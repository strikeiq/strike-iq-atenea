import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import Sidebar from '@/components/layout/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: '#0a0a0a' }}>
      <Suspense fallback={null}>
        <Sidebar profile={profile} />
      </Suspense>
      <main style={{
        flex: 1,
        marginLeft: '220px',
        padding: '32px',
        maxWidth: 'calc(100vw - 220px)',
        overflowX: 'hidden',
      }}>
        {children}
      </main>
    </div>
  )
}
