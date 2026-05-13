export const TERMS_ACCEPTANCE_ERROR = "Debes aceptar los Terminos y Condiciones para registrarte."

export const PAYMENT_TERMS_ACCEPTANCE_ERROR =
  "Debes aceptar los Terminos y Condiciones antes de continuar con el pago."

export function isTermsAccepted(value: unknown): value is true {
  return value === true
}

export function getTermsAcceptanceError(value: unknown): string | null {
  return isTermsAccepted(value) ? null : TERMS_ACCEPTANCE_ERROR
}

export function getPaymentTermsAcceptanceError(value: unknown): string | null {
  return isTermsAccepted(value) ? null : PAYMENT_TERMS_ACCEPTANCE_ERROR
}
