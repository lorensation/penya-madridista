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

export function getBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin
  }
  
  // When rendering on the server, we don't have access to window
  // Use environment variable or default to localhost
  return process.env.NEXT_PUBLIC_SITE_URL || "https://www.lorenzosanz.com"
}