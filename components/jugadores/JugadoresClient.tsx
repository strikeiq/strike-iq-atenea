'use client'

import { useState, useMemo } from 'react'
import { TIPOS_BONO, CATEGORIAS_BONO, type TipoBono } from '@/lib/types'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Download, ChevronUp, ChevronDown, X } from 'lucide-react'

function fmt(n: number) {
  if (!n) return '—'
  return `$${Math.round(n).toLocaleString()}`
}

function pct(n: number) {
  if (n == null) return '—'
  return `${Math.round(n)}%`
}

export default function JugadoresClient({ jugadores }: { jugadores: any[] }) {
  const [search, setSearch] = useState('')
  const [tipoBono, setTipoBono] = useState('')
  const [categoria, setCategoria] = useState('')
  const [princi, setPrinci] = useState('')
  const [ordenCol, setOrdenCol] = useState('ganancia_casino')
  const [ordenDir, setOrdenDir] = useState<'asc' | 'desc'>('desc')
  const [pagina, setPagina] = useState(0)
  const POR_PAG = 50

  const filtrados = useMemo(() => {
    let data = [...jugadores]

    if (search) {
      const q = search.toLowerCase()
      data = data.filter(j => (j.jugador || '').toLowerCase().includes(q))
    }
    if (tipoBono) data = data.filter(j => j.tipo_bono === tipoBono)
    if (categoria) data = data.filter(j => j.categoria_bono === categoria)
    if (princi) data = data.filter(j => (j.princi || '').includes(princi.toUpperCase()))

    data.sort((a, b) => {
      const va = a[ordenCol] ?? 0
      const vb = b[ordenCol] ?? 0
      return ordenDir === 'desc' ? (vb > va ? 1 : -1) : (va > vb ? 1 : -1)
    })

    return data
  }, [jugadores, search, tipoBono, categoria, princi, ordenCol, ordenDir])

  const pagData = filtrados.slice(pagina * POR_PAG, (pagina + 1) * POR_PAG)
  const totalPags = Math.ceil(filtrados.length / POR_PAG)

  function toggleOrden(col: string) {
    if (ordenCol === col) setOrdenDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setOrdenCol(col); setOrdenDir('desc') }
    setPagina(0)
  }

  function exportar() {
    const cols = ['jugador','primera_tx','ultima_tx','dias_sin_cargar','total_depositado','total_retirado','ganancia_casino','cantidad_cargas','wager_total','promedio_por_carga','pct_retiro','hl','remarketing','rango_horario','hora_mas_frecuente','dia_tipico_carga','racha_activa_dias','fin_racha_activa','solo_una_carga','tipo_bono','categoria_bono','princi','ejecutivo']
    const csv = [cols.join(','), ...filtrados.map(r => cols.map(c => `"${r[c] ?? ''}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `atenea_jugadores_${new Date().toISOString().split('T')[0]}.csv`; a.click()
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (ordenCol !== col) return null
    return ordenDir === 'desc'
      ? <ChevronDown className="inline w-3 h-3 ml-1" />
      : <ChevronUp className="inline w-3 h-3 ml-1" />
  }

  const colHeader = (label: string, col: string) => (
    <TableHead
      key={col}
      onClick={() => toggleOrden(col)}
      className="cursor-pointer select-none whitespace-nowrap text-[#71717a] hover:text-[#a1a1aa]"
    >
      {label}<SortIcon col={col} />
    </TableHead>
  )

  const hayFiltros = !!(search || tipoBono || categoria || princi)

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Jugadores</h1>
          <p style={{ color: '#52525b', fontSize: '13px', marginTop: '4px' }}>
            {filtrados.length} de {jugadores.length} jugadores
          </p>
        </div>
        <Button
          variant="outline"
          onClick={exportar}
          className="text-[13px] border-[#2a2a2a] bg-transparent text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#1a1a1a]"
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Exportar CSV
        </Button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <Input
          value={search}
          onChange={e => { setSearch(e.target.value); setPagina(0) }}
          placeholder="Buscar jugador..."
          className="max-w-[220px] bg-[#111] border-[#2a2a2a] text-[#f4f4f5] placeholder:text-[#52525b] focus-visible:ring-[#0f602f]"
        />

        <Select value={tipoBono || '__all__'} onValueChange={v => { setTipoBono(v === '__all__' ? '' : v); setPagina(0) }}>
          <SelectTrigger className="max-w-[180px] bg-[#111] border-[#2a2a2a] text-[#f4f4f5]">
            <SelectValue placeholder="Todos los tipos" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
            <SelectItem value="__all__" className="text-[#71717a]">Todos los tipos</SelectItem>
            {TIPOS_BONO.map(t => (
              <SelectItem key={t} value={t} className="text-[#f4f4f5]">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoria || '__all__'} onValueChange={v => { setCategoria(v === '__all__' ? '' : v); setPagina(0) }}>
          <SelectTrigger className="max-w-[130px] bg-[#111] border-[#2a2a2a] text-[#f4f4f5]">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
            <SelectItem value="__all__" className="text-[#71717a]">Categoría</SelectItem>
            {CATEGORIAS_BONO.map(c => (
              <SelectItem key={c} value={c} className="text-[#f4f4f5]">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          value={princi}
          onChange={e => { setPrinci(e.target.value); setPagina(0) }}
          placeholder="PRINCI / WEBCHAT"
          className="max-w-[160px] bg-[#111] border-[#2a2a2a] text-[#f4f4f5] placeholder:text-[#52525b] focus-visible:ring-[#0f602f]"
        />

        {hayFiltros && (
          <Button
            variant="outline"
            className="text-[12px] px-3 h-9 border-[#2a2a2a] bg-transparent text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#1a1a1a]"
            onClick={() => { setSearch(''); setTipoBono(''); setCategoria(''); setPrinci(''); setPagina(0) }}
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Tabla */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <Table>
            <TableHeader>
              <TableRow className="border-[#1e1e1e] hover:bg-transparent">
                {colHeader('Jugador', 'jugador')}
                {colHeader('Última carga', 'ultima_tx')}
                {colHeader('Días sin cargar', 'dias_sin_cargar')}
                {colHeader('Depositado', 'total_depositado')}
                {colHeader('Retirado', 'total_retirado')}
                {colHeader('Ganancia', 'ganancia_casino')}
                {colHeader('Cargas', 'cantidad_cargas')}
                {colHeader('Wager total', 'wager_total')}
                {colHeader('Prom. carga', 'promedio_por_carga')}
                {colHeader('% Retiro', 'pct_retiro')}
                {colHeader('HL', 'hl')}
                {colHeader('Remarketing', 'remarketing')}
                {colHeader('Rango horario', 'rango_horario')}
                {colHeader('Hora frecuente', 'hora_mas_frecuente')}
                {colHeader('Día típico', 'dia_tipico_carga')}
                {colHeader('Racha activa', 'racha_activa_dias')}
                {colHeader('Fin racha', 'fin_racha_activa')}
                <TableHead className="text-[#71717a]">Solo 1 carga</TableHead>
                <TableHead className="text-[#71717a]">Tipo bono</TableHead>
                <TableHead className="text-[#71717a]">Cat.</TableHead>
                <TableHead className="text-[#71717a]">PRINCI</TableHead>
                <TableHead className="text-[#71717a]">Ejecutivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagData.map((j: any) => (
                <TableRow key={j.jugador_norm} className="border-[#1e1e1e] hover:bg-[#1a1a1a]">
                  <TableCell style={{ fontWeight: '500' }}>{j.jugador}</TableCell>
                  <TableCell className="mono" style={{ fontSize: '12px', color: '#71717a' }}>
                    {j.ultima_tx ? format(new Date(j.ultima_tx + 'T00:00:00'), 'dd/MM/yy') : '—'}
                  </TableCell>
                  <TableCell className="mono" style={{
                    color: j.dias_sin_cargar > 30 ? '#ef4444' : j.dias_sin_cargar > 14 ? '#f59e0b' : '#22c55e'
                  }}>
                    {j.dias_sin_cargar ?? '—'}
                  </TableCell>
                  <TableCell className="mono">{fmt(j.total_depositado)}</TableCell>
                  <TableCell className="mono">{fmt(j.total_retirado)}</TableCell>
                  <TableCell className="mono" style={{ color: (j.ganancia_casino || 0) >= 0 ? '#22c55e' : '#ef4444', fontWeight: '600' }}>
                    {fmt(j.ganancia_casino)}
                  </TableCell>
                  <TableCell className="mono">{j.cantidad_cargas ?? 0}</TableCell>
                  <TableCell className="mono">{fmt(j.wager_total)}</TableCell>
                  <TableCell className="mono">{fmt(j.promedio_por_carga)}</TableCell>
                  <TableCell className="mono">{pct(j.pct_retiro)}</TableCell>
                  <TableCell className="mono" style={{ fontSize: '12px' }}>{j.hl || '—'}</TableCell>
                  <TableCell className="mono" style={{ fontSize: '12px' }}>{j.remarketing || '—'}</TableCell>
                  <TableCell className="mono" style={{ fontSize: '12px' }}>{j.rango_horario || '—'}</TableCell>
                  <TableCell className="mono" style={{ fontSize: '12px' }}>{j.hora_mas_frecuente ?? '—'}</TableCell>
                  <TableCell className="mono" style={{ fontSize: '12px' }}>{j.dia_tipico_carga || '—'}</TableCell>
                  <TableCell className="mono">{j.racha_activa_dias ?? '—'}</TableCell>
                  <TableCell className="mono" style={{ fontSize: '12px', color: '#71717a' }}>
                    {j.fin_racha_activa ? format(new Date(j.fin_racha_activa + 'T00:00:00'), 'dd/MM/yy') : '—'}
                  </TableCell>
                  <TableCell className="mono" style={{ fontSize: '12px' }}>{j.solo_una_carga ? 'Sí' : 'No'}</TableCell>
                  <TableCell>
                    {j.tipo_bono ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-[#1a2e1a] text-[#22c55e] border-[#22c55e33]"
                      >
                        {j.tipo_bono}
                      </Badge>
                    ) : <span style={{ color: '#52525b', fontSize: '12px' }}>—</span>}
                  </TableCell>
                  <TableCell className="mono" style={{ fontSize: '12px' }}>{j.categoria_bono || '—'}</TableCell>
                  <TableCell className="mono" style={{ fontSize: '12px', color: '#71717a' }}>{j.princi || '—'}</TableCell>
                  <TableCell className="mono" style={{ fontSize: '12px', color: '#71717a' }}>{j.ejecutivo || '—'}</TableCell>
                </TableRow>
              ))}
              {pagData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={23} style={{ textAlign: 'center', color: '#52525b', padding: '48px' }}>
                    No hay jugadores que coincidan con los filtros
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginación */}
        {totalPags > 1 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', borderTop: '1px solid #1e1e1e',
          }}>
            <span style={{ fontSize: '12px', color: '#52525b' }}>
              Pág. {pagina + 1} de {totalPags} · {filtrados.length} resultados
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <Button
                variant="outline"
                onClick={() => setPagina(p => Math.max(0, p - 1))}
                disabled={pagina === 0}
                className="text-[12px] px-3 h-8 border-[#2a2a2a] bg-transparent text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#1a1a1a]"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                onClick={() => setPagina(p => Math.min(totalPags - 1, p + 1))}
                disabled={pagina === totalPags - 1}
                className="text-[12px] px-3 h-8 border-[#2a2a2a] bg-transparent text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#1a1a1a]"
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
