import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportesClient from '@/components/reportes/ReportesClient'

export default async function ReportesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/gestor')

  // Últimas cargas
  const { data: lotes } = await supabase
    .from('transacciones')
    .select('lote_id, created_at, fecha')
    .not('lote_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100)

  // Agrupar por lote
  const lotesMap = new Map<string, { lote_id: string; created_at: string; count: number; fecha_min: string; fecha_max: string }>()
  for (const t of (lotes || [])) {
    if (!t.lote_id) continue
    if (!lotesMap.has(t.lote_id)) {
      lotesMap.set(t.lote_id, { lote_id: t.lote_id, created_at: t.created_at, count: 0, fecha_min: t.fecha, fecha_max: t.fecha })
    }
    const l = lotesMap.get(t.lote_id)!
    l.count++
    if (t.fecha < l.fecha_min) l.fecha_min = t.fecha
    if (t.fecha > l.fecha_max) l.fecha_max = t.fecha
  }

  return <ReportesClient lotesRecientes={Array.from(lotesMap.values()).slice(0, 10)} />
}
