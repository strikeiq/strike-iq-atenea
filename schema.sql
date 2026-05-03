-- ================================================================
-- STRIKE IQ — Atenea  |  Schema Supabase
-- Ejecutar completo en el SQL Editor de Supabase
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ----------------------------------------------------------------
-- FUNCIÓN: normalizar nombre (misma lógica que Python)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION normalizar_jugador(nombre TEXT)
RETURNS TEXT LANGUAGE SQL IMMUTABLE AS $$
  SELECT LOWER(TRIM(REGEXP_REPLACE(COALESCE(nombre,''), '[\s_]', '', 'g')))
$$;

-- ================================================================
-- TABLA: profiles  (roles de usuario - admin | cajero)
-- ================================================================
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email      TEXT,
  nombre     TEXT,
  role       TEXT NOT NULL DEFAULT 'cajero' CHECK (role IN ('admin','cajero')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, nombre, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email,'@',1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'cajero')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ================================================================
-- TABLA: transacciones  (archivos .xlsx del casino)
-- ================================================================
CREATE TABLE transacciones (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tx_id         BIGINT,
  operacion     TEXT CHECK (operacion IN ('in', 'out')),
  depositar     NUMERIC(15,2) DEFAULT 0,
  retirar       NUMERIC(15,2) DEFAULT 0,
  wager         NUMERIC(15,2) DEFAULT 0,
  balance_antes NUMERIC(15,2) DEFAULT 0,
  fecha         DATE NOT NULL,
  hora          TIME,
  iniciador     TEXT,
  plataforma    TEXT,
  jugador       TEXT,
  jugador_norm  TEXT GENERATED ALWAYS AS (normalizar_jugador(jugador)) STORED,
  ip            TEXT,
  lote_id       UUID,                        -- identifica cada carga de archivo
  created_at    TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (tx_id)                             -- evita duplicados entre cargas
);

CREATE INDEX idx_tx_fecha         ON transacciones (fecha);
CREATE INDEX idx_tx_jugador_norm  ON transacciones (jugador_norm);
CREATE INDEX idx_tx_operacion     ON transacciones (operacion);
CREATE INDEX idx_tx_jugador_fecha ON transacciones (jugador_norm, fecha);
-- Búsqueda fuzzy por nombre
CREATE INDEX idx_tx_jugador_trgm  ON transacciones USING gin(jugador gin_trgm_ops);

-- ================================================================
-- TABLA: jugadores  (perfil agregado por jugador — se refresca)
-- ================================================================
CREATE TABLE jugadores (
  jugador_norm      TEXT PRIMARY KEY,
  jugador_original  TEXT,
  primera_tx        DATE,
  ultima_tx         DATE,
  total_depositado  NUMERIC(15,2) DEFAULT 0,
  total_retirado    NUMERIC(15,2) DEFAULT 0,
  ganancia_casino   NUMERIC(15,2) GENERATED ALWAYS AS (total_depositado - total_retirado) STORED,
  cantidad_cargas   INTEGER DEFAULT 0,
  dias_activo       INTEGER DEFAULT 0,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jugadores_ganancia  ON jugadores (ganancia_casino DESC);
CREATE INDEX idx_jugadores_ultima_tx ON jugadores (ultima_tx DESC);
CREATE INDEX idx_jugadores_trgm      ON jugadores USING gin(jugador_original gin_trgm_ops);

-- Función de refresco
CREATE OR REPLACE FUNCTION refresh_jugadores()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO jugadores (
    jugador_norm, jugador_original,
    primera_tx, ultima_tx,
    total_depositado, total_retirado,
    cantidad_cargas, dias_activo
  )
  SELECT
    jugador_norm,
    MAX(jugador)                                                AS jugador_original,
    MIN(fecha)                                                  AS primera_tx,
    MAX(fecha)                                                  AS ultima_tx,
    SUM(CASE WHEN operacion='in'  THEN depositar ELSE 0 END)    AS total_depositado,
    SUM(CASE WHEN operacion='out' THEN retirar   ELSE 0 END)    AS total_retirado,
    COUNT(CASE WHEN operacion='in' THEN 1 END)::INTEGER         AS cantidad_cargas,
    COUNT(DISTINCT CASE WHEN operacion='in' THEN fecha END)::INTEGER AS dias_activo
  FROM transacciones
  WHERE jugador_norm IS NOT NULL AND jugador_norm <> ''
  GROUP BY jugador_norm
  ON CONFLICT (jugador_norm) DO UPDATE SET
    jugador_original  = EXCLUDED.jugador_original,
    primera_tx        = EXCLUDED.primera_tx,
    ultima_tx         = EXCLUDED.ultima_tx,
    total_depositado  = EXCLUDED.total_depositado,
    total_retirado    = EXCLUDED.total_retirado,
    cantidad_cargas   = EXCLUDED.cantidad_cargas,
    dias_activo       = EXCLUDED.dias_activo,
    updated_at        = NOW();
END;
$$;

-- ================================================================
-- TABLA: asignaciones  (PRINCI / WEBCHAT — reemplaza Sheets)
-- ================================================================
CREATE TABLE asignaciones (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  jugador_norm  TEXT NOT NULL REFERENCES jugadores(jugador_norm) ON DELETE CASCADE,
  jugador       TEXT,
  tipo          TEXT NOT NULL CHECK (tipo IN ('princi','webchat')),
  numero        INTEGER NOT NULL,
  ejecutivo     TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (jugador_norm)
);

CREATE INDEX idx_asign_tipo_numero ON asignaciones (tipo, numero);

-- ================================================================
-- TABLA: registro_bonos  (estado actual del bono por jugador)
-- ================================================================
CREATE TABLE registro_bonos (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  jugador_norm        TEXT NOT NULL REFERENCES jugadores(jugador_norm) ON DELETE CASCADE,
  jugador             TEXT,
  tipo_bono           TEXT CHECK (tipo_bono IN (
                        'RECURRENTES','EXCLUSIVOS','STRIKE VIP','NUEVOS',
                        'RECURRENTES VIPS','POTENCIALES VIP','INACTIVO','MIGRADO'
                      )),
  categoria_bono      TEXT,               -- A,B,C...P,a,b,Ñ
  bonos_ofrecidos     INTEGER DEFAULT 0,
  bonos_usados        INTEGER DEFAULT 0,
  pct_conversion      NUMERIC(5,1) GENERATED ALWAYS AS (
    CASE WHEN bonos_ofrecidos > 0
    THEN ROUND((bonos_usados::NUMERIC / bonos_ofrecidos) * 100, 1)
    ELSE 0 END
  ) STORED,
  monto_total         NUMERIC(15,2) DEFAULT 0,
  respondio           BOOLEAN DEFAULT FALSE,
  fecha_ult_contacto  TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (jugador_norm)
);

CREATE INDEX idx_rb_tipo_bono    ON registro_bonos (tipo_bono);
CREATE INDEX idx_rb_categoria    ON registro_bonos (categoria_bono);

-- ================================================================
-- TABLA: contactos  (historial de cada interacción individual)
-- ================================================================
CREATE TABLE contactos (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  jugador_norm  TEXT NOT NULL,
  jugador       TEXT,
  tipo_bono     TEXT,
  categoria_bono TEXT,
  usado         BOOLEAN DEFAULT FALSE,
  monto         NUMERIC(15,2),
  respondio     BOOLEAN DEFAULT FALSE,
  notas         TEXT,
  cajero_id     UUID REFERENCES profiles(id),
  cajero_nombre TEXT,
  fecha         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contactos_jugador_norm ON contactos (jugador_norm);
CREATE INDEX idx_contactos_fecha        ON contactos (fecha DESC);
CREATE INDEX idx_contactos_cajero       ON contactos (cajero_id);

-- ================================================================
-- FUNCIÓN: registrar_bono()
-- Cuando un cajero guarda un bono:
--  1. Inserta en contactos
--  2. Upsert en registro_bonos (actualiza contadores)
-- ================================================================
CREATE OR REPLACE FUNCTION registrar_bono(
  p_jugador_norm  TEXT,
  p_jugador       TEXT,
  p_tipo_bono     TEXT,
  p_categoria     TEXT,
  p_monto         NUMERIC,
  p_usado         BOOLEAN,
  p_respondio     BOOLEAN,
  p_notas         TEXT,
  p_cajero_id     UUID,
  p_cajero_nombre TEXT
)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_id UUID;
BEGIN
  -- 1. Insertar contacto
  INSERT INTO contactos (
    jugador_norm, jugador, tipo_bono, categoria_bono,
    monto, usado, respondio, notas, cajero_id, cajero_nombre
  ) VALUES (
    p_jugador_norm, p_jugador, p_tipo_bono, p_categoria,
    p_monto, p_usado, p_respondio, p_notas, p_cajero_id, p_cajero_nombre
  ) RETURNING id INTO v_id;

  -- 2. Upsert registro_bonos
  INSERT INTO registro_bonos (
    jugador_norm, jugador, tipo_bono, categoria_bono,
    bonos_ofrecidos, bonos_usados, monto_total,
    respondio, fecha_ult_contacto
  ) VALUES (
    p_jugador_norm, p_jugador, p_tipo_bono, p_categoria,
    1, CASE WHEN p_usado THEN 1 ELSE 0 END,
    COALESCE(p_monto, 0),
    p_respondio, NOW()
  )
  ON CONFLICT (jugador_norm) DO UPDATE SET
    tipo_bono          = EXCLUDED.tipo_bono,
    categoria_bono     = EXCLUDED.categoria_bono,
    bonos_ofrecidos    = registro_bonos.bonos_ofrecidos + 1,
    bonos_usados       = registro_bonos.bonos_usados + CASE WHEN p_usado THEN 1 ELSE 0 END,
    monto_total        = registro_bonos.monto_total + COALESCE(p_monto, 0),
    respondio          = p_respondio,
    fecha_ult_contacto = NOW(),
    updated_at         = NOW();

  RETURN v_id;
END;
$$;

-- ================================================================
-- VISTA: resumen_atenea
-- Una sola query devuelve todo — sin joins en la app
-- ================================================================
CREATE OR REPLACE VIEW resumen_atenea AS
SELECT
  j.jugador_norm,
  j.jugador_original                          AS jugador,
  j.primera_tx,
  j.ultima_tx,
  (CURRENT_DATE - j.ultima_tx)::INTEGER       AS dias_sin_cargar,
  j.total_depositado,
  j.total_retirado,
  j.ganancia_casino,
  j.cantidad_cargas,
  j.dias_activo,
  -- Bono
  rb.tipo_bono,
  rb.categoria_bono,
  rb.bonos_ofrecidos,
  rb.bonos_usados,
  rb.pct_conversion,
  rb.monto_total                              AS monto_bonos,
  rb.respondio,
  rb.fecha_ult_contacto,
  -- Asignación
  UPPER(a.tipo) || ' ' || a.numero            AS princi,
  a.ejecutivo
FROM jugadores j
LEFT JOIN registro_bonos rb ON rb.jugador_norm = j.jugador_norm
LEFT JOIN asignaciones a    ON a.jugador_norm  = j.jugador_norm;

-- ================================================================
-- FUNCIÓN: resumen_dinamico(desde, hasta)
-- Para filtrar por rango de fechas
-- ================================================================
CREATE OR REPLACE FUNCTION resumen_dinamico(
  p_desde DATE DEFAULT '2020-01-01',
  p_hasta DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  jugador_norm       TEXT,
  jugador            TEXT,
  primera_tx         DATE,
  ultima_tx          DATE,
  dias_sin_cargar    INTEGER,
  total_depositado   NUMERIC,
  total_retirado     NUMERIC,
  ganancia_casino    NUMERIC,
  cantidad_cargas    BIGINT,
  dias_activo        BIGINT,
  tipo_bono          TEXT,
  categoria_bono     TEXT,
  bonos_ofrecidos    INTEGER,
  bonos_usados       INTEGER,
  pct_conversion     NUMERIC,
  monto_bonos        NUMERIC,
  respondio          BOOLEAN,
  fecha_ult_contacto TIMESTAMPTZ,
  princi             TEXT,
  ejecutivo          TEXT
) LANGUAGE SQL STABLE AS $$
  SELECT
    j.jugador_norm,
    j.jugador_original,
    j.primera_tx,
    j.ultima_tx,
    (CURRENT_DATE - j.ultima_tx)::INTEGER,
    SUM(CASE WHEN t.operacion='in'  THEN t.depositar ELSE 0 END),
    SUM(CASE WHEN t.operacion='out' THEN t.retirar   ELSE 0 END),
    SUM(CASE WHEN t.operacion='in'  THEN t.depositar ELSE 0 END) -
    SUM(CASE WHEN t.operacion='out' THEN t.retirar   ELSE 0 END),
    COUNT(CASE WHEN t.operacion='in' THEN 1 END),
    COUNT(DISTINCT CASE WHEN t.operacion='in' THEN t.fecha END),
    rb.tipo_bono,
    rb.categoria_bono,
    rb.bonos_ofrecidos,
    rb.bonos_usados,
    rb.pct_conversion,
    rb.monto_total,
    rb.respondio,
    rb.fecha_ult_contacto,
    UPPER(a.tipo) || ' ' || a.numero,
    a.ejecutivo
  FROM jugadores j
  LEFT JOIN transacciones t  ON t.jugador_norm = j.jugador_norm
                             AND t.fecha BETWEEN p_desde AND p_hasta
  LEFT JOIN registro_bonos rb ON rb.jugador_norm = j.jugador_norm
  LEFT JOIN asignaciones a    ON a.jugador_norm  = j.jugador_norm
  WHERE j.ultima_tx BETWEEN p_desde AND p_hasta
  GROUP BY j.jugador_norm, j.jugador_original, j.primera_tx, j.ultima_tx,
           rb.tipo_bono, rb.categoria_bono, rb.bonos_ofrecidos, rb.bonos_usados,
           rb.pct_conversion, rb.monto_total, rb.respondio, rb.fecha_ult_contacto,
           a.tipo, a.numero, a.ejecutivo
$$;

-- ================================================================
-- STAGING: para cargas masivas de transacciones
-- ================================================================
CREATE TABLE transacciones_stage (LIKE transacciones INCLUDING DEFAULTS);
ALTER TABLE transacciones_stage DROP COLUMN IF EXISTS jugador_norm;

CREATE OR REPLACE FUNCTION merge_transacciones_stage()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO transacciones (
    tx_id, operacion, depositar, retirar, wager,
    balance_antes, fecha, hora, iniciador, plataforma, jugador, ip, lote_id
  )
  SELECT
    tx_id, operacion, depositar, retirar, wager,
    balance_antes, fecha, hora, iniciador, plataforma, jugador, ip, lote_id
  FROM transacciones_stage
  ON CONFLICT (tx_id) DO NOTHING;

  TRUNCATE transacciones_stage;
  PERFORM refresh_jugadores();
END;
$$;

-- ================================================================
-- RLS (Row Level Security)
-- ================================================================
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones  ENABLE ROW LEVEL SECURITY;
ALTER TABLE jugadores      ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignaciones   ENABLE ROW LEVEL SECURITY;
ALTER TABLE registro_bonos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contactos      ENABLE ROW LEVEL SECURITY;

-- Perfiles: cada uno ve el suyo; admin ve todos
CREATE POLICY "profiles_self"  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_admin" ON profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Transacciones/Jugadores: todos los autenticados pueden leer
CREATE POLICY "tx_read"  ON transacciones  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "jug_read" ON jugadores      FOR SELECT USING (auth.role() = 'authenticated');

-- Admin escribe en todo
CREATE POLICY "tx_admin"  ON transacciones  FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "jug_admin" ON jugadores      FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "asign_admin" ON asignaciones FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- registro_bonos / contactos: todos pueden leer; cajero solo escribe sus propios
CREATE POLICY "rb_read"  ON registro_bonos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "rb_write" ON registro_bonos FOR INSERT USING (auth.role() = 'authenticated');
CREATE POLICY "rb_update" ON registro_bonos FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "cont_read"  ON contactos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "cont_write" ON contactos FOR INSERT USING (auth.uid() = cajero_id);
