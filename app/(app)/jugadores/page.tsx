import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import JugadoresClient from '@/components/jugadores/JugadoresClient'

export default async function JugadoresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Cargar datos usando la vista
  const { data: jugadores } = await supabase
    .from('resumen_atenea')
    .select('*')
    .order('ganancia_casino', { ascending: false })
    .limit(500)

  return <JugadoresClient jugadores={jugadores ?? []} />
}
