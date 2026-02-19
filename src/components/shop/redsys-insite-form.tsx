"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Loader2, AlertCircle, CreditCard } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// ── InSite Error Code Map ────────────────────────────────────────────────────

const INSITE_ERRORS: Record<string, string> = {
  msg1:  "Debes rellenar los datos de la tarjeta",
  msg2:  "El número de tarjeta es obligatorio",
  msg3:  "El número de tarjeta debe ser numérico",
  msg4:  "El número de tarjeta no puede ser negativo",
  msg5:  "El mes de caducidad es obligatorio",
  msg6:  "El mes de caducidad debe ser numérico",
  msg7:  "El mes de caducidad es incorrecto",
  msg8:  "El año de caducidad es obligatorio",
  msg9:  "El año de caducidad debe ser numérico",
  msg10: "El año de caducidad no puede ser negativo",
  msg11: "Longitud incorrecta del código de seguridad",
  msg12: "El código de seguridad debe ser numérico",
  msg13: "El código de seguridad no puede ser negativo",
  msg14: "El código de seguridad no es necesario para su tarjeta",
  msg15: "La longitud de la tarjeta no es correcta",
  msg16: "Introduce un número de tarjeta válido (sin espacios ni guiones)",
  msg17: "Validación incorrecta por parte del comercio",
}

/** Maximum time (ms) to poll for idOper after storeIdOper is called */
const IDOPER_POLL_TIMEOUT = 3000
const IDOPER_POLL_INTERVAL = 80

// ── Props ────────────────────────────────────────────────────────────────────

export interface RedsysInSiteFormProps {
  /** Unique order number (12 chars, YYMM prefix) */
  order: string
  /** Called when InSite returns an idOper (card token for authorization) */
  onIdOperReceived: (idOper: string) => void
  /** Called on validation or iframe error */
  onError: (message: string) => void
  /** Button text (default: "Pagar") */
  buttonText?: string
  /** Form language — ISO 639-1 code (default: "ES") */
  language?: string
  /** Layout style (default: "twoRows") */
  formStyle?: "inline" | "twoRows"
  /** Show bank logo (default: true) */
  showLogo?: boolean
  /** Disable the form (e.g. while processing) */
  disabled?: boolean
  /** Additional CSS class for the container */
  className?: string
}

// ── Global type declarations for Redsys JS ───────────────────────────────────

declare global {
  interface Window {
    getInSiteFormJSON?: (config: Record<string, string>) => void
    storeIdOper?: (
      event: MessageEvent,
      tokenInputId: string,
      errorInputId: string,
      validationFn: () => boolean,
    ) => void
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function RedsysInSiteForm({
  order,
  onIdOperReceived,
  onError,
  buttonText = "Pagar",
  language = "ES",
  formStyle = "twoRows",
  showLogo = true,
  disabled = false,
  className = "",
}: RedsysInSiteFormProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [formReady, setFormReady] = useState(false)
  const [internalError, setInternalError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const tokenRef = useRef<HTMLInputElement>(null)
  const errorRef = useRef<HTMLInputElement>(null)
  const initRef = useRef(false)
  const idOperHandledRef = useRef(false)

  // Stable callback refs to avoid re-initializing the iframe
  const onIdOperRef = useRef(onIdOperReceived)
  const onErrorRef = useRef(onError)
  onIdOperRef.current = onIdOperReceived
  onErrorRef.current = onError

  const fuc = process.env.NEXT_PUBLIC_REDSYS_MERCHANT_CODE || ""
  const terminal = process.env.NEXT_PUBLIC_REDSYS_TERMINAL || "1"
  const isTest = process.env.NEXT_PUBLIC_REDSYS_ENV !== "production"

  // ── Load Redsys JS ──────────────────────────────────────────────────────

  useEffect(() => {
    // Check if already loaded
    if (window.getInSiteFormJSON) {
      setScriptLoaded(true)
      return
    }

    const scriptUrl = isTest
      ? "https://sis-t.redsys.es:25443/sis/NC/sandbox/redsysV3.js"
      : "https://sis.redsys.es/sis/NC/redsysV3.js"

    const script = document.createElement("script")
    script.src = scriptUrl
    script.async = true
    script.onload = () => {
      console.log("[RedsysInSite] Script loaded successfully")
      setScriptLoaded(true)
    }
    script.onerror = () => {
      setInternalError("No se pudo cargar el módulo de pago. Recarga la página.")
      onErrorRef.current("Script load failed")
    }
    document.head.appendChild(script)

    return () => {
      // Don't remove the script on unmount — it may be needed if user navigates back
    }
  }, [isTest])

  // ── Poll for idOper value (robust alternative to fixed timeout) ─────────

  const pollForIdOper = useCallback(() => {
    if (idOperHandledRef.current) return
    const started = Date.now()

    const poll = () => {
      if (idOperHandledRef.current) return

      const tokenEl = document.getElementById("redsys-token") as HTMLInputElement | null
      const errorEl = document.getElementById("redsys-error") as HTMLInputElement | null

      // Also check via refs as fallback
      const tokenValue = tokenEl?.value || tokenRef.current?.value || ""
      const errorValue = errorEl?.value || errorRef.current?.value || ""

      console.log("[RedsysInSite] Polling — token:", JSON.stringify(tokenValue), "error:", JSON.stringify(errorValue))

      if (tokenValue && tokenValue !== "" && tokenValue !== "-1") {
        idOperHandledRef.current = true
        console.log("[RedsysInSite] idOper received:", tokenValue)
        setInternalError(null)
        onIdOperRef.current(tokenValue)
        return
      }

      if (tokenValue === "-1") {
        idOperHandledRef.current = true
        const msg = "Número de pedido repetido. Inténtalo de nuevo."
        console.warn("[RedsysInSite] Duplicate order:", msg)
        setInternalError(msg)
        onErrorRef.current(msg)
        return
      }

      if (errorValue) {
        idOperHandledRef.current = true
        const msg = INSITE_ERRORS[errorValue] || `Error en el formulario de pago (${errorValue})`
        console.warn("[RedsysInSite] Form error:", errorValue, msg)
        setInternalError(msg)
        onErrorRef.current(msg)
        return
      }

      // Keep polling until timeout
      if (Date.now() - started < IDOPER_POLL_TIMEOUT) {
        setTimeout(poll, IDOPER_POLL_INTERVAL)
      } else {
        console.warn("[RedsysInSite] Timed out waiting for idOper")
      }
    }

    poll()
  }, [])

  // ── Merchant validation callback ────────────────────────────────────────

  const merchantValidation = useCallback((): boolean => {
    console.log("[RedsysInSite] merchantValidation called — starting poll for idOper")
    // storeIdOper calls this BEFORE storing the value, so poll for it
    idOperHandledRef.current = false
    pollForIdOper()
    return true // Must return true for storeIdOper to proceed
  }, [pollForIdOper])

  // ── Initialize InSite form ──────────────────────────────────────────────

  useEffect(() => {
    if (!scriptLoaded || !order || !fuc || initRef.current) return

    // Set up postMessage listener
    const messageHandler = (event: MessageEvent) => {
      // Log all postMessages for debugging (filter Redsys origins)
      const origin = event.origin || ""
      if (origin.includes("redsys.es")) {
        console.log("[RedsysInSite] postMessage from", origin, "data:", typeof event.data === "string" ? event.data.substring(0, 200) : event.data)
      }

      if (window.storeIdOper) {
        try {
          window.storeIdOper(event, "redsys-token", "redsys-error", merchantValidation)
        } catch (err) {
          console.error("[RedsysInSite] storeIdOper error:", err)
        }
      }
    }

    window.addEventListener("message", messageHandler)

    // ── CRITICAL: ALL values MUST be strings per Redsys InSite V3 docs ──
    const insiteConfig: Record<string, string> = {
      id: "redsys-card-form",
      fuc: String(fuc),
      terminal: String(terminal),
      order: String(order),
      buttonValue: String(buttonText),
      idiomaInsite: String(language),
      estiloInsite: String(formStyle),
      mostrarLogoInsite: String(showLogo),
    }

    console.log("[RedsysInSite] Initializing with config:", JSON.stringify(insiteConfig))

    // Small delay to ensure DOM is ready
    requestAnimationFrame(() => {
      try {
        if (window.getInSiteFormJSON) {
          window.getInSiteFormJSON(insiteConfig)
          setFormReady(true)
          initRef.current = true
          console.log("[RedsysInSite] Form initialized successfully")
        } else {
          console.error("[RedsysInSite] getInSiteFormJSON not available")
        }
      } catch (err) {
        console.error("[RedsysInSiteForm] Error initializing:", err)
        setInternalError("Error al inicializar el formulario de pago")
      }
    })

    return () => {
      window.removeEventListener("message", messageHandler)
    }
  }, [scriptLoaded, order, fuc, terminal, buttonText, language, formStyle, showLogo, merchantValidation])

  // ── Fallback: also listen for direct changes to hidden inputs ───────────

  useEffect(() => {
    if (!formReady) return

    // MutationObserver as a safety net to catch idOper writes we might miss
    const tokenEl = document.getElementById("redsys-token") as HTMLInputElement | null
    if (!tokenEl) return

    const observer = new MutationObserver(() => {
      const val = tokenEl.value
      if (val && val !== "" && !idOperHandledRef.current) {
        console.log("[RedsysInSite] MutationObserver caught idOper:", val)
        if (val === "-1") {
          idOperHandledRef.current = true
          const msg = "Número de pedido repetido. Inténtalo de nuevo."
          setInternalError(msg)
          onErrorRef.current(msg)
        } else {
          idOperHandledRef.current = true
          setInternalError(null)
          onIdOperRef.current(val)
        }
      }
    })

    observer.observe(tokenEl, { attributes: true, attributeFilter: ["value"] })

    // Also watch with an input event (some browsers fire this on programmatic .value sets)
    const onInput = () => {
      const val = tokenEl.value
      if (val && val !== "" && !idOperHandledRef.current) {
        console.log("[RedsysInSite] input event caught idOper:", val)
        if (val !== "-1") {
          idOperHandledRef.current = true
          setInternalError(null)
          onIdOperRef.current(val)
        }
      }
    }
    tokenEl.addEventListener("input", onInput)
    tokenEl.addEventListener("change", onInput)

    return () => {
      observer.disconnect()
      tokenEl.removeEventListener("input", onInput)
      tokenEl.removeEventListener("change", onInput)
    }
  }, [formReady])

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className={`redsys-insite-wrapper ${className}`}>
      {/* Loading state */}
      {!formReady && !internalError && (
        <div className="flex items-center justify-center py-8 text-gray-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          <span>Cargando formulario de pago seguro...</span>
        </div>
      )}

      {/* Error state */}
      {internalError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{internalError}</AlertDescription>
        </Alert>
      )}

      {/* Security badge */}
      {formReady && (
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
          <CreditCard className="h-3.5 w-3.5" />
          <span>Pago seguro — Los datos de tarjeta son procesados directamente por Getnet/Redsys</span>
        </div>
      )}

      {/* InSite iframe container */}
      <div
        id="redsys-card-form"
        ref={containerRef}
        className={`min-h-[380px] w-full ${disabled ? "pointer-events-none opacity-50" : ""}`}
      />

      {/* Hidden inputs for idOper / error storage (used by storeIdOper) */}
      <input type="hidden" id="redsys-token" ref={tokenRef} />
      <input type="hidden" id="redsys-error" ref={errorRef} />
    </div>
  )
}
