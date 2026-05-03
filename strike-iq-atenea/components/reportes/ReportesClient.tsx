'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

// Normalización igual que Supabase
function normalizarJugador(nombre: string) {
  return (nombre || '').toLowerCase().replace(/[\s_]/g, '')
}

// Convierte "2.000,00" o "2,000.00" → 2000
function parseMonto(valor: any): number {
  const s = String(valor).trim()
  if (!s || s === '') return 0
  const tieneAmbos = s.includes(',') && s.includes('.')
  if (tieneAmbos) {
    const esLat = s.lastIndexOf(',') > s.lastIndexOf('.')
    return parseFloat(esLat ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, ''))
  }
  if (s.includes(',')) return parseFloat(s.replace(',', '.'))
  return parseFloat(s) || 0
}

export default function ReportesClient({ lotesRecientes }: { lotesRecientes: any[] }) {
  const supabase = createClient()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const [stats, setStats] = useState<{ total: number; ins: number; outs: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [progress, setProgress] = useState(0)
  const [isDrag, setIsDrag] = useState(false)

  const processFile = useCallback(async (f: File) => {
    setFile(f); setMsg(null); setPreview([]); setStats(null)
    try {
      setLoading(true)
      const { read, utils } = await import('xlsx')
      const buf = await f.arrayBuffer()
      const wb = read(buf)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[] = utils.sheet_to_json(ws, { defval: '' })

      const processed = rows.map(r => ({
        tx_id:        r['ID']         ? parseInt(String(r['ID'])) : null,
        operacion:    String(r['operación'] || r['operacion'] || '').toLowerCase() === 'in' ? 'in' : 'out',
        depositar:    parseMonto(r['Depositar']),
        retirar:      parseMonto(r['Retirar']),
        wager:        parseMonto(r['Wager']),
        balance_antes: parseMonto(r['Balance antes de operación']),
        fecha:        r['Fecha'] ? new Date(r['Fecha']).toISOString().split('T')[0] : null,
        hora:         r['Tiempo'] ? String(r['Tiempo']) : null,
        iniciador:    String(r['Iniciador'] || ''),
        plataforma:   String(r['Del usuario'] || ''),
        jugador:      String(r['Al usuario'] || ''),
        ip:           String(r['IP'] || ''),
      })).filter(r => r.jugador && r.fecha)

      setPreview(processed.slice(0, 5))
      setStats({
        total: processed.length,
        ins: processed.filter(r => r.operacion === 'in').length,
        outs: processed.filter(r => r.operacion === 'out').length,
      })
    } catch (e: any) {
      setMsg({ type: 'err', text: `Error al leer el archivo: ${e.message}` })
    } finally {
      setLoading(false)
    }
  }, [])

  async function uploadFile() {
    if (!file) return
    setLoading(true); setMsg(null); setProgress(0)

    try {
      const { read, utils } = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = read(buf)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[] = utils.sheet_to_json(ws, { defval: '' })

      const lote_id = crypto.randomUUID()
      const processed = rows.map(r => ({
        tx_id:        r['ID']         ? parseInt(String(r['ID'])) : null,
        operacion:    String(r['operación'] || r['operacion'] || '').toLowerCase() === 'in' ? 'in' : 'out',
        depositar:    parseMonto(r['Depositar']),
        retirar:      parseMonto(r['Retirar']),
        wager:        parseMonto(r['Wager']),
        balance_antes: parseMonto(r['Balance antes de operación']),
        fecha:        r['Fecha'] ? new Date(r['Fecha']).toISOString().split('T')[0] : null,
        hora:         r['Tiempo'] ? String(r['Tiempo']) : null,
        iniciador:    String(r['Iniciador'] || ''),
        plataforma:   String(r['Del usuario'] || ''),
        jugador:      String(r['Al usuario'] || ''),
        ip:           String(r['IP'] || ''),
        lote_id,
      })).filter(r => r.jugador && r.fecha)

      // Subir en chunks de 500
      const CHUNK = 500
      for (let i = 0; i < processed.length; i += CHUNK) {
        const chunk = processed.slice(i, i + CHUNK)
        const { error } = await supabase.from('transacciones').upsert(chunk, {
          onConflict: 'tx_id', ignoreDuplicates: true,
        })
        if (error) throw error
        setProgress(Math.round(((i + chunk.length) / processed.length) * 90))
      }

      // Refrescar jugadores
      await supabase.rpc('refresh_jugadores')
      setProgress(100)
      setMsg({ type: 'ok', text: `✓ ${processed.length} transacciones cargadas correctamente` })
      setFile(null); setPreview([]); setStats(null)
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setLoading(false); setTimeout(() => setProgress(0), 2000)
    }
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Cargar reporte</h1>
        <p style={{ color: '#52525b', fontSize: '13px', marginTop: '4px' }}>
          Subí el archivo .xlsx exportado desde Atenea
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Upload zone */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            onDragOver={e => { e.preventDefault(); setIsDrag(true) }}
            onDragLeave={() => setIsDrag(false)}
            onDrop={e => { e.preventDefault(); setIsDrag(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }}
            style={{
              border: `2px dashed ${isDrag ? '#16a34a' : file ? '#16a34a44' : '#2a2a2a'}`,
              borderRadius: '12px', padding: '48px 24px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
              cursor: 'pointer', transition: 'all 0.15s',
              background: isDrag ? 'rgba(22,163,74,0.05)' : 'transparent',
              position: 'relative',
            }}
          >
            <div style={{ fontSize: '32px' }}>↑</div>
            <div style={{ fontSize: '14px', color: '#a1a1aa', textAlign: 'center' }}>
              {file ? (
                <>
                  <div style={{ color: '#22c55e', fontWeight: '500' }}>{file.name}</div>
                  <div style={{ fontSize: '12px', color: '#71717a', marginTop: '4px' }}>
                    {(file.size / 1024).toFixed(0)} KB
                  </div>
                </>
              ) : (
                <>
                  <div>Arrastrá el .xlsx aquí</div>
                  <div style={{ fontSize: '12px', color: '#52525b', marginTop: '4px' }}>o hacé clic para seleccionar</div>
                </>
              )}
            </div>
            <input type="file" accept=".xlsx,.xls" style={{
              position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer'
            }} onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
          </div>

          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
              {[
                { label: 'Total filas', value: stats.total.toLocaleString() },
                { label: 'Cargas (in)', value: stats.ins.toLocaleString(), color: '#22c55e' },
                { label: 'Retiros (out)', value: stats.outs.toLocaleString(), color: '#f59e0b' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                  <div className="mono" style={{ fontSize: '20px', fontWeight: '600', color: color || '#f4f4f5' }}>{value}</div>
                  <div style={{ fontSize: '11px', color: '#52525b', marginTop: '2px' }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          {progress > 0 && progress < 100 && (
            <div style={{ background: '#1a1a1a', borderRadius: '6px', height: '6px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#16a34a', width: `${progress}%`, transition: 'width 0.3s', borderRadius: '6px' }} />
            </div>
          )}

          {msg && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
              background: msg.type === 'ok' ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${msg.type === 'ok' ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: msg.type === 'ok' ? '#22c55e' : '#ef4444',
            }}>{msg.text}</div>
          )}

          <button className="btn btn-primary" onClick={uploadFile}
            disabled={!stats || loading}
            style={{ fontSize: '14px', padding: '12px' }}>
            {loading ? <span className="spinner" /> : '↑'}
            {loading ? `Subiendo... ${progress}%` : `Subir ${stats?.total?.toLocaleString() ?? ''} transacciones`}
          </button>

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', color: '#52525b', marginBottom: '8px' }}>Vista previa (primeras 5 filas)</div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ fontSize: '12px' }}>
                  <thead>
                    <tr><th>Op</th><th>Jugador</th><th>Depositar</th><th>Fecha</th></tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i}>
                        <td><span style={{ color: r.operacion === 'in' ? '#22c55e' : '#f59e0b', fontSize: '11px', fontWeight: '600' }}>{r.operacion.toUpperCase()}</span></td>
                        <td>{r.jugador}</td>
                        <td className="mono">{r.operacion === 'in' ? `$${r.depositar.toLocaleString()}` : `$${r.retirar.toLocaleString()}`}</td>
                        <td className="mono">{r.fecha}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Historial de cargas */}
        <div className="card">
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
            Últimas cargas
          </div>
          {lotesRecientes.length === 0 ? (
            <div style={{ color: '#52525b', fontSize: '13px', textAlign: 'center', padding: '32px 0' }}>
              No hay cargas aún
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {lotesRecientes.map(l => (
                <div key={l.lote_id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', background: '#1a1a1a', borderRadius: '8px',
                }}>
                  <div>
                    <div className="mono" style={{ fontSize: '12px', color: '#a1a1aa' }}>
                      {l.fecha_min} → {l.fecha_max}
                    </div>
                    <div style={{ fontSize: '11px', color: '#52525b', marginTop: '2px' }}>
                      {format(new Date(l.created_at), 'dd/MM/yyyy HH:mm')}
                    </div>
                  </div>
                  <span className="badge mono" style={{ background: '#1e3a1e', color: '#22c55e' }}>
                    {l.count.toLocaleString()} tx
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
