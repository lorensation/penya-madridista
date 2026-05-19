import test from "node:test"
import assert from "node:assert/strict"
import {
  getBaseUrl,
  getNotificationUrl,
  normalizeRedsysTerminal,
  redsysTerminalsMatch,
} from "../src/lib/redsys/config"

function withEnv(env: Record<string, string | undefined>, fn: () => void) {
  const previous = new Map<string, string | undefined>()

  for (const key of Object.keys(env)) {
    previous.set(key, process.env[key])
    const value = env[key]
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  try {
    fn()
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }
}

test("uses the public site URL before a localhost base URL for Redsys callbacks", () => {
  withEnv(
    {
      NEXT_PUBLIC_SITE_URL: "https://www.lorenzosanz.com/",
      NEXT_PUBLIC_BASE_URL: "http://localhost:3000/",
      VERCEL_URL: undefined,
      NODE_ENV: "production",
    },
    () => {
      assert.equal(getBaseUrl(), "https://www.lorenzosanz.com")
      assert.equal(
        getNotificationUrl(),
        "https://www.lorenzosanz.com/api/payments/redsys/notification",
      )
    },
  )
})

test("falls back to Vercel deployment URL when configured public URLs are local in production", () => {
  withEnv(
    {
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000/",
      NEXT_PUBLIC_BASE_URL: "http://127.0.0.1:3000/",
      VERCEL_URL: "penya-madridista.vercel.app",
      NODE_ENV: "production",
    },
    () => {
      assert.equal(getBaseUrl(), "https://penya-madridista.vercel.app")
    },
  )
})

test("normalizes Redsys terminal identifiers before comparing notification callbacks", () => {
  assert.equal(normalizeRedsysTerminal("001"), "1")
  assert.equal(normalizeRedsysTerminal("1"), "1")
  assert.equal(redsysTerminalsMatch("1", "001"), true)
  assert.equal(redsysTerminalsMatch("001", "1"), true)
  assert.equal(redsysTerminalsMatch("1", "2"), false)
})
