import Image from "next/image"
import { Wrench, Clock, AlertTriangle } from "lucide-react"
import { createServerSupabaseClient } from "@/lib/supabase"

// Add route segment config to mark this route as dynamic
export const dynamic = 'force-dynamic'

// Function to get site settings
async function getSiteSettings() {
  const supabase = await createServerSupabaseClient()
  
  const { data } = await supabase
    .from('site_settings')
    .select('site_name, logo_url, primary_color')
    .order('id', { ascending: false })
    .limit(1)
    .single()
  
  return {
    siteName: data?.site_name || 'Peña Lorenzo Sanz',
    logoUrl: data?.logo_url || '/logo.png',
    primaryColor: data?.primary_color || '#1e40af'
  }
}

export default async function MaintenancePage() {
  const { siteName, logoUrl, primaryColor } = await getSiteSettings()
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden">
        <div 
          className="p-4 flex justify-center" 
          style={{ backgroundColor: primaryColor }}
        >
          <div className="relative h-20 w-60">
            <Image
              src={logoUrl}
              alt={siteName}
              fill
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
        </div>
        
        <div className="p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <Wrench className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
            Sitio en Mantenimiento
          </h1>
          
          <p className="text-center text-gray-600 mb-6">
            Estamos realizando mejoras en nuestro sitio web. Volveremos a estar en línea pronto.
          </p>
          
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
            <div className="flex">
              <Clock className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                Estamos trabajando para mejorar tu experiencia. Gracias por tu paciencia.
              </p>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
              <p className="text-sm text-yellow-700">
                Si eres administrador, puedes <a href="/login" className="underline font-medium">iniciar sesión</a> para acceder al panel de administración.
              </p>
            </div>
          </div>
        </div>
        
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} {siteName}. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}