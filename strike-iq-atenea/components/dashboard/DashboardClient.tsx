'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function StatCard({ label, value, sub, color = '#22c55e' }: {
  label: string; value: string; sub?: string; color?: string
}) {
  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: color,
      }} />
      <div style={{ fontSize: '12px', color: '#71717a', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: '26px', fontWeight: '600', color: '#f4f4f5' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '12px', color: '#52525b', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

const TOOLTIP_STYLE = {
  backgroundColor: '#1a1a1a',
  border: '1px solid #2a2a2a',
  borderRadius: '8px',
  color: '#f4f4f5',
  fontSize: '12px',
}

export default function DashboardClient({ stats, topJugadores, actividad7d }: {
  stats: Record<string, number>
  topJugadores: any[]
  actividad7d: any[]
}) {
  // Agrupar actividad por día
  const chartData = useMemo(() => {
    const byDay: Record<string, { depositar: number; retirar: number }> = {}
    actividad7d.forEach((r: any) => {
      const day = r.fecha
      if (!byDay[day]) byDay[day] = { depositar: 0, retirar: 0 }
      if (r.operacion === 'in')  byDay[day].depositar += Number(r.depositar || 0)
      if (r.operacion === 'out') byDay[day].retirar   += Number(r.retirar || 0)
    })
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, vals]) => ({
        fecha: format(parseISO(fecha), 'EEE d', { locale: es }),
        Depósitos: Math.round(vals.depositar),
        Retiros: Math.round(vals.retirar),
      }))
  }, [actividad7d])

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#f4f4f5' }}>Dashboard</h1>
        <p style={{ color: '#52525b', fontSize: '13px', marginTop: '4px' }}>
          Atenea · últimos 30 días
        </p>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '28px' }}>
        <StatCard label="Jugadores totales" value={stats.totalJugadores.toLocaleString()} />
        <StatCard label="Activos 30d" value={stats.jugadoresActivos30d.toLocaleString()} sub="jugadores" />
        <StatCard label="Total depositado" value={fmt(stats.totalDepositado)} color="#3b82f6" />
        <StatCard label="Total retirado" value={fmt(stats.totalRetirado)} color="#f59e0b" />
        <StatCard label="Ganancia casino" value={fmt(stats.gananciaCasino)}
          color={stats.gananciaCasino >= 0 ? '#22c55e' : '#ef4444'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
        {/* Chart */}
        <div className="card">
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '20px' }}>
            Actividad últimos 7 días
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                <Tooltip contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, '']} />
                <Bar dataKey="Depósitos" fill="#16a34a" radius={[3,3,0,0]} />
                <Bar dataKey="Retiros"   fill="#374151" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b', fontSize: 13 }}>
              Sin datos en los últimos 7 días
            </div>
          )}
        </div>

        {/* Top jugadores */}
        <div className="card">
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
            Top jugadores
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topJugadores.slice(0, 8).map((j: any, i: number) => {
              const maxGanancia = topJugadores[0]?.ganancia_casino || 1
              const pct = Math.max(0, (j.ganancia_casino / maxGanancia) * 100)
              return (
                <div key={j.jugador_original}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#a1a1aa' }}>
                      <span className="mono" style={{ color: '#52525b', marginRight: '8px' }}>{String(i+1).padStart(2,'0')}</span>
                      {j.jugador_original}
                    </span>
                    <span className="mono" style={{ fontSize: '12px', color: '#22c55e' }}>
                      {fmt(j.ganancia_casino)}
                    </span>
                  </div>
                  <div style={{ height: '2px', background: '#1e1e1e', borderRadius: '1px' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: '#16a34a', borderRadius: '1px', transition: 'width 0.5s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
