const PLAN_BASE_LABELS: Record<string, string> = {
  under25: "Suscripción Joven",
  over25: "Suscripción Individual",
  family: "Suscripción Familiar",
  infinite: "Suscripción Honoraria",
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
    return "Suscripción"
  }

  // Honorary plan should always display as honorary, regardless of payment type.
  if (planType === "infinite") {
    return PLAN_BASE_LABELS.infinite
  }

  const baseLabel = PLAN_BASE_LABELS[planType] ?? "Suscripción"
  const paymentLabel = paymentType ? PAYMENT_LABELS[paymentType] : null

  return paymentLabel ? `${baseLabel} - ${paymentLabel}` : baseLabel
}
