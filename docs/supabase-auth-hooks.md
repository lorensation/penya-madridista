# Supabase Auth Hooks - Guidance

This document provides guidance on Supabase Auth Hooks and when to consider using them for the Peña Lorenzo Sanz platform.

## Current Status

**Auth hooks are NOT required for this rollout.** The current setup uses:
- **Supabase dashboard email templates** for auth-triggered emails (signup confirm, password reset, etc.)
- **App-side SMTP** (Hostinger via nodemailer) for all other emails (invites, campaigns, newsletters)
- **Webhook endpoint** (`/api/webhooks/supabase`) for post-signup user sync

This combination covers all email needs without requiring auth hooks.

---

## Available Auth Hooks

### 1. `send_email` Hook

**Purpose:** Intercept and fully customize how Supabase sends auth emails.

**When to use:**
- You want ALL auth emails (signup, reset, invite) sent through your own SMTP instead of Supabase's built-in mailer
- You need advanced email tracking/analytics on auth emails
- You want to use a third-party email service (SendGrid, Postmark, etc.) for auth emails
- You need to add dynamic content to auth emails that dashboard templates can't handle

**How it works:**
1. Supabase calls your Edge Function or webhook with the email payload
2. Your function sends the email using your own provider
3. Return a success/failure response

**Example Edge Function:**
```typescript
// supabase/functions/send-email/index.ts
import { serve } from "https://deno.land/std/http/server.ts"

serve(async (req) => {
  const payload = await req.json()
  const { user, email_data } = payload

  // email_data contains: token, token_hash, redirect_to, email_action_type
  // email_action_type: "signup" | "recovery" | "invite" | "magiclink" | "email_change"

  // Send via your SMTP/API...
  // Return 200 to indicate success
  return new Response(JSON.stringify({}), { status: 200 })
})
```

**Current recommendation:** Not needed. Dashboard templates + custom SMTP settings cover our needs.

---

### 2. `before_user_created` Hook

**Purpose:** Run custom logic before a new user is created in auth.users.

**When to use:**
- Implement signup blocklists (block specific domains or emails)
- Enforce signup constraints (e.g., require corporate email)
- Add custom claims or metadata at creation time
- Integration with external identity/verification services

**Example use case:**
```typescript
// Block disposable email domains
const blockedDomains = ["tempmail.com", "throwaway.email"]
const domain = payload.user.email.split("@")[1]
if (blockedDomains.includes(domain)) {
  return new Response(
    JSON.stringify({ error: { http_code: 403, message: "Email domain not allowed" } }),
    { status: 403 }
  )
}
```

**Current recommendation:** Not needed. The `blocked_users` table + middleware handle user blocking after creation.

---

### 3. `custom_access_token` Hook

**Purpose:** Modify the JWT access token claims before it's issued.

**When to use:**
- Add custom roles/permissions to the JWT (avoid extra DB queries for role checks)
- Enrich tokens with organization/tenant information
- Add feature flags or subscription status to tokens
- Implement fine-grained RBAC via JWT claims

**Example use case:**
```typescript
// Add admin role to JWT
const { data: member } = await supabase
  .from("miembros")
  .select("role")
  .eq("user_uuid", payload.user_id)
  .single()

payload.claims.user_role = member?.role || "user"
payload.claims.is_member = member ? true : false

return new Response(JSON.stringify(payload), { status: 200 })
```

**Current recommendation:** Not needed now, but could be valuable in the future to:
- Avoid the current pattern of querying `miembros.role` in middleware on every request
- Enable RLS policies based on JWT claims instead of subqueries
- Reduce database load for role checks

---

## Existing Post-Signup Sync

The current webhook at `/api/webhooks/supabase` handles synchronization after Supabase auth events:

```
POST /api/webhooks/supabase
```

This receives Supabase webhook payloads for events like `user.created` and syncs the `users` table. This mechanism should be preserved regardless of auth hook adoption.

---

## Decision Matrix

| Need | Solution | Hook Required? |
|---|---|---|
| Branded auth emails | Dashboard templates + custom SMTP | No |
| App-sent emails (invites, campaigns) | nodemailer + Hostinger SMTP | No |
| Post-signup user sync | Webhook `/api/webhooks/supabase` | No |
| Block signups by domain | `before_user_created` hook | Optional |
| JWT role enrichment | `custom_access_token` hook | Optional (future) |
| Full control over auth email sending | `send_email` hook | Optional |

---

## References

- [Supabase Auth Hooks Overview](https://supabase.com/docs/guides/auth/auth-hooks)
- [Send Email Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook)
- [Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook)
- [Before User Created Hook](https://supabase.com/docs/guides/auth/auth-hooks)
