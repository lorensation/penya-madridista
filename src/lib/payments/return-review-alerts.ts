import type { Json } from "@/types/supabase"
import { recordRedsysNotificationEvent } from "@/lib/redsys/notification-events"

interface BestEffortAdminClient {
  from(table: string): {
    insert(payload: unknown): unknown
  }
}

interface ReturnPendingReviewAlertOptions {
  order: string
  memberId: string
  status: string
  hasSignedReturnParams: boolean
}

export async function createReturnPendingReviewAlert(
  admin: BestEffortAdminClient | null | undefined,
  options: ReturnPendingReviewAlertOptions,
) {
  await recordRedsysNotificationEvent(admin, {
    event: "redsys.return.review_required",
    reason: "pending_after_return",
    redsys_order: options.order,
    member_id: options.memberId,
    context: "membership",
    status_before: options.status,
    status_after: options.status,
    raw: {
      has_signed_return_params: options.hasSignedReturnParams,
    } as Json,
  })
}
