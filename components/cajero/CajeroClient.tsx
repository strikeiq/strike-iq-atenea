'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TIPOS_BONO, CATEGORIAS_BONO, type TipoBono, type Jugador } from '@/lib/types'

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
function badge(tipo: string | null) {
  const colors: Record<string, string> = {
    'RECURRENTES': '#16a34a', 'EXCLUSIVOS': '#2563eb', 'STRIKE VIP': '#7c3aed',
    'NUEVOS': '#0891b2', 'RECURRENTES VIPS': '#059669', 'POTENCIALES VIP': '#d97706',
    'INACTIVO': '#52525b', 'MIGRADO': '#9333ea',
  }
  return colors[tipo ?? ''] || '#52525b'
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── Stat item ─────────────────────────────────────────────────────
function Stat({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '50%',
        background: '#16a34a22', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '16px', flexShrink: 0,
      }}>{icon}</div>
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
            <span style={{ fontSize: '12px', fontWeight: '600', color: badge(c.tipo_bono) }}>
              {c.tipo_bono}
            </span>
          )}
          {c.categoria_bono && (
            <span style={{ fontSize: '12px', color: '#71717a' }}>- {c.categoria_bono}</span>
          )}
          <span style={{
            fontSize: '11px', padding: '2px 8px', borderRadius: '12px', fontWeight: '500',
            background: c.usado ? '#16a34a22' : '#d9770622',
            color: c.usado ? '#22c55e' : '#f97316',
            border: `1px solid ${c.usado ? '#16a34a44' : '#d9770644'}`,
          }}>
            {c.usado ? 'Usado' : 'Pendiente'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="number"
            value={monto}
            onChange={e => setMonto(e.target.value)}
            onBlur={() => saveField({ monto: monto ? parseFloat(monto) : null })}
            placeholder="Monto"
            style={{ width: '90px', padding: '4px 8px', fontSize: '13px', textAlign: 'right' }}
          />
          <input
            type="checkbox"
            checked={c.usado}
            onChange={e => saveField({ usado: e.target.checked })}
            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#16a34a' }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="checkbox"
          checked={c.respondio}
          onChange={e => saveField({ respondio: e.target.checked })}
          style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: '#16a34a' }}
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
  const [tab, setTab] = useState<'individual' | 'multiple'>('individual')

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

  const s: React.CSSProperties = {
    minHeight: '100dvh',
    background: '#0a0a0a',
    color: '#f4f4f5',
    fontFamily: 'system-ui, sans-serif',
    padding: '32px',
  }

  return (
    <div style={s}>
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
            <label style={{ fontSize: '12px', color: '#71717a', display: 'block', marginBottom: '6px' }}>ID Usuario</label>
            <input
              readOnly
              value={jugador?.jugador_norm ?? ''}
              placeholder=""
              style={{ background: '#1a1a1a', cursor: 'default' }}
            />
          </div>

          {/* Usuario (search) */}
          <div ref={dropRef} style={{ position: 'relative' }}>
            <label style={{ fontSize: '12px', color: '#71717a', display: 'block', marginBottom: '6px' }}>Usuario</label>
            <input
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setJugador(null) }}
              placeholder="Nombre del usuario..."
              autoComplete="off"
              style={{ borderColor: jugador ? '#16a34a' : undefined }}
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
            <label style={{ fontSize: '12px', color: '#71717a', display: 'block', marginBottom: '6px' }}>Monto a cargar (opcional)</label>
            <input
              type="number"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              placeholder="Ej: 10000"
              min="0"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
          {/* Tipo de Bono */}
          <div>
            <label style={{ fontSize: '12px', color: '#71717a', display: 'block', marginBottom: '6px' }}>Tipo de Bono</label>
            <select value={tipoBono} onChange={e => setTipoBono(e.target.value as TipoBono)}>
              <option value="">Seleccionar...</option>
              {TIPOS_BONO.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Categoría de Bono */}
          <div>
            <label style={{ fontSize: '12px', color: '#71717a', display: 'block', marginBottom: '6px' }}>Categoría de Bono</label>
            <select value={categoria} onChange={e => setCategoria(e.target.value)}>
              <option value="">Seleccionar...</option>
              {CATEGORIAS_BONO.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Guardar */}
          <button
            onClick={guardarBono}
            disabled={!jugador || !tipoBono || saving}
            style={{
              background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px',
              padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
              opacity: (!jugador || !tipoBono || saving) ? 0.5 : 1,
            }}
          >
            {saving ? '...' : '💾'} Guardar Bono
          </button>
        </div>

        {msg && (
          <div style={{
            marginTop: '12px', padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
            background: msg.type === 'ok' ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${msg.type === 'ok' ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: msg.type === 'ok' ? '#22c55e' : '#ef4444',
          }}>
            {msg.text}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid #1e1e1e', paddingBottom: '0' }}>
        {[
          { id: 'individual', label: 'Bono Individual' },
          { id: 'multiple', label: 'Bonos Múltiples' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            style={{
              background: 'none', border: 'none', color: tab === t.id ? '#22c55e' : '#71717a',
              fontSize: '14px', fontWeight: tab === t.id ? '600' : '400',
              padding: '8px 16px', cursor: 'pointer',
              borderBottom: tab === t.id ? '2px solid #22c55e' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Bono Individual ── */}
      {tab === 'individual' && (
        <>
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
                    background: '#16a34a33', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px',
                  }}>👤</div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '15px' }}>{jugador.jugador_original}</div>
                    <div style={{ fontSize: '12px', color: '#71717a' }}>Usuario registrado</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Stat icon="📩" value={bono?.bonos_ofrecidos ?? 0} label="Bonos Ofrecidos" />
                  <Stat icon="✅" value={bono?.bonos_usados ?? 0} label="Bonos Usados" />
                  <Stat icon="📅" value={jugador.ultima_tx ? new Date(jugador.ultima_tx).toLocaleDateString('es-AR') : '—'} label="Última Carga" />
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
                      <button
                        key={f}
                        onClick={() => setFiltro(f)}
                        style={{
                          padding: '4px 12px', borderRadius: '6px', border: 'none',
                          fontSize: '12px', fontWeight: '500', cursor: 'pointer',
                          background: filtro === f ? '#16a34a' : '#1e1e1e',
                          color: filtro === f ? 'white' : '#71717a',
                        }}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
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
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>◉</div>
              <div style={{ fontSize: '13px' }}>Buscá un usuario para ver su información</div>
            </div>
          )}
        </>
      )}

      {/* ── TAB: Bonos Múltiples ── */}
      {tab === 'multiple' && (
        <div style={{ maxWidth: '560px' }}>
          <div style={{
            background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px',
            padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px',
          }}>
            <div>
              <label style={{ fontSize: '12px', color: '#71717a', display: 'block', marginBottom: '6px' }}>
                Usuarios (uno por línea)
              </label>
              <textarea
                value={multiUsuarios}
                onChange={e => setMultiUsuarios(e.target.value)}
                placeholder={'usuario1\nusuario2\nusuario3'}
                rows={8}
                style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '13px' }}
              />
              <div style={{ fontSize: '11px', color: '#52525b', marginTop: '4px' }}>
                {multiUsuarios.split('\n').filter(s => s.trim()).length} usuarios
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#71717a', display: 'block', marginBottom: '6px' }}>Tipo de Bono</label>
                <select value={multiTipo} onChange={e => setMultiTipo(e.target.value as TipoBono)}>
                  <option value="">Seleccionar...</option>
                  {TIPOS_BONO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#71717a', display: 'block', marginBottom: '6px' }}>Categoría</label>
                <select value={multiCategoria} onChange={e => setMultiCategoria(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {CATEGORIAS_BONO.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#71717a', display: 'block', marginBottom: '6px' }}>Monto (opcional)</label>
              <input type="number" value={multiMonto} onChange={e => setMultiMonto(e.target.value)} placeholder="Ej: 10000" />
            </div>

            {multiMsg && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
                background: multiMsg.type === 'ok' ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${multiMsg.type === 'ok' ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}`,
                color: multiMsg.type === 'ok' ? '#22c55e' : '#ef4444',
              }}>
                {multiMsg.text}
              </div>
            )}

            <button
              onClick={guardarBonosMultiples}
              disabled={!multiTipo || !multiUsuarios.trim() || multiSaving}
              style={{
                background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px',
                padding: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                opacity: (!multiTipo || !multiUsuarios.trim() || multiSaving) ? 0.5 : 1,
              }}
            >
              {multiSaving ? 'Guardando...' : 'Guardar para todos'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
