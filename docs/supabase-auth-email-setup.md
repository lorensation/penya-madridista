# Supabase Auth Email Setup Guide

This document provides step-by-step instructions for configuring Supabase Auth email templates, redirect URLs, and site URL settings for the Peña Lorenzo Sanz platform.

## 1. Site URL Configuration

### Dashboard Location
**Supabase Dashboard → Authentication → URL Configuration**

### Site URL
Set to your production domain:
```
https://lorenzosanz.com
```

### Redirect URLs
Add all allowed redirect URLs (supports wildcards):

**Production:**
```
https://lorenzosanz.com/**
https://www.lorenzosanz.com/**
```

**Local development:**
```
http://localhost:3000/**
```

**Staging / ngrok (if used):**
```
https://*.ngrok-free.app/**
```

> **Important:** Always include the `/**` wildcard suffix to allow deep redirects like `/dashboard`, `/reset-password`, etc.

---

## 2. Email Templates

### Dashboard Location
**Supabase Dashboard → Authentication → Email Templates**

### Template Placeholders Reference

| Placeholder | Description |
|---|---|
| `{{ .ConfirmationURL }}` | Full URL with token for one-click confirm (only in PKCE flow) |
| `{{ .Token }}` | Raw 6-digit OTP token |
| `{{ .TokenHash }}` | Hashed token for URL-based verification |
| `{{ .SiteURL }}` | Your configured Site URL |
| `{{ .Email }}` | Recipient's email address |
| `{{ .Data }}` | User metadata JSON (e.g., `{{ .Data.full_name }}`) |
| `{{ .RedirectTo }}` | The `redirectTo` URL passed by the app |

### Recommended URL Pattern

For all email templates that require a verification link, use this pattern:

```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=TYPE&next=REDIRECT
```

This routes through the app's `/auth/callback` handler which supports both `token_hash` (verifyOtp) and `code` (exchangeCodeForSession) flows.

---

### 2.1 Confirm Signup

**Subject:** `Confirma tu cuenta en la Peña Lorenzo Sanz`

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
  <div style="background-color: #07025A; padding: 20px; text-align: center;">
    <img src="https://www.lorenzosanz.com/Logo-Penya-LS-resized.jpg" alt="Peña Lorenzo Sanz" style="max-width: 180px; height: auto;" />
  </div>
  <div style="padding: 30px; color: #333;">
    <h1 style="color: #07025A;">¡Bienvenido a la Peña Lorenzo Sanz!</h1>
    <p>Hola {{ .Email }},</p>
    <p>Gracias por registrarte. Para activar tu cuenta, haz clic en el siguiente enlace:</p>
    <p style="text-align: center;">
      <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup&next=/dashboard"
         style="background-color: #07025A; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
        Confirmar mi cuenta
      </a>
    </p>
    <p style="font-size: 13px; color: #666;">Si no te registraste en nuestra web, puedes ignorar este email.</p>
    <p>¡Hala Madrid!</p>
  </div>
  <div style="background: #f4f4f4; padding: 16px; text-align: center; font-size: 12px; color: #999;">
    <p>&copy; 2026 Peña Lorenzo Sanz. Todos los derechos reservados.</p>
    <p>
      <a href="{{ .SiteURL }}/privacy-policy" style="color: #999;">Política de Privacidad</a> |
      <a href="{{ .SiteURL }}/aviso-legal" style="color: #999;">Aviso Legal</a> |
      <a href="{{ .SiteURL }}/terms-and-conditions" style="color: #999;">Términos y Condiciones</a>
    </p>
    <p><a href="mailto:info@lorenzosanz.com" style="color: #999;">info@lorenzosanz.com</a></p>
  </div>
</div>
```

---

### 2.2 Reset Password

**Subject:** `Restablecer contraseña - Peña Lorenzo Sanz`

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
  <div style="background-color: #07025A; padding: 20px; text-align: center;">
    <img src="https://www.lorenzosanz.com/Logo-Penya-LS-resized.jpg" alt="Peña Lorenzo Sanz" style="max-width: 180px; height: auto;" />
  </div>
  <div style="padding: 30px; color: #333;">
    <h1 style="color: #07025A;">Restablecer contraseña</h1>
    <p>Hola {{ .Email }},</p>
    <p>Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el siguiente enlace:</p>
    <p style="text-align: center;">
      <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password"
         style="background-color: #07025A; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
        Restablecer mi contraseña
      </a>
    </p>
    <p style="font-size: 13px; color: #666;">Si no solicitaste este cambio, puedes ignorar este email. Tu contraseña no se modificará.</p>
    <p>¡Hala Madrid!</p>
  </div>
  <div style="background: #f4f4f4; padding: 16px; text-align: center; font-size: 12px; color: #999;">
    <p>&copy; 2026 Peña Lorenzo Sanz. Todos los derechos reservados.</p>
    <p>
      <a href="{{ .SiteURL }}/privacy-policy" style="color: #999;">Política de Privacidad</a> |
      <a href="{{ .SiteURL }}/aviso-legal" style="color: #999;">Aviso Legal</a> |
      <a href="{{ .SiteURL }}/terms-and-conditions" style="color: #999;">Términos y Condiciones</a>
    </p>
    <p><a href="mailto:info@lorenzosanz.com" style="color: #999;">info@lorenzosanz.com</a></p>
  </div>
</div>
```

---

### 2.3 Invite User (Magic Link)

**Subject:** `Has sido invitado a la Peña Lorenzo Sanz`

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
  <div style="background-color: #07025A; padding: 20px; text-align: center;">
    <img src="https://www.lorenzosanz.com/Logo-Penya-LS-resized.jpg" alt="Peña Lorenzo Sanz" style="max-width: 180px; height: auto;" />
  </div>
  <div style="padding: 30px; color: #333;">
    <h1 style="color: #07025A;">¡Has sido invitado!</h1>
    <p>Hola {{ .Email }},</p>
    <p>Has sido invitado a unirte a la <strong>Peña Lorenzo Sanz Siempre Presente</strong>. Haz clic en el siguiente enlace para aceptar la invitación:</p>
    <p style="text-align: center;">
      <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&next=/dashboard"
         style="background-color: #07025A; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
        Aceptar invitación
      </a>
    </p>
    <p>¡Hala Madrid!</p>
  </div>
  <div style="background: #f4f4f4; padding: 16px; text-align: center; font-size: 12px; color: #999;">
    <p>&copy; 2026 Peña Lorenzo Sanz. Todos los derechos reservados.</p>
    <p>
      <a href="{{ .SiteURL }}/privacy-policy" style="color: #999;">Política de Privacidad</a> |
      <a href="{{ .SiteURL }}/aviso-legal" style="color: #999;">Aviso Legal</a> |
      <a href="{{ .SiteURL }}/terms-and-conditions" style="color: #999;">Términos y Condiciones</a>
    </p>
    <p><a href="mailto:info@lorenzosanz.com" style="color: #999;">info@lorenzosanz.com</a></p>
  </div>
</div>
```

---

### 2.4 Password Changed Notification

**Subject:** `Tu contraseña ha sido actualizada - Peña Lorenzo Sanz`

> **Note:** This template is for the "Change Email Address" or "Password Changed" notification. Supabase sends this automatically after a password change.

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
  <div style="background-color: #07025A; padding: 20px; text-align: center;">
    <img src="https://www.lorenzosanz.com/Logo-Penya-LS-resized.jpg" alt="Peña Lorenzo Sanz" style="max-width: 180px; height: auto;" />
  </div>
  <div style="padding: 30px; color: #333;">
    <h1 style="color: #07025A;">Contraseña actualizada</h1>
    <p>Hola {{ .Email }},</p>
    <p>Te informamos de que tu contraseña ha sido actualizada correctamente.</p>
    <p>Si no realizaste este cambio, contacta con nosotros inmediatamente en <a href="mailto:info@lorenzosanz.com">info@lorenzosanz.com</a>.</p>
    <p>¡Hala Madrid!</p>
  </div>
  <div style="background: #f4f4f4; padding: 16px; text-align: center; font-size: 12px; color: #999;">
    <p>&copy; 2026 Peña Lorenzo Sanz. Todos los derechos reservados.</p>
    <p>
      <a href="{{ .SiteURL }}/privacy-policy" style="color: #999;">Política de Privacidad</a> |
      <a href="{{ .SiteURL }}/aviso-legal" style="color: #999;">Aviso Legal</a> |
      <a href="{{ .SiteURL }}/terms-and-conditions" style="color: #999;">Términos y Condiciones</a>
    </p>
    <p><a href="mailto:info@lorenzosanz.com" style="color: #999;">info@lorenzosanz.com</a></p>
  </div>
</div>
```

---

## 3. SMTP Settings (Optional)

If you want Supabase Auth emails to be sent through your own SMTP server (Hostinger):

**Dashboard → Authentication → SMTP Settings → Enable Custom SMTP**

```
Host:     smtp.hostinger.com
Port:     465
User:     noreply@lorenzosanz.com
Password: (your email password)
Sender:   Peña Lorenzo Sanz <noreply@lorenzosanz.com>
```

> **Note:** The app's own emails (invites, campaigns, newsletters) are already sent via Hostinger SMTP through the `sendEmail` helper. This SMTP setting only applies to Supabase-triggered auth emails (confirm signup, reset password, etc.).

---

## 4. Rate Limits

**Dashboard → Authentication → Rate Limits**

Recommended settings:
- Email OTP: 3 per hour per email
- SMS OTP: N/A (not used)
- Sign-ups: 10 per hour per IP

---

## 5. Verification Checklist

After configuring all templates:

1. [ ] Register a new account → confirm email arrives with branded template
2. [ ] Click confirmation link → account is verified, redirected to `/dashboard`
3. [ ] Use "Forgot Password" → reset email arrives with correct link
4. [ ] Click reset link → lands on `/reset-password` page with valid session
5. [ ] Change password → notification email sent with legal footer
6. [ ] Send admin member invite → invitation uses shared template with legal links
7. [ ] All links in templates resolve correctly (no 404s)
8. [ ] Legal footer links work: Privacy Policy, Aviso Legal, Terms
