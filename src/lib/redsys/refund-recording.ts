export type RefundMetadataSource = "admin_dashboard" | "redsys_console_csv_20260501"

export interface BuildRedsysRefundMetadataInput {
  existingMetadata: unknown
  source: RefundMetadataSource
  originalOrder: string
  originalTransactionId: string
  refundRequestId?: string | null
  amountCents: number
  authorizationCode?: string | null
  dsResponse?: string | null
  lastFour?: string | null
  processedAt: string
}

export interface SubscriptionMembershipState {
  id: string
  status: string | null
}

function metadataObject(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {}
  }

  return { ...(metadata as Record<string, unknown>) }
}

export function buildRedsysRefundMetadata(input: BuildRedsysRefundMetadataInput): Record<string, unknown> {
  return {
    ...metadataObject(input.existingMetadata),
    redsys_refund: {
      source: input.source,
      original_order: input.originalOrder,
      original_transaction_id: input.originalTransactionId,
      refund_request_id: input.refundRequestId ?? null,
      amount_cents: input.amountCents,
      authorization_code: input.authorizationCode ?? null,
      ds_response: input.dsResponse ?? null,
      last_four: input.lastFour ?? null,
      processed_at: input.processedAt,
    },
  }
}

export function hasRemainingActiveMembershipAfterRefund(subscriptions: SubscriptionMembershipState[]): boolean {
  return subscriptions.some((subscription) => ["active", "pending_profile", "trialing"].includes(subscription.status ?? ""))
}
