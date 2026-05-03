'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

const NAV_ADMIN = [
  { href: '/dashboard', label: 'Dashboard', icon: '◈' },
  { href: '/gestor',    label: 'Gestor Bonos', icon: '◆' },
  { href: '/jugadores', label: 'Jugadores', icon: '◉' },
  { href: '/reportes',  label: 'Cargar reporte', icon: '↑' },
  { href: '/importar',  label: 'Importar CRM', icon: '⇄' },
]

const NAV_CAJERO = [
  { href: '/gestor', label: 'Gestor Bonos', icon: '◆' },
]

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const nav = profile?.role === 'admin' ? NAV_ADMIN : NAV_CAJERO

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, bottom: 0,
      width: '220px',
      background: '#0f0f0f',
      borderRight: '1px solid #1e1e1e',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{
        padding: '24px 20px 20px',
        borderBottom: '1px solid #1e1e1e',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '7px',
            background: 'linear-gradient(135deg, #16a34a, #15803d)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '15px', fontWeight: '700', color: 'white', flexShrink: 0,
          }}>S</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#f4f4f5', lineHeight: 1.2 }}>
              Strike IQ
            </div>
            <div style={{ fontSize: '11px', color: '#52525b' }}>Atenea</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {nav.map(item => {
          const active = pathname === item.href
          return (
            <Link key={item.href} href={item.href} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 12px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: active ? '600' : '400',
              color: active ? '#22c55e' : '#71717a',
              background: active ? 'rgba(22,163,74,0.1)' : 'transparent',
              transition: 'all 0.1s',
            }}>
              <span style={{ fontSize: '14px', opacity: active ? 1 : 0.6 }}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #1e1e1e',
      }}>
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '13px', color: '#f4f4f5', fontWeight: '500' }}>
            {profile?.nombre || 'Usuario'}
          </div>
          <div style={{ fontSize: '11px', color: '#52525b', marginTop: '2px' }}>
            {profile?.role === 'admin' ? '● Admin' : '● Cajero'}
          </div>
        </div>
        <button onClick={handleLogout} className="btn btn-secondary"
          style={{ width: '100%', fontSize: '12px', padding: '7px 12px' }}>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
