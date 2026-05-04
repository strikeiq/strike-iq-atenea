'use client'

import { useState, useCallback, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TIPOS_BONO, CATEGORIAS_BONO, type TipoBono, type Contacto, type Profile, type Jugador } from '@/lib/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// ── Helpers ──────────────────────────────────────────────────────
function badge(tipo: string | null) {
  const colors: Record<string, string> = {
    'RECURRENTES': '#16a34a', 'EXCLUSIVOS': '#2563eb', 'STRIKE VIP': '#7c3aed',
    'NUEVOS': '#0891b2', 'RECURRENTES VIPS': '#059669', 'POTENCIALES VIP': '#d97706',
    'INACTIVO': '#52525b', 'MIGRADO': '#9333ea',
  }
  return colors[tipo ?? ''] || '#52525b'
}

// ── Sub-components ───────────────────────────────────────────────
function BonoBadge({ tipo }: { tipo: string | null }) {
  if (!tipo) return <span style={{ color: '#52525b', fontSize: '12px' }}>—</span>
  return (
    <span className="badge" style={{ background: badge(tipo) + '22', color: badge(tipo), border: `1px solid ${badge(tipo)}44` }}>
      {tipo}
    </span>
  )
}

function PlayerCard({ jugador, bono }: { jugador: Jugador; bono: any }) {
  const ganancia = jugador.ganancia_casino || 0
  return (
    <div style={{
      background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px',
      padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: '600', fontSize: '15px' }}>{jugador.jugador_original}</div>
          <div className="mono" style={{ fontSize: '11px', color: '#52525b', marginTop: '2px' }}>{jugador.jugador_norm}</div>
        </div>
        <BonoBadge tipo={bono?.tipo_bono} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {[
          { label: 'Depositado', value: `$${(jugador.total_depositado||0).toLocaleString()}`, color: '#f4f4f5' },
          { label: 'Retirado',   value: `$${(jugador.total_retirado||0).toLocaleString()}`,   color: '#f4f4f5' },
          { label: 'Ganancia casino', value: `$${ganancia.toLocaleString()}`, color: ganancia >= 0 ? '#22c55e' : '#ef4444' },
          { label: 'Cargas',     value: String(jugador.cantidad_cargas || 0), color: '#f4f4f5' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#1a1a1a', borderRadius: '6px', padding: '8px 10px' }}>
            <div style={{ fontSize: '10px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
            <div className="mono" style={{ fontSize: '14px', fontWeight: '600', color, marginTop: '2px' }}>{value}</div>
          </div>
        ))}
      </div>

      {bono && (
        <div style={{ borderTop: '1px solid #222', paddingTop: '10px', display: 'flex', gap: '16px', fontSize: '12px', color: '#71717a' }}>
          <span>Ofrecidos: <span className="mono" style={{ color: '#f4f4f5' }}>{bono.bonos_ofrecidos}</span></span>
          <span>Usados: <span className="mono" style={{ color: '#22c55e' }}>{bono.bonos_usados}</span></span>
          <span>Conv: <span className="mono" style={{ color: '#f4f4f5' }}>{bono.pct_conversion}%</span></span>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────
function GestorInner({ profile, historialInicial }: {
  profile: Profile
  historialInicial: Contacto[]
}) {
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as any) || 'individual'
  const supabase = createClient()
  const [tab, setTab] = useState<'individual' | 'multiple' | 'importar' | 'historial' | 'eliminar'>(initialTab)

  // Individual form state
  const [busqueda, setBusqueda] = useState('')
  const [sugerencias, setSugerencias] = useState<Jugador[]>([])
  const [jugadorSel, setJugadorSel] = useState<Jugador | null>(null)
  const [bonoJugador, setBonoJugador] = useState<any | null>(null)
  const [tipoBono, setTipoBono] = useState<TipoBono | ''>('')
  const [categoria, setCategoria] = useState('')
  const [monto, setMonto] = useState('')
  const [usado, setUsado] = useState(false)
  const [respondio, setRespondio] = useState(false)
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [historial, setHistorial] = useState<Contacto[]>(historialInicial)
  const searchRef = useRef<HTMLInputElement>(null)

  // Multiple bonos state
  const [multiUsuarios, setMultiUsuarios] = useState('')
  const [multiTipo, setMultiTipo] = useState<TipoBono | ''>('')
  const [multiCategoria, setMultiCategoria] = useState('')
  const [multiMonto, setMultiMonto] = useState('')
  const [multiSaving, setMultiSaving] = useState(false)
  const [multiMsg, setMultiMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Importar CRM
  const [crmFile, setCrmFile] = useState<File | null>(null)
  const [crmPreview, setCrmPreview] = useState<{ jugador: string; tipo: string; numero: number }[]>([])
  const [crmSaving, setCrmSaving] = useState(false)
  const [crmMsg, setCrmMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Buscar jugadores
  const buscarJugadores = useCallback(async (query: string) => {
    if (query.length < 2) { setSugerencias([]); return }
    const { data } = await supabase
      .from('jugadores')
      .select('*')
      .ilike('jugador_original', `%${query}%`)
      .limit(8)
    setSugerencias(data || [])
  }, [supabase])

  useEffect(() => {
    const t = setTimeout(() => buscarJugadores(busqueda), 200)
    return () => clearTimeout(t)
  }, [busqueda, buscarJugadores])

  async function seleccionarJugador(j: Jugador) {
    setJugadorSel(j)
    setBusqueda(j.jugador_original)
    setSugerencias([])
    // Cargar bono actual
    const { data } = await supabase.from('registro_bonos').select('*').eq('jugador_norm', j.jugador_norm).single()
    setBonoJugador(data)
    if (data?.tipo_bono) setTipoBono(data.tipo_bono)
    if (data?.categoria_bono) setCategoria(data.categoria_bono)
  }

  function resetForm() {
    setBusqueda(''); setJugadorSel(null); setBonoJugador(null)
    setTipoBono(''); setCategoria(''); setMonto('')
    setUsado(false); setRespondio(false); setNotas('')
  }

  async function guardarBono() {
    if (!jugadorSel || !tipoBono) return
    setSaving(true); setMsg(null)
    try {
      const { error } = await supabase.rpc('registrar_bono', {
        p_jugador_norm:  jugadorSel.jugador_norm,
        p_jugador:       jugadorSel.jugador_original,
        p_tipo_bono:     tipoBono,
        p_categoria:     categoria || null,
        p_monto:         monto ? parseFloat(monto) : null,
        p_usado:         usado,
        p_respondio:     respondio,
        p_notas:         notas || null,
        p_cajero_id:     profile.id,
        p_cajero_nombre: profile.nombre,
      })
      if (error) throw error

      setMsg({ type: 'ok', text: `✓ Bono guardado para ${jugadorSel.jugador_original}` })
      // Recargar historial
      const { data: h } = await supabase.from('contactos')
        .select('*').eq('cajero_id', profile.id)
        .order('fecha', { ascending: false }).limit(50)
      setHistorial(h || [])
      setTimeout(() => { resetForm(); setMsg(null) }, 2000)
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || 'Error al guardar' })
    } finally {
      setSaving(false)
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
        p_cajero_id: profile.id, p_cajero_nombre: profile.nombre,
      })
      if (error) err++; else ok++
    }

    setMultiMsg({ type: ok > 0 ? 'ok' : 'err', text: `${ok} guardados · ${err} no encontrados` })
    if (ok > 0) { setMultiUsuarios(''); setMultiTipo(''); setMultiCategoria(''); setMultiMonto('') }
    setMultiSaving(false)
  }

  // CRM Import: parse CSV del CRM con regex PRINCI/WEBCHAT
  async function procesarCRM(file: File) {
    const text = await file.text()
    const lines = text.split('\n')
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    const colNombre = headers.findIndex(h => h === 'Nombre')
    const colSesiones = headers.findIndex(h => h === 'Sesiones')
    if (colNombre === -1 || colSesiones === -1) {
      setCrmMsg({ type: 'err', text: 'El CSV debe tener columnas "Nombre" y "Sesiones"' }); return
    }
    const pPrinci  = /\bPRINCI(?:PAL)?\s*(\d{1,4})\b/gi
    const pWebchat = /\bWEB\s*CHAT\s*(\d{1,4})\b|\bWEBCHAT(\d{1,4})\b/gi
    const rows: { jugador: string; tipo: string; numero: number }[] = []

    for (const line of lines.slice(1)) {
      if (!line.trim()) continue
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
      const nombre = cols[colNombre]
      const sesiones = cols[colSesiones] || ''
      if (!nombre) continue
      let m
      pPrinci.lastIndex = 0
      while ((m = pPrinci.exec(sesiones)) !== null) rows.push({ jugador: nombre, tipo: 'princi', numero: parseInt(m[1]) })
      pWebchat.lastIndex = 0
      while ((m = pWebchat.exec(sesiones)) !== null) rows.push({ jugador: nombre, tipo: 'webchat', numero: parseInt(m[1] || m[2]) })
    }
    setCrmPreview(rows)
    if (rows.length === 0) setCrmMsg({ type: 'err', text: 'No se detectaron PRINCI ni WEBCHAT en el archivo' })
    else setCrmMsg(null)
  }

  async function importarCRM() {
    if (!crmPreview.length) return
    setCrmSaving(true)
    let ok = 0, err = 0
    for (const r of crmPreview) {
      const norm = r.jugador.toLowerCase().replace(/[\s_]/g, '')
      const { error } = await supabase.from('asignaciones').upsert({
        jugador_norm: norm, jugador: r.jugador, tipo: r.tipo, numero: r.numero,
      }, { onConflict: 'jugador_norm' })
      if (error) err++; else ok++
    }
    setCrmMsg({ type: ok > 0 ? 'ok' : 'err', text: `${ok} asignaciones importadas · ${err} errores` })
    if (ok > 0) { setCrmPreview([]); setCrmFile(null) }
    setCrmSaving(false)
  }

  const TABS = [
    { id: 'individual', label: 'Bono Individual' },
    { id: 'multiple',   label: 'Bonos Múltiples' },
    { id: 'importar',   label: 'Importar CRM' },
    { id: 'historial',  label: `Historial` },
    { id: 'eliminar',   label: 'Eliminar Usuario' },
  ]

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Gestor Atenea</h1>
        <p style={{ color: '#52525b', fontSize: '13px', marginTop: '4px' }}>
          Registrá bonos y gestioná jugadores
        </p>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: '28px' }}>
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id as any)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Bono Individual ── */}
      {tab === 'individual' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '24px', alignItems: 'start' }}>
          {/* Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Buscar jugador */}
            <div className="card">
              <label style={{ fontSize: '12px', color: '#71717a', display: 'block', marginBottom: '6px' }}>
                Buscar usuario
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  ref={searchRef}
                  value={busqueda}
                  onChange={e => { setBusqueda(e.target.value); setJugadorSel(null) }}
                  placeholder="Nombre del jugador..."
                  autoComplete="off"
                />
                {sugerencias.length > 0 && !jugadorSel && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px',
                    marginTop: '4px', overflow: 'hidden',
                  }}>
                    {sugerencias.map(j => (
                      <div key={j.jugador_norm}
                        onClick={() => seleccionarJugador(j)}
                        style={{
                          padding: '10px 14px', cursor: 'pointer',
                          borderBottom: '1px solid #222', fontSize: '13px',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#222')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div>{j.jugador_original}</div>
                        <div className="mono" style={{ fontSize: '11px', color: '#52525b' }}>{j.jugador_norm}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tipo y Categoría */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#71717a', display: 'block', marginBottom: '6px' }}>Tipo de Bono</label>
                <select value={tipoBono} onChange={e => setTipoBono(e.target.value as TipoBono)}>
                  <option value="">Seleccionar...</option>
                  {TIPOS_BONO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#71717a', display: 'block', marginBottom: '6px' }}>Categoría de Bono</label>
                <select value={categoria} onChange={e => setCategoria(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {CATEGORIAS_BONO.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#71717a', display: 'block', marginBottom: '6px' }}>Monto a cargar (opcional)</label>
                <input type="number" value={monto} onChange={e => setMonto(e.target.value)} placeholder="Ej: 10000" min="0" />
              </div>
            </div>

            {/* Toggles */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Bono usado', val: usado, set: setUsado },
                { label: 'Respondió', val: respondio, set: setRespondio },
              ].map(({ label, val, set }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: '#a1a1aa' }}>{label}</span>
                  <button onClick={() => set(!val)} style={{
                    width: '42px', height: '22px', borderRadius: '11px', border: 'none',
                    background: val ? '#16a34a' : '#333', cursor: 'pointer',
                    position: 'relative', transition: 'background 0.2s',
                  }}>
                    <span style={{
                      position: 'absolute', top: '3px',
                      left: val ? '22px' : '3px',
                      width: '16px', height: '16px', borderRadius: '50%',
                      background: 'white', transition: 'left 0.2s',
                    }} />
                  </button>
                </div>
              ))}
              <div>
                <label style={{ fontSize: '12px', color: '#71717a', display: 'block', marginBottom: '6px' }}>Notas (opcional)</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)}
                  placeholder="Observaciones..." rows={2}
                  style={{ resize: 'vertical', minHeight: '60px' }} />
              </div>
            </div>

            {/* Mensaje */}
            {msg && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
                background: msg.type === 'ok' ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${msg.type === 'ok' ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}`,
                color: msg.type === 'ok' ? '#22c55e' : '#ef4444',
              }}>
                {msg.text}
              </div>
            )}

            <button className="btn btn-primary" onClick={guardarBono}
              disabled={!jugadorSel || !tipoBono || saving}
              style={{ fontSize: '14px', padding: '12px' }}>
              {saving ? <span className="spinner" /> : '◆'}
              {saving ? 'Guardando...' : 'Guardar Bono'}
            </button>
          </div>

          {/* Player card */}
          <div>
            {jugadorSel ? (
              <PlayerCard jugador={jugadorSel} bono={bonoJugador} />
            ) : (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '240px',
                background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px',
                color: '#2a2a2a',
              }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>◉</div>
                <div style={{ fontSize: '13px', color: '#52525b' }}>Buscá un usuario para ver su información</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Bonos Múltiples ── */}
      {tab === 'multiple' && (
        <div style={{ maxWidth: '560px' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#71717a', display: 'block', marginBottom: '6px' }}>
                Usuarios (uno por línea)
              </label>
              <textarea
                value={multiUsuarios}
                onChange={e => setMultiUsuarios(e.target.value)}
                placeholder={"usuario1\nusuario2\nusuario3"}
                rows={8}
                style={{ resize: 'vertical', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px' }}
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

            <button className="btn btn-primary" onClick={guardarBonosMultiples}
              disabled={!multiTipo || !multiUsuarios.trim() || multiSaving}>
              {multiSaving ? <span className="spinner" /> : '◆'}
              {multiSaving ? 'Guardando...' : 'Guardar para todos'}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: Importar CRM ── */}
      {tab === 'importar' && (
        <div style={{ maxWidth: '680px' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '13px', color: '#71717a', marginBottom: '14px', lineHeight: 1.6 }}>
                Subí el CSV exportado del CRM. Se detectan automáticamente los PRINCI y WEBCHAT
                de la columna <span className="mono" style={{ color: '#a1a1aa' }}>Sesiones</span>.
              </p>
              <label style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                border: '2px dashed #2a2a2a', borderRadius: '10px', padding: '32px',
                cursor: 'pointer', transition: 'border-color 0.15s', gap: '8px',
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#16a34a')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
              >
                <span style={{ fontSize: '24px' }}>⇄</span>
                <span style={{ fontSize: '14px', color: '#71717a' }}>
                  {crmFile ? crmFile.name : 'Subir CSV del CRM'}
                </span>
                <input type="file" accept=".csv" style={{ display: 'none' }}
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    setCrmFile(f); setCrmPreview([]); setCrmMsg(null)
                    procesarCRM(f)
                  }} />
              </label>
            </div>

            {crmMsg && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
                background: crmMsg.type === 'ok' ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${crmMsg.type === 'ok' ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}`,
                color: crmMsg.type === 'ok' ? '#22c55e' : '#ef4444',
              }}>
                {crmMsg.text}
              </div>
            )}

            {crmPreview.length > 0 && (
              <>
                <div style={{ fontSize: '13px', color: '#71717a' }}>
                  Vista previa — <strong style={{ color: '#f4f4f5' }}>{crmPreview.length}</strong> asignaciones detectadas
                </div>
                <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr><th>Jugador</th><th>Tipo</th><th>Número</th></tr>
                    </thead>
                    <tbody>
                      {crmPreview.slice(0, 50).map((r, i) => (
                        <tr key={i}>
                          <td>{r.jugador}</td>
                          <td><span className="badge" style={{ background: '#1e3a1e', color: '#22c55e' }}>{r.tipo.toUpperCase()}</span></td>
                          <td className="mono">{r.numero}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="btn btn-primary" onClick={importarCRM} disabled={crmSaving}>
                  {crmSaving ? <span className="spinner" /> : '⇄'}
                  {crmSaving ? 'Importando...' : `Importar ${crmPreview.length} asignaciones`}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Historial ── */}
      {tab === 'historial' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e1e1e' }}>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>Mis últimos {historial.length} registros</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Jugador</th>
                  <th>Tipo de Bono</th>
                  <th>Categoría</th>
                  <th>Monto</th>
                  <th>Usado</th>
                  <th>Respondió</th>
                </tr>
              </thead>
              <tbody>
                {historial.map(c => (
                  <tr key={c.id}>
                    <td className="mono" style={{ fontSize: '12px', color: '#71717a', whiteSpace: 'nowrap' }}>
                      {format(new Date(c.fecha), 'dd/MM HH:mm', { locale: es })}
                    </td>
                    <td style={{ fontWeight: '500' }}>{c.jugador}</td>
                    <td><BonoBadge tipo={c.tipo_bono} /></td>
                    <td className="mono" style={{ fontSize: '13px' }}>{c.categoria_bono || '—'}</td>
                    <td className="mono">{c.monto ? `$${Number(c.monto).toLocaleString()}` : '—'}</td>
                    <td>
                      <span style={{ color: c.usado ? '#22c55e' : '#52525b', fontSize: '12px' }}>
                        {c.usado ? '✓ Sí' : '✗ No'}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: c.respondio ? '#22c55e' : '#52525b', fontSize: '12px' }}>
                        {c.respondio ? '✓ Sí' : '✗ No'}
                      </span>
                    </td>
                  </tr>
                ))}
                {historial.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: '#52525b', padding: '40px' }}>
                    Sin registros aún
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: Eliminar Usuario ── */}
      {tab === 'eliminar' && profile.role === 'admin' && (
        <EliminarUsuario supabase={supabase} />
      )}
      {tab === 'eliminar' && profile.role !== 'admin' && (
        <div style={{ color: '#52525b', fontSize: '14px' }}>
          Solo los administradores pueden eliminar usuarios.
        </div>
      )}
    </div>
  )
}

export default function GestorClient(props: { profile: Profile; historialInicial: Contacto[] }) {
  return (
    <Suspense fallback={null}>
      <GestorInner {...props} />
    </Suspense>
  )
}

function EliminarUsuario({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const [query, setQuery] = useState('')
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [deleting, setDeleting] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  async function buscar() {
    if (query.length < 2) return
    const { data } = await supabase.from('jugadores').select('*').ilike('jugador_original', `%${query}%`).limit(10)
    setJugadores(data || [])
  }

  async function eliminar(j: Jugador) {
    if (!confirm(`¿Eliminar a ${j.jugador_original} y todos sus datos?`)) return
    setDeleting(j.jugador_norm); setMsg(null)
    const { error } = await supabase.from('jugadores').delete().eq('jugador_norm', j.jugador_norm)
    if (error) setMsg({ type: 'err', text: error.message })
    else {
      setMsg({ type: 'ok', text: `${j.jugador_original} eliminado correctamente` })
      setJugadores(prev => prev.filter(p => p.jugador_norm !== j.jugador_norm))
    }
    setDeleting(null)
  }

  return (
    <div style={{ maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="card" style={{ display: 'flex', gap: '10px' }}>
        <input value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && buscar()}
          placeholder="Buscar usuario a eliminar..." />
        <button className="btn btn-secondary" onClick={buscar} style={{ flexShrink: 0 }}>Buscar</button>
      </div>

      {msg && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
          background: msg.type === 'ok' ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${msg.type === 'ok' ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: msg.type === 'ok' ? '#22c55e' : '#ef4444',
        }}>{msg.text}</div>
      )}

      {jugadores.map(j => (
        <div key={j.jugador_norm} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px', background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px',
        }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '500' }}>{j.jugador_original}</div>
            <div className="mono" style={{ fontSize: '11px', color: '#52525b' }}>{j.jugador_norm}</div>
          </div>
          <button className="btn btn-danger" onClick={() => eliminar(j)}
            disabled={deleting === j.jugador_norm} style={{ fontSize: '12px', padding: '6px 12px' }}>
            {deleting === j.jugador_norm ? <span className="spinner" /> : 'Eliminar'}
          </button>
        </div>
      ))}
    </div>
  )
}
