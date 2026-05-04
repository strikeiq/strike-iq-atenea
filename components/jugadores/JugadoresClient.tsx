'use client'

import { useState, useMemo } from 'react'
import { TIPOS_BONO, CATEGORIAS_BONO, type TipoBono } from '@/lib/types'
import { format } from 'date-fns'

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

  const colHeader = (label: string, col: string) => (
    <th key={col} onClick={() => toggleOrden(col)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
      {label} {ordenCol === col ? (ordenDir === 'desc' ? '↓' : '↑') : ''}
    </th>
  )

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Jugadores</h1>
          <p style={{ color: '#52525b', fontSize: '13px', marginTop: '4px' }}>
            {filtrados.length} de {jugadores.length} jugadores
          </p>
        </div>
        <button className="btn btn-secondary" onClick={exportar} style={{ fontSize: '13px' }}>
          ↓ Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPagina(0) }}
          placeholder="Buscar jugador..." style={{ maxWidth: '220px' }} />
        <select value={tipoBono} onChange={e => { setTipoBono(e.target.value); setPagina(0) }} style={{ maxWidth: '180px' }}>
          <option value="">Todos los tipos</option>
          {TIPOS_BONO.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={categoria} onChange={e => { setCategoria(e.target.value); setPagina(0) }} style={{ maxWidth: '130px' }}>
          <option value="">Categoría</option>
          {CATEGORIAS_BONO.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={princi} onChange={e => { setPrinci(e.target.value); setPagina(0) }}
          placeholder="PRINCI / WEBCHAT" style={{ maxWidth: '160px' }} />
        {(search || tipoBono || categoria || princi) && (
          <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '7px 12px' }}
            onClick={() => { setSearch(''); setTipoBono(''); setCategoria(''); setPrinci(''); setPagina(0) }}>
            Limpiar
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
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
                <th>Solo 1 carga</th>
                <th>Tipo bono</th>
                <th>Cat.</th>
                <th>PRINCI</th>
                <th>Ejecutivo</th>
              </tr>
            </thead>
            <tbody>
              {pagData.map((j: any) => (
                <tr key={j.jugador_norm}>
                  <td style={{ fontWeight: '500' }}>{j.jugador}</td>
                  <td className="mono" style={{ fontSize: '12px', color: '#71717a' }}>
                    {j.ultima_tx ? format(new Date(j.ultima_tx + 'T00:00:00'), 'dd/MM/yy') : '—'}
                  </td>
                  <td className="mono" style={{
                    color: j.dias_sin_cargar > 30 ? '#ef4444' : j.dias_sin_cargar > 14 ? '#f59e0b' : '#22c55e'
                  }}>
                    {j.dias_sin_cargar ?? '—'}
                  </td>
                  <td className="mono">{fmt(j.total_depositado)}</td>
                  <td className="mono">{fmt(j.total_retirado)}</td>
                  <td className="mono" style={{ color: (j.ganancia_casino || 0) >= 0 ? '#22c55e' : '#ef4444', fontWeight: '600' }}>
                    {fmt(j.ganancia_casino)}
                  </td>
                  <td className="mono">{j.cantidad_cargas ?? 0}</td>
                  <td className="mono">{fmt(j.wager_total)}</td>
                  <td className="mono">{fmt(j.promedio_por_carga)}</td>
                  <td className="mono">{pct(j.pct_retiro)}</td>
                  <td className="mono" style={{ fontSize: '12px' }}>{j.hl || '—'}</td>
                  <td className="mono" style={{ fontSize: '12px' }}>{j.remarketing || '—'}</td>
                  <td className="mono" style={{ fontSize: '12px' }}>{j.rango_horario || '—'}</td>
                  <td className="mono" style={{ fontSize: '12px' }}>{j.hora_mas_frecuente ?? '—'}</td>
                  <td className="mono" style={{ fontSize: '12px' }}>{j.dia_tipico_carga || '—'}</td>
                  <td className="mono">{j.racha_activa_dias ?? '—'}</td>
                  <td className="mono" style={{ fontSize: '12px', color: '#71717a' }}>
                    {j.fin_racha_activa ? format(new Date(j.fin_racha_activa + 'T00:00:00'), 'dd/MM/yy') : '—'}
                  </td>
                  <td className="mono" style={{ fontSize: '12px' }}>{j.solo_una_carga ? 'Sí' : 'No'}</td>
                  <td>
                    {j.tipo_bono ? (
                      <span className="badge" style={{ fontSize: '10px', background: '#1a2e1a', color: '#22c55e' }}>
                        {j.tipo_bono}
                      </span>
                    ) : <span style={{ color: '#52525b', fontSize: '12px' }}>—</span>}
                  </td>
                  <td className="mono" style={{ fontSize: '12px' }}>{j.categoria_bono || '—'}</td>
                  <td className="mono" style={{ fontSize: '12px', color: '#71717a' }}>{j.princi || '—'}</td>
                  <td className="mono" style={{ fontSize: '12px', color: '#71717a' }}>{j.ejecutivo || '—'}</td>
                </tr>
              ))}
              {pagData.length === 0 && (
                <tr><td colSpan={23} style={{ textAlign: 'center', color: '#52525b', padding: '48px' }}>
                  No hay jugadores que coincidan con los filtros
                </td></tr>
              )}
            </tbody>
          </table>
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
              <button className="btn btn-secondary" onClick={() => setPagina(p => Math.max(0, p - 1))}
                disabled={pagina === 0} style={{ padding: '6px 12px', fontSize: '12px' }}>← Anterior</button>
              <button className="btn btn-secondary" onClick={() => setPagina(p => Math.min(totalPags - 1, p + 1))}
                disabled={pagina === totalPags - 1} style={{ padding: '6px 12px', fontSize: '12px' }}>Siguiente →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
