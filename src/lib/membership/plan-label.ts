const PLAN_BASE_LABELS: Record<string, string> = {
  under25: "Membresia Joven",
  over25: "Membresia Individual",
  family: "Membresia Familiar",
  infinite: "Membresia Honoraria",
}

const PAYMENT_LABELS: Record<string, string> = {
  monthly: "Mensual",
  annual: "Anual",
  decade: "Decada",
  infinite: "Sin renovacion",
}

export function getMembershipPlanLabel(options: {
  planType?: string | null
  paymentType?: string | null
}): string {
  const planType = options.planType ?? null
  const paymentType = options.paymentType ?? null

  if (!planType) {
    return "Membresia"
  }

  // Honorary plan should always display as honorary, regardless of payment type.
  if (planType === "infinite") {
    return PLAN_BASE_LABELS.infinite
  }

  const baseLabel = PLAN_BASE_LABELS[planType] ?? "Membresia"
  const paymentLabel = paymentType ? PAYMENT_LABELS[paymentType] : null

  return paymentLabel ? `${baseLabel} - ${paymentLabel}` : baseLabel
}
