/**
 * Generate unique 12-character order numbers for RedSys.
 *
 * Format: YYMM + prefix (1 char) + random (7 chars) = 12 chars
 *
 * Constraints (from Getnet docs):
 *   - Max 12 characters
 *   - First 4 characters MUST be numeric
 *   - Remaining characters: [0-9A-Za-z]
 *
 * Prefixes:
 *   S = Shop one-time payment
 *   M = Membership first payment (with tokenization)
 *   R = Recurring MIT charge
 *   D = Refund (devolución)
 *   X = Other / generic
 */

const ALPHANUMERIC = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

export type OrderPrefix = "S" | "M" | "R" | "D" | "X"

/**
 * Generate a unique order number.
 *
 * @param prefix  Operation type prefix
 * @returns 12-character order number (e.g. "2602Sa3Rk7Wz")
 */
export function generateOrderNumber(prefix: OrderPrefix = "X"): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, "0")

  // First 4 chars: YYMM (numeric)
  const datePart = `${yy}${mm}`

  // 5th char: prefix letter + 7 random alphanumeric chars = 8 chars
  let random = ""
  const bytes = new Uint8Array(7)
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    // Fallback for environments without Web Crypto
    for (let i = 0; i < 7; i++) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }
  for (let i = 0; i < 7; i++) {
    random += ALPHANUMERIC[bytes[i] % ALPHANUMERIC.length]
  }

  return `${datePart}${prefix}${random}`
}

/**
 * Extract the prefix from an order number.
 * Returns the 5th character.
 */
export function getOrderPrefix(orderNumber: string): OrderPrefix | null {
  if (orderNumber.length < 5) return null
  const ch = orderNumber[4]
  if ("SMRDX".includes(ch)) return ch as OrderPrefix
  return null
}

/**
 * Validate that an order number matches RedSys format.
 */
export function isValidOrderNumber(orderNumber: string): boolean {
  if (orderNumber.length < 4 || orderNumber.length > 12) return false
  // First 4 chars must be numeric
  if (!/^\d{4}/.test(orderNumber)) return false
  // Rest must be alphanumeric
  if (!/^[0-9A-Za-z]+$/.test(orderNumber)) return false
  return true
}
