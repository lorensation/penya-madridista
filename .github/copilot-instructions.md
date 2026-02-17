# Peña Lorenzo Sanz - AI Development Guide

This is a Next.js 15 (App Router) membership and e-commerce platform for a Real Madrid fan club, built with TypeScript, Supabase, and Stripe.

## Architecture Overview

### Core Tech Stack
- **Framework**: Next.js 15 with App Router (React 19, TypeScript 5)
- **Database & Auth**: Supabase (PostgreSQL + Auth)
- **Payments**: Stripe (subscriptions + e-commerce)
- **Styling**: Tailwind CSS 4 + shadcn/ui (new-york style)
- **State**: Zustand (cart management)
- **Forms**: react-hook-form + zod validation

### Project Structure Pattern
```
src/
  app/                    # Next.js App Router pages
    actions/             # Server actions (auth, admin, stripe)
    api/                 # API routes (webhooks, admin endpoints)
    (routes)/            # Public and protected pages
  components/
    ui/                  # shadcn/ui components
    (feature)/           # Feature-specific components (admin, dashboard, shop, etc.)
  lib/
    supabase/            # Modular Supabase clients (client, server, admin, services)
    stripe-server.ts     # Server-side Stripe operations
    stripe-client.ts     # Client-side Stripe operations
  context/               # React contexts (AuthContext)
  stores/                # Zustand stores (cart.ts)
  types/                 # TypeScript types (supabase.ts, common.ts)
```

## Critical Patterns

### 1. Server vs Client Components
- **Server Components** (default): Use for data fetching, admin operations
- **Client Components** (`"use client"`): Use for interactivity, hooks, browser APIs
- **Server Actions** (`"use server"`): Use in `actions/` directory for mutations
- API Routes only for webhooks and external integrations

### 2. Supabase Client Architecture
**ALWAYS use the correct client for the context:**

```typescript
// Browser/Client Components - uses cookies, auto-refresh
import { createBrowserSupabaseClient } from "@/lib/supabase"
const supabase = createBrowserSupabaseClient()

// Server Components/Actions - uses cookies() from next/headers
import { createServerSupabaseClient } from "@/lib/supabase"
const supabase = createServerSupabaseClient()

// Admin operations bypassing RLS - uses service role key
import { createAdminSupabaseClient } from "@/lib/supabase"
const supabase = createAdminSupabaseClient()
```

**Key Services** (in `lib/supabase/`):
- `auth-service.ts`: signUp, signIn, signOut, getCurrentUser
- `user-service.ts`: getUserProfile, updateUserProfile, checkMembershipStatus
- `member-service.ts`: createMember, getMember, updateMember

### 3. Database Schema (Key Tables)
- **`users`**: Basic auth user info (id, email, name, is_member)
- **`miembros`**: Full member profiles (personal data, subscription, role, redsys_token)
  - `role`: 'member' | 'admin' - Admin routes check this field
  - `subscription_status`: 'active' | 'inactive' | 'trialing' | 'canceled' | 'expired'
- **`blocked_users`**: User bans (user_id, reason_type, reason, blocked_at, notes)
- **`site_settings`**: Global config (maintenance_mode, etc.)
- **`payment_transactions`**: Central payment ledger (redsys_order, redsys_token, cof_txn_id, status)
- **`member_invites`**: Admin invitations with tokens

### 4. Authentication & Authorization Flow

**Middleware** (`middleware.ts`):
1. Skips `/api/webhooks/` (no auth required)
2. Checks for blocked users → redirect to `/blocked`
3. Checks maintenance mode → redirect to `/maintenance` (admins exempt)
4. Protects `/dashboard` and `/admin` routes
5. Admin routes verify `role === 'admin'` in `miembros` table

**Auth Patterns**:
```typescript
// In client components - use AuthContext
const { user, session, isLoading } = useAuth()

// In server components/actions
const supabase = createServerSupabaseClient()
const { data: { user } } = await supabase.auth.getUser()

// Check admin role
const { data: member } = await supabase
  .from("miembros")
  .select("role")
  .eq("email", user.email)
  .single()
if (member?.role !== "admin") { /* deny */ }
```

### 5. Payment Integration (RedSys / Getnet)

**Two Payment Contexts:**
1. **Subscriptions** (membership plans):
   - Server action: `src/app/actions/payment.ts` (`prepareMembershipPayment`, `executePayment`)
   - Notification webhook: `src/app/api/payments/redsys/notification/route.ts`
   - Inline payment via RedSys InSite iframe on the membership page

2. **E-commerce** (shop products):
   - Server action: `src/app/actions/payment.ts` (`prepareShopCheckout`, `executePayment`)
   - Cart stored in Zustand (`stores/cart.ts`)
   - Products have variants; payment via RedSys InSite

**Payment Flow**:
```typescript
// 1. Prepare payment (server action)
import { prepareMembershipPayment, executePayment } from "@/app/actions/payment"
const { order, merchantParams, signature } = await prepareMembershipPayment(planType, interval)

// 2. Client-side: Collect card via RedSys InSite iframe
// 3. Execute payment (server action)
const result = await executePayment(order, cardToken)
```

**Key library files:**
- `src/lib/redsys/` — crypto, types, request building, signature verification
- `src/app/api/payments/redsys/notification/route.ts` — server-to-server callback
- DB table: `payment_transactions` — central payment ledger

### 6. Environment Variables (Required)
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # Admin operations
REDSYS_MERCHANT_CODE=               # e.g. 048190003
REDSYS_TERMINAL=                     # e.g. 1
REDSYS_SECRET_KEY=                   # SHA-256 merchant key
REDSYS_ENV=test                      # 'test' or 'production'
NEXT_PUBLIC_BASE_URL=                # For redirects
```

### 7. Path Aliases
```typescript
@/*          → src/*
@/lib/*      → src/lib/*
@/components → src/components
```

## Development Workflows

### Running the App
```powershell
npm run dev          # Dev server with Turbopack
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint check
```

### Adding UI Components
This project uses **shadcn/ui** (new-york style):
```powershell
npx shadcn@latest add [component-name]
```
Components auto-install to `src/components/ui/` with proper aliases.

### Database Changes
1. Update schema in Supabase dashboard
2. Regenerate types: Export schema → update `src/types/supabase.ts`
3. Update `src/types/common.ts` for app-level types

### Testing Payments Locally
Use RedSys test environment (sandbox). Test cards are available at https://pagosonline.redsys.es/funcionalidades-702702702702.html
The notification URL must be publicly reachable — use ngrok or similar for local testing:
```powershell
# Expose local Next.js for RedSys notifications
ngrok http 3000
# Then set NEXT_PUBLIC_BASE_URL to the ngrok URL
```

## Common Gotchas

1. **Middleware applies to ALL routes** except static files - check `config.matcher`
2. **Blocked users MUST be signed out** - middleware handles this with explicit cookie deletion
3. **Admin checks use `miembros.role`** not `users` table
4. **Shop routes (`/tienda/`) allow public GET requests** - no auth required for browsing
5. **Complete-profile requires `session_id` or `admin_invite` param** - redirect to `/membership` if missing
6. **Use `revalidatePath()` after mutations** to update Server Components
7. **Analytics TODO**: Replace placeholder GA ID in `components/analytics-provider.tsx`

## Key Files to Reference

- **Auth flow**: `middleware.ts`, `src/app/actions/auth.ts`, `src/context/AuthContext.tsx`
- **Admin operations**: `src/app/actions/admin-members.ts`, `src/lib/blocked-users.ts`
- **Payment actions**: `src/app/actions/payment.ts` (RedSys InSite flow)
- **RedSys notification**: `src/app/api/payments/redsys/notification/route.ts`
- **RedSys library**: `src/lib/redsys/` (crypto, types, request building)
- **Cart logic**: `src/stores/cart.ts` (Zustand with localStorage persistence)
- **Email templates**: `src/lib/email.ts` (Mailgun integration)
- **Type definitions**: `src/types/supabase.ts` (database), `src/types/common.ts` (app)

## Component Patterns

### Server Actions Example
```typescript
"use server"
import { createServerSupabaseClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function updateProfile(formData: FormData) {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("miembros")
    .update({ name: formData.get("name") })
    .eq("id", userId)
  
  revalidatePath("/dashboard/settings")
  return { success: !error, error: error?.message }
}
```

### Client Component with Auth
```tsx
"use client"
import { useAuth } from "@/context/AuthContext"

export default function MyComponent() {
  const { user, isLoading } = useAuth()
  
  if (isLoading) return <div>Loading...</div>
  if (!user) return <div>Please login</div>
  
  return <div>Hello {user.email}</div>
}
```

### Admin Layout Pattern
All admin pages use shared layout (`src/app/admin/layout.tsx`) with navigation - maintains consistency.

---

**Developed by Cineronte S.L.** - When modifying core flows (auth, payments, blocked users), test thoroughly across middleware, actions, and notification webhooks.
