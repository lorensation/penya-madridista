"use client"

import { useEffect, useRef } from "react"
import type { RedsysSignedRequest } from "@/lib/redsys"

interface RedsysRedirectAutoSubmitFormProps {
  actionUrl: string
  signed: RedsysSignedRequest
}

export function RedsysRedirectAutoSubmitForm({
  actionUrl,
  signed,
}: RedsysRedirectAutoSubmitFormProps) {
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    formRef.current?.submit()
  }, [])

  return (
    <form ref={formRef} method="POST" action={actionUrl}>
      <input type="hidden" name="Ds_SignatureVersion" value={signed.Ds_SignatureVersion} />
      <input type="hidden" name="Ds_MerchantParameters" value={signed.Ds_MerchantParameters} />
      <input type="hidden" name="Ds_Signature" value={signed.Ds_Signature} />
      <noscript>
        <button type="submit">Continuar al pago</button>
      </noscript>
    </form>
  )
}
