import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GestorClient from '@/components/gestor/GestorClient'

export default async function GestorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  // Cargar historial reciente del cajero
  const { data: historial } = await supabase
    .from('contactos')
    .select('*')
    .eq('cajero_id', user.id)
    .order('fecha', { ascending: false })
    .limit(50)

  return <GestorClient profile={profile} historialInicial={historial ?? []} />
}
