"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Ban, LogOut } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { BlockReasonType } from "@/lib/blocked-users"

// Map block reason types to user-friendly messages
const reasonMessages: Record<BlockReasonType, string> = {
  'spam': 'Tu cuenta ha sido bloqueada por comportamiento considerado como spam.',
  'harassment': 'Tu cuenta ha sido bloqueada por comportamiento de acoso.',
  'inappropriate_content': 'Tu cuenta ha sido bloqueada por compartir contenido inapropiado.',
  'fake_account': 'Esta cuenta ha sido identificada como una cuenta falsa o suplantadora.',
  'payment_issues': 'Tu cuenta ha sido bloqueada por problemas de pago recurrentes.',
  'multiple_accounts': 'Tu cuenta ha sido bloqueada por crear múltiples cuentas.',
  'violation_of_terms': 'Tu cuenta ha sido bloqueada por violar nuestros términos de servicio.',
  'other': 'Tu cuenta ha sido bloqueada. Para más información, ponte en contacto con nosotros.'
};

function BlockedPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reasonParam = searchParams?.get("reason") as BlockReasonType | null
  const [reason, setReason] = useState<string>("")
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const checkBlockedStatus = async () => {
      setLoading(true)
      
      try {
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // Get the block information directly from the database
          const { data: blockedData, error } = await supabase
            .from('blocked_users')
            .select('reason_type, reason')
            .eq('user_id', user.id)
            .single()
          
          if (!error && blockedData) {
            // We have direct blocked user information
            if (blockedData.reason_type && blockedData.reason_type in reasonMessages) {
              setReason(reasonMessages[blockedData.reason_type as BlockReasonType])
              
              // Add custom reason if available
              if (blockedData.reason) {
                setReason(prev => `${prev} ${blockedData.reason}`)
              }
            } else {
              setReason(reasonMessages.other)
            }
          } else {
            // Fall back to URL parameter if available
            if (reasonParam && reasonParam in reasonMessages) {
              setReason(reasonMessages[reasonParam])
            } else {
              setReason(reasonMessages.other)
            }
          }
        } else {
          // User not authenticated, use URL parameter
          if (reasonParam && reasonParam in reasonMessages) {
            setReason(reasonMessages[reasonParam])
          } else {
            setReason(reasonMessages.other)
          }
        }
      } catch (error) {
        console.error("Error checking blocked status:", error)
        setReason(reasonMessages.other)
      } finally {
        setLoading(false)
      }
    }
    
    checkBlockedStatus()
  }, [reasonParam]);

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center pb-4 border-b">
          <div className="mx-auto mb-4 rounded-full bg-red-100 p-3 w-16 h-16 flex items-center justify-center">
            <Ban className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600">Cuenta Bloqueada</CardTitle>
          <CardDescription>
            No puedes acceder a tu cuenta en este momento
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
            </div>
          ) : (
            <p className="text-center text-gray-700 mb-4">
              {reason}
            </p>
          )}
          <p className="text-sm text-gray-500 text-center">
            Si crees que esto es un error o necesitas más información, 
            por favor ponte en contacto con nuestro equipo de soporte en{" "}
            <a href="mailto:info@lorenzosanz.com" className="text-primary hover:underline">
              info@lorenzosanz.com
            </a>
          </p>
          <div className="mt-6 pt-4 border-t">
            <Button 
              onClick={handleSignOut}
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Volver al inicio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Loading component
function LoadingForm() {
    return (
      <div className="container max-w-3xl py-10">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando página...</p>
        </div>
      </div>
    )
}

export default function BlockedPage() {
    <Suspense fallback={<LoadingForm />}>
      <BlockedPageContent />
    </Suspense>
}