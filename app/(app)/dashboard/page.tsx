import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/dashboard/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/gestor')

  // Stats generales
  const [
    { count: totalJugadores },
    { data: statsData },
    { data: actividad7d },
    { data: topJugadores },
  ] = await Promise.all([
    supabase.from('jugadores').select('*', { count: 'exact', head: true }),
    supabase.rpc('resumen_dinamico', {
      p_desde: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
      p_hasta: new Date().toISOString().split('T')[0],
    }).limit(1000),
    supabase.from('transacciones')
      .select('fecha, depositar, retirar, operacion')
      .gte('fecha', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]),
    supabase.from('jugadores')
      .select('jugador_original, total_depositado, total_retirado, ganancia_casino, cantidad_cargas, ultima_tx')
      .order('ganancia_casino', { ascending: false })
      .limit(20),
  ])

  const stats = {
    totalJugadores: totalJugadores ?? 0,
    totalDepositado: statsData?.reduce((s: number, r) => s + (r.total_depositado || 0), 0) ?? 0,
    totalRetirado: statsData?.reduce((s: number, r) => s + (r.total_retirado || 0), 0) ?? 0,
    gananciaCasino: statsData?.reduce((s: number, r) => s + (r.ganancia_casino || 0), 0) ?? 0,
    jugadoresActivos30d: statsData?.length ?? 0,
    jugadoresActivos7d: new Set(actividad7d?.map(r => r.fecha)).size ?? 0,
  }

  return <DashboardClient stats={stats} topJugadores={topJugadores ?? []} actividad7d={actividad7d ?? []} />
}
