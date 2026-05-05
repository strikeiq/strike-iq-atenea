'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Sparkles,
  Users,
  UploadCloud,
  ArrowLeftRight,
  CircleDot,
} from 'lucide-react'

const NAV_ADMIN = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/gestor',    label: 'Gestor Bonos', Icon: Sparkles },
  { href: '/jugadores', label: 'Jugadores', Icon: Users },
  { href: '/reportes',  label: 'Cargar reporte', Icon: UploadCloud },
  { href: '/gestor?tab=importar', label: 'Importar CRM', Icon: ArrowLeftRight },
]

const NAV_CAJERO = [
  { href: '/gestor', label: 'Gestor Bonos', Icon: Sparkles },
]

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const nav = profile?.role === 'admin' ? NAV_ADMIN : NAV_CAJERO

  function isActive(href: string) {
    const [hrefPath, hrefQuery] = href.split('?')
    if (pathname !== hrefPath) return false
    if (!hrefQuery) return !searchParams.get('tab')
    const params = new URLSearchParams(hrefQuery)
    return params.get('tab') === searchParams.get('tab')
  }

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
            background: 'linear-gradient(135deg, #0f602f, #15803d)',
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
          const active = isActive(item.href)
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
              <item.Icon
                style={{ width: '15px', height: '15px', opacity: active ? 1 : 0.6, flexShrink: 0 }}
              />
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#52525b', marginTop: '2px' }}>
            <CircleDot style={{ width: '10px', height: '10px', color: '#22c55e' }} />
            {profile?.role === 'admin' ? 'Admin' : 'Cajero'}
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full text-xs h-8 border-[#2a2a2a] bg-transparent text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#1a1a1a] hover:border-[#3a3a3a]"
        >
          Cerrar sesión
        </Button>
      </div>
    </aside>
  )
}
