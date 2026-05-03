export type Role = 'admin' | 'cajero'

export interface Profile {
  id: string
  email: string
  nombre: string
  role: Role
  created_at: string
}

export type TipoBono =
  | 'RECURRENTES'
  | 'EXCLUSIVOS'
  | 'STRIKE VIP'
  | 'NUEVOS'
  | 'RECURRENTES VIPS'
  | 'POTENCIALES VIP'
  | 'INACTIVO'
  | 'MIGRADO'

export const TIPOS_BONO: TipoBono[] = [
  'RECURRENTES', 'EXCLUSIVOS', 'STRIKE VIP', 'NUEVOS',
  'RECURRENTES VIPS', 'POTENCIALES VIP', 'INACTIVO', 'MIGRADO',
]

export const CATEGORIAS_BONO = [
  'A','B','C','D','E','F','G','H','I','J','K','L','M','N',
  'a','b','Ñ','O','P',
]

export interface Jugador {
  jugador_norm: string
  jugador_original: string
  primera_tx: string
  ultima_tx: string
  total_depositado: number
  total_retirado: number
  ganancia_casino: number
  cantidad_cargas: number
  dias_activo: number
  updated_at: string
}

export interface RegistroBono {
  id: string
  jugador_norm: string
  jugador: string
  tipo_bono: TipoBono | null
  categoria_bono: string | null
  bonos_ofrecidos: number
  bonos_usados: number
  pct_conversion: number
  monto_total: number
  respondio: boolean
  fecha_ult_contacto: string | null
  updated_at: string
}

export interface Contacto {
  id: string
  jugador_norm: string
  jugador: string
  tipo_bono: TipoBono | null
  categoria_bono: string | null
  usado: boolean
  monto: number | null
  respondio: boolean
  notas: string | null
  cajero_id: string
  cajero_nombre: string
  fecha: string
  created_at: string
}

export interface Asignacion {
  id: string
  jugador_norm: string
  jugador: string
  tipo: 'princi' | 'webchat'
  numero: number
  ejecutivo: string | null
  updated_at: string
}

export interface ResumenJugador {
  jugador_norm: string
  jugador: string
  primera_tx: string
  ultima_tx: string
  dias_sin_cargar: number
  total_depositado: number
  total_retirado: number
  ganancia_casino: number
  cantidad_cargas: number
  dias_activo: number
  tipo_bono: TipoBono | null
  categoria_bono: string | null
  bonos_ofrecidos: number
  bonos_usados: number
  pct_conversion: number
  monto_bonos: number
  respondio: boolean
  fecha_ult_contacto: string | null
  princi: string | null
  ejecutivo: string | null
}

export interface DashboardStats {
  total_jugadores: number
  jugadores_activos_7d: number
  jugadores_activos_30d: number
  total_depositado: number
  total_retirado: number
  ganancia_total: number
  cargas_hoy: number
  avg_deposito: number
}
