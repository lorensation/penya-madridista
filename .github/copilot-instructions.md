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
- **`miembros`**: Full member profiles (personal data, subscription, role, stripe_customer_id)
  - `role`: 'member' | 'admin' - Admin routes check this field
  - `subscription_status`: 'active' | 'inactive' | 'trialing' | 'canceled' | 'expired'
- **`blocked_users`**: User bans (user_id, reason_type, reason, blocked_at, notes)
- **`site_settings`**: Global config (maintenance_mode, etc.)
- **`checkout_sessions`**: Track Stripe checkout sessions
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

### 5. Stripe Integration

**Two Payment Systems:**
1. **Subscriptions** (membership plans):
   - Webhook: `STRIPE_WEBHOOK_SECRET` (main)
   - Handled by `src/app/api/webhooks/stripe/route.ts`
   - Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`

2. **E-commerce** (shop products):
   - Webhook: `STRIPE_WEBHOOK_SECRET_SHOP`
   - Cart stored in Zustand (`stores/cart.ts`)
   - Products have variants with `stripePriceId`

**Payment Flow**:
```typescript
// Create checkout session (server action)
import { stripe } from "@/lib/stripe-server"
const session = await stripe.checkout.sessions.create({
  customer: customerId,
  line_items: [{ price: priceId, quantity: 1 }],
  mode: "subscription", // or "payment" for shop
  success_url: `${baseUrl}/success`,
  cancel_url: `${baseUrl}/cancel`,
})
```

### 6. Environment Variables (Required)
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # Admin operations
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=               # Subscriptions
STRIPE_WEBHOOK_SECRET_SHOP=          # E-commerce
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

### Testing Webhooks Locally
```powershell
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Common Gotchas

1. **Middleware applies to ALL routes** except static files - check `config.matcher`
2. **Blocked users MUST be signed out** - middleware handles this with explicit cookie deletion
3. **Admin checks use `miembros.role`** not `users` table
4. **Shop routes (`/tienda/`) allow public GET requests** - no auth required for browsing
5. **Complete-profile requires `session_id` param** - redirect to `/membership` if missing
6. **Use `revalidatePath()` after mutations** to update Server Components
7. **Analytics TODO**: Replace placeholder GA ID in `components/analytics-provider.tsx`

## Key Files to Reference

- **Auth flow**: `middleware.ts`, `src/app/actions/auth.ts`, `src/context/AuthContext.tsx`
- **Admin operations**: `src/app/actions/admin-members.ts`, `src/lib/blocked-users.ts`
- **Stripe webhooks**: `src/app/api/webhooks/stripe/route.ts` (843 lines - handles all events)
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

**Developed by Cineronte S.L.** - When modifying core flows (auth, payments, blocked users), test thoroughly across middleware, actions, and webhooks.
