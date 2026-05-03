# Strike IQ — Atenea

Panel de gestión de jugadores para casino Atenea.
**Stack:** Next.js 15 · Supabase · Vercel

---

## Setup en 4 pasos

### 1. Crear proyecto en Supabase
1. Ir a [supabase.com](https://supabase.com) → New project
2. En el **SQL Editor**, pegar y ejecutar todo el contenido de `schema.sql`
3. Copiar `Project URL` y `anon public key` desde **Settings → API**

### 2. Crear usuarios en Supabase Auth
1. Ir a **Authentication → Users → Invite user**
2. Al crear un admin, agregar en `user_metadata`:
   ```json
   { "role": "admin", "nombre": "Tu Nombre" }
   ```
3. Para cajeros:
   ```json
   { "role": "cajero", "nombre": "Nombre Cajero" }
   ```

### 3. Deploy en Vercel
```bash
# Clonar e instalar
git init && git add . && git commit -m "init"
# Subir a GitHub, luego importar en vercel.com

# Variables de entorno en Vercel:
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 4. Primer uso
1. Subir el primer reporte .xlsx en **Cargar reporte**
2. Importar CSV del CRM en **Importar CRM** (desde el Gestor, tab "Importar CRM")
3. Los cajeros ya pueden registrar bonos en **Gestor Bonos**

---

## Estructura del proyecto

```
├── app/
│   ├── login/           → Pantalla de login
│   └── (app)/
│       ├── dashboard/   → Stats generales (solo admin)
│       ├── gestor/      → Registro de bonos (todos)
│       ├── jugadores/   → Tabla completa de jugadores
│       ├── reportes/    → Carga de archivos .xlsx
│       └── importar/    → Importar asignaciones CRM
├── components/
│   ├── gestor/          → GestorClient (el corazón de la app)
│   ├── dashboard/       → DashboardClient con charts
│   ├── jugadores/       → Tabla filtrable + exportación
│   ├── reportes/        → Upload drag & drop
│   └── layout/          → Sidebar
├── lib/
│   ├── supabase/        → Client (browser) + Server
│   └── types.ts         → Tipos TypeScript
├── schema.sql           → Schema completo de Supabase
└── middleware.ts        → Protección de rutas + roles
```

## Roles

| Rol | Acceso |
|-----|--------|
| `admin` | Dashboard · Gestor · Jugadores · Reportes · Importar CRM |
| `cajero` | Solo Gestor (Bono Individual · Múltiple · Historial) |

## Flujo de trabajo

### Carga de reportes (admin, cada 2-3 días)
1. Exportar .xlsx desde el casino Atenea
2. Ir a **Cargar reporte** → arrastrar archivo
3. Verificar la vista previa → **Subir**
4. La tabla `jugadores` se actualiza automáticamente

### Importar asignaciones CRM (admin)
1. Exportar CSV del CRM con columnas `Nombre` y `Sesiones`
2. Gestor → **Importar CRM** → subir CSV
3. El sistema detecta PRINCI 1/2/3 y WEBCHAT 1/2/3 automáticamente

### Registro de bonos (cajeros diariamente)
1. Gestor → **Bono Individual**
2. Buscar jugador → seleccionar tipo y categoría
3. **Guardar Bono** → se actualiza `registro_bonos` y `contactos`

## Agregar un nuevo casino (futuro)
La arquitectura está preparada. Solo hay que:
1. Agregar columna `casino` en `transacciones` y `jugadores` (ya existe en el schema, filtrada a 'Atenea')
2. Crear nueva vista `resumen_{casino}` en Supabase
3. Agregar selector de casino en la UI
