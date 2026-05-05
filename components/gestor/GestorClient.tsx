'use client'

import { useState, useCallback, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TIPOS_BONO, CATEGORIAS_BONO, type TipoBono, type Contacto, type Profile, type Jugador } from '@/lib/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { BorderGradientButton } from '@/components/border-gradient'
import {
  Loader2,
  Sparkles,
  CircleDot,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeftRight,
  Trash2,
  Search,
} from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────────
function badgeColor(tipo: string | null) {
  const colors: Record<string, string> = {
    'RECURRENTES': '#0f602f', 'EXCLUSIVOS': '#2563eb', 'STRIKE VIP': '#7c3aed',
    'NUEVOS': '#0891b2', 'RECURRENTES VIPS': '#059669', 'POTENCIALES VIP': '#d97706',
    'INACTIVO': '#52525b', 'MIGRADO': '#9333ea',
  }
  return colors[tipo ?? ''] || '#52525b'
}

// ── Sub-components ───────────────────────────────────────────────
function BonoBadge({ tipo }: { tipo: string | null }) {
  if (!tipo) return <span style={{ color: '#52525b', fontSize: '12px' }}>—</span>
  const color = badgeColor(tipo)
  return (
    <Badge
      variant="outline"
      style={{ background: color + '22', color, border: `1px solid ${color}44` }}
      className="text-[11px]"
    >
      {tipo}
    </Badge>
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

      setMsg({ type: 'ok', text: `Bono guardado para ${jugadorSel.jugador_original}` })
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

  // CRM Import: parse CSV del CRM — detecta PRINCI/Principal, WEBCHAT (Etiquetas), Soporte Atenea
  async function procesarCRM(file: File) {
    const text = await file.text()

    // Parser simple respetando campos entre comillas con saltos de línea internos
    function parseCsvLine(line: string): string[] {
      const result: string[] = []
      let cur = '', inQ = false
      for (let i = 0; i < line.length; i++) {
        const c = line[i]
        if (c === '"') { inQ = !inQ }
        else if (c === ',' && !inQ) { result.push(cur.trim()); cur = '' }
        else { cur += c }
      }
      result.push(cur.trim())
      return result
    }

    // Juntar líneas partidas por campos multi-línea
    const rawLines: string[] = []
    let buf = ''
    let quotes = 0
    for (const ch of text) {
      if (ch === '"') quotes++
      if (ch === '\n' && quotes % 2 === 0) { rawLines.push(buf); buf = ''; quotes = 0 }
      else buf += ch
    }
    if (buf) rawLines.push(buf)

    const headers = parseCsvLine(rawLines[0]).map(h => h.replace(/^"|"$/g, ''))
    const colNombre    = headers.findIndex(h => h === 'Nombre')
    const colSesiones  = headers.findIndex(h => h === 'Sesiones')
    const colEtiquetas = headers.findIndex(h => h === 'Etiquetas')

    if (colNombre === -1 || colSesiones === -1) {
      setCrmMsg({ type: 'err', text: 'El CSV debe tener columnas "Nombre" y "Sesiones"' }); return
    }

    const pPrinci  = /\b(?:PRINCI(?:PAL)?)\s*(\d{1,4})\b/gi
    const pWebchat = /\bWEBCHAT\b/i
    const pSoporte = /\bSOPORTE\s+ATENEA\b/i

    // prioridad: 1=webchat, 2=soporte_atenea sesión, 3=princi, 4=soporte_atenea etiqueta
    const rows: { jugador: string; tipo: string; numero: number; p: number }[] = []

    for (const line of rawLines.slice(1)) {
      if (!line.trim()) continue
      const cols = parseCsvLine(line)
      const nombreRaw = (cols[colNombre] || '').replace(/^"|"$/g, '').trim()
      const nombres   = [...new Set(nombreRaw.split(/[\r\n\s]+/).filter(Boolean))]
      const sesiones  = (cols[colSesiones]  || '').replace(/^"|"$/g, '').trim()
      const etiquetas = colEtiquetas >= 0 ? (cols[colEtiquetas] || '').replace(/^"|"$/g, '').trim() : ''
      if (!nombres.length) continue

      for (const nombre of nombres) {
        // WEBCHAT (de Etiquetas) — prioridad 1
        if (pWebchat.test(etiquetas)) {
          rows.push({ jugador: nombre, tipo: 'webchat', numero: 1, p: 1 })
        }

        // Soporte Atenea de Sesiones — prioridad 2
        if (pSoporte.test(sesiones)) {
          rows.push({ jugador: nombre, tipo: 'soporte_atenea', numero: 1, p: 2 })
        }

        // PRINCI de Sesiones — prioridad 3
        let m
        pPrinci.lastIndex = 0
        while ((m = pPrinci.exec(sesiones)) !== null) {
          rows.push({ jugador: nombre, tipo: 'princi', numero: parseInt(m[1]), p: 3 })
        }

        // Soporte Atenea de Etiquetas — prioridad 4 (más baja)
        if (pSoporte.test(etiquetas)) {
          rows.push({ jugador: nombre, tipo: 'soporte_atenea', numero: 1, p: 4 })
        }
      }
    }

    // Deduplicar: un registro por jugador_norm. Gana el de menor p (mayor prioridad).
    const seen = new Map<string, { jugador: string; tipo: string; numero: number; p: number }>()
    for (const r of rows) {
      const key = r.jugador.toLowerCase().replace(/[\s_]/g, '')
      const existing = seen.get(key)
      if (!existing || r.p < existing.p) seen.set(key, r)
    }
    const deduped = Array.from(seen.values()).map(({ p: _, ...r }) => r)

    setCrmPreview(deduped)
    if (deduped.length === 0) setCrmMsg({ type: 'err', text: 'No se detectaron sesiones en el archivo' })
    else setCrmMsg(null)
  }

  async function importarCRM() {
    if (!crmPreview.length) return
    setCrmSaving(true)

    const records = crmPreview.map(r => ({
      jugador_norm: r.jugador.toLowerCase().replace(/[\s_]/g, ''),
      jugador: r.jugador,
      tipo: r.tipo,
      numero: r.numero,
    }))

    const BATCH = 500
    let ok = 0, err = 0
    const errMsgs: string[] = []

    for (let i = 0; i < records.length; i += BATCH) {
      const { error } = await supabase.from('asignaciones')
        .upsert(records.slice(i, i + BATCH), { onConflict: 'jugador_norm' })
      if (error) {
        err += Math.min(BATCH, records.length - i)
        if (!errMsgs.includes(error.message)) errMsgs.push(error.message)
      } else {
        ok += Math.min(BATCH, records.length - i)
      }
    }

    const errDetail = errMsgs.length ? ` — ${errMsgs[0]}` : ''
    setCrmMsg({ type: ok > 0 ? 'ok' : 'err', text: `${ok} asignaciones importadas · ${err} errores${errDetail}` })
    if (ok > 0) { setCrmPreview([]); setCrmFile(null) }
    setCrmSaving(false)
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Gestor Atenea</h1>
        <p style={{ color: '#52525b', fontSize: '13px', marginTop: '4px' }}>
          Registrá bonos y gestioná jugadores
        </p>
      </div>

      <Tabs value={tab} onValueChange={v => setTab(v as any)} className="w-full">
        <TabsList className="bg-[#111] border border-[#1e1e1e] mb-7 flex-wrap h-auto gap-0.5 p-1">
          <TabsTrigger value="individual" className="data-[state=active]:bg-[#1a1a1a] data-[state=active]:text-[#22c55e] text-[#71717a] text-[13px]">
            Bono Individual
          </TabsTrigger>
          <TabsTrigger value="multiple" className="data-[state=active]:bg-[#1a1a1a] data-[state=active]:text-[#22c55e] text-[#71717a] text-[13px]">
            Bonos Múltiples
          </TabsTrigger>
          <TabsTrigger value="importar" className="data-[state=active]:bg-[#1a1a1a] data-[state=active]:text-[#22c55e] text-[#71717a] text-[13px]">
            Importar CRM
          </TabsTrigger>
          <TabsTrigger value="historial" className="data-[state=active]:bg-[#1a1a1a] data-[state=active]:text-[#22c55e] text-[#71717a] text-[13px]">
            Historial
          </TabsTrigger>
          <TabsTrigger value="eliminar" className="data-[state=active]:bg-[#1a1a1a] data-[state=active]:text-[#22c55e] text-[#71717a] text-[13px]">
            Eliminar Usuario
          </TabsTrigger>
        </TabsList>

        {/* ── TAB: Bono Individual ── */}
        <TabsContent value="individual">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '24px', alignItems: 'start' }}>
            {/* Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Buscar jugador */}
              <div className="card">
                <Label className="text-[12px] text-[#71717a] mb-1.5 block">
                  Buscar usuario
                </Label>
                <div style={{ position: 'relative' }}>
                  <Input
                    ref={searchRef}
                    value={busqueda}
                    onChange={e => { setBusqueda(e.target.value); setJugadorSel(null) }}
                    placeholder="Nombre del jugador..."
                    autoComplete="off"
                    className="bg-[#111] border-[#2a2a2a] text-[#f4f4f5] placeholder:text-[#52525b] focus-visible:ring-[#0f602f]"
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

              {/* Toggles */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-[#a1a1aa]">Bono usado</Label>
                  <Switch checked={usado} onCheckedChange={setUsado} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-[#a1a1aa]">Respondió</Label>
                  <Switch checked={respondio} onCheckedChange={setRespondio} />
                </div>
                <div>
                  <Label className="text-[12px] text-[#71717a] mb-1.5 block">Notas (opcional)</Label>
                  <Textarea
                    value={notas}
                    onChange={e => setNotas(e.target.value)}
                    placeholder="Observaciones..."
                    rows={2}
                    className="bg-[#111] border-[#2a2a2a] text-[#f4f4f5] placeholder:text-[#52525b] resize-y min-h-[60px] focus-visible:ring-[#0f602f]"
                  />
                </div>
              </div>

              {/* Mensaje */}
              {msg && (
                <div style={{
                  padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
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

              <BorderGradientButton
                onClick={guardarBono}
                disabled={!jugadorSel || !tipoBono || saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#111] text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 className="animate-spin w-4 h-4" />}
                {saving ? 'Guardando...' : 'Guardar Bono'}
              </BorderGradientButton>
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
                  <CircleDot style={{ width: '40px', height: '40px', marginBottom: '12px', opacity: 0.3 }} />
                  <div style={{ fontSize: '13px', color: '#52525b' }}>Buscá un usuario para ver su información</div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── TAB: Bonos Múltiples ── */}
        <TabsContent value="multiple">
          <div style={{ maxWidth: '560px' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <Label className="text-[12px] text-[#71717a] mb-1.5 block">
                  Usuarios (uno por línea)
                </Label>
                <Textarea
                  value={multiUsuarios}
                  onChange={e => setMultiUsuarios(e.target.value)}
                  placeholder={"usuario1\nusuario2\nusuario3"}
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
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#111] text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {multiSaving && <Loader2 className="animate-spin w-4 h-4" />}
                {multiSaving ? 'Guardando...' : 'Guardar para todos'}
              </BorderGradientButton>
            </div>
          </div>
        </TabsContent>

        {/* ── TAB: Importar CRM ── */}
        <TabsContent value="importar">
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
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#0f602f')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
                >
                  <ArrowLeftRight style={{ width: '24px', height: '24px', color: '#52525b' }} />
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
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  {crmMsg.type === 'ok'
                    ? <CheckCircle className="w-4 h-4 shrink-0" />
                    : <AlertCircle className="w-4 h-4 shrink-0" />
                  }
                  {crmMsg.text}
                </div>
              )}

              {crmPreview.length > 0 && (
                <>
                  <div style={{ fontSize: '13px', color: '#71717a' }}>
                    Vista previa — <strong style={{ color: '#f4f4f5' }}>{crmPreview.length}</strong> asignaciones detectadas
                  </div>
                  <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[#1e1e1e]">
                          <TableHead className="text-[#71717a]">Jugador</TableHead>
                          <TableHead className="text-[#71717a]">Tipo</TableHead>
                          <TableHead className="text-[#71717a]">Número</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {crmPreview.slice(0, 50).map((r, i) => {
                          const badgeStyle =
                            r.tipo === 'princi'         ? { background: '#1e3a1e', color: '#22c55e', border: '1px solid #22c55e33' } :
                            r.tipo === 'webchat'        ? { background: '#1e2a3a', color: '#60a5fa', border: '1px solid #60a5fa33' } :
                            r.tipo === 'soporte_atenea' ? { background: '#2a1e3a', color: '#c084fc', border: '1px solid #c084fc33' } :
                            { background: '#2a2a1e', color: '#fbbf24', border: '1px solid #fbbf2433' }
                          const label =
                            r.tipo === 'princi'         ? `PRINCI ${r.numero}` :
                            r.tipo === 'webchat'        ? 'WEBCHAT' :
                            r.tipo === 'soporte_atenea' ? 'SOPORTE ATENEA' : r.tipo.toUpperCase()
                          return (
                            <TableRow key={i} className="border-[#1e1e1e] hover:bg-[#1a1a1a]">
                              <TableCell>{r.jugador}</TableCell>
                              <TableCell>
                                <Badge variant="outline" style={badgeStyle} className="text-[11px]">
                                  {label}
                                </Badge>
                              </TableCell>
                              <TableCell className="mono">{r.tipo === 'princi' ? r.numero : '—'}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <BorderGradientButton
                    onClick={importarCRM}
                    disabled={crmSaving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#111] text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {crmSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <ArrowLeftRight className="w-4 h-4" />}
                    {crmSaving ? 'Importando...' : `Importar ${crmPreview.length} asignaciones`}
                  </BorderGradientButton>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── TAB: Historial ── */}
        <TabsContent value="historial">
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e1e1e' }}>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>Mis últimos {historial.length} registros</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <Table>
                <TableHeader>
                  <TableRow className="border-[#1e1e1e] hover:bg-transparent">
                    <TableHead className="text-[#71717a]">Fecha</TableHead>
                    <TableHead className="text-[#71717a]">Jugador</TableHead>
                    <TableHead className="text-[#71717a]">Tipo de Bono</TableHead>
                    <TableHead className="text-[#71717a]">Categoría</TableHead>
                    <TableHead className="text-[#71717a]">Monto</TableHead>
                    <TableHead className="text-[#71717a]">Usado</TableHead>
                    <TableHead className="text-[#71717a]">Respondió</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historial.map(c => (
                    <TableRow key={c.id} className="border-[#1e1e1e] hover:bg-[#1a1a1a]">
                      <TableCell className="mono" style={{ fontSize: '12px', color: '#71717a', whiteSpace: 'nowrap' }}>
                        {format(new Date(c.fecha), 'dd/MM HH:mm', { locale: es })}
                      </TableCell>
                      <TableCell style={{ fontWeight: '500' }}>{c.jugador}</TableCell>
                      <TableCell><BonoBadge tipo={c.tipo_bono} /></TableCell>
                      <TableCell className="mono" style={{ fontSize: '13px' }}>{c.categoria_bono || '—'}</TableCell>
                      <TableCell className="mono">{c.monto ? `$${Number(c.monto).toLocaleString()}` : '—'}</TableCell>
                      <TableCell>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: c.usado ? '#22c55e' : '#52525b' }}>
                          {c.usado
                            ? <CheckCircle className="w-3.5 h-3.5" />
                            : <XCircle className="w-3.5 h-3.5" />
                          }
                          {c.usado ? 'Sí' : 'No'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: c.respondio ? '#22c55e' : '#52525b' }}>
                          {c.respondio
                            ? <CheckCircle className="w-3.5 h-3.5" />
                            : <XCircle className="w-3.5 h-3.5" />
                          }
                          {c.respondio ? 'Sí' : 'No'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {historial.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} style={{ textAlign: 'center', color: '#52525b', padding: '40px' }}>
                        Sin registros aún
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* ── TAB: Eliminar Usuario ── */}
        <TabsContent value="eliminar">
          {profile.role === 'admin' ? (
            <EliminarUsuario supabase={supabase} />
          ) : (
            <div style={{ color: '#52525b', fontSize: '14px' }}>
              Solo los administradores pueden eliminar usuarios.
            </div>
          )}
        </TabsContent>
      </Tabs>
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
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && buscar()}
          placeholder="Buscar usuario a eliminar..."
          className="bg-[#111] border-[#2a2a2a] text-[#f4f4f5] placeholder:text-[#52525b] focus-visible:ring-[#0f602f]"
        />
        <Button
          variant="outline"
          onClick={buscar}
          className="shrink-0 border-[#2a2a2a] bg-transparent text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#1a1a1a]"
        >
          <Search className="w-4 h-4 mr-1.5" />
          Buscar
        </Button>
      </div>

      {msg && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
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

      {jugadores.map(j => (
        <div key={j.jugador_norm} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px', background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px',
        }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '500' }}>{j.jugador_original}</div>
            <div className="mono" style={{ fontSize: '11px', color: '#52525b' }}>{j.jugador_norm}</div>
          </div>
          <Button
            variant="destructive"
            onClick={() => eliminar(j)}
            disabled={deleting === j.jugador_norm}
            className="text-[12px] h-8 px-3"
          >
            {deleting === j.jugador_norm
              ? <Loader2 className="animate-spin w-3.5 h-3.5 mr-1.5" />
              : <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            }
            Eliminar
          </Button>
        </div>
      ))}
    </div>
  )
}
