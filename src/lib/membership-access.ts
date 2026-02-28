export interface MembershipAccessInput {
  status?: string | null
  endDate?: string | null
}

/**
 * Access is granted while the subscription is active/trialing.
 * For canceled subscriptions, access remains until endDate.
 */
export function hasMembershipAccess(input: MembershipAccessInput): boolean {
  const status = input.status ?? "inactive"

  if (status === "active" || status === "trialing") {
    return true
  }

  if (status === "canceled") {
    if (!input.endDate) {
      return false
    }

    const endTimestamp = Date.parse(input.endDate)
    if (Number.isNaN(endTimestamp)) {
      return false
    }

    return endTimestamp > Date.now()
  }

  return false
}
