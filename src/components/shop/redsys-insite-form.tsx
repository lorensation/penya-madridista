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
    getInSiteFormJSON?: (config: Record<string, unknown>) => void
    storeIdOper?: (
      event: MessageEvent,
      tokenInputId: string,
      errorInputId: string,
      validationFn: () => boolean,
    ) => void
    /** Our custom namespace to avoid collisions */
    __redsysCallbacks?: {
      onIdOper: ((idOper: string) => void) | null
      onError: ((error: string) => void) | null
    }
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
    script.onload = () => setScriptLoaded(true)
    script.onerror = () => {
      setInternalError("No se pudo cargar el módulo de pago. Recarga la página.")
      onErrorRef.current("Script load failed")
    }
    document.head.appendChild(script)

    return () => {
      // Don't remove the script on unmount — it may be needed if user navigates back
    }
  }, [isTest])

  // ── Merchant validation callback ────────────────────────────────────────

  const merchantValidation = useCallback((): boolean => {
    // This is called by storeIdOper BEFORE storing the idOper.
    // Schedule a microtask to read the stored value AFTER storeIdOper finishes.
    setTimeout(() => {
      const tokenEl = tokenRef.current
      const errorEl = errorRef.current

      if (tokenEl?.value && tokenEl.value !== "" && tokenEl.value !== "-1") {
        setInternalError(null)
        onIdOperRef.current(tokenEl.value)
      } else if (tokenEl?.value === "-1") {
        const msg = "Número de pedido repetido. Inténtalo de nuevo."
        setInternalError(msg)
        onErrorRef.current(msg)
      } else if (errorEl?.value) {
        const errorCode = errorEl.value
        const msg = INSITE_ERRORS[errorCode] || `Error en el formulario de pago (${errorCode})`
        setInternalError(msg)
        onErrorRef.current(msg)
      }
    }, 50)

    return true // Must return true for storeIdOper to proceed
  }, [])

  // ── Initialize InSite form ──────────────────────────────────────────────

  useEffect(() => {
    if (!scriptLoaded || !order || !fuc || initRef.current) return

    // Set up global callbacks namespace
    window.__redsysCallbacks = {
      onIdOper: null,
      onError: null,
    }

    // Set up postMessage listener
    const messageHandler = (event: MessageEvent) => {
      if (window.storeIdOper && tokenRef.current && errorRef.current) {
        window.storeIdOper(event, "redsys-token", "redsys-error", merchantValidation)
      }
    }

    window.addEventListener("message", messageHandler)

    // Build InSite config — ALL values must be strings
    const insiteConfig: Record<string, unknown> = {
      id: "redsys-card-form",
      fuc: String(fuc),
      terminal: String(terminal),
      order: String(order),
      buttonValue: buttonText,
      idiomaInsite: language,
      estiloInsite: formStyle,
      mostrarLogoInsite: showLogo,
    }

    // Small delay to ensure DOM is ready
    requestAnimationFrame(() => {
      try {
        if (window.getInSiteFormJSON) {
          window.getInSiteFormJSON(insiteConfig)
          setFormReady(true)
          initRef.current = true
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
        className={disabled ? "pointer-events-none opacity-50" : ""}
      />

      {/* Hidden inputs for idOper / error storage (used by storeIdOper) */}
      <input type="hidden" id="redsys-token" ref={tokenRef} />
      <input type="hidden" id="redsys-error" ref={errorRef} />
    </div>
  )
}
