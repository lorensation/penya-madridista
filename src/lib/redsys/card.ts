const LAST_FOUR_PATTERN = /^\d{4}$/
const MASKED_CARD_PATTERN = /[*xX]+/

export type CardLastFourExtractionReason = "found" | "missing" | "invalid"

export interface CardLastFourExtraction {
  lastFour: string | null
  reason: CardLastFourExtractionReason
}

export function getCardLastFourExtraction(
  redsysPayload: Record<string, unknown>,
): CardLastFourExtraction {
  const cardNumber = redsysPayload.Ds_CardNumber

  if (cardNumber === undefined || cardNumber === null || cardNumber === "") {
    return { lastFour: null, reason: "missing" }
  }

  if (typeof cardNumber !== "string") {
    return { lastFour: null, reason: "invalid" }
  }

  const normalized = cardNumber.trim()
  if (LAST_FOUR_PATTERN.test(normalized)) {
    return { lastFour: normalized, reason: "found" }
  }

  if (!MASKED_CARD_PATTERN.test(normalized)) {
    return { lastFour: null, reason: "invalid" }
  }

  const lastFour = normalized.slice(-4)
  return LAST_FOUR_PATTERN.test(lastFour)
    ? { lastFour, reason: "found" }
    : { lastFour: null, reason: "invalid" }
}

export function extractCardLastFour(redsysPayload: Record<string, unknown>): string | null {
  return getCardLastFourExtraction(redsysPayload).lastFour
}
