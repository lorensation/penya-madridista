## Plan de Integración: Redirección RedSys + Supabase (Next.js App Router)

### Resumen
Se hará una integración coherente en 8 frentes: corrección de spinner/UX en dashboard, eliminación de `406` en perfiles opcionales, unificación de lectura de planes desde `subscriptions`, GDPR en preferencias para no miembros, validación estricta en `complete-profile`, migración total de actualización de tarjeta a Redirección, ajuste de webhook para `card_update`, y mitigación del `403` en mapas estáticos.

### Decisiones cerradas
1. Registro: se mantiene **un checkbox único** y se mapea a `users.email_notifications` + `users.marketing_emails`.
2. `miembros.subscription_plan`: se **depreca ya** (sin lecturas ni escrituras nuevas en app).
3. Card update: retorno por rutas dedicadas **OK/KO**.
4. Alcance admin: **incluido** en este lote para no romper “suscripción permanente”.

### Especificación de implementación

1. Base de datos y drift de esquema.
   1. Crear migración idempotente en `supabase/migrations` para añadir en `public.users`:
      - `email_notifications boolean not null default true`
      - `marketing_emails boolean not null default true`
   2. Incluir backfill desde `miembros` por `miembros.user_uuid = users.id` con `coalesce(...)`.
   3. Mantener `miembros.email_notifications`/`marketing_emails` solo como redundancia histórica.
   4. Regenerar tipos TS de Supabase y actualizar `src/types/supabase.ts` para reflejar columnas nuevas en `users`.
   5. Nota de operación: el proyecto tiene drift de `schema_migrations`; por eso el SQL debe quedar 100% idempotente.

2. Capa común de lectura de perfil/suscripción opcional.
   1. Crear helper de perfil opcional en `src/lib/data/member-profile.ts` con `.eq("user_uuid", userId).maybeSingle()` y sin fallback por `id`.
   2. Crear helper de suscripción actual en `src/lib/data/subscription.ts` (última por `created_at desc`, `.maybeSingle()`).
   3. Sustituir lecturas repetidas en dashboard por estos helpers.
   4. Retirar logs ruidosos de “no rows” para perfiles opcionales.

3. Correcciones en dashboard (spinner, 406, CTA eventos, labels).
   1. En [`/src/app/dashboard/page.tsx`](C:/Users/sanzp/Desktop/PEÑA%20LS/penya-madridista/src/app/dashboard/page.tsx):
      - Separar fetch de eventos del perfil; eventos deben depender de sesión/usuario, no de `profile`.
      - Garantizar `setLoadingEvents(false)` siempre.
      - Mostrar preview de 1-2 eventos también a no miembros.
      - Leer plan desde `subscriptions.plan_type/payment_type` y no desde `miembros.subscription_plan`.
   2. En [`/src/app/dashboard/events/page.tsx`](C:/Users/sanzp/Desktop/PEÑA%20LS/penya-madridista/src/app/dashboard/events/page.tsx):
      - Reemplazar `.single()` de `miembros` por helper opcional.
      - CTA de reserva: render condicional; con acceso renderiza `<a><Button/></a>`, sin acceso renderiza solo `Button disabled` + enlace “Hazte miembro”.
   3. En [`/src/app/dashboard/membership/page.tsx`](C:/Users/sanzp/Desktop/PEÑA%20LS/penya-madridista/src/app/dashboard/membership/page.tsx):
      - Reemplazar lecturas de `miembros` opcional por helper `.maybeSingle()`.
      - Plan label derivado de `subscription.plan_type/payment_type`.
   4. En [`/src/app/dashboard/settings/page.tsx`](C:/Users/sanzp/Desktop/PEÑA%20LS/penya-madridista/src/app/dashboard/settings/page.tsx):
      - Reemplazar `.single()` opcionales de `miembros` por helper.
      - Mantener estado de membresía/plan mostrado desde `subscriptions` (no `miembros.subscription_plan`).

4. Mapper único de planes y caso “honoraria”.
   1. Crear `src/lib/membership/plan-label.ts` con mapping central:
      - `under25` → “Membresía Joven”
      - `over25` → “Membresía Individual”
      - `family` → “Membresía Familiar”
      - `infinite` → “Membresía Honoraria”
   2. Añadir sufijo por `payment_type` cuando aplique (`Mensual`, `Anual`, `Década`, `Sin renovación`).
   3. Regla explícita: para `plan_type=infinite`, mostrar siempre “Honoraria” aunque exista `payment_type=decade` en datos legacy.

5. GDPR preferencias de comunicación.
   1. En [`/src/app/dashboard/settings/page.tsx`](C:/Users/sanzp/Desktop/PEÑA%20LS/penya-madridista/src/app/dashboard/settings/page.tsx):
      - `UserData` incorpora `email_notifications` y `marketing_emails`.
      - `updateFormWithUserData` pasa a ser fuente de verdad para switches.
      - `handleSubmitPreferences` siempre actualiza `users`; elimina rama de “convertirme en miembro”.
      - Si `isMiembro`, update redundante en `miembros` (best-effort).
      - UI: botón siempre “Guardar preferencias” o “Guardar cambios”; eliminar texto de conversión a miembro.
   2. En [`/src/components/auth/register-form.tsx`](C:/Users/sanzp/Desktop/PEÑA%20LS/penya-madridista/src/components/auth/register-form.tsx):
      - Mantener checkbox único `subscribeToNewsletter`.
      - Al insertar en `users`, mapear checkbox a ambas columnas.
   3. Ajustar inserciones de `users` en rutas auxiliares para defaults explícitos compatibles con nuevo esquema (`api/auth/register`, `api/profile/create`, webhook Supabase).

6. Validación estricta en complete-profile.
   1. En [`/src/components/profile-form.tsx`](C:/Users/sanzp/Desktop/PEÑA%20LS/penya-madridista/src/components/profile-form.tsx):
      - Reescribir `profileFormSchema` con normalización (`trim`, espacios múltiples) + regex estrictas.
      - “Solo texto”: nombre, apellidos, nacionalidad, población, provincia, país.
      - “Solo números”: cp, num_socio, num_carnet.
      - DNI/Pasaporte alfanumérico sin espacios.
      - Dirección con charset permitido.
      - Teléfono: aceptar formato humano en input y normalizar a solo dígitos (rango 9-15).
   2. En [`/src/app/complete-profile/page.tsx`](C:/Users/sanzp/Desktop/PEÑA%20LS/penya-madridista/src/app/complete-profile/page.tsx):
      - Eliminar `parseInt(...) || null`.
      - Convertir de forma estricta tras validación (sin aceptar parciales).
      - No escribir `miembros.subscription_plan` (deprecado).
      - Guardar preferencias también en `users` (source of truth).
   3. Mantener columnas numéricas actuales en DB; los ceros iniciales no se preservan por tipo bigint (limitación aceptada para este lote).

7. Migración card update: InSite/H2H -> Redirección.
   1. En [`/src/app/actions/payment.ts`](C:/Users/sanzp/Desktop/PEÑA%20LS/penya-madridista/src/app/actions/payment.ts):
      - `prepareCardUpdate()` devolverá `actionUrl` + `signed`.
      - Insertará `payment_transactions` pending con `metadata.type="card_update"`.
      - Construirá firma con `TRANSACTIONTYPE=7`, `IDENTIFIER=REQUIRED`, `COF_INI=S`, `COF_TYPE=R`, `URLOK/URLKO` a rutas nuevas.
      - `amount_cents` configurable por env (`REDSYS_CARD_UPDATE_AMOUNT_CENTS`, default `0`).
      - `executeCardUpdate()` queda deprecada/no usada por UI.
   2. En [`/src/app/dashboard/membership/page.tsx`](C:/Users/sanzp/Desktop/PEÑA%20LS/penya-madridista/src/app/dashboard/membership/page.tsx):
      - Sustituir bloque InSite por patrón redirect (`RedsysRedirectAutoSubmitForm`).
   3. Crear rutas:
      - `src/app/dashboard/membership/card-update/ok/page.tsx`
      - `src/app/dashboard/membership/card-update/ko/page.tsx`
      Ambas consultan estado por `order` y muestran resultado + CTA a membresía.
   4. En [`/src/app/api/payments/redsys/notification/route.ts`](C:/Users/sanzp/Desktop/PEÑA%20LS/penya-madridista/src/app/api/payments/redsys/notification/route.ts):
      - Ramificar fulfillment por `metadata.type`.
      - `card_update`: actualizar solo tokens/last4 (`subscriptions` y `miembros`), sin tocar plan/status/fechas.
      - `membership` normal: mantener alta/renovación actual.
      - Mantener idempotencia con claim por `status='pending'`.

8. Deprecación efectiva de `miembros.subscription_plan` incluyendo admin.
   1. En [`/src/app/api/payments/redsys/notification/route.ts`](C:/Users/sanzp/Desktop/PEÑA%20LS/penya-madridista/src/app/api/payments/redsys/notification/route.ts) y [`/src/app/complete-profile/page.tsx`](C:/Users/sanzp/Desktop/PEÑA%20LS/penya-madridista/src/app/complete-profile/page.tsx): dejar de escribir `miembros.subscription_plan`.
   2. En [`/src/app/admin/users/edit/[id]/page.tsx`](C:/Users/sanzp/Desktop/PEÑA%20LS/penya-madridista/src/app/admin/users/edit/[id]/page.tsx):
      - Cargar y mostrar plan/estado desde `subscriptions`.
      - Acción “Suscripción permanente”: upsert en `subscriptions` con `plan_type='infinite'`, `payment_type='infinite'`, `status='active'`, `end_date=null`.
      - Mantener actualización de `miembros.subscription_status` para compatibilidad visual legacy.
      - Retirar dependencias de UI sobre `miembros.subscription_plan`.

9. Maps 403 en contacto.
   1. En [`/src/components/city-managers.tsx`](C:/Users/sanzp/Desktop/PEÑA%20LS/penya-madridista/src/components/city-managers.tsx):
      - Mantener `next/image` pero con `unoptimized` para evitar fetch server-side de optimizer.
      - Añadir fallback visual en error de carga.
   2. Verificaciones operativas fuera de código: API key válida, Static Maps API habilitada, billing activo, restricciones de key coherentes.

### Cambios importantes de API/interfaz/tipos
1. DB: `public.users` gana `email_notifications` y `marketing_emails` (NOT NULL, default `true`).
2. Server Action: `prepareCardUpdate()` pasa a devolver payload completo de Redirección (`actionUrl`, `signed`).
3. Rutas nuevas: `/dashboard/membership/card-update/ok` y `/dashboard/membership/card-update/ko`.
4. Nuevo helper público de labels: `src/lib/membership/plan-label.ts`.
5. `miembros.subscription_plan` queda deprecado a nivel aplicación (columna conservada solo por compatibilidad de datos legacy).

### Casos de prueba y aceptación
1. Usuario sin miembro en `/dashboard`: no spinner infinito; ve preview de eventos.
2. Usuario sin miembro en `/dashboard/events`: botón de reservar no navega ni por click ni por teclado; aparece CTA a membresía.
3. Navegación dashboard (`/dashboard/events`, `/dashboard/membership`, `/dashboard/settings`): sin `406 PGRST116` por lecturas opcionales.
4. `/dashboard/settings` no miembro: guardar preferencias actualiza `users` sin crear fila en `miembros` ni cambiar `is_member`.
5. Registro con checkbox único activado/desactivado: ambas columnas en `users` quedan alineadas.
6. `/complete-profile`: rechaza entradas mixtas (`123abc`) y acepta formato válido normalizado.
7. Plan mostrado en dashboard/membership/settings/admin: correcto para `under25`, `over25`, `family`, `infinite`.
8. Card update redirección:
   - OK: webhook actualiza token/last4 y no modifica plan/status/fechas.
   - KO: muestra estado correcto.
   - Reintentos webhook: sin duplicados ni cambios inconsistentes.
9. Maps en contacto: dejan de fallar por `_next/image` server-fetch; fallback visible si key/billing siguen mal.
10. Smoke técnico: `npm run lint`, `npm run build`, y checklist manual de flujos UI.

### Supuestos y defaults explícitos
1. Se conserva esquema actual de campos numéricos en `miembros`; no se migra a `text` en este lote.
2. `REDSYS_CARD_UPDATE_AMOUNT_CENTS` default `0`; si el terminal no admite 0, se configura a `1` sin cambiar código.
3. `miembros.subscription_plan` no se elimina físicamente aún; solo se deja de usar/escribir en app.
4. La fuente de verdad para plan/periodicidad/estado es `subscriptions`; para consentimientos GDPR es `users`.
