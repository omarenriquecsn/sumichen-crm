# AGENTS.md — Contexto del proyecto (Sumichem CRM)

Este archivo documenta la arquitectura, convenciones y estado del repositorio para que cualquier agente/desarrollador pueda retomar el trabajo rápidamente. **Léelo completo antes de editar código.**

## 1. Qué es esta aplicación

CRM de ventas para **Sumichem** (distribuidora de químicos). Permite gestionar:

- **Clientes** y su ciclo de venta (etapas: inicial → calificado → propuesta → negociación → cerrado).
- **Oportunidades** en un Pipeline con drag & drop.
- **Reuniones** (con calendario y enlaces de Google Calendar).
- **Tickets** de soporte.
- **Pedidos** (con subtotal/impuestos/total, moneda USD/BS, tipo de pago contado/crédito, transporte, evidencia en PDF adjunta).
- **Metas** de ventas por vendedor.
- **Notificaciones** in-app + Pushover (nuevo pedido).
- **Registro de usuarios**: sección `/registro-usuarios` exclusiva del admin principal (Omar Contreras) para crear nuevos vendedores o administradores (backend + frontend gated).
- **Analítica**, **Descargas** (export XLSX) y **Panel admin**.
- **Productos**: carga masiva vía Excel y visualización desde Supabase Storage.
- **Marketing / Leads** (Fase 1): captura de leads desde Instagram (botón de acción → WhatsApp Business) y formulario web, zonas con vendedores asignados, asignación automática por zona, SLA 12h tras la asignación con reasignación automática, conversaciones/chat por lead con polling, dashboard de marketing (ver sección "Feature — Marketing / Leads").

Roles: `admin` y `vendedor`.

## 2. Estructura del repositorio (monorepo de 2 apps)

```
project-bolt-sb1-2tl6dqp7 - copia/
├── AGENTS.md               ← este archivo
├── project/                ← FRONTEND React + Vite + TypeScript
│   ├── src/
│   │   ├── App.tsx         ← Router (HashRouter) + QueryClient + rutas por rol
│   │   ├── main.tsx        ← entry point
│   │   ├── lib/supabase.ts ← cliente Supabase (auth + storage)
│   │   ├── context/        ← AuthProvider (sesión Supabase)
│   │   ├── hooks/          ← TODOS los datos (React Query) — ver §3.1
│   │   ├── pages/          ← páginas por módulo
│   │   ├── components/     ← layout, ui (Tailwind), forms
│   │   ├── constants/      ← etapas del pipeline, clasificación de cambios
│   │   ├── types/index.ts  ← interfaces y enums del dominio
│   │   └── utils/          ← helpers de cálculo/formateo por módulo
│   ├── supabase/migrations/← SQL canónico del schema (RLS, triggers, secuencias)
│   ├── dist/               ← build de producción (puede estar desactualizado)
│   ├── .env                ← VITE_BACKEND_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
│   └── package.json
└── backend/                ← BACKEND Express 5 + TypeORM + Postgres
    ├── src/
    │   ├── index.ts        ← bootstrap (DataSource + listen :3000)
    │   ├── server.ts       ← app Express (CORS, morgan, rutas, swagger, /health)
    │   ├── config/         ← dataBaseConfig.ts (TypeORM) y supabaseConfig.ts
    │   ├── controllers/    ← 18 controladores (12 módulos + zonas/leads/conversaciones + transporte)
    │   ├── routes/         ← 18 routers montados en routes/indexRoutes.ts
    │   ├── services/       ← 19 servicios (lógica de negocio)
    │   ├── repositories/   ← 17 repositorios (capa de datos TypeORM)
    │   ├── entities/       ← 18 entidades TypeORM (11 legacy + 6 marketing + transporte)
    │   ├── enums/          ← 15 enums
    │   ├── middlewares/    ← jwtHandler, errorHandler, asyncHandler, validarHMACMeta
    │   ├── dtos/           ← validación con class-validator
    │   ├── utils/          ← whatsapp/twilio, pushover, PDF, exports XLSX
    │   ├── worker/clean.ts ← cron de limpieza de evidencias (proceso separado)
    │   ├── worker/slaMonitor.ts ← cron de SLA de leads (arranca en index.ts)
    │   └── api/usuarios/[id].ts ← stub serverless Vercel (sin uso)
    ├── build/              ← salida de tsc (lo que corre en producción)
    ├── uploads/evidencias/ ← PDFs de evidencia de pedidos (ruta real en VPS)
    ├── exports/            ← XLSX generados
    ├── .env                ← TODAS las credenciales (ver §6.1 ⚠)
    └── package.json
```

## 3. Patrones y convenciones de código

### 3.1 Frontend: acceso a datos

- **No hay instancia central de axios ni interceptor.** Se usa `fetch()` inline con `import.meta.env.VITE_BACKEND_URL` y header `Authorization: Bearer ${session?.access_token}` (sesión obtenida de `useAuth()`). También hay un uso puntual de `axios` en `useNotificaciones.ts`.
- Todo el server-state va por **TanStack React Query v5** con un solo `QueryClient` en `App.tsx`.
- **Un solo hook agregador**: `src/hooks/useApi.ts` (~1000 líneas) contiene todas las queries/mutations. Sus sub-hooks aceptan un `vendedorId` **opcional**:
  - Sin argumento (modo vendedor): alcance = id del usuario autenticado (`currentUser.id`).
  - Con argumento (modo admin, ej. `VendedorPanel`): acota los datos al vendedor indicado.
  - `useSupabase.ts` y `useAdmin.ts` son **alias** de `useApi` (backward-compat, no editar la lógica ahí).
  - Al crear registros con `cliente_id`, el `vendedor_id` se resuelve: vendedorId explícito (admin) > dueño del cliente > usuario logueado (helper `resolverVendedorId`).
  - Patrón de mutación: `useMutation` + `onSuccess: () => queryClient.invalidateQueries({ queryKey: [...] })` + `react-toastify`.
- Auth: **Supabase Auth** (`lib/supabase.ts`, `context/AuthProvider.tsx`). El rol vive en `user_metadata.rol` y en la tabla `vendedores`. `ProtectedRoute` redirige por rol.

### 3.2 Backend: organización

- **Flujo por módulo**: `routes/` → `controllers/` (usa `asyncHandler`) → `services/` → `repositories/` → entidades TypeORM.
- Autenticación: `jwtHandler.ts` valida el JWT de Supabase (HS256 con `SUPABASE_JWT_SECRET`) y lo deja en `req.user`. Los controles de rol usan `req.user.user_metadata.rol`.
- Errores: clase `ApiError` + `errorHandler.ts` global (`{ success: false, message }`).
- CORS: allow-list estricto en `server.ts` (localhost:5173, crmsumichen.com, Vercel) con `credentials: true`.
- Cron de limpieza (`worker/clean.ts`) NO está conectado en `index.ts`: se ejecuta como proceso aparte. Variables: `RUN_CRON`, `CLEANUP_CRON`, `CLEANUP_DAYS`, `CLEANUP_TZ`.

### 3.3 Convenciones de estilo

- Código y comentarios en **español**.
- Frontend: Tailwind CSS para UI general; MUI v7 en algunos modales/formularios; react-hook-form + yup/zod para forms; react-toastify para toasts; lucide-react para iconos; recharts para gráficas; react-big-calendar para calendario.
- Backend: TypeScript commonjs, TypeORM con decoradores, class-validator en DTOs.
- **No hay tests.** `backend` script `test` es un stub que falla.

### 3.4 ⚠ Identidad del usuario (¡CRÍTICO para cualquier feature con roles/ids!)

Hay **DOS ids distintos** que NUNCA deben confundirse:

| Campo | Dónde vive | Qué es | Ejemplo |
|---|---|---|---|
| `supabase_id` | columna `vendedores.supabase_id` | el `auth.users.id` de Supabase = `sub` del JWT = `session.user.id` | `c0794db2-460a-4ec7-b89a-c1243c544b65` |
| `id` | columna `vendedores.id` (PK) | uuid propio del Postgres del VPS | otro uuid distinto |

- **`session.user.id` (frontend)** y **`decoded.sub` (backend)** son el `supabase_id`. Cuando `jwtHandler` lee el perfil por `supabase_id` y pone `req.user.id = decoded.sub`, `req.user.id` ES el `supabase_id`.
- **`GET /usuarios/:id`** recibe en la URL el `session.user.id` (supabase_id) y el repositorio busca con `findOneBy({ supabase_id: id })` → devuelve el objeto del perfil **`vendedores`** completo (con su `id` de DB y su `supabase_id`).
- ⚠ **Trampa en el frontend**: el `currentUser` de `useAuth()` NO es el objeto `User` de Supabase: en runtime es el JSON del perfil `vendedores` (viene de `useCurrentUser` → `GET /usuarios/:id`). Por eso `currentUser.id` = id de la tabla (no sirve para identificar a Omar) y el id que identifica a Omar es `currentUser.supabase_id`. `userData` (de `useUserData`) es un objeto **mapeado** que NO incluye `supabase_id`.
- Para identificar al admin principal (Omar) se usa `esAdminPrincipal(...supabaseIds)` pasando SIEMPRE `currentUser.supabase_id` (ver `constants/adminPrincipal.ts`).
- Regla práctica: si necesitas el `supabase_id` del usuario logueado en el frontend, usa `session.user.id` o `currentUser.supabase_id`, NUNCA `currentUser.id`.

## 4. Comandos

| Comando | Dónde | Descripción |
|---|---|---|
| `npm run dev` | `project/` | Levanta Vite (dev server, puerto 5173) |
| `npm run build` | `project/` | Build de producción (`dist/`) |
| `npm run lint` | `project/` | ESLint |
| `npm run dev` | `backend/` | `tsc -w` + `nodemon build/index.js` (puerto 3000) |
| `npm run build` | `backend/` | Compila TS → `build/` |
| `npm start` | `backend/` | Corre `node build/index.js` |

No hay script de test funcional ni de typecheck dedicado (el typecheck real es `tsc` en backend y `vite build`/`tsc` en frontend).

## 5. Base de datos

- **Schema gestionado por migraciones TypeORM** en `backend/src/database/migrations/` (compiladas a `build/database/migrations/`):
  - `1750000000000-BaselineSchema.ts` — baseline **idempotente** (todo con `IF NOT EXISTS`) del schema real de las entidades. En una DB existente no altera nada (solo registra la migración); en una DB nueva crea tablas, enums, secuencia `numero_seq` e índices.
  - ⚠ **El baseline NO incluye las 6 tablas del feature Marketing/Leads** (`zonas`, `vendedor_zona`, `leads`, `reasignaciones`, `conversaciones`, `mensajes`). ✅ **Resuelto**: migración nueva `1750000000001-MarketingLeadsSchema.ts` las crea (ver "Feature — Marketing / Leads").
  - `1787524208767-ActualizacionEntidades.ts` — migración creada por el usuario: agrega `productos_pedido.precio_base` y `productos_pedido.porcentaje_negociacion` (`numeric(12,4) NOT NULL DEFAULT 0`) y realinea índices/FKs de marketing (no toca el schema legacy).
  - `1787524209000-TransporteSchema.ts` — crea la tabla `transporte` (id uuid PK, nombre, cedula, marca, modelo, placa) y agrega `pedidos.transporte_id` (uuid NULL, FK → `transporte.id` ON DELETE SET NULL) + índice. Idempotente (`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`).
  - ⚠ El SQL canónico de Supabase (`project/supabase/migrations/*.sql`) fue **realineado con las entidades en el Punto 10** (schema completo, RLS, triggers, `numero_seq`), pero **es solo referencia**: la app NO usa el Postgres de Supabase para datos (ver arquitectura arriba). La fuente de verdad del backend son las entidades + estas migraciones; el SQL de Supabase solo importaría si algún día el CRM corriera sobre el Postgres de Supabase.
- `synchronize: false` en `config/dataBaseConfig.ts` (⚠ ya NO auto-migra). `migrationsRun: true` por defecto (se desactiva con `RUN_MIGRATIONS=false`).
- El glob de migraciones apunta a `build/database/migrations/**/*.js` (código compilado), porque la app corre con `node build/index.js`.
- ⚠ **Arquitectura real (aclarada 18/08)**: los datos del CRM viven en el **Postgres propio** al que apunta `DATABASE_URL` (dev: `localhost`; producción: Postgres local en el VPS). **Supabase se usa SOLO para auth (JWT) y storage** (subir Excel de productos). Las evidencias de pedidos se guardan en disco del VPS, no en storage. Por lo tanto, las tablas del SQL de Supabase (`still_sky.sql`/`fierce_firefly.sql`) existen en el Postgres de Supabase pero **la app nunca las lee** — son legacy. El schema real = entidades + migración baseline en el Postgres propio. El perfil de cada usuario se crea vía `POST /usuarios` (con `supabase_id`), no por el trigger de Supabase.
- Entidades (18): `Vendedor`, `Cliente`, `Actividad`, `Reunion`, `Ticket`, `Oportunidad` (cliente_id único), `Pedido` (+ `ProductosPedido` eager, + `Transporte` en `transporte_detalle` eager), `Producto`, `Meta`, `Notificacion`, las 6 de marketing: `Zona`, `VendedorZona`, `Lead`, `Reasignacion`, `Conversacion`, `Mensaje`, y `Transporte` (conductor/vehículo del pedido).
- Relaciones típicas: Cliente/Ticket/Actividad/Reunion/Oportunidad/Pedido/Meta/Notificacion → `ManyToOne Vendedor`; Ticket/Actividad/Reunion/Oportunidad/Pedido → `ManyToOne Cliente`. Marketing: `Lead` → `Vendedor`/`Zona`/`Cliente`; `Conversacion` → `Lead` (única) y `Vendedor`; `Mensaje` → `Conversacion`; `Reasignacion` → `Lead` y `Vendedor`. Pedidos: `Pedido.transporte_detalle` → `OneToOne Transporte` (relación eager, FK `pedidos.transporte_id`).
- La secuencia `numero_seq` (pedidos) ahora se crea en la migración baseline (antes dependía de que existiera externamente).

## 6. Entorno y despliegue

### 6.1 ⚠ SEGURIDAD (crítico)

- ⚠ Los archivos `.env` (frontend y backend) **siguen conteniendo secretos de producción en el working tree** (DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET, TWILIO, META_TOKEN, PUSHOVER). Ambos `.gitignore` ya ignoran `.env` y se añadieron `.env.example` de referencia. Si el repo se hace público/sube a GitHub, **rotar TODAS las credenciales inmediatamente**.
- ✅ `backend/vercel.json` ya NO tiene `Access-Control-Allow-Origin: *` (alineado con el allow-list: `https://crmsumichen.com`, `credentials: true`).
- ✅ Endpoints protegidos con JWT (`verificarToken`): `GET/POST/PUT /productos*`, `GET /usuarios` (cualquier usuario autenticado), `GET /usuarios/:id` (propio perfil o admin), `PUT/DELETE /usuarios/:id` (solo admin), `POST /usuarios/registrar` (solo Omar), `GET /uploads/:fileName` (evidencias).
- ⚠ **Pendiente / intencional**: `POST /usuarios` sigue público a propósito (fallback del signup en `AuthProvider`). Revisar si se puede eliminar del frontend y protegerlo.

### 6.2 Variables de entorno necesarias

- **Frontend (`project/.env`)**: `VITE_BACKEND_URL` (prod: `https://crmsumichen.com/api`), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- **Backend (`backend/.env`)**: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_KEY`/`SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`, Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`, `ADMIN_WHATSAPP_NUMBER`), Meta (`META_PHONE_ID`, `META_TOKEN`, `META_RECIPIENT`, `META_VERIFY_TOKEN` para el webhook, `META_APP_SECRET` para HMAC del webhook), Pushover (`PUSHOVER_USER`, `PUSHOVER_TOKEN`), y opcionales del worker (`RUN_CRON`, `CLEANUP_CRON`, `CLEANUP_DAYS`, `CLEANUP_TZ`, `SUPABASE_CLEANUP_BUCKET`). También: `PUBLIC_API_URL` (base para `evidencia_url`; prod `https://crmsumichen.com/api`, dev `http://localhost:3000`), `APP_PUBLIC_URL` (link del push), `EVIDENCIA_UPLOAD_PATH` (carpeta de evidencias; en dev apuntar a la carpeta local del backend). Del feature Marketing: `SLA_HOURS` (default 12), `RESEND_API_KEY` (pendiente, Fase 2).

### 6.3 Deploy

- Frontend y API en **VPS** (`https://crmsumichen.com`), API en puerto 3000; el proxy mapea `/api/*`.
- Evidencias de pedidos se escriben en disco VPS: `/var/www/crm-backend/uploads/evidencias` (ruta configurable con `EVIDENCIA_UPLOAD_PATH`; por defecto se resuelve relativo a `__dirname` → `backend/uploads/evidencias` en dev). La `evidencia_url` se arma con `PUBLIC_API_URL` (dev: `http://localhost:3000`, prod: `https://crmsumichen.com/api`).
- Swagger básico en `/api-docs` (solo `/usuarios` documentado).
- Existe build desactualizado en `project/dist/` y un `backend/src/api/` stub de Vercel sin uso.

## 7. Problemas y deuda técnica conocida

1. **Seguridad**: ⚠ `.env` con secretos en el repo (rotar si se publica). ✅ Endpoints de productos, usuarios y evidencias ya protegidos con JWT. ✅ `vercel.json` sin `Access-Control-Allow-Origin: *`. ⚠ Pendiente: `POST /usuarios` sigue público (fallback del signup) pero ya fuerza `rol = vendedor` (el rol del JWT ya no se usa para autorización). ✅ Nuevo `POST /usuarios/registrar` protegido (JWT + solo Omar) para crear vendedores/admins con rol elegido.
2. **`synchronize: false` + migraciones** ✅: se creó el baseline idempotente `1750000000000-BaselineSchema.ts` y se desactivó `synchronize`. ⚠ Verificar en producción que el arranque registra la migración sin errores (DB existente = no-op) y que una DB nueva queda funcional.
3. **Duplicación masiva** ✅: `useSupabase.ts` y `useAdmin.ts` ahora son **alias** del hook único `useApi.ts` (sub-hooks con `vendedorId` opcional). Pendiente solo la limpieza de imports de `useSupabase`/`useAdmin` si algún día se migra a `useApi` directo.
4. **Typos en nombres** ✅: se renombraron archivos e identificadores (ver Punto 4 en la bitácora). Quedan nombres raros en UI (ej. `menuVendedor`, `Analitica`, `DashboarVendedorModal`) pero son solo estéticos y no generan confusión en imports.
5. **Rutas sin verificación de rol consistente** ✅: `jwtHandler` ahora lee el rol autoritativo de la tabla `vendedores` en cada request (`req.user.rol`); los controladores lo usan en vez del rol auto-reportado del JWT. El signup público y el trigger de Supabase crean usuarios siempre como `vendedor`. El primer admin debe crearse/promoverse manualmente (SQL o `PUT /usuarios/:id` por un admin existente).
6. **`notificacionesRoutes.ts` reutilizaba el router de `actividadesRoutes.ts`** ✅: ahora crea su propio `Router()` (sin cambios de comportamiento).
7. Sin tests y sin CI. ✅ El repo ahora es git (remoto `origin` = `https://github.com/omarenriquecsn/sumichen-crm`, rama `main`; se limpiaron los `.git` anidados de `backend/` y `project/`). Backend ahora tiene `lint` (eslint 9 flat config + typescript-eslint, reglas relajadas para legacy) y `typecheck` (`tsc --noEmit`); el script `test` ya no falla (es un placeholder que sale 0).
8. `google calendar` ✅: feature ya implementada en el frontend — al crear una reunión se genera y abre el link de Google Calendar (`utils/googleCalendarLink.ts`, usado en `Reuniones.tsx`, `ReunionesModal.tsx`, `ClienteDetalle.tsx`, `ClienteDetalleModal.tsx`). Se actualizó la nota que lo marcaba como pendiente.
9. Importaciones a mitad de archivo ✅: movidos al inicio en `pedidosControllers.ts` (los imports de express, servicios y utils estaban después de `subirEvidencia`).
10. Schema canónico SQL de Supabase ✅: realineado con las entidades en el Punto 10 (`still_sky.sql` reescrito + trigger con `supabase_id`).
11. **Marketing / Leads (Fase 1)** ⚠: implementada y con los **5 fallos críticos corregidos** (migración, ids, HMAC, rate limiting, SLA) + el ownership de `enviarMensaje`. Quedan 2 menores 🟡 (`getLeadsPorVencerSLA` roto/muerto, import dinámico en SLA). Ver la sección "Feature — Marketing / Leads (Fase 1)". ⚠ Para usar en dev: aplicar la migración nueva compilando y arrancando el backend una vez.
12. **`router.use(verificarToken)` global en routers de marketing** ✅ (21/08): `zonasRoutes`, `leadsRoutes` y `conversacionesRoutes` usaban `router.use(verificarToken)` **sin ruta**, y al montarse en `/` dejaban el JWT global → bloqueaba `/health`, `/api-docs` y los endpoints públicos (`POST /leads/web`, webhook). Se acotó con `router.use('/zonas', ...)`, `router.use('/leads', ...)`, `router.use('/conversaciones', ...)`.
13. **Webhook WhatsApp entrante + envío saliente (Fase 2)** ✅ backend (21/08): ver `routes/whatsappWebhookRoutes.ts` + `services/whatsappWebhookServices.ts` + migración `1750000000002-WhatsappInboundSchema.ts` + `utils/sendWhatsapp.ts` + `services/conversacionesServices.ts`. Crea/actualiza lead por teléfono, dedupe por wamid, acumula pendientes, y el vendedor responde desde el chat enviando por la API de Meta. ⚠ Pendiente: token permanente de `META_TOKEN` (el actual expira ~24h) y verificación de negocio Meta en producción.
14. **Asignación de leads rota (500) por array en `where` de TypeORM** ✅ (21/08): `asignarLeadAutomatico` y `procesarSLAVencidos` usaban `estado: ['asignado', 'contactado', 'reasignado']` en `count()`. TypeORM serializa el array como literal Postgres `{"asignado",...}` que NO es válido para un enum → "la sintaxis de entrada no es válida para el enum leads_estado_enum" (500). Fix: usar `In([...])` de typeorm en ambas + en `getLeadsPorVencerSLA`. Verificado: `PUT /leads/:id/asignar` responde 200 y asigna al vendedor con menor carga de la zona.
15. **Rate limiter + Webhooks tras Cloudflare** ✅ (22/08): `keyGenerator` personalizado en `rateLimiter.ts` (primera IP de `X-Forwarded-For` + prefijo `ip:` para IPv6) corrige `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` y `ERR_ERL_KEY_GEN_IPV6` que rompían `POST /webhook/whatsapp` y `POST /leads/web`. Ver Punto 11.
16. **Cache de React Query en feature Marketing** ✅ (22/08): las mutaciones de leads/conversaciones ahora invalidan sus queries (`onSuccess` en `useApi.ts`) → el chat aparece al instante tras asignar un lead, sin recargar. Ver Punto 11.
17. **Filtro de fechas del dashboard marketing (off-by-one)** ✅ (22/08): `hasta` con formato `YYYY-MM-DD` se interpreta como fin del día (`parseHastaInclusive` en `leadsControllers.ts`) + fechas locales en el frontend. Ver Punto 11.
18. **Botón "Perder" de leads** ✅ (22/08): implementado end-to-end (`PUT /leads/:id/perder` + `usePerderLead` + `handlePerder`). Ver Punto 11.
19. ⚠ **Logging temporal en webhook**: `console.log('[WEBHOOK] payload recibido:')` en `whatsappWebhookServices.ts` (22/08, Punto 11) — quitar antes de desplegar a producción.
20. **Asistente de Bienvenida WhatsApp (22/08)** ✅: al llegar un lead de WhatsApp **sin vendedor**, el bot pregunta el **estado** (lista desde `zonas.estados`), mapea estado→zona, **auto-asigna** el vendedor con menor carga (`asignarLeadAutomatico`) y captura la **intención** en `tipo_web`. Config editable en `/marketing` (sección "Menú de Bienvenida"). Migración `1750000000003-MenuBienvenidaSchema.ts`. Ver "Feature — Asistente de Bienvenida WhatsApp".
21. **Reactivación de leads perdidos + resultado de conversación (22/08)** ✅: un lead `perdido` que vuelve a escribir se reactiva (con vendedor → `contactado`; sin vendedor → `nuevo` + reinicia asistente). En `/leads` y `/chat` hay acciones "Cliente" (registro manual con datos → `PUT /leads/:id/convertir` con `datos_cliente`) y "Perder". Botones Convertir/Reasignar ahora visibles también con estado `reasignado`. Ver "Feature — Resultados de conversación".
22. **Transporte externo en pedidos + precio_base/% negociación (24/08)** ✅: ver "Feature — Transporte y negociación en pedidos". Incluye la relación `Pedido.transporte_detalle → Transporte` (OneToOne eager, corregida la que estaba rota por `@JoinColumn` sin relación), el módulo `/transporte` (GET/PUT `/transporte/pedido/:pedidoId`, JWT) y el cálculo de `precio_unitario` en el frontend.
23. **PWA instalable + Web Push + Acceso biométrico (28/08)** ✅: ver "Feature — PWA instalable + Notificaciones push + Acceso biométrico". App instalable en Android/iOS/Windows con notificaciones push por dispositivo y login con huella/rostro (WebAuthn). ⚠ Los eventos de negocio que disparan push (pedidos/mensajes/leads/SLA) NO están cableados aún: usar `enviarPushAUsuario`/`enviarPushAAdmins` (`backend/src/services/pushServices.ts`).

## 8. Progreso de la actualización (bitácora)

Sesión de mantenimiento: **Punto 1 (Seguridad)** ✅, **Punto 2 (Migraciones)** ✅, **Punto 3 (Refactor de hooks)** ✅, **Punto 4 (Typos)** ✅, **Punto 5 (Rol consistente)** ✅, **Punto 6 (Rutas)** ✅, **Punto 7 (Lint/typecheck/test)** ✅, **Punto 8 (Google Calendar)** ✅, **Punto 9 (Imports)** ✅, **Punto 10 (SQL alineado)** ✅ y **Punto 11 (Fixes WhatsApp + UX, 22/08)** ✅. Plus: **Feature "Registrar Usuarios"** ✅, **Feature "Marketing / Leads (Fase 1)"** ⚠ (compila; fallos críticos corregidos — ver sección del feature), **Feature "Transporte y negociación en pedidos" (24/08)** ✅ (ver Punto 12), **Punto 13 (Próximas Actividades + modal detalle + persistencia de listas, 27/08)** ✅, **Punto 14 (Descargas DB: fix reuniones + columnas nuevas + descargas de marketing, 28/08)** ✅ y **Punto 15 (PWA instalable + Web Push + Acceso biométrico, 28/08)** ✅ (ver "Feature — PWA instalable + Notificaciones push + Acceso biométrico").

### Punto 1 — Seguridad ✅ (fase 1A, 1B y 1C completadas; build backend + build/lint frontend OK)

- **1A** `.env.example` de referencia en `project/` y `backend/` (los `.gitignore` ya cubrían `.env`). `backend/vercel.json` alineado al allow-list CORS de `server.ts`.
- **1B** Rutas protegidas con JWT en backend:
  - `productosRoutes.ts`: `verificarToken` en todos los endpoints (incl. `POST /productos/excel`).
  - `usuariosRoutes.ts`: `GET /usuarios` y `PUT/DELETE /usuarios/:id` con JWT + control `esAdmin` en el controlador; `GET /usuarios/:id` permite propio perfil o admin. `POST /usuarios` sigue público (fallback del signup, documentado en código).
  - `jwtHandler.ts`: se tipó `user_metadata.rol?: 'admin' | 'vendedor'`.
  - Frontend alineado: `useUserData.ts` y `useCurrentUser.ts` ahora envían `Authorization: Bearer` (token vía `supabase.auth.getSession()`); `ExcelProductos.tsx` envía el token al subir el Excel.
- **1C** `archivosRoutes.ts`: `GET /uploads/:fileName` ahora exige JWT. `PedidosDetail.tsx` y `PedidosDetailModal.tsx` abren la evidencia con `evidencia_url?access_token=<token>`.
  - 🔧 **Fix (18/08)**: el backend acepta el token también por query `?access_token=` (necesario porque `<a target="_blank">` no puede enviar headers). El frontend usa la URL con `?access_token=` en vez de la URL cruda (que devolvía `Acceso denegado`).
  - 🔧 **Fix 2 (18/08)**: se descartó el enfoque de blob URL (`useEvidencia.ts` eliminado) porque al abrir un blob en pestaña nueva el navegador descargaba el archivo en vez de mostrarlo. Ahora se abre la URL directa con el token por query, y `archivosControllers` sirve el PDF con `Content-Disposition: inline` para que se muestre en el visor.
  - 🔧 **Fix 3 (18/08)**: `pedidosControllers.ts` hardcodeaba `https://crmsumichen.com/api/uploads/...` y la ruta `/var/www/crm-backend/uploads/evidencias`. Ahora se usa `PUBLIC_API_URL` (base de `evidencia_url`), `EVIDENCIA_UPLOAD_PATH` (carpeta de evidencias) y `APP_PUBLIC_URL` (link del push). En `backend/.env` local se agregó `PUBLIC_API_URL=http://localhost:3000`.
  - 🔧 **Fix 4 (18/08) — login vendedor roto (403 + uuid inválido)**: el JWT de Supabase NO trae un claim `id`, la identidad vive en `sub`. `getUsuarioById` comparaba `req.user?.id === id` (siempre `undefined`) → 403 en `/usuarios/:id` → `currentUser`/`userData` fallaban → el frontend disparaba `/clientes/undefined` (500 "invalid input syntax for type uuid") y `/notificaciones/` (404). Fix: `jwtHandler.ts` normaliza `req.user.id = decoded.sub ?? decoded.id`. Además, `GET /usuarios` quedó **admin-only** en el Punto 1 y eso rompía las páginas de vendedor (usan `useVendedores()` en casi todas); se relajó a "cualquier usuario autenticado" (el JWT ya la protege).
- **Notas para test en producción**: verificar que el signup sigue funcionando (POST /usuarios público), que la subida de evidencias y su visualización funcionan con el token, y que admin/panel de vendedores carga la lista correctamente.

### Punto 2 — Migraciones ✅ (build backend OK)

- `config/dataBaseConfig.ts`: `synchronize: false` (⚠ ya no auto-migra), `migrationsRun` controlado por env (`RUN_MIGRATIONS !== 'false'`), glob de migraciones corregido a `build/database/migrations/**/*.js` (la app corre código compilado).
- Nueva `src/database/migrations/1750000000000-BaselineSchema.ts`: baseline **idempotente** del schema real de las entidades (tipos enum, tablas, `numero_seq`, índices, todo con `IF NOT EXISTS`). En DB existente es no-op y solo registra la migración; en DB nueva crea el schema completo.
- ⚠ **Pendiente de verificar**: 1) que al arrancar localmente se registre la migración sin errores (la DB local ya tiene el schema), 2) que una DB nueva quede funcional.

### Punto 3 — Refactor de hooks ✅ (build + lint + tsc frontend OK)

- Nuevo `src/hooks/useApi.ts`: hook **único** que agrupa todas las queries/mutations. Los sub-hooks aceptan un `vendedorId` **opcional** como alcance (modo vendedor = usuario logueado; modo admin = vendedor indicado, ej. `VendedorPanel`).
- `useSupabase.ts` y `useAdmin.ts` quedaron como **alias** de `useApi` (`export { useApi as useSupabase } from "./useApi"`), preservando la API pública → ningún import de las ~34 páginas cambió.
- Helper `resolverVendedorId`: prioridad vendedorId explícito (admin) > dueño del cliente > usuario logueado. Aplica en crear cliente/pedido/actividad/reunión/ticket/oportunidad.
- 🔧 **Fix (18/08)**: `resolverVendedorId` ya NO depende de `useVendedores()` (que dispara `GET /usuarios`, admin-only). El dueño del cliente se lee directamente de `cliente.vendedor_id`. Se eliminó el import y las 5 llamadas internas a `useVendedores` en los create hooks.
- **Fixes implícitos del refactor** (se unificó la lógica al patrón correcto):
  - `useAdmin().useCrearActividad` enviaba `{ actividadData, vendedor_id }` (objeto anidado = bug); ahora envía los campos de la actividad en el body.
  - `useAdmin().useCrearCliente`/`useActualizarCliente` usaban el `id` del alcance; ahora usan `clienteData.id` (mismo valor en la práctica).
  - `useEliminarActividad` eliminaba la reunión dos veces (bug); ahora una sola vez.
  - `useActualizarCliente` ahora aplica la lógica `etapa_venta → estado` también en modo admin (antes solo en vendedor).
  - `useCrearPedido` acepta `File | FileList` para la evidencia (antes variaba según el modo).
- ⚠ **Nota**: `useAdmin` solo lo usa `VendedorPanel` (solo hooks de lectura); los hooks de escritura de `useAdmin` eran código muerto, así que la unificación no cambió ninguna página admin en uso.

### Punto 4 — Typos en nombres ✅ (build backend + tsc/lint frontend OK)

- Archivos renombrados (se actualizaron todos sus imports):
  - `project/src/components/ui/SelectVendedot.tsx` → `SelectVendedor.tsx`
  - `project/src/utils/tikets.ts` → `tickets.ts`
  - `project/src/components/forms/CrearOportunida.tsx` → `CrearOportunidad.tsx`
  - `project/src/constants/typeCange.ts` → `typeChange.ts`
  - `backend/src/entities/Notificaiones.ts` → `Notificaciones.ts`
  - `backend/src/repositories/notificaionesRepository.ts` → `notificacionesRepository.ts`
  - `backend/src/enums/PrioridadTicketEnium.ts` → `PrioridadTicketEnum.ts`
- `queryClientet` → `queryClient` en `project/src/App.tsx`.
- Correcciones de enums (solo se usan como tipos TS, sin impacto runtime en datos existentes):
  - `DiasCreditoEnum`: `QUINCE = 5` → `QUINCE = 15` (bug: "quince" valía 5) y `TRWINTA` → `TREINTA`.
  - `PrioridadTicketEnum`: `URGENCTE` → `URGENTE`.
- Quedan nombres estéticos sin renombrar (no rompen nada): `menuVendedor.tsx`, `Analitica.tsx`, `DashboarVendedorModal.tsx`, `TicketDeatilModal.tsx`, `ClienteFom.tsx`, `AnaliticaModal.tsx`, `useOportunidadAccion.ts`, etc.

### Punto 5 — Rol consistente ✅ (build backend OK)

- **Problema**: el rol del JWT (`user_metadata.rol`) es auto-reportado en el signup; cualquier usuario podía crearse como `admin`.
- **Fix**: el rol AUTORITATIVO sale de la tabla `vendedores`:
  - `jwtHandler.ts` (ahora async): en cada request autenticado lee `vendedores.rol` por `supabase_id` y lo deja en `req.user.rol`. Fail-safe: si el perfil no existe o la DB falla, `rol` queda `undefined` → se trata como vendedor (nunca se otorga admin por error).
  - Los controladores usan `req.user.rol` en vez de `req.user.user_metadata.rol` (clientes, metas, actividades, pedidos, tickets, oportunidades, reuniones, usuarios/`esAdmin`).
  - `usuariosServices.createUsuariosService` fuerza `rol = RolesEnum.VENDEDOR` en el `POST /usuarios` público (ignora el `rol` del body).
  - Trigger `handle_new_user()` (migración SQL de Supabase): crea perfiles siempre con `rol = 'vendedor'` (ignora `raw_user_meta_data.rol`).
- El frontend ya era consistente: `ProtectedRoute` usa `userData.rol` (de `GET /usuarios/:id`, es decir la DB), no el claim del JWT.
- ⚠ **En producción (18/08)**: se verificó que los 4 admins ya tienen `rol = 'admin'` en el Postgres del VPS y que `supabase_id` está poblado en todos los perfiles → **no hizo falta ejecutar el trigger ni promover nada** (los SQL de Supabase son solo referencia; la app no lee ese Postgres).

### Punto 6 — Rutas de notificaciones desacopladas ✅ (build backend OK)

- `notificacionesRoutes.ts` importaba y reutilizaba el `router` de `actividadesRoutes.ts` (montaba las rutas de notificaciones sobre el router de actividades). Ahora crea su propio `Router()` con los mismos 4 endpoints (sin cambios de comportamiento).

### Punto 7 — Lint, typecheck y test del backend ✅ (lint/typecheck/build OK)

- `package.json`: nuevos scripts `lint` (`eslint .`), `typecheck` (`tsc --noEmit`) y el stub de `test` ya NO falla (placeholder que sale 0).
- `eslint.config.mjs` (flat config ESLint 9 + `typescript-eslint`, se instaló como devDependency). Reglas relajadas a propósito porque el código es legacy (no tenía lint previo): `no-explicit-any`, `no-unused-vars`, `no-empty-object-type`, `no-require-imports` y `no-namespace` en off.
- Fixes menores que exigió el lint: `asyncHandler` tipó `fn` con firma explícita en vez de `Function`; `exportPedidos.ts` usó `const` para `lastExportPath`.
- Resultado: `npm run lint` = 0 errores, `npm run typecheck` = 0 errores, `npm run build` OK, `npm test` sale 0.
- ⚠ Sigue sin haber tests reales ni CI. El repo ya es git (https://github.com/omarenriquecsn/sumichen-crm, rama `main`) pero no hay pipeline de CI configurado. El placeholder de `test` está documentado para que nadie crea que hay suite.

### Punto 8 — Google Calendar ✅ (sin cambios de código)

- La feature ya estaba implementada en el frontend: al crear una reunión se genera el link de Google Calendar con `utils/googleCalendarLink.ts` y se abre en pestaña nueva (con confirmación opcional de invitado). Usado en `Reuniones.tsx`, `ReunionesModal.tsx`, `ClienteDetalle.tsx` y `ClienteDetalleModal.tsx`. Solo se actualizó la nota en AGENTS.md que la marcaba como pendiente.

### Punto 9 — Imports a mitad de archivo ✅ (build backend OK)

- `pedidosControllers.ts`: los imports de express, servicios y utils estaban después de la definición de `subirEvidencia`. Se movieron al inicio del archivo (bloque único de imports).

### Punto 10 — SQL de Supabase realineado con las entidades ✅ (solo SQL de referencia, sin impacto runtime)

- `project/supabase/migrations/20250706223753_still_sky.sql` reescrito como **referencia canónica** alineada con las entidades TypeORM y con la migración baseline:
  - `vendedores`: agregado `supabase_id` (NOT NULL + índice único) y `monto_negociacion_mes`.
  - `clientes`: `rif` único NOT NULL, `sector`, `direccion_entrega`, `google_maps`, `estado_anterior`, `fecha_estado`; `fecha_creacion`/`fecha_actualizacion` como date. Se quitaron columnas legacy (`cargo`, `valor_potencial`, `probabilidad`, `codigo_postal`, `ultima_actividad`) y el UNIQUE de `email`.
  - `pedidos`: `numero` integer con `numero_seq` (se eliminó el trigger `generate_pedido_number` y `pedido_sequence` legacy), columnas `tipo_pago`, `dias_credito`, `moneda`, `transporte`, `evidencia_url`, estado `pendiente/procesado`.
  - `productos_pedido`: `producto_id` FK a `productos`, `total`; sin columnas legacy.
  - Nuevas tablas: `productos` y `notificaciones` (con RLS, políticas e índices).
  - `metas`: `mes` text, contadores `emails/tareas/llamadas/reuniones`.
  - `oportunidades`: `cliente_id` UNIQUE (1 cliente → 1 oportunidad).
  - RLS + políticas para todas las tablas (vendedor solo sus datos; admin todo; productos catálogo global; notificaciones por vendedor).
  - Triggers de `fecha_actualizacion` y de número de ticket (ticket_sequence) mantenidos.
- `20250706223850_fierce_firefly.sql` (trigger `handle_new_user`): ahora también graba `supabase_id = NEW.id` (el backend busca el perfil por esa columna en jwtHandler y `/usuarios/:id`).
- ⚠ **En producción (18/08)**: se verificó que los 4 admins ya tienen `rol = 'admin'` en el Postgres del VPS y que `supabase_id` está poblado en todos los perfiles → **no hizo falta ejecutar el trigger ni promover nada** (los SQL de Supabase son solo referencia; la app no lee ese Postgres).

### Punto 11 — Fixes WhatsApp + UX (22/08) ✅ (build/lint/tsc OK; flujo WhatsApp verificado de punta a punta)

Sesión enfocada en probar WhatsApp local (Cloudflare tunnel) y corregir bugs del feature Marketing.

- **Rate limiter roto tras Cloudflare** ✅: `express-rate-limit` lanzaba `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` (Cloudflare envía `X-Forwarded-For` con varias IPs y no había `trust proxy`) y `ERR_ERL_KEY_GEN_IPV6` (claves IPv6, ej. `::1` local). Fix en `backend/src/middlewares/rateLimiter.ts`: `keyGenerator` personalizado que extrae la primera IP de `X-Forwarded-For` y **prefija las claves IPv6** con `ip:` para saltar la validación. Aplica a `limiterPublico` y `limiterWebhook`. ⚠ Este bug hacía que `POST /webhook/whatsapp` devolviera 500 en vez de procesar el mensaje.
- **Flujo WhatsApp verificado en dev** ✅ (22/08): con túnel Cloudflare (`cloudflared tunnel --url http://localhost:3000`), webhook de Meta → backend: verificación de suscripción (GET 200 con `sumichem-test-verify`), recepción entrante (POST 200 crea/actualiza lead por teléfono + mensaje en `mensajes_pendientes`), y envío saliente por la API de Meta (HTTP 200 + wamid). El número de prueba `+1 555-143-3666` (phone_number_id `964389213422160`) **sí recibe mensajes entrantes** desde el teléfono real de Omar (`584125072254`); el número real `114880014860322` (+58 416-6440742) **NO** porque el WABA está con `account_review_status: PENDING` (modo prueba/sandbox → solo números de prueba pueden escribirle). ⚠ Para producción: completar la verificación de negocio (WABA a Live) y volver a poner `META_PHONE_ID` = número real.
- **Chat no aparecía tras asignar lead sin recargar** ✅: las mutaciones del feature Marketing no invalidaban la caché de React Query (solo el polling de 60s o un refresh manual refrescaba). Fix en `project/src/hooks/useApi.ts`: `onSuccess` con `queryClient.invalidateQueries` en `useAsignarLead`, `useReasignarLead`, `useConvertirLead`, `useAbrirConversacion`, `useEnviarMensaje`, `useCerrarConversacion` y `usePerderLead` (invalida `leads`, `lead`, `conversaciones`, `conversacion`, `conversacion-lead`, `historial-reasignaciones`, `mensajes` según aplica).
- **Dashboard marketing: filtrar fechas off-by-one** ✅: `new Date('YYYY-MM-DD')` cae a medianoche UTC, y el filtro `fecha_creacion <= hasta` excluía los leads creados más tarde ese mismo día (en Venezuela UTC-4 había que seleccionar "mañana" para ver "hoy"). Fix en `backend/src/controllers/leadsControllers.ts` (`parseHastaInclusive`: `hasta` con formato `YYYY-MM-DD` suma 1 día para incluir todo el día) + `project/src/pages/marketing/MarketingDashboard.tsx` (defaults de fechas y agrupado por día con **fecha local** vía helper `toLocalDateStr`, no UTC). Verificado en DB: `hasta=2026-08-22` antes traía 1 lead, ahora 2.
- **Botón "Perder" sin acción** ✅: tenía `// TODO: implementar marcar perdido`. Implementado end-to-end: `PUT /leads/:id/perder` (JWT) → `perderLeadService` (admin o vendedor dueño del lead; valida no convertido) → `marcarLeadPerdido` (estado `perdido` + `ultima_actividad_en`). Frontend: `usePerderLead` en `useApi.ts` y `handlePerder` en `Leads.tsx` (confirmación + toast + refetch). Ruta verificada (401 sin token).
- ⚠ **Pendiente**: quitar el `console.log('[WEBHOOK] payload recibido:')` temporal agregado en `backend/src/services/whatsappWebhookServices.ts` para depurar (no desplegarlo a producción).

### Feature — Asistente de Bienvenida WhatsApp ✅ (build/lint/tsc OK; flujo verificado end-to-end)

> **Resumen**: cuando un lead llega por WhatsApp **sin vendedor asignado**, el bot automáticamente pregunta el **estado** del cliente (lista dinámica de `zonas.estados`), lo mapea a la **zona**, **auto-asigna el vendedor con menor carga** de esa zona y luego captura la **intención** (`tipo_web`: cotización/información/soporte). La máquina de estados vive en `lead.metadata.paso_menu` (`estado` → `intencion` → `completado`). Configurable por el admin desde `/marketing`.

#### Flujo
1. **Primer mensaje** (lead `nuevo`, sin vendedor) → se guarda en `mensajes_pendientes` y el bot envía bienvenida + lista numerada de estados disponibles (solo de zonas activas con vendedores). `paso_menu='estado'`.
2. **Respuesta de estado** → match por número o nombre → `asignarLeadAutomatico(leadId, zona)` → crea la conversación y **siembra los pendientes** (`abrirConversacionParaLead`) → envía "Te atenderá {vendedor}. ¿Qué necesitas? 1..2..3" → `paso_menu='intencion'`.
3. **Respuesta de intención** → match → guarda `lead.tipo_web` → envía confirmación → `paso_menu='completado'`.
- Respuesta inválida → re-envía la pregunta del paso actual. Zona sin vendedores → `mensaje_sin_vendedor` y `paso_menu='completado'`. Lead ya asignado → flujo webhook normal (el asistente no interviene).

#### Backend
- **Migración** `1750000000003-MenuBienvenidaSchema.ts` (idempotente): crea `menu_bienvenida` (fila única: `activo`, textos con placeholders `{nombre}/{vendedor}/{zona}/{opciones}`, `opciones_intencion` jsonb), agrega `zonas.estados` (jsonb), siembra config default + mapeo de estados por zona (editable en `/zonas`).
- **Entidad** `MenuBienvenida.ts` (registrada en `dataBaseConfig`); `Zona.estados`.
- **Endpoints admin** (JWT + rol admin en el PUT): `GET /menu-bienvenida`, `PUT /menu-bienvenida` (`menuBienvenidaRoutes` montado en `indexRoutes`).
- **Asistente** `services/asistenteMenuServices.ts`: `procesarAsistente` (entry point), `enviarMenuEstados`, `procesarRespuestaEstado`, `procesarRespuestaIntencion`, `enviarSeguro` (envío no bloqueante si la API de Meta falla). Reusa `getZonas`, `asignarLeadAutomatico`, `abrirConversacionParaLead`.
- **Webhook** `whatsappWebhookServices.ts`: llama a `procesarAsistente` tras crear el lead, tras mensaje pendiente y tras mensaje en conversación.

#### Frontend
- `useApi.ts`: `useMenuBienvenida` (query) + `useActualizarMenuBienvenida` (mutation, invalida `["menu-bienvenida"]`).
- `MarketingDashboard.tsx`: sección "Menú de Bienvenida (WhatsApp)" con toggle activo, textos (welcome/pregunta estado/sin vendedor/pregunta intención/confirmación) y editor de `opciones_intencion`. La lista de estados NO se configura aquí (viene de `/zonas`).
- `Zonas.tsx`: campo "Estados cubiertos (separados por coma)" + columna con chips en la tabla.
- `types/index.ts`: `OpcionIntencion`, `MenuBienvenida`, `Zona.estados`.

#### Cómo probar
- Simular webhook `POST /webhook/whatsapp` con teléfono nuevo: msg1 "hola" → lead `nuevo` con `paso_menu='estado'` y `estados_disponibles` en metadata (el envío de Meta fallará para números ficticios pero no rompe el flujo, `enviarSeguro`). msg2 "1" → lead `asignado`, zona/vendedor puestos, conversación creada con pendientes sembrados, `paso_menu='intencion'`. msg3 "1" → `tipo_web='cotizacion'`, `paso_menu='completado'`. Verificado en DB (22/08): Anzoátegui → zona Oriente → Heidy Daza.

#### ⚠ Notas / deuda
- El mapeo de estados por zona es **seed editable**; estados sin zona no aparecen en el menú. Zonas duplicadas (Guarenas/Guatire/Maracay sin estados) quedan fuera hasta configurarlas.
- Los envíos de Meta dependen de `META_PHONE_ID`/`META_TOKEN` y de la ventana de 24h; el asistente no bloquea por eso.
- El estado del lead `nuevo` mientras no elige estado NO lo monitorea el SLA (solo asignado/contactado/reasignado).

### Feature — Resultados de conversación (22/08) ✅ (build/lint/tsc OK; reactivación verificada end-to-end)

> **Resumen**: cierra el ciclo del lead. (1) Un lead **perdido que vuelve a escribir se reactiva** automáticamente. (2) Desde la lista de chats y la página de leads, el vendedor/admin puede registrar el **resultado** de la conversación: **"Cliente"** (abre formulario manual que registra al cliente en DB con datos completos → luego puede crear un pedido) o **"Perder"** (lead `perdido`).

#### Reactivación de lead perdido (webhook)
- En `whatsappWebhookServices.procesarMensajeWhatsApp`: si el lead está `perdido` y vuelve a escribir:
  - Con vendedor → estado a `contactado`, el mensaje cae en su conversación.
  - Sin vendedor → estado a `nuevo`, se borra `metadata.paso_menu`/`estados_disponibles`/`intencion_seleccionada` para que el asistente de bienvenida pregunte de nuevo el estado.

#### Conversión manual a cliente (formulario)
- Backend: `PUT /leads/:id/convertir` ahora acepta `{ datos_cliente: {...} }` (nombre, apellido, rif, email, telefono, empresa, direccion, ciudad, direccion_entrega, google_maps, sector, notas). `convertirLeadACliente(leadId, datos)` usa los datos manuales con fallback al lead. Si el lead no tiene vendedor, se asigna al vendedor del body o al admin (requiere vendedor → 400 si no).
- Frontend: nuevo `components/forms/ConvertirLeadModal.tsx` (formulario con datos precargados del lead). Se abre desde:
  - `Leads.tsx`: botón "Convertir" (ahora abre el modal; antes era `confirm` + convertir directo).
  - `ChatLista.tsx`: botón "Cliente" por conversación y por lead sin conversación.
- Tras registrar, toast "Cliente registrado. Ya puedes crear un pedido" (el cliente queda en `clientes` y con `lead.cliente_id` seteado → se puede crear pedido desde `/pedidos`).

#### Botones de resultado en lista de chats
- `ChatLista.tsx`: cada conversación (y cada "lead sin chat") tiene acciones "Cliente" (abre modal) y "Perder" (confirm → `PUT /leads/:id/perder`). Deshabilitadas si el lead ya está `convertido`/`perdido`.
- `Leads.tsx`: botones **Convertir** y **Reasignar** ahora visibles también para estado `reasignado` (antes se ocultaban tras una reasignación).
- Se quitó el `console.log('[WEBHOOK] payload recibido:')` temporal del webhook.

#### Cómo probar
- Reactivación: crear lead por webhook, marcarlo `perdido` (SQL o botón), enviar otro mensaje → estado `contactado` y mensaje en conversación (verificado 22/08).
- Convertir manual: en `/chat` pulsar "Cliente" → completar formulario → cliente creado + lead `convertido`. En `/leads` el botón "Convertir" abre el mismo modal (verificado el flujo con datos manuales en el endpoint; requiere JWT).

### Feature — Registro de usuarios (solo el admin principal) ✅ (build/lint/tsc frontend + backend OK)

> **Resumen del feature**: solo **Omar Contreras** (admin principal) puede crear nuevos usuarios (vendedor o admin) desde la sección **"Registrar Usuarios"** (`/registro-usuarios`), accesible solo desde el enlace del sidebar que él ve. El backend crea el usuario en **Supabase Auth** (admin API, con email confirmado) y su perfil en `vendedores` con el rol elegido.

#### Requisito funcional (del usuario)
- Solo Omar puede **ver** el enlace y **usar** la sección. Ni otros admins ni vendedores.
- El enlace va en el **sidebar debajo de "Descargas DB"** (fin de la lista del menú admin).

#### Cómo se identifica a Omar (⚠ leer §3.4)
- Omar se identifica por su **`supabase_id`**: `c0794db2-460a-4ec7-b89a-c1243c544b65` (= `auth.users.id` de Supabase = `session.user.id`).
- **NO** usar `currentUser.id` (es el id de la tabla `vendedores`, distinto). El campo correcto en frontend es `currentUser.supabase_id`.
- Constante declarada en **2 lugares** (mantener sincronizadas si cambia el usuario de Omar):
  1. Backend: `OMAR_SUPABASE_ID` en `backend/src/controllers/usuariosControllers.ts`.
  2. Frontend: `OMAR_SUPABASE_ID` en `project/src/constants/adminPrincipal.ts`.

#### Seguridad (doble capa)
- **Backend (autoritativo)**: `POST /usuarios/registrar` exige JWT válido (`verificarToken`) + control `esOmar` en el controlador: `req.user?.rol === 'admin' && req.user?.id === OMAR_SUPABASE_ID`. Cualquier otro usuario → `403`. Es imposible saltarse el gate del frontend.
- **Frontend (UX)**: `SoloOmarRoute` protege la ruta `/registro-usuarios` y el `Sidebar` oculta el enlace a quien no sea Omar.

#### Flujo completo (qué pasa al enviar el formulario)
1. `useRegistrarUsuario.ts` hace `POST /usuarios/registrar` con `Authorization: Bearer <session.access_token>` y el body `{ email, password, nombre, apellido, rol }`.
2. `usuariosControllers.registrarUsuario` valida `esOmar` (403 si no) y delega en el servicio.
3. `registrarUsuarioService`:
   - Valida campos obligatorios y password ≥ 6 caracteres.
   - Normaliza el rol: solo acepta `'vendedor'` o `'admin'` (cualquier otro valor → vendedor).
   - Crea el cliente de Supabase con **`SUPABASE_SERVICE_ROLE_KEY`** (permisos de admin API).
   - `supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nombre, apellido, rol } })` → el usuario queda habilitado para entrar (email confirmado).
   - Crea el perfil en `vendedores` con `{ nombre, apellido, rol, supabase_id: data.user.id, activo: true }` (vía repositorio `createUsuario`).
   - **Rollback**: si falla el perfil, borra el usuario de Auth (`admin.deleteUser`) para no dejar huérfanos y responde 500.
4. El frontend muestra toast de éxito/error y **invalida `['vendedores']`** (para que la lista del panel admin se refresque).

#### Archivos del feature
**Backend**
- `backend/src/controllers/usuariosControllers.ts`: `OMAR_SUPABASE_ID`, helper `esOmar(req)`, controlador `registrarUsuario`.
- `backend/src/services/usuariosServices.ts`: `registrarUsuarioService` (lógica de arriba; usa `createClient` de `@supabase/supabase-js` con la service role key).
- `backend/src/routes/usuariosRoutes.ts`: `POST /usuarios/registrar` con `verificarToken` + `asyncHandler`.

**Frontend**
- `project/src/constants/adminPrincipal.ts`: `OMAR_SUPABASE_ID` + helper `esAdminPrincipal(...supabaseIds)` → true si cualquiera de los ids coincide con Omar.
- `project/src/components/auth/SoloOmarRoute.tsx`: exige sesión + `userData.rol === 'admin'` + `esAdminPrincipal(currentUser.supabase_id, ...)`; si no, redirige a `/dashboard`. Espera a que `currentUser`/`userData` estén cargados (spinner).
- `project/src/pages/usuarios/RegistrarUsuarios.tsx` (ruta `/registro-usuarios`): formulario nombre/apellido/email/contraseña/confirmar-contraseña/rol con Tailwind + lucide-react, toasts con react-toastify.
- `project/src/hooks/useRegistrarUsuario.ts`: `useMutation` → `POST /usuarios/registrar` con Bearer token; `onSuccess` invalida `['vendedores']`.
- `project/src/components/layout/Sidebar.tsx`: array `adminPrincipalLink` (`UserPlus`) que solo se agrega al menú si `esAdminPrincipal(...)`; queda al final del menú admin (debajo de "Descargas DB").
- `project/src/App.tsx`: ruta `/registro-usuarios` envuelta en `<SoloOmarRoute>`.

#### Por qué se creó (contexto)
- `POST /usuarios` público siempre crea **vendedor** (Punto 5: el rol del body se ignora por seguridad). No servía para crear admins.
- La sección de Omar evita depender del signup público y permite elegir el rol al registrar.

#### Cómo probar
- **Con Omar**: ver el enlace en el sidebar (debajo de "Descargas DB"), entrar a `/registro-usuarios`, registrar un vendedor y un admin → toasts de éxito; el admin nuevo aparece en "Vendedores".
- **Con otro admin/vendedor**: NO ver el enlace; si entra directo a `#/registro-usuarios` → redirigido a `/dashboard`; aunque llame al endpoint con curl, recibe 403.
- **Registrar sin permisos** (`POST /usuarios/registrar` sin token o con token de vendedor) → 401/403.

#### ⚠ Notas / deuda técnica de este feature
- `UserData` (interfaz de `context/types.ts`) NO declara `supabase_id` aunque en runtime `currentUser` sí lo trae. Los casts `(currentUser as { supabase_id?: string })` son intencionales; si algún día se tipa bien, se pueden quitar.
- El email del usuario registrado es con `email_confirm: true` → puede iniciar sesión inmediatamente.
- El perfil en `vendedores` se crea SIEMPRE (sin depender del trigger `handle_new_user` de Supabase, que es legacy/no se usa).
- Si el usuario de Supabase de Omar cambiara algún día, actualizar las 2 constantes (backend + frontend).

### Feature — Marketing / Leads (Fase 1) ⚠ (backend + frontend compilan; revisión de flujo hecha con fallos detectados)

> **Resumen**: captura de leads (Instagram, web y WhatsApp), zonas con vendedores, asignación automática, SLA con reasignación y chat por lead. Fases acordadas: **F1** leads + zonas + asignación + SLA + dashboard básico (implementada), **F2** chat real + webhooks Meta/WhatsApp + historial admin (parcial: ✅ **webhook WhatsApp entrante implementado** — ver abajo; ⚠ falta envío saliente desde el CRM por la API de Meta), **F3** detección de "sin stock" por palabras clave + métricas avanzadas (pendiente).

#### Decisiones del usuario (contexto funcional)
- Instagram llega por **botón de acción → WhatsApp Business** (Meta Cloud API; verificación en progreso). Formulario web con **3 tipos de solicitud** sin nombres exactos aún → placeholders `cotizacion`/`informacion`/`soporte`.
- **WhatsApp Business API bidireccional** (vendedor escribe en CRM → backend envía por WA API → cliente responde → webhook a CRM).
- Las **zonas** se definen después (no bloquear avance); un vendedor puede tener varias zonas.
- **Asignación automática por zona** al crear el lead (vendedor con menor carga de leads activos).
- **Timer SLA 12h inicia tras la asignación**. Si vence → reasignar a otro vendedor de la misma zona; si no hay → email recordatorio al vendedor original vía **Resend** (`RESEND_API_KEY` pendiente).
- **Historial de reasignaciones** requerido (tabla `reasignaciones`).
- Detección de "sin stock" por **palabras clave** aproximadas (solo saber qué piden y no venden).
- Cuidado con seguridad: **HMAC** en webhooks, **rate limiting**, aislamiento de chats.

#### Entidades nuevas (6) — ⚠ NO tienen migración aún (ver fallos abajo)
`Zona`, `VendedorZona` (many-to-many vendedor↔zona), `Lead` (origen/tipo_web/canal/estado/datos_contacto jsonb/metadata/`asignado_en`/`ultima_actividad_en`), `Reasignacion` (motivo sla_vencido/manual_admin/vendedor_inactivo/sin_vendedor_zona), `Conversacion` (lead_id único, vendedor_id, estado abierta/cerrada/transferida, canal whatsapp/instagram/web_chat), `Mensaje` (remitente_tipo vendedor/lead/sistema, `detectado_sin_stock`). Registradas en `dataBaseConfig.ts` (`synchronize: false`).

#### Endpoints (backend)
- Públicos (sin JWT): `POST /leads/web` (formulario), `POST /leads/instagram` (HMAC), `POST /conversaciones/webhook/:leadId` (HMAC), **`GET /webhook/whatsapp` (verificación de suscripción Meta)** y **`POST /webhook/whatsapp` (mensaje entrante, HMAC)**.
- Con JWT: `GET/POST /zonas`, `PUT/DELETE /zonas/:id`, `POST/DELETE /zonas/:id/vendedores(/:vendedorId)`, `GET /zonas/:id/vendedores`; `GET /leads` (+filtros zona/estado/origen/desde/hasta/page/limit), `GET /leads/:id`, `GET /leads/:id/historial-reasignaciones`, `PUT /leads/:id/asignar` (admin), `PUT /leads/:id/reasignar` (admin), `PUT /leads/:id/convertir`, `POST /leads/procesar-sla` (admin); `GET /conversaciones`, `GET /conversaciones/:id`, `GET /conversaciones/lead/:leadId`, `POST /conversaciones/lead/:leadId/abrir`, `POST/GET /conversaciones/:id/mensajes`, `DELETE /conversaciones/:id` (cierra). Vendedor solo ve sus leads/conversaciones; admin todo.

#### Seguridad
- `middlewares/validarHMACMeta.ts`: valida `X-Hub-Signature-256` con `META_APP_SECRET`/`WHATSAPP_APP_SECRET`. ⚠ **Fallos de HMAC abajo**. Para el webhook entrante de WhatsApp hay que configurar `META_APP_SECRET` (App Secret de la Meta App); sin él el middleware omite la validación (solo apto para pruebas locales).
- Roles vía `req.user.rol` (Punto 5) en controladores (asignar/reasignar/procesar-sla = admin).

#### ⚠ Fallos detectados en la revisión de flujo (18/08/2026) — estado actual

> Los **5 críticos y 1 menor** ya fueron **corregidos** (ver abajo). Quedan 3 menores 🟡 pendientes (ítems 9, 10 y los selects placeholder ya resueltos en el 7).

1. **🔴 → ✅ RESUELTO — NO existía migración para las 6 tablas nuevas.** Se creó `1750000000001-MarketingLeadsSchema.ts` (idempotente, `IF NOT EXISTS`) que crea `zonas`, `vendedor_zona`, `leads`, `reasignaciones`, `conversaciones`, `mensajes` + enums/índices/FKs. ⚠ Para aplicar en dev: compilar (`npm run build`) y reiniciar backend con `RUN_MIGRATIONS` no-false (creará las tablas). En producción habrá que desplegar y arrancar una vez para que las cree.
2. **🔴 → ✅ RESUELTO — Confusión de ids (supabase_id vs id de tabla) en leads/conversaciones/mensajes.** `jwtHandler` ahora expone `req.user.vendedor_db_id` (id de tabla `vendedores.id`) al leer el perfil. Todos los filtros/ownership de vendedor en leads y conversaciones usan `reqUser.vendedor_db_id` (antes `reqUser.id` = supabase_id). `enviarMensaje`/`abrirConversacion` guardan `vendedor_db_id` como `remitente_id`/`vendedor_id` → el frontend `ChatVentana` (`esMio = msg.remitente_id === currentUser?.id`) ahora funciona. `recibirMensajeExternoService` ya guardaba `lead.vendedor_asignado_id` (id de tabla, correcto).
3. **🔴 → ✅ RESUELTO — HMAC Meta roto.** `server.ts` captura el body crudo (`express.json({ verify })` → `req.rawBody`) y `validarHMACMeta` firma `req.rawBody` (bytes exactos del request), no `JSON.stringify(req.body)`.
4. **🔴 → ✅ RESUELTO — Sin rate limiting.** Instalado `express-rate-limit`. Nuevo `middlewares/rateLimiter.ts` con `limiterPublico` (30 req/15min) para `POST /leads/web` y `limiterWebhook` (60 req/15min) para `POST /leads/instagram` y `POST /conversaciones/webhook/:leadId`.
5. **🔴 → ✅ RESUELTO — SLA excluía `reasignado`.** `getLeadsSLAVencido` ahora monitorea `['asignado','contactado','reasignado']`. Las consultas de carga (`asignarLeadAutomatico` y `procesarSLAVencidos`) también cuentan `reasignado` como activo para reparto justo.
6. **🟡 → ✅ RESUELTO — `useLeads` (frontend) no enviaba `desde`/`hasta`.** Ahora el hook acepta `desde`/`hasta` en los filtros, los agrega a los query params y su tipo de retorno es `LeadsResponse` (`{ data: Lead[], total, page, limit, totalPages }`). El `MarketingDashboard` los envía y el filtro de fechas funciona. (Resuelto con el tipado del dashboard.)
7. **🟡 → ✅ RESUELTO (21/08) — Selects de zonas/vendedores en `Leads.tsx` y `Zonas.tsx` eran placeholders** (opciones vacías con comentarios "vendrían de otro hook"). Se conectaron: `Zonas.tsx` usa `useVendedores` (lista de vendedores del backend) en el select de asignación y `useDesasignarVendedorZona` en el botón X de cada vendedor; `Leads.tsx` usa `useZonas` (select por lead para asignar + filtro por zona) y `useVendedores` en el modal de reasignar.
8. **🟡 → ✅ RESUELTO (menor) — `enviarMensajeService` no validaba ownership.** Ahora recibe `reqUser` y rechaza (403) si un vendedor escribe en una conversación ajena (aislamiento de chat, igual que `getMensajesService`).
9. **🟡 `getLeadsPorVencerSLA` (repo) está roto** (`asignado_en: new Date(...)` con `find` no soporta comparador `<`) — es código muerto, usar el QueryBuilder `getLeadsSLAVencido`. (Pendiente)
10. **🟡 `procesarSLAVencidos` usa `(await import('../config/dataBaseConfig'))`** dentro del loop para obtener `AppDataSource` — feo pero funciona; se puede importar arriba. (Pendiente)

#### Archivos del feature
**Backend**
- `entities/{Zona,VendedorZona,Lead,Reasignacion,Conversacion,Mensaje}.ts`; `entities/Vendedores.ts` (relación `zonas`); `config/dataBaseConfig.ts` (entidades registradas).
- `repositories/{zonas,leads,conversaciones,mensajes}Repository.ts`; `services/{zonas,leads,conversaciones}Services.ts`; `controllers/{zonas,leads,conversaciones}Controllers.ts`; `routes/{zonas,leads,conversaciones}Routes.ts` (montados en `indexRoutes.ts`).
- `middlewares/validarHMACMeta.ts`; `worker/slaMonitor.ts` (intervalo 15 min, `SLA_HOURS` default 12; arranca en `index.ts` con graceful shutdown).

**Frontend**
- `hooks/useApi.ts`: sub-hooks `useZonas`, `useCrearZona`, `useActualizarZona`, `useEliminarZona`, `useAsignarVendedorZona`, `useDesasignarVendedorZona`, `useVendedoresDeZona`, `useLeads`, `useLeadById`, `useCrearLeadWeb`, `useAsignarLead`, `useReasignarLead`, `useConvertirLead`, `useHistorialReasignaciones`, `useConversaciones` (polling 60s), `useConversacionById`, `useConversacionByLead`, `useAbrirConversacion`, `useEnviarMensaje`, `useMensajes` (polling 5s), `useCerrarConversacion`.
- `types/index.ts`: tipos `Zona`, `VendedorZona`, `Lead`, `Reasignacion`, `Conversacion`, `Mensaje` y unions.
- `pages/zonas/Zonas.tsx` (admin, `/zonas`), `pages/leads/Leads.tsx` (admin, `/leads`), `pages/chat/ChatLista.tsx` + `ChatVentana.tsx` (vendedor y admin, `/chat`, `/chat/:id`), `pages/marketing/MarketingDashboard.tsx` (admin, `/marketing`).
- `App.tsx` (rutas nuevas) y `components/layout/Sidebar.tsx` (enlaces "Mis Leads" y "Chats" para vendedor; "Zonas", "Todos los Leads", "Chats" y "Marketing" para admin).
- `pages/chat/ChatLista.tsx` **agrupado por vendedor** (21/08): si el usuario es admin, agrupa las conversaciones por vendedor (tarjeta por vendedor con conteo); si es vendedor, lista simple (el backend ya filtra por rol). El admin ve todas las conversaciones y puede abrir/responder cualquiera; el vendedor solo las suyas (403 en el backend si intenta ver ajenas — verificado).

#### Webhook entrante de WhatsApp (Fase 2) ✅ implementado (backend)

> **Flujo**: cliente escribe por WhatsApp al número de negocio → Meta Cloud API hace `POST` al webhook → backend **crea/actualiza el lead** según el teléfono y guarda el mensaje. Si el lead ya tiene vendedor asignado, el mensaje cae en su conversación; si no, se acumula en `metadata.mensajes_pendientes` y se siembra al abrir la conversación (`abrirConversacionParaLead`).

- **Endpoint**: `GET /webhook/whatsapp` (verificación de suscripción: `hub.mode`, `hub.verify_token` → `META_VERIFY_TOKEN`, `hub.challenge` → responde con el challenge en texto plano) y `POST /webhook/whatsapp` (payload real de Meta, validado con `validarHMACMeta`). Ambos públicos (sin JWT), el POST con `limiterWebhook`.
- **Migración nueva**: `1750000000002-WhatsappInboundSchema.ts` — agrega `'whatsapp'` a `leads_origen_enum` y `'whatsapp_mensaje'` a `leads_canal_entrada_enum` (idempotente, revisa `pg_enum`).
- **Servicio** `services/whatsappWebhookServices.ts`:
  - `verificarWebhookWhatsApp(query)`: valida `META_VERIFY_TOKEN` y devuelve el challenge.
  - `procesarWebhookWhatsApp(payload)`: itera `entry[].changes[].value.messages[]`, extrae `from` (teléfono), nombre del contacto y texto. Para cada mensaje:
    - **Dedupe**: si el `wamid` ya existe (en `mensajes.metadata.wamid` o en `lead.metadata.wamid/wamids`) se ignora (Meta reenvía el mismo webhook varias veces).
    - Sin lead → crea lead `origen='whatsapp'`, `canal_entrada='whatsapp_mensaje'`, `estado='nuevo'`, `datos_contacto={nombre, telefono, mensaje_inicial}`, `metadata={wamid, wamids[], phone_number_id, mensajes_pendientes[]}`.
    - Lead con vendedor asignado → asegura conversación (la crea si falta) y guarda el mensaje con `remitente_tipo='lead'`.
    - Lead sin vendedor → acumula en `metadata.mensajes_pendientes` y agrega el `wamid` a `metadata.wamids`.
- **Repos**: `getLeadByTelefono` en `leadsRepository.ts` (compara `datos_contacto->>'telefono'` normalizado a dígitos, últimos 10) y `mensajeExistePorWamid` en `mensajesRepository.ts`.
- **Envío saliente** ✅: `utils/sendWhatsapp.ts` exporta `sendWhatsAppText(to, body, phoneNumberId?)` (texto libre, API v19.0 de Meta; usa `META_PHONE_ID` por defecto o el `phone_number_id` guardado en `metadata` del lead al recibir el webhook). `enviarMensajeService` lo llama cuando `remitenteTipo='vendedor'` y `conv.canal='whatsapp'`: guarda en DB primero y luego intenta enviar por la API de Meta dentro de la ventana de 24h. Si falla (ventana cerrada, token inválido) NO rompe el flujo: guarda el error en `metadata.error_envio` del mensaje. El `wamid` de salida se guarda en `metadata.wamid_envio`.
- **Archivos**: `routes/whatsappWebhookRoutes.ts`, `controllers/whatsappWebhookControllers.ts`, `services/whatsappWebhookServices.ts`, migración `1750000000002-WhatsappInboundSchema.ts`, `repositories/leadsRepository.ts` y `repositories/mensajesRepository.ts` (helpers), `services/conversacionesServices.ts` (siembra de pendientes + envío saliente), `utils/sendWhatsapp.ts` (envío). Montado en `routes/indexRoutes.ts`.
- **Frontend**: `types/index.ts` (`OrigenLead`/`CanalEntrada` + `whatsapp`) y `pages/leads/Leads.tsx` (label + filtro "WhatsApp").
- **Env**: `META_VERIFY_TOKEN` (lo configuras tú y en Meta Dashboard) y `META_APP_SECRET` (App Secret de la Meta App, para HMAC; sin él se omite la validación → solo pruebas locales). Añadidas a `backend/.env.example`.
- **Zonas y vendedores (seeded en DB dev 21/08)**: 12 zonas creadas (`Centro Occidente`, `Llanos`, `Centro`, `Oriente`, `Miranda`, `Guarenas`, `Guatire`, `La Guaira`, `Guarico`, `Apure`, `Maracaibo`, `Maracay`) y asignaciones en `vendedor_zona`: Norangel Guedez → Centro Occidente/Llanos/Centro; Heidy Daza → Oriente; Carlos Araujo → Miranda/Guarenas/Guatire/La Guaira; Mairim Reyes → Guarico/Apure/Maracay; Yraiza Belisario → Maracay. ⚠ `Maracaibo` no tiene vendedor asignado (definir quién la atiende).

#### Cómo probar (tras crear la migración y corregir los fallos)
- Crear zona + asignarle vendedores → `POST /zonas` y `POST /zonas/:id/vendedores`.
- Crear lead web → `POST /leads/web` (sin token) → se asigna automáticamente al vendedor con menor carga de su zona.
- Con vendedor: ver sus leads en `/leads` (⚠ requiere fix #2 del id), abrir conversación y enviar mensajes desde `/chat`.
- Admin: ver todos los leads, reasignar manualmente, ver historial de reasignaciones, ejecutar SLA manual (`POST /leads/procesar-sla`), dashboard `/marketing`.
- Webhook WhatsApp: `GET /webhook/whatsapp?hub.mode=subscribe&hub.verify_token=<META_VERIFY_TOKEN>&hub.challenge=123` → responde `123`. `POST /webhook/whatsapp` con payload de Meta → crea/actualiza lead; repetir el mismo `id` (wamid) → `duplicado_ignorado`.

#### Pendiente Fase 2/3
- ⚠ **Token permanente o refresh de `META_TOKEN`**: el envío saliente usa el token actual que expira (~24h); para producción hay que usar un token permanente o renovarlo automáticamente.
- Verificación de negocio Meta (producción) para desplegar el webhook en `https://crmsumichen.com/api/webhook/whatsapp`.
- Email recordatorio por SLA vencido vía **Resend** (`RESEND_API_KEY`) cuando no hay vendedor disponible en la zona.
- Detección de "sin stock" por palabras clave (`detectado_sin_stock` ya existe en `Mensaje`).
- Definir los nombres reales de los 3 tipos de solicitud web (hoy placeholders).
- Definir vendedor para la zona `Maracaibo` (hoy sin asignar).

### Punto 12 — Transporte externo en pedidos + negociación de precio (24/08) ✅ (build/lint/typecheck OK backend y frontend)

> **Resumen**: (1) cuando el pedido es de **transporte externo**, se capturan los datos del conductor/vehículo (`transporte`: nombre, cédula, marca, modelo, placa) en el mismo `POST /pedidos`, se guardan en la tabla nueva `transporte` (asociada vía `pedidos.transporte_id`) y se pueden **editar después** desde el detalle del pedido. (2) `productos_pedido` ahora guarda `precio_base` y `porcentaje_negociacion`, y en el formulario de pedidos el **precio_unitario se calcula en el frontend**: `precio_base + precio_base * (porcentaje/100)` (porcentaje entero, ej. 10 = 10%).

#### Backend
- **Entidad** `Transporte` (renombrada de `Trasporte.ts` — typo — a `Transporte.ts`; import actualizado en `dataBaseConfig.ts` y `Pedidos.ts`). La relación rota de `Pedidos.ts` (`@JoinColumn` sin decorador de relación, rompía TypeORM en runtime) se corrigió a `@OneToOne(() => Transporte, t => t.pedido, { nullable: true, cascade: true, eager: true })` + `@JoinColumn({ name: 'transporte_id' })` en el campo `transporte_detalle?` (nombrado así para no chocar con el enum `transporte`).
- **Migración** `1787524209000-TransporteSchema.ts` (idempotente): crea la tabla `transporte` (id uuid PK, nombre, cedula, marca, modelo, placa) y `ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS transporte_id uuid` + índice + FK `ON DELETE SET NULL`.
- **Módulo `/transporte`**: `routes/transporteRoutes.ts` montado en `indexRoutes`, con:
  - `GET /transporte/pedido/:pedidoId` (JWT) → transporte del pedido o 404.
  - `PUT /transporte/pedido/:pedidoId` (JWT) → crea el transporte si el pedido no tiene, o lo actualiza.
  - Capa completa routes → controllers (`transporteControllers.ts`) → services (`transporteServices.ts`) → repositories (`transporteRepository.ts` con `getTransporteByPedidoId`, `createTransporte`, `updateTransporte`, `setPedidoTransporte`).
- **DTO `CrearPedidoDto`**: `Producto_pedido` ahora declara `precio_base` y `porcentaje_negociacion`; el DTO acepta el objeto opcional `transporte_detalle`.
- **`createPedidosService`**: si `transporte === 'externo'` y viene `transporte_detalle`, se crea/inserta el transporte vía cascade de la relación al guardar el pedido (guard extra: no crea si el transporte no es externo). Los `precio_base`/`porcentaje_negociacion` pasan tal cual a `createProductosPedido` (spread existente).

#### Frontend
- **Tipos**: `Transporte`, `Pedido.transporte_detalle?`, `formProducto` con `precio_base` + `porcentaje_negociacion`, `PedidoDb.transporte_detalle?`, `ProductoDb` con los 2 campos, `ProductoPedido` con `precio_base?`/`porcentaje_negociacion?`, `PedidoData.transporte_detalle?`.
- **`SelectProductos.tsx`**: cada producto seleccionado ahora tiene inputs **Precio Base ($)** y **% Negociación**; `precio_unitario` se recalcula automáticamente (`precio_base + precio_base * porcentaje/100`) y su input pasó a **solo lectura**. Se eliminó el `console.log(seleccion)` y el handler obsoleto `cambiarPrecio`.
- **`CrearPedido.tsx`**: cuando `transporte === 'externo'` se muestra el bloque "Datos del Transporte" (nombre, cédula, marca, modelo, placa) en el mismo formulario; se envía `transporte_detalle` solo si el transporte es externo.
- **`useApi.ts`**: `useCrearPedido` envía `precio_base`/`porcentaje_negociacion` por producto y `transporte_detalle` en el body (solo si externo). Nuevos hooks `useTransportePedido(pedidoId)` (query `GET /transporte/pedido/:id`) y `useGuardarTransporte()` (mutation `PUT /transporte/pedido/:id`, invalida `['transporte', pedidoId]` y `['pedidos']`). Exportados.
- **`PedidosDetail.tsx`**: la card "Transporte" de "Detalles Adicionales" ahora muestra los datos del conductor/vehículo si el pedido es externo y un botón **"Editar transporte"** (visible para admin o el vendedor dueño del pedido) que abre el modal.
- **Nuevo `components/forms/EditarTransporteModal.tsx`**: formulario de los 5 campos + `useGuardarTransporte`, con toasts y cierre al guardar.

#### Cómo probar
- Crear pedido con transporte `externo` → los 5 campos viajan en el body y se crea la fila en `transporte` (verificar en DB con `SELECT * FROM transporte`).
- Abrir el detalle de un pedido externo → ver los datos y editarlos con "Editar transporte" → se actualiza la fila.
- En el formulario, elegir un producto, cambiar `precio_base` y `% Negociación` → `precio_unitario` se recalcula en vivo; al guardar, `productos_pedido` guarda los 3 valores.

#### ⚠ Notas / deuda
- El botón "Editar" de la lista de pedidos (`Pedidos.tsx`) sigue sin acción (no es parte de esta feature; la edición de transporte se hace desde el detalle).
- `EditarPedido.tsx` no se tocó (no está conectado a ningún flujo); si algún día se activa, habría que replicar los campos de transporte y el calculador de precio.
- La migración `1787524208767-ActualizacionEntidades.ts` (creada por el usuario) agrega las columnas `precio_base`/`porcentaje_negociacion`; la nueva `1787524209000-TransporteSchema.ts` se ejecuta después y crea tabla/columna de transporte. Aplicar ambas compilando el backend y arrancando una vez.

### Punto 13 — Próximas Actividades + modal detalle + persistencia de listas (27/08) ✅ (build/lint OK frontend)

#### Feature — "Próximas Actividades" en el dashboard de vendedores
> Reemplaza el cuadro "Próximas Reuniones" por **"Próximas Actividades"**: mezcla las reuniones próximas con las actividades próximas (`llamada | email | reunion`) pendientes, ordenadas por fecha (ventana de 2 días, como el cuadro anterior).

- **`utils/actividades.ts`**: nuevos `ProximaActividadItem` (id, tipo, titulo, fecha, cliente_id, vendedor_id, **`origen: 'reunion' | 'actividad'`**), `obtenerActividadesProximas(actividades, dias = 2)` (filtra `!completado`, tipo `llamada|email|reunion`, `fecha` en `[hoy, hoy+2]`, ordena asc, corta a 4) y `obtenerProximasActividades(actividades, reuniones)` (une reuniones `origen:'reunion'` con actividades `origen:'actividad'`, ordena y corta a 6).
- **`DashboardVendedor.tsx`** y **`DashboarVendedorModal.tsx`**: el cuadro ahora usa `obtenerProximasActividades`, con ícono/color por tipo (`Calendar` azul para reunión/visita, `Phone` verde para llamada, `Mail` morado para correo), fecha formateada (`dddd a las HH:mm` para reuniones, `dddd DD/MM` para llamadas/correos) y columna empresa + vendedor (solo admin).
- ⚠ **Fix de duplicación (28/08)**: al crear una reunión, el backend (`backend/src/services/reunionesServices.ts` → `createReunionesService`) crea automáticamente una `Actividad` de tipo `reunion` con `id_tipo_actividad` = id de la reunión. Eso hacía que la misma reunión apareciera **2 veces** en el panel (una como `Reunion` y otra como su `Actividad` vinculada). Fix: `obtenerProximasActividades` excluye las actividades cuyo `id_tipo_actividad` coincida con el id de **cualquier** reunión (Set de ids). Las actividades tipo `reunion` creadas manualmente (sin `id_tipo_actividad`) siguen mostrándose.

#### Feature — Modal de detalle de actividad/reunión (abrir/leer/cerrar)
- **Nuevo `components/forms/ActividadDetalleModal.tsx`**: modal solo-lectura que recibe `{ item: { id, origen }, actividades, reuniones, clientes, vendedores, isOpen, onClose }`. Resuelve el registro (Actividad por id si `origen==='actividad'`, Reunión si `origen==='reunion'`), el cliente (empresa) y el vendedor (nombre). Muestra ícono por tipo, título, tipo, descripción, estado (actividad: completada/pendiente/vencida · reunión: estado), fechas (actividad: `fecha` y `fecha_vencimiento` · reunión: `fecha_inicio`–`fecha_fin`), ubicación si es reunión, empresa y vendedor. Cierre con botón X, botón "Cerrar" o clic fuera.
- **Wiring**: en `DashboardVendedor.tsx` y `DashboarVendedorModal.tsx`, las tarjetas de "Próximas Actividades" y "Actividades Recientes" son clicables (`cursor-pointer`, `onClick` → `setActividadSeleccionada({ id, origen })`) y renderizan el modal.

#### Feature — Persistencia del estado de vista de listas (pag/scroll)
> Al abrir el detalle de un cliente y volver a `/clientes`, se mantiene la página (y búsqueda/filtros). Al abrir el detalle de un pedido y volver a `/pedidos`, se restaura la posición de scroll donde estaba el pedido. Persistencia en `sessionStorage` (toda la sesión). Aplicado también a las variantes modal (`menuVendedor` móvil).

- **Nuevo `utils/vistaListas.ts`**: `guardarEstadoVista(clave, estado)` / `recuperarEstadoVista<T>(clave, defaults)` (sessionStorage JSON con try/catch), `getContenedorScroll()` (retorna `document.querySelector('main')` o `window`), `guardarScroll(clave)` / `restaurarScroll(clave)`.
- **`pages/clientes/Clientes.tsx`**: `page`, `searchTerm`, `filterEstado` y `soloNuevos` se inicializan desde `recuperarEstadoVista("clientes:vista", ...)` y se guardan en unmount (effect cleanup). Se agregó `paginaEfectiva = Math.min(page, Math.max(1, totalPages))` (clamp) usada en `slice`, contador y botones de paginación (evita página vacía si cambian los datos).
- **`pages/pedidos/Pedidos.tsx`**: `terminoBusqueda`/`filtroEstado` se restauran desde `recuperarEstadoVista("pedidos:vista", ...)`. El scroll se captura con un **listener** en el contenedor hacia `scrollTopRef` (porque al navegar el `main` del Layout se desmonta y leer el DOM en el cleanup daría 0) y se guarda en unmount junto con búsqueda/filtro. Se restaura **una sola vez** (ref flag) cuando los datos están listos (`hayPedidos`).
- **`pages/clientes/ClientesModal.tsx`** (clave `clientesModal:vista`): persiste `page`/`searchTerm`/`filterEstado`/`soloNuevos` + clamp de página (mismo patrón).
- **`pages/pedidos/PedidosModal.tsx`** (clave `pedidosModal:vista`): persiste `terminoBusqueda`/`filtroEstado`. No hace falta restaurar scroll en los modales: el detalle se abre como **modal anidado** (`setIsOpenDetalle`/`setPedidoSeleccionado`), así que la lista queda montada.

#### Feature — Filtros avanzados de clientes (RIF/ciudad/sector/buscar en notas)
- En `pages/clientes/Clientes.tsx` y `pages/clientes/ClientesModal.tsx`:
  - La búsqueda "Buscar..." ahora coincide con **RIF, empresa, contacto (nombre/apellido/email/teléfono) y ciudad** (antes solo nombre/apellido/empresa/email). Placeholder dinámico: "Buscar en notas del cliente..." si el check está activo, si no "Buscar por RIF, empresa, contacto o ciudad...".
  - Nuevo select **"Todos los sectores"** (opciones de `Object.values(CustomerSector)`) combinado con AND a los demás filtros.
  - Nuevo check **"Buscar solo en notas del cliente"**: si está activo, el término solo se compara contra `cliente.notas` (clientes sin notas no matchean un término no vacío); si está inactivo, busca por RIF/empresa/contacto/ciudad.
  - Ambos filtros se persisten en `sessionStorage` (`filterSector`, `buscarSoloNotas`) junto al resto del estado de vista (compatible con datos guardados previos por el merge de `recuperarEstadoVista`).
- ⚠ Nota: el código lo generó el modelo local `deepseek-coder:6.7b`; se corrigió un bug que generó (`notas?.includes(...) ?? true` hacía que clientes sin notas coincidieran con cualquier término).

#### Feature — Catálogo de productos en el asistente WhatsApp (27/08) ✅ (build/lint OK backend y frontend)
> En las opciones de intención del asistente ("Menú de Bienvenida" en `/marketing`) se eliminan **Información** y **Soporte**, quedando solo **Cotización** y **Catálogo**. El mensaje de confirmación ahora muestra el **nombre + teléfono del vendedor** asignado. Si el cliente elige **Catálogo**, el bot genera un **PDF** con los productos del inventario diario (Excel) y lo envía por WhatsApp como documento.

- **Backend**:
  - **Migración** `1750000000004-CatalogoTipoWebEnum.ts` (idempotente): agrega `'catalogo'` a `leads_tipo_web_enum` (patrón `DO $$ ADD VALUE IF NOT EXISTS`) y actualiza la fila `menu_bienvenida` existente (opciones `[{Cotización},{Catálogo}]` + `mensaje_confirmacion` con `{telefono_vendedor}`).
  - `entities/Lead.ts`: `TipoWebEnum.CATALOGO = 'catalogo'`. `entities/MenuBienvenida.ts`: `OpcionIntencion.tipo_web` incluye `'catalogo'` y defaults actualizados. `services/menuBienvenidaServices.ts`: `tiposValidos` incluye `'catalogo'`.
  - **`utils/catalogoProductos.ts`** (nuevo): `generarCatalogoPDF()` descarga `inventario.xlsx` del bucket `inventario` (Supabase Storage), lo parsea con `exceljs` (detecta encabezado + columnas **Nombre** y **Descripción** por nombre) y arma un PDF con `pdfkit` (encabezado **SUMICHEM · RIF J-406007986 · Contacto 0424-4368661**, título "Catálogo de Productos", lista numerada nombre+descripción).
  - **`utils/sendWhatsapp.ts`**: nueva `sendWhatsAppDocument(to, pdfBuffer, filename, caption?, phoneNumberId?)` (sube el PDF a `/media` de Meta → media_id → mensaje `type: 'document'`; usa `FormData` global de Node 22).
  - **`services/asistenteMenuServices.ts`**: `procesarRespuestaIntencion` reemplaza `{telefono_vendedor}` con `lead.vendedor_asignado.telefono`; si `tipo_web === 'catalogo'` genera y envía el PDF (no bloqueante, try/catch) tras la confirmación.
- **Frontend**: `types/index.ts` (`TipoWeb`/`OpcionIntencion` incluyen `'catalogo'`); `MarketingDashboard.tsx` el select de opciones pasa a Cotización/Catálogo y el hint de confirmación incluye `{telefono_vendedor}`.
- ⚠ Notas: la generación del catálogo requiere que exista `inventario/inventario.xlsx` en Supabase Storage (se sube con `POST /productos/excel`). Si el Excel no existe/falla, el asistente solo envía la confirmación (no rompe el flujo). Los textos siguen siendo editables en `/marketing`.

#### Notas / deuda
- El código de estos features se generó con el **modelo local** `deepseek-coder:6.7b` (vía Ollama) y se revisó/corrigió manualmente antes de aplicar (el modelo suele soltar typos y asumir imports/rutas que no existen; además propone a veces reemplazar `useState` por destructuración directa, lo que rompe los setters).
- La persistencia es por **sesión** (sessionStorage), no permanente entre pestañas/sesiones.
- `vistaListas` usa `document.querySelector('main')` (único Layout activo en las rutas principales); en contextos sin Layout (ej. `VendedorPanel` embebido) el fallback es `window`, así que el scroll se restaura sobre la ventana.

### Punto 14 — Descargas DB: fix reuniones + columnas nuevas + descargas de marketing (28/08) ✅ (build/lint/typecheck OK backend y frontend)

> **Resumen**: (1) las **reuniones ya NO aparecen** en la descarga de **actividades**. (2) El export de **pedidos** ahora incluye **Precio Base** y **% Negociación** de `productos_pedido`. (3) El export de **clientes** ahora incluye **Sector**, **Dirección de Entrega**, **Google Maps**, **Estado Anterior** y **Fecha de Cambio de Estado**. (4) Nuevas descargas de marketing: **Zonas**, **Leads** y **Chats** (historial completo, una fila por mensaje). (5) Cuando una tabla está vacía, el backend responde `404 { message: "No hay ... para exportar" }` y el frontend muestra ese mensaje en un toast (antes daba 500 + "Error al descargar el archivo").

#### Backend
- **`utils/exportActividades.ts`**: filtra `actividades.filter(a => a.tipo !== 'reunion')` — el backend crea una `Actividad` tipo `reunion` con `id_tipo_actividad` automáticamente al registrar cada reunión, y esa duplicación hacía que las reuniones aparecieran en actividades y en reuniones.
- **`utils/exportPedidos.ts`**: columnas `Precio Base` (`pp.precio_base`) y `% Negociación` (`pp.porcentaje_negociacion`) entre "Precio Unitario" y "Total por Producto".
- **`utils/exportClientes.ts`**: columnas `Sector` (`cliente.sector`), `Dirección de Entrega` (`direccion_entrega`), `Google Maps` (`google_maps`), `Estado Anterior` (`estado_anterior`) y `Fecha de Cambio de Estado` (`fecha_estado`, formateada `es-VE`).
- **Repos**: `zonasRepository.getZonasParaExport()` (TODAS las zonas, activas e inactivas, con `vendedores.vendedor`), `leadsRepository.getLeadsParaExport()` (todos con `vendedor_asignado`/`zona`/`cliente`, sin paginación) y `conversacionesRepository.getConversacionesParaExport()` (todas con `lead`/`vendedor`/`mensajes`). Services wrappers en `zonasServices`/`leadsServices`/`conversacionesServices`.
- **Utils nuevos** (guardan en `backend/exports/`):
  - `exportZonas.ts` → Nombre, Descripción, Estados (jsonb unidos por "; "), Vendedores asignados, Activa (Sí/No), fechas.
  - `exportLeads.ts` → Origen, Tipo de Solicitud (`tipo_web`), Canal de Entrada, Estado, Zona, Vendedor Asignado, Nombre, Teléfono, Email, Instagram, Mensaje Inicial, Cliente Convertido, Asignado En, Última Actividad En, fechas.
  - `exportChats.ts` → **historial completo** (una fila por mensaje): Conversación ID, Lead, Teléfono, Vendedor, Canal, Estado Conversación, Remitente (Lead/Vendedor/Sistema + nombre), Contenido, Tipo Mensaje, Sin Stock, Fecha. Conversaciones sin mensajes agregan una fila "Sin mensajes".
- **Controllers `descargasControllers.ts`**: helpers `esErrorSinDatos` (mensajes que empiezan con "No hay") y `manejarError` → responde **404** con el mensaje específico ("No hay X para exportar") cuando la tabla está vacía; en otros errores sigue con 500 genérico. Aplica a los 8 endpoints.
- **Rutas nuevas** (JWT, en `descargasRoutes.ts`): `GET /descargas/zonas`, `GET /descargas/leads`, `GET /descargas/chats`.

#### Frontend
- **`pages/descargas/DescargasDB.tsx`**: 3 tarjetas nuevas (Zonas `MapPin`, Leads `Target`, Chats `MessageSquare`). `handleDescargar` ahora lee el JSON de error y muestra `data.message` en el toast (ej. "No hay leads para exportar") cuando el backend responde 404/500 con mensaje.

#### Cómo probar
- Con la DB dev (metas/leads/chats vacíos): pulsar "Descargar" en Metas/Leads/Chats → toast informativo "No hay metas/leads/conversaciones para exportar" (ya no 500).
- Crear datos y descargar → el XLSX baja con las columnas nuevas.

#### ⚠ Notas / deuda
- Los endpoints `/descargas/*` solo exigen JWT (no rol admin en el backend); el gate admin sigue siendo solo del frontend (`session.user.user_metadata.rol`). No se tocó en esta sesión.
- `getLeadsParaExport`/`getConversacionesParaExport`/`getZonasParaExport` cargan TODOS los registros sin paginación: con volumenes muy grandes convendría revisar el tamaño del XLSX generado.

### Punto 15 — PWA instalable + Web Push + Acceso biométrico (28/08) ✅ (build/lint/typecheck OK backend y frontend)

> **Resumen**: (1) el CRM ahora es una **PWA instalable** en Android, iOS y Windows (manifest + service worker + iconos). (2) **Notificaciones push por dispositivo** (Web Push con VAPID): cada usuario instala la app y activa el permiso desde Configuración → "Notificaciones en este dispositivo"; el backend guarda la suscripción (`push_suscripciones`) y expone `enviarPushAUsuario`/`enviarPushAAdmins` listos para cablear eventos. (3) **Acceso biométrico (WebAuthn/passkey)**: el usuario registra su huella/rostro en Configuración → Seguridad y luego entra con "Entrar con huella" desde el Login (sin email/contraseña).

#### Feature — PWA instalable (manifest + service worker + iconos)
- **`project/public/`** (Vite lo copia a `dist/`):
  - `manifest.webmanifest`: name **Sumichem CRM**, short_name **Sumichem**, `start_url: "./"`, `scope: "./"`, `display: "standalone"`, `theme_color #2563eb`, `background_color #f3f4f6`, `lang: es`, iconos 192/512/maskable.
  - `sw.js`: service worker con `push` (muestra notificación), `notificationclick` (abre/enfoca la app en la ruta de `data.url`), y `fetch` **network-first** solo para recursos estáticos same-origin (app-shell). NO cachea la API.
  - `icons/`: `icon-192.png`, `icon-512.png`, `maskable-512.png`, `apple-touch-icon.png` (180) generados desde `icon-source.svg` (editable). Script: `backend/scripts/generarIconosPwa.js` (usa `sharp`). Para cambiar el logo: reemplazar el SVG y re-ejecutar.
- **`index.html`**: `<link rel="manifest">`, `theme-color`, metatags iOS (`apple-mobile-web-app-capable`, status-bar, title), `apple-touch-icon`, favicon PNG.
- **`src/lib/registrarServiceWorker.ts`**: registra `/sw.js` solo en `import.meta.env.PROD` (no interfiere con el dev/HMR). Llamado desde `main.tsx`.
- **Botón "Instalar app"** (hook `src/hooks/useInstalarApp.ts`): aparece **solo si la app NO está instalada** y es instalable:
  - Captura `beforeinstallprompt` (Chrome/Edge/Android/Windows: solo dispara si es instalable y no instalada) y `appinstalled`.
  - Se oculta si ya corre en modo `standalone` (`matchMedia('(display-mode: standalone)')` o `navigator.standalone`).
  - En **iOS** no hay `beforeinstallprompt`: el botón se muestra mientras no esté instalada y abre `InstalarAppModal` con los pasos de "Añadir a pantalla de inicio" (requiere iOS 16.4+ para push).
  - Ubicación: **`Sidebar.tsx`** (encima de "Cerrar Sesión", visible en todas las páginas tras el login) y en **Configuración → Notificaciones**.

#### Feature — Notificaciones push por dispositivo (Web Push)
- **Backend**:
  - Dep: `web-push` + `@types/web-push`. Llaves VAPID generadas con `backend/scripts/generarVapid.js` → `backend/.env` (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) y `project/.env` (`VITE_VAPID_PUBLIC_KEY`). Documentadas en ambos `.env.example`.
  - Entidad `PushSuscripcion` (tabla `push_suscripciones`): `vendedor_id` (FK `vendedores.id` = **id de tabla**), `endpoint` UNIQUE, `p256dh`, `auth`, `dispositivo`, fechas. Registrada en `dataBaseConfig.ts`.
  - Migración `1787524209200-PushSuscripcionSchema.ts` (idempotente). **Aplicada en dev** (tabla verificada en DB).
  - Módulo `/push` (JWT, patrón routes→controllers→services→repository):
    - `POST /push/suscripcion` (upsert por endpoint + `req.user.vendedor_db_id`), `DELETE /push/suscripcion` (body `{endpoint}`), `GET /push/suscripciones`, `POST /push/test`.
    - `services/pushServices.ts`: inicializa VAPID al arrancar; **`enviarPushAUsuario(vendedorDbId, {titulo, cuerpo, url, tag})`** y **`enviarPushAAdmins({...})`** quedan listos para los eventos de negocio (pedidos, mensajes de lead, asignación/SLA, etc.) — **aún no cableados**. Limpieza automática de suscripciones 404/410.
- **Frontend**:
  - `src/lib/push.ts`: `urlBase64ToUint8Array`, `soportaPush()`, `tipoEstadoPermiso()`, `suscribirPush()` (SW → `Notification.requestPermission()` → `pushManager.subscribe({applicationServerKey})` → `POST /push/suscripcion`), `desuscribirPush(endpoint)`, `listarSuscripciones()`, `enviarPushDePruebaFront()`.
  - `src/hooks/useNotificacionesPush.ts`: estado del permiso (`no_soportado`/`denegado`/`pendiente`/`activado`), `activar`, `desactivar(endpoint)`, `enviarPrueba`, y query `["push","suscripciones"]` (React Query).
  - UI en **Configuración → Notificaciones**: botón "Activar notificaciones", estado, botón "Enviar notificación de prueba", lista de dispositivos suscritos (con eliminar) y botón "Instalar app".

#### Feature — Acceso biométrico (WebAuthn / passkey)
- **Backend**:
  - Dep: `@simplewebauthn/server` (v13). Env: `RP_ID` (prod: `crmsumichen.com` | dev: `localhost`), `RP_ORIGIN` (origen del **frontend**), `RP_NAME`.
  - Entidad `CredencialBiometrica` (tabla `credenciales_biometricas`): `supabase_id`, `credential_id` UNIQUE, `public_key` (COSE base64url), `counter`, `dispositivo`. Migración `1787524209300-CredencialBiometricaSchema.ts` (idempotente, **aplicada en dev**).
  - Módulo `/auth/biometric`:
    - JWT: `POST /registrar/inicio`, `POST /registrar/completar`, `GET /credenciales`, `DELETE /credenciales/:id`.
    - Públicos: `POST /login/inicio`, `POST /login/completar`.
  - `services/biometricServices.ts`: challenges **en memoria** (TTL 5 min, un solo uso); `residentKey: 'required'` (passkeys descubribles → login sin email); verificación de registro/autenticación y actualización de `counter`.
  - **Emisión de sesión sin contraseña**: `verifyLogin` usa la service role → `supabase.auth.admin.getUserById(supabase_id)` → `supabase.auth.admin.generateLink({type:'magiclink'})` → devuelve `token_hash`; el frontend hace `supabase.auth.verifyOtp({type:'magiclink', token_hash, email})` → sesión normal (el resto de la app funciona sin cambios).
- **Frontend**:
  - `src/lib/biometric.ts`: `soportaBiometria()`, `registrarBiometrico()` (crea passkey en el dispositivo), `iniciarSesionBiometrica()` (get + verifyOtp), `listarCredenciales()`, `eliminarCredencial(id)`. Usa la API nativa `navigator.credentials` (sin librería del lado cliente).
  - **Login.tsx**: botón "Entrar con huella" (Fingerprint) bajo el formulario.
  - **Configuración → Seguridad**: sección "Acceso Biométrico" con botón "Registrar este dispositivo", lista de dispositivos registrados y eliminar.

#### Cómo probar
- **Instalación**: desplegar/probar sobre HTTPS (o `vite preview` en localhost) → en el Sidebar aparece "Instalar app" → instalar → el botón desaparece (ya instalada). En iOS: el botón muestra las instrucciones de "Añadir a pantalla de inicio".
- **Push**: instalar → Configuración → Notificaciones → "Activar notificaciones" (permiso del navegador) → "Enviar notificación de prueba" → debe llegar la notificación al dispositivo (incluso con la pestaña cerrada). Verificar la tabla `push_suscripciones`.
- **Biometría**: Configuración → Seguridad → "Registrar este dispositivo" (Windows Hello/Touch ID/Face ID/PIN) → cerrar sesión → en Login "Entrar con huella" → sesión iniciada.

#### ⚠ Notas / deuda
- **Eventos de negocio NO cableados aún**: `enviarPushAUsuario`/`enviarPushAAdmins` están listos; falta decidir qué eventos disparan push (nuevo pedido → admin, mensaje de lead → vendedor, lead asignado → vendedor, SLA → admin). Pendiente de la próxima sesión.
- **Deploy producción**: 1) copiar las llaves VAPID y `RP_ID`/`RP_ORIGIN` reales a los `.env` del VPS; 2) desplegar el frontend `dist/` completo (incluye `manifest.webmanifest`, `sw.js`, `icons/`); 3) el servidor web debe servir esos archivos desde la raíz con HTTPS y **no cachear `sw.js`**; 4) arrancar el backend una vez para aplicar las 2 migraciones nuevas.
- Los challenges de WebAuthn viven en memoria (única instancia del backend en el VPS): si hay varios procesos, hay que moverlos a Redis/DB.
- iOS: push requiere iOS 16.4+; instalación manual desde Safari.
- `useInstalarApp` usa `navigator.platform` (deprecado pero funcional) para detectar iPadOS.
- Las llaves VAPID generadas están en los `.env` locales (NUNCA comitear). Si se rotan, las suscripciones existentes siguen funcionando (el par de llaves se usa para firmar, no para identificar la suscripción).

## 9. Punto de partida sugerido para la próxima actualización

- Los 10 puntos de esta sesión + el **feature "Registrar Usuarios"** están completos y verificados (build/lint/tsc en frontend y backend). En producción (18/08) ya se verificó que los 4 admins tienen `rol='admin'` y `supabase_id` poblado en el Postgres del VPS → **no requiere acciones manuales de SQL**. Supabase se usa solo para auth + storage, así que los SQL de migración no se aplican a producción (legacy).
- **Punto 12 / Feature "Transporte y negociación en pedidos"** ✅ (24/08): transporte externo con datos de conductor/vehículo capturados en el `POST /pedidos` y editables desde el detalle (`GET/PUT /transporte/pedido/:pedidoId`, JWT), más `precio_base`/`porcentaje_negociacion` en `productos_pedido` con cálculo de `precio_unitario` en el frontend. Ver Punto 12 en §8. ⚠ **Para aplicar la migración en dev**: compilar el backend (`npm run build`) y arrancar una vez (crea la tabla `transporte` y `pedidos.transporte_id`; no toca las columnas ya migradas).
- **Punto 13 / Features del dashboard + persistencia de listas** ✅ (27/08): cuadro "Próximas Actividades" (mezcla reuniones + actividades de los próximos 2 días con íconos por tipo), modal de detalle `ActividadDetalleModal` clicable desde "Próximas Actividades" y "Actividades Recientes" de `DashboardVendedor`/`DashboarVendedorModal`, fix de duplicación de reuniones (el backend crea una Actividad vinculada por `id_tipo_actividad`, ahora excluida), persistencia del estado de vista de listas en `sessionStorage` (`utils/vistaListas.ts`: clientes conserva página+búsqueda+filtros, pedidos conserva scroll+búsqueda+filtro, incluidas las variantes modal), **filtros avanzados de clientes** (búsqueda por RIF/empresa/contacto/ciudad, select de sector y check "buscar solo en notas") y **catálogo de productos en el asistente WhatsApp** (opción Catálogo → PDF con el inventario diario, migración `1750000000004`, `utils/catalogoProductos.ts`, `sendWhatsAppDocument`). Ver Punto 13 en §8.
- **Punto 14 / Descargas DB** ✅ (28/08): fix de reuniones duplicadas en el export de actividades, columnas nuevas en pedidos (Precio Base, % Negociación) y clientes (Sector, Dirección de Entrega, Google Maps, Estado Anterior, Fecha de Cambio de Estado), 3 descargas nuevas de marketing (Zonas, Leads, Chats) y aviso "No hay X para exportar" en toast cuando la tabla está vacía (404 con mensaje) en vez de error genérico. Ver Punto 14 en §8.
- **Punto 15 / PWA + Web Push + Biometría** ✅ (28/08): el CRM es ahora una **PWA instalable** (Android/iOS/Windows) con botón "Instalar app" en el Sidebar (visible solo si no está instalada), **notificaciones push por dispositivo** (Web Push con VAPID; suscripciones en `push_suscripciones`; UI en Configuración → Notificaciones con prueba de punta a punta) y **acceso biométrico** (WebAuthn/passkey: registro en Configuración → Seguridad y "Entrar con huella" en el Login). Migraciones `1787524209200` y `1787524209300` **aplicadas en dev**. ⚠ **Eventos de negocio NO cableados aún** (usar `enviarPushAUsuario`/`enviarPushAAdmins` en `backend/src/services/pushServices.ts`). Ver Punto 15 en §8.
- **Feature "Marketing / Leads (Fase 1)"**: backend + frontend **compilan** (build/lint/typecheck OK) y los **5 fallos críticos + 4 menores ya están corregidos** (migración `1750000000001-MarketingLeadsSchema.ts`, ids `vendedor_db_id`, HMAC raw body, rate limiting, SLA con `reasignado`, ownership de `enviarMensaje`, el filtro de fechas del dashboard con `useLeads` tipado a `LeadsResponse`, los selects de zonas/vendedores conectados en `Leads.tsx`/`Zonas.tsx`, y el array-en-where de TypeORM corregido con `In()`). Queda **1 menor 🟡** (import dinámico en `procesarSLAVencidos`). ⚠ **Para probar en dev**: compilar backend (`npm run build`) y reiniciar (aplica la migración nueva creando las tablas). En producción habrá que desplegar y arrancar una vez.
- **Feature "Webhook WhatsApp entrante + envío saliente (Fase 2)"** ✅ backend implementado y probado en dev (build/lint/typecheck OK): verificación `GET /webhook/whatsapp`, recepción `POST /webhook/whatsapp` con HMAC, creación/actualización de lead por teléfono, dedupe por wamid, acumulación de pendientes en `metadata.mensajes_pendientes` y siembra al abrir conversación. El vendedor responde desde `/chat` y el backend envía por la API de Meta (`sendWhatsAppText`) dentro de la ventana de 24h. Migración `1750000000002-WhatsappInboundSchema.ts` aplicada en dev (enums `whatsapp`/`whatsapp_mensaje` verificados en DB). Zonas y asignación de vendedores sembradas en DB dev (12 zonas, 5 vendedores; ver sección del feature). ⚠ Para producción: configurar `META_VERIFY_TOKEN`, `META_APP_SECRET` y un `META_TOKEN` permanente en el `.env` del VPS, desplegar y arrancar una vez para que corra la migración, y registrar el webhook en Meta Dashboard (ver sección del feature).
- **Punto 11 (22/08)** ✅: flujo WhatsApp verificado de punta a punta con túnel Cloudflare (rate limiter arreglado, verificación de suscripción + recepción + envío OK), cache de React Query del feature Marketing invalidada tras mutaciones (chat aparece sin recargar), filtro de fechas del dashboard marketing corregido (off-by-one UTC → fecha local + `hasta` inclusivo), y botón "Perder" de leads implementado end-to-end. ⚠ Pendiente: quitar el `console.log('[WEBHOOK] payload recibido:')` temporal, `META_APP_SECRET` vacío (HMAC omitido), `META_PHONE_ID` apuntando al número de prueba `964389213422160` y WABA `PENDING` (modo prueba; los teléfonos reales solo podrán escribirle al número real `114880014860322` tras aprobar la verificación de negocio). Ver Punto 11 en §8.
- **Feature "Asistente de Bienvenida WhatsApp"** ✅ (22/08): implementado y verificado end-to-end (build/lint/tsc OK). El bot pregunta el estado a leads de WhatsApp sin vendedor, auto-asigna por zona y captura la intención (`tipo_web`). Config editable en `/marketing` (sección "Menú de Bienvenida"); estados por zona editables en `/zonas`. Migración `1750000000003-MenuBienvenidaSchema.ts` ya aplicada en dev (tabla `menu_bienvenida` + `zonas.estados` verificados en DB). Ver "Feature — Asistente de Bienvenida WhatsApp" en §8. ⚠ El seed de estados→zonas es editable y zonas sin estados (Guarenas/Guatire/Maracay) quedan fuera del menú hasta configurarlas.
- **Feature "Resultados de conversación"** ✅ (22/08): lead `perdido` se reactiva al volver a escribir; acciones "Cliente" (formulario manual `ConvertirLeadModal`) y "Perder" en `/chat` y `/leads`; botones Convertir/Reasignar visibles con estado `reasignado`. `PUT /leads/:id/convertir` acepta `datos_cliente`. Ver "Feature — Resultados de conversación" en §8.
- ⚠ **Pendiente de deploy**: el endpoint `POST /usuarios/registrar` (backend) y el frontend con el enlace "Registrar Usuarios" necesitan desplegarse en el VPS para estar en producción.
- Pendiente opcional: rotar credenciales de los `.env` si el repo se publica.
- Próximas mejoras candidatas: tests reales + CI (el repo ya está en GitHub en `https://github.com/omarenriquecsn/sumichen-crm`), limpiar imports de `useSupabase`/`useAdmin` migrando a `useApi`, evaluar el `POST /usuarios` público (hoy fallback del signup), escribir tests.
- Confirmar con el usuario el **alcance** de la próxima actualización (nuevo módulo, fix, refactor, deploy).
- Schema de datos: ya se eligió **migraciones TypeORM** (baseline idempotente). Para cambios futuros de schema: crear una migración nueva en `src/database/migrations/`, NO editar el baseline.
- Para cualquier cambio de API: seguir el patrón routes → controllers → services → repositories → entity.
- Para cambios de UI: mantener Tailwind + MUI y el patrón de hooks agregadores + React Query.