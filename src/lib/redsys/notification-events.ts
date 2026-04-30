import type { Json } from "@/types/supabase"

export type RedsysNotificationEventName =
  | "redsys.notification.received"
  | "redsys.notification.ignored"
  | "redsys.notification.failed"
  | "redsys.notification.completed"
  | "redsys.return.review_required"
  | "redsys.monitor.alert"

export type RedsysNotificationReason =
  | "success"
  | "missing_fields"
  | "invalid_signature"
  | "unknown_order"
  | "amount_mismatch"
  | "merchant_mismatch"
  | "terminal_mismatch"
  | "status_transition_failed"
  | "membership_finalization_failed"
  | "already_processed"
  | "unsupported_signature_version"
  | "decode_failed"
  | "missing_order"
  | "denied"
  | "fulfillment_failed"
  | "unhandled_error"
  | "pending_after_return"
  | "monitor_detected_issue"

export interface RedsysNotificationEventInput {
  event: RedsysNotificationEventName | string
  reason: RedsysNotificationReason | string
  redsys_order?: string | null
  transaction_id?: string | null
  member_id?: string | null
  context?: string | null
  status_before?: string | null
  status_after?: string | null
  ds_response?: string | null
  authorization_code?: string | null
  amount?: number | string | null
  content_type?: string | null
  signature_version?: string | null
  transaction_type?: string | null
  expected_amount?: number | null
  received_amount?: string | null
  expected_merchant_code?: string | null
  received_merchant_code?: string | null
  expected_terminal?: string | null
  received_terminal?: string | null
  has_merchant_parameters?: boolean | null
  has_signature?: boolean | null
  error_message?: string | null
  raw?: Json | null
}

export interface RedsysNotificationEventInsert {
  event: string
  reason: string
  redsys_order: string | null
  transaction_id: string | null
  member_id: string | null
  context: string | null
  status_before: string | null
  status_after: string | null
  ds_response: string | null
  ds_authorization_code: string | null
  amount: string | null
  content_type: string | null
  signature_version: string | null
  transaction_type: string | null
  expected_amount: number | null
  received_amount: string | null
  expected_merchant_code: string | null
  received_merchant_code: string | null
  expected_terminal: string | null
  received_terminal: string | null
  has_merchant_parameters: boolean | null
  has_signature: boolean | null
  error_message: string | null
  raw: Json | null
}

interface BestEffortAdminClient {
  from(table: "redsys_notification_events" | string): {
    insert(payload: unknown): unknown
  }
}

function nullableString(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null
  }

  return String(value)
}

export function buildRedsysNotificationEventInsert(
  input: RedsysNotificationEventInput,
): RedsysNotificationEventInsert {
  return {
    event: input.event,
    reason: input.reason,
    redsys_order: input.redsys_order ?? null,
    transaction_id: input.transaction_id ?? null,
    member_id: input.member_id ?? null,
    context: input.context ?? null,
    status_before: input.status_before ?? null,
    status_after: input.status_after ?? null,
    ds_response: input.ds_response ?? null,
    ds_authorization_code: input.authorization_code ?? null,
    amount: nullableString(input.amount),
    content_type: input.content_type ?? null,
    signature_version: input.signature_version ?? null,
    transaction_type: input.transaction_type ?? null,
    expected_amount: input.expected_amount ?? null,
    received_amount: input.received_amount ?? null,
    expected_merchant_code: input.expected_merchant_code ?? null,
    received_merchant_code: input.received_merchant_code ?? null,
    expected_terminal: input.expected_terminal ?? null,
    received_terminal: input.received_terminal ?? null,
    has_merchant_parameters: input.has_merchant_parameters ?? null,
    has_signature: input.has_signature ?? null,
    error_message: input.error_message ?? null,
    raw: input.raw ?? null,
  }
}

export async function recordRedsysNotificationEvent(
  admin: BestEffortAdminClient | null | undefined,
  input: RedsysNotificationEventInput,
) {
  if (!admin) {
    return
  }

  try {
    const result = await admin
      .from("redsys_notification_events")
      .insert(buildRedsysNotificationEventInsert(input))
    const { error } = (result ?? {}) as { error?: { message?: string } | null }

    if (error) {
      console.error("[redsys.notification.audit]", {
        event: "redsys.notification.audit_failed",
        reason: input.reason,
        redsys_order: input.redsys_order ?? null,
        error_message: error.message ?? String(error),
      })
    }
  } catch (error) {
    console.error("[redsys.notification.audit]", {
      event: "redsys.notification.audit_failed",
      reason: input.reason,
      redsys_order: input.redsys_order ?? null,
      error_message: error instanceof Error ? error.message : String(error),
    })
  }
}
