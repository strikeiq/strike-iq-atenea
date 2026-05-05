'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TIPOS_BONO, CATEGORIAS_BONO, type TipoBono, type Jugador } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BorderGradientButton } from '@/components/border-gradient'
import {
  Loader2,
  Sparkles,
  UserCircle,
  CircleDot,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────
interface RegistroBono {
  bonos_ofrecidos: number
  bonos_usados: number
  tipo_bono: string | null
  categoria_bono: string | null
}

interface Contacto {
  id: string
  jugador_norm: string
  tipo_bono: string | null
  categoria_bono: string | null
  usado: boolean
  monto: number | null
  respondio: boolean
  fecha: string
}

// ── Helpers ───────────────────────────────────────────────────────
function badgeColor(tipo: string | null) {
  const colors: Record<string, string> = {
    'RECURRENTES': '#0f602f', 'EXCLUSIVOS': '#2563eb', 'STRIKE VIP': '#7c3aed',
    'NUEVOS': '#0891b2', 'RECURRENTES VIPS': '#059669', 'POTENCIALES VIP': '#d97706',
    'INACTIVO': '#52525b', 'MIGRADO': '#9333ea',
  }
  return colors[tipo ?? ''] || '#52525b'
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── Stat item ─────────────────────────────────────────────────────
function Stat({ Icon, value, label }: { Icon: React.ElementType; value: string | number; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '50%',
        background: '#0f602f22', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon style={{ width: '16px', height: '16px', color: '#22c55e' }} />
      </div>
      <div>
        <div style={{ fontSize: '18px', fontWeight: '700', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '12px', color: '#71717a', marginTop: '2px' }}>{label}</div>
      </div>
    </div>
  )
}

// ── Bono row (editable) ───────────────────────────────────────────
function BonoRow({ c, onUpdate }: {
  c: Contacto
  onUpdate: (id: string, patch: Partial<Pick<Contacto, 'monto' | 'usado' | 'respondio'>>) => Promise<void>
}) {
  const [monto, setMonto] = useState(c.monto?.toString() ?? '')
  const [saving, setSaving] = useState(false)

  async function saveField(patch: Partial<Pick<Contacto, 'monto' | 'usado' | 'respondio'>>) {
    setSaving(true)
    await onUpdate(c.id, patch)
    setSaving(false)
  }

  return (
    <div style={{
      background: '#111', border: '1px solid #222', borderRadius: '8px',
      padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px',
      opacity: saving ? 0.6 : 1, transition: 'opacity 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: '#a1a1aa' }}>{fmt(c.fecha)}</span>
          {c.tipo_bono && (
            <span style={{ fontSize: '12px', fontWeight: '600', color: badgeColor(c.tipo_bono) }}>
              {c.tipo_bono}
            </span>
          )}
          {c.categoria_bono && (
            <span style={{ fontSize: '12px', color: '#71717a' }}>- {c.categoria_bono}</span>
          )}
          <span style={{
            fontSize: '11px', padding: '2px 8px', borderRadius: '12px', fontWeight: '500',
            background: c.usado ? '#0f602f22' : '#d9770622',
            color: c.usado ? '#22c55e' : '#f97316',
            border: `1px solid ${c.usado ? '#0f602f44' : '#d9770644'}`,
          }}>
            {c.usado ? 'Usado' : 'Pendiente'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Input
            type="number"
            value={monto}
            onChange={e => setMonto(e.target.value)}
            onBlur={() => saveField({ monto: monto ? parseFloat(monto) : null })}
            placeholder="Monto"
            className="w-[90px] h-8 text-[13px] text-right bg-[#1a1a1a] border-[#2a2a2a] text-[#f4f4f5]"
          />
          <input
            type="checkbox"
            checked={c.usado}
            onChange={e => saveField({ usado: e.target.checked })}
            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0f602f' }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="checkbox"
          checked={c.respondio}
          onChange={e => saveField({ respondio: e.target.checked })}
          style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: '#0f602f' }}
        />
        <span style={{ fontSize: '12px', color: '#71717a' }}>Respondió</span>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────
export default function CajeroClient() {
  const supabase = createClient()

  // Form state
  const [busqueda, setBusqueda] = useState('')
  const [sugerencias, setSugerencias] = useState<Jugador[]>([])
  const [jugador, setJugador] = useState<Jugador | null>(null)
  const [bono, setBono] = useState<RegistroBono | null>(null)
  const [contactos, setContactos] = useState<Contacto[]>([])
  const [filtro, setFiltro] = useState<'todos' | 'pendientes' | 'usados'>('todos')

  const [tipoBono, setTipoBono] = useState<TipoBono | ''>('')
  const [categoria, setCategoria] = useState('')
  const [monto, setMonto] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Bonos múltiples
  const [multiUsuarios, setMultiUsuarios] = useState('')
  const [multiTipo, setMultiTipo] = useState<TipoBono | ''>('')
  const [multiCategoria, setMultiCategoria] = useState('')
  const [multiMonto, setMultiMonto] = useState('')
  const [multiSaving, setMultiSaving] = useState(false)
  const [multiMsg, setMultiMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const dropRef = useRef<HTMLDivElement>(null)

  // Cerrar dropdown al clickear afuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setSugerencias([])
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Búsqueda con debounce
  const buscarJugadores = useCallback(async (q: string) => {
    if (q.length < 2) { setSugerencias([]); return }
    const { data } = await supabase
      .from('jugadores')
      .select('*')
      .ilike('jugador_original', `%${q}%`)
      .limit(8)
    setSugerencias(data || [])
  }, [supabase])

  useEffect(() => {
    const t = setTimeout(() => buscarJugadores(busqueda), 200)
    return () => clearTimeout(t)
  }, [busqueda, buscarJugadores])

  async function seleccionarJugador(j: Jugador) {
    setJugador(j)
    setBusqueda(j.jugador_original)
    setSugerencias([])

    const [{ data: rb }, { data: cts }] = await Promise.all([
      supabase.from('registro_bonos').select('*').eq('jugador_norm', j.jugador_norm).single(),
      supabase.from('contactos').select('*').eq('jugador_norm', j.jugador_norm).order('fecha', { ascending: false }).limit(50),
    ])
    setBono(rb ?? null)
    setContactos(cts ?? [])
    if (rb?.tipo_bono) setTipoBono(rb.tipo_bono as TipoBono)
    if (rb?.categoria_bono) setCategoria(rb.categoria_bono)
  }

  async function guardarBono() {
    if (!jugador || !tipoBono) return
    setSaving(true); setMsg(null)
    const { error } = await supabase.rpc('registrar_bono', {
      p_jugador_norm: jugador.jugador_norm,
      p_jugador: jugador.jugador_original,
      p_tipo_bono: tipoBono,
      p_categoria: categoria || null,
      p_monto: monto ? parseFloat(monto) : null,
      p_usado: false,
      p_respondio: false,
      p_notas: null,
      p_cajero_id: null,
      p_cajero_nombre: 'Cajero',
    })
    if (error) {
      setMsg({ type: 'err', text: error.message })
    } else {
      setMsg({ type: 'ok', text: `Bono guardado para ${jugador.jugador_original}` })
      // Refrescar datos
      const [{ data: rb }, { data: cts }] = await Promise.all([
        supabase.from('registro_bonos').select('*').eq('jugador_norm', jugador.jugador_norm).single(),
        supabase.from('contactos').select('*').eq('jugador_norm', jugador.jugador_norm).order('fecha', { ascending: false }).limit(50),
      ])
      setBono(rb ?? null)
      setContactos(cts ?? [])
      setMonto('')
      setTimeout(() => setMsg(null), 3000)
    }
    setSaving(false)
  }

  async function actualizarContacto(id: string, patch: Partial<Pick<Contacto, 'monto' | 'usado' | 'respondio'>>) {
    const { error } = await supabase.from('contactos').update(patch).eq('id', id)
    if (!error) {
      setContactos(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
      // Si cambió usado, actualizar contador en bono
      if (patch.usado !== undefined && bono) {
        const delta = patch.usado ? 1 : -1
        setBono(prev => prev ? { ...prev, bonos_usados: prev.bonos_usados + delta } : prev)
      }
    }
  }

  async function guardarBonosMultiples() {
    if (!multiTipo || !multiUsuarios.trim()) return
    setMultiSaving(true); setMultiMsg(null)
    const nombres = multiUsuarios.split('\n').map(s => s.trim()).filter(Boolean)
    let ok = 0, err = 0
    for (const nombre of nombres) {
      const norm = nombre.toLowerCase().replace(/[\s_]/g, '')
      const { data: jug } = await supabase.from('jugadores').select('*').eq('jugador_norm', norm).single()
      if (!jug) { err++; continue }
      const { error } = await supabase.rpc('registrar_bono', {
        p_jugador_norm: jug.jugador_norm, p_jugador: jug.jugador_original,
        p_tipo_bono: multiTipo, p_categoria: multiCategoria || null,
        p_monto: multiMonto ? parseFloat(multiMonto) : null,
        p_usado: false, p_respondio: false, p_notas: null,
        p_cajero_id: null, p_cajero_nombre: 'Cajero',
      })
      if (error) err++; else ok++
    }
    setMultiMsg({ type: ok > 0 ? 'ok' : 'err', text: `${ok} guardados · ${err} no encontrados` })
    if (ok > 0) { setMultiUsuarios(''); setMultiTipo(''); setMultiCategoria(''); setMultiMonto('') }
    setMultiSaving(false)
  }

  const contactosFiltrados = contactos.filter(c => {
    if (filtro === 'pendientes') return !c.usado
    if (filtro === 'usados') return c.usado
    return true
  })

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0a0a0a',
      color: '#f4f4f5',
      fontFamily: 'system-ui, sans-serif',
      padding: '32px',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>Gestor Atenea</h1>
      </div>

      {/* ── Formulario principal ── */}
      <div style={{
        background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px',
        padding: '20px', marginBottom: '24px',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '16px', alignItems: 'end', marginBottom: '16px' }}>
          {/* ID Usuario */}
          <div>
            <Label className="text-[12px] text-[#71717a] mb-1.5 block">ID Usuario</Label>
            <Input
              readOnly
              value={jugador?.jugador_norm ?? ''}
              placeholder=""
              className="bg-[#1a1a1a] border-[#2a2a2a] text-[#f4f4f5] cursor-default"
            />
          </div>

          {/* Usuario (search) */}
          <div ref={dropRef} style={{ position: 'relative' }}>
            <Label className="text-[12px] text-[#71717a] mb-1.5 block">Usuario</Label>
            <Input
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setJugador(null) }}
              placeholder="Nombre del usuario..."
              autoComplete="off"
              className="bg-[#111] border-[#2a2a2a] text-[#f4f4f5] placeholder:text-[#52525b] focus-visible:ring-[#0f602f]"
              style={{ borderColor: jugador ? '#0f602f' : undefined }}
            />
            {sugerencias.length > 0 && !jugador && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px',
                marginTop: '4px', overflow: 'hidden',
              }}>
                {sugerencias.map(j => (
                  <div
                    key={j.jugador_norm}
                    onClick={() => seleccionarJugador(j)}
                    style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#222')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {j.jugador_original}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Monto */}
          <div>
            <Label className="text-[12px] text-[#71717a] mb-1.5 block">Monto a cargar (opcional)</Label>
            <Input
              type="number"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              placeholder="Ej: 10000"
              min="0"
              className="bg-[#111] border-[#2a2a2a] text-[#f4f4f5] placeholder:text-[#52525b] focus-visible:ring-[#0f602f]"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
          {/* Tipo de Bono */}
          <div>
            <Label className="text-[12px] text-[#71717a] mb-1.5 block">Tipo de Bono</Label>
            <Select value={tipoBono || '__none__'} onValueChange={v => setTipoBono(v === '__none__' ? '' : v as TipoBono)}>
              <SelectTrigger className="bg-[#111] border-[#2a2a2a] text-[#f4f4f5]">
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                <SelectItem value="__none__" className="text-[#71717a]">Seleccionar...</SelectItem>
                {TIPOS_BONO.map(t => (
                  <SelectItem key={t} value={t} className="text-[#f4f4f5]">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Categoría de Bono */}
          <div>
            <Label className="text-[12px] text-[#71717a] mb-1.5 block">Categoría de Bono</Label>
            <Select value={categoria || '__none__'} onValueChange={v => setCategoria(v === '__none__' ? '' : v)}>
              <SelectTrigger className="bg-[#111] border-[#2a2a2a] text-[#f4f4f5]">
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                <SelectItem value="__none__" className="text-[#71717a]">Seleccionar...</SelectItem>
                {CATEGORIAS_BONO.map(c => (
                  <SelectItem key={c} value={c} className="text-[#f4f4f5]">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Guardar */}
          <BorderGradientButton
            onClick={guardarBono}
            disabled={!jugador || !tipoBono || saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#111] text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {saving && <Loader2 className="animate-spin w-4 h-4" />}
            Guardar Bono
          </BorderGradientButton>
        </div>

        {msg && (
          <div style={{
            marginTop: '12px', padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
            background: msg.type === 'ok' ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${msg.type === 'ok' ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: msg.type === 'ok' ? '#22c55e' : '#ef4444',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            {msg.type === 'ok'
              ? <CheckCircle className="w-4 h-4 shrink-0" />
              : <AlertCircle className="w-4 h-4 shrink-0" />
            }
            {msg.text}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="individual" className="w-full">
        <TabsList className="bg-[#111] border border-[#1e1e1e] mb-6">
          <TabsTrigger value="individual" className="data-[state=active]:bg-[#1a1a1a] data-[state=active]:text-[#22c55e] text-[#71717a]">
            Bono Individual
          </TabsTrigger>
          <TabsTrigger value="multiple" className="data-[state=active]:bg-[#1a1a1a] data-[state=active]:text-[#22c55e] text-[#71717a]">
            Bonos Múltiples
          </TabsTrigger>
        </TabsList>

        {/* ── TAB: Bono Individual ── */}
        <TabsContent value="individual">
          {jugador ? (
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px', alignItems: 'start' }}>
              {/* Stats del jugador */}
              <div style={{
                background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '20px',
                display: 'flex', flexDirection: 'column', gap: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: '#0f602f33', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <UserCircle style={{ width: '24px', height: '24px', color: '#22c55e' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '15px' }}>{jugador.jugador_original}</div>
                    <div style={{ fontSize: '12px', color: '#71717a' }}>Usuario registrado</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Stat Icon={Sparkles} value={bono?.bonos_ofrecidos ?? 0} label="Bonos Ofrecidos" />
                  <Stat Icon={CheckCircle} value={bono?.bonos_usados ?? 0} label="Bonos Usados" />
                  <Stat Icon={CircleDot} value={jugador.ultima_tx ? new Date(jugador.ultima_tx).toLocaleDateString('es-AR') : '—'} label="Última Carga" />
                </div>
              </div>

              {/* Lista de bonos */}
              <div style={{
                background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span style={{ fontWeight: '600', fontSize: '15px' }}>Bonos del Usuario</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {(['todos', 'pendientes', 'usados'] as const).map(f => (
                      <Button
                        key={f}
                        size="sm"
                        variant={filtro === f ? 'default' : 'outline'}
                        onClick={() => setFiltro(f)}
                        className={
                          filtro === f
                            ? 'text-[12px] h-7 bg-[#0f602f] hover:bg-[#15803d] text-white border-transparent'
                            : 'text-[12px] h-7 border-[#2a2a2a] bg-transparent text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#1e1e1e]'
                        }
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {contactosFiltrados.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#52525b', padding: '32px', fontSize: '13px' }}>
                      Sin bonos registrados
                    </div>
                  ) : (
                    contactosFiltrados.map(c => (
                      <BonoRow key={c.id} c={c} onUpdate={actualizarContacto} />
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: '240px', background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px',
              color: '#52525b',
            }}>
              <CircleDot style={{ width: '40px', height: '40px', marginBottom: '12px', opacity: 0.3 }} />
              <div style={{ fontSize: '13px' }}>Buscá un usuario para ver su información</div>
            </div>
          )}
        </TabsContent>

        {/* ── TAB: Bonos Múltiples ── */}
        <TabsContent value="multiple">
          <div style={{ maxWidth: '560px' }}>
            <div style={{
              background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px',
              padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px',
            }}>
              <div>
                <Label className="text-[12px] text-[#71717a] mb-1.5 block">
                  Usuarios (uno por línea)
                </Label>
                <Textarea
                  value={multiUsuarios}
                  onChange={e => setMultiUsuarios(e.target.value)}
                  placeholder={'usuario1\nusuario2\nusuario3'}
                  rows={8}
                  className="bg-[#1a1a1a] border-[#2a2a2a] text-[#f4f4f5] placeholder:text-[#52525b] font-mono text-[13px] resize-y focus-visible:ring-[#0f602f]"
                />
                <div style={{ fontSize: '11px', color: '#52525b', marginTop: '4px' }}>
                  {multiUsuarios.split('\n').filter(s => s.trim()).length} usuarios
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <Label className="text-[12px] text-[#71717a] mb-1.5 block">Tipo de Bono</Label>
                  <Select value={multiTipo || '__none__'} onValueChange={v => setMultiTipo(v === '__none__' ? '' : v as TipoBono)}>
                    <SelectTrigger className="bg-[#111] border-[#2a2a2a] text-[#f4f4f5]">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                      <SelectItem value="__none__" className="text-[#71717a]">Seleccionar...</SelectItem>
                      {TIPOS_BONO.map(t => (
                        <SelectItem key={t} value={t} className="text-[#f4f4f5]">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[12px] text-[#71717a] mb-1.5 block">Categoría</Label>
                  <Select value={multiCategoria || '__none__'} onValueChange={v => setMultiCategoria(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="bg-[#111] border-[#2a2a2a] text-[#f4f4f5]">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                      <SelectItem value="__none__" className="text-[#71717a]">Seleccionar...</SelectItem>
                      {CATEGORIAS_BONO.map(c => (
                        <SelectItem key={c} value={c} className="text-[#f4f4f5]">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-[12px] text-[#71717a] mb-1.5 block">Monto (opcional)</Label>
                <Input
                  type="number"
                  value={multiMonto}
                  onChange={e => setMultiMonto(e.target.value)}
                  placeholder="Ej: 10000"
                  className="bg-[#111] border-[#2a2a2a] text-[#f4f4f5] placeholder:text-[#52525b] focus-visible:ring-[#0f602f]"
                />
              </div>

              {multiMsg && (
                <div style={{
                  padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
                  background: multiMsg.type === 'ok' ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${multiMsg.type === 'ok' ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  color: multiMsg.type === 'ok' ? '#22c55e' : '#ef4444',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  {multiMsg.type === 'ok'
                    ? <CheckCircle className="w-4 h-4 shrink-0" />
                    : <AlertCircle className="w-4 h-4 shrink-0" />
                  }
                  {multiMsg.text}
                </div>
              )}

              <BorderGradientButton
                onClick={guardarBonosMultiples}
                disabled={!multiTipo || !multiUsuarios.trim() || multiSaving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#111] text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {multiSaving && <Loader2 className="animate-spin w-4 h-4" />}
                {multiSaving ? 'Guardando...' : 'Guardar para todos'}
              </BorderGradientButton>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
