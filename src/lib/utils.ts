import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(input: string | number | Date): string {
  const date = new Date(input)
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export function formatPrice(
  price: number,
  options: {
    currency?: "USD" | "EUR" | "GBP"
    notation?: Intl.NumberFormatOptions["notation"]
  } = {}
) {
  const { currency = "EUR", notation = "compact" } = options

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation,
    maximumFractionDigits: 2,
  }).format(price)
}

/**
 * Formats a price that is stored in cents (e.g., 2499 for 24.99€)
 * Specifically designed for shop products where prices are stored as integers in cents
 */
export function formatShopPrice(
  priceInCents: number,
  options: {
    currency?: "USD" | "EUR" | "GBP"
    notation?: Intl.NumberFormatOptions["notation"]
  } = {}
) {
  // Convert cents to the actual price
  const actualPrice = priceInCents / 100
  
  const { currency = "EUR", notation = "standard" } = options

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    notation,
    maximumFractionDigits: 2,
  }).format(actualPrice)
}

export function getBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin
  }
  
  // When rendering on the server, we don't have access to window
  // Use environment variable or default to localhost
  return process.env.NEXT_PUBLIC_SITE_URL || "https://www.lorenzosanz.com"
}