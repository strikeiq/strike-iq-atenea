'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BorderGradientButton } from '@/components/border-gradient'
import { Loader2, LogIn, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Usuario o contraseña incorrectos')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a',
      padding: '24px',
    }}>
      {/* Subtle grid background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(22,163,74,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(22,163,74,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '380px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            marginBottom: '8px',
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #0f602f, #15803d)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', fontWeight: '700', color: 'white',
            }}>S</div>
            <span style={{ fontSize: '22px', fontWeight: '700', color: '#f4f4f5' }}>
              Strike IQ
            </span>
          </div>
          <p style={{ color: '#52525b', fontSize: '13px' }}>Atenea · Panel de gestión</p>
        </div>

        {/* Form card */}
        <div style={{
          background: '#111111',
          border: '1px solid #2a2a2a',
          borderRadius: '16px',
          padding: '32px',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '24px', color: '#f4f4f5' }}>
            Iniciar sesión
          </h2>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <div style={{ marginBottom: '16px' }}>
              <Label htmlFor="email" className="text-[#a1a1aa] text-[13px] mb-1.5 block">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoComplete="email"
                className="bg-[#1a1a1a] border-[#2a2a2a] text-[#f4f4f5] placeholder:text-[#52525b] focus-visible:ring-[#0f602f] focus-visible:border-[#0f602f]"
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <Label htmlFor="password" className="text-[#a1a1aa] text-[13px] mb-1.5 block">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="bg-[#1a1a1a] border-[#2a2a2a] text-[#f4f4f5] placeholder:text-[#52525b] focus-visible:ring-[#0f602f] focus-visible:border-[#0f602f]"
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '16px',
                fontSize: '13px',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <BorderGradientButton
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#111] text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? <Loader2 className="animate-spin w-4 h-4" />
                : <LogIn className="w-4 h-4" />
              }
              {loading ? 'Ingresando...' : 'Ingresar'}
            </BorderGradientButton>
          </form>
        </div>
      </div>
    </div>
  )
}
