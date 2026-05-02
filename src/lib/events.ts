import type { SupabaseClient, User } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import { hasMembershipAccess } from "@/lib/membership-access"

type EventQueryClient = SupabaseClient<Database>

export type EventViewerAccess = "member" | "authenticated_non_member" | "anonymous"

export interface EventMembershipState {
  status?: string | null
  endDate?: string | null
}

export function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0]
}

export function createUpcomingVisibleEventsQuery(
  supabase: EventQueryClient,
  columns = "*",
) {
  return supabase
    .from("events")
    .select(columns)
    .gte("date", getTodayDateString())
    .eq("is_hidden", false)
    .order("date", { ascending: true })
}

export function getEventWhatsappBookingLink(eventTitle: string): string {
  const message = encodeURIComponent(`Hola, me gustaría reservar una plaza para el evento: ${eventTitle}`)
  return `https://wa.me/34665652251?text=${message}`
}

export function getViewerEventAccess(
  user: User | null,
  membershipState?: EventMembershipState | null,
): EventViewerAccess {
  if (!user) {
    return "anonymous"
  }

  const hasAccess = hasMembershipAccess({
    status: membershipState?.status ?? null,
    endDate: membershipState?.endDate ?? null,
  })

  return hasAccess ? "member" : "authenticated_non_member"
}

export function isUpcomingEventDate(date: string): boolean {
  return date >= getTodayDateString()
}

export function parseEuroPriceInputToCents(value: string): {
  cents: number | null
  normalizedValue: string
  error: string | null
} {
  const trimmed = value.trim()

  if (!trimmed) {
    return {
      cents: null,
      normalizedValue: "",
      error: null,
    }
  }

  const normalizedValue = trimmed.replace(",", ".")

  if (!/^\d+(\.\d{1,2})?$/.test(normalizedValue)) {
    return {
      cents: null,
      normalizedValue,
      error: "Introduce un precio valido con hasta 2 decimales.",
    }
  }

  const parsed = Number.parseFloat(normalizedValue)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return {
      cents: null,
      normalizedValue,
      error: "El precio no puede ser negativo.",
    }
  }

  return {
    cents: Math.round(parsed * 100),
    normalizedValue,
    error: null,
  }
}

export function formatCentsToEuroInput(priceCents: number | null): string {
  if (priceCents === null || typeof priceCents !== "number" || !Number.isFinite(priceCents)) {
    return ""
  }

  return (priceCents / 100).toFixed(2)
}
