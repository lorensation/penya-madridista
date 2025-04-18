"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { 
  ArrowLeft, 
  AlertCircle, 
  Save, 
  Globe, 
  Mail, 
  CreditCard, 
  Image as ImageIcon, 
  CheckCircle 
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { supabase } from "@/lib/supabase"

// Add route segment config to mark this route as dynamic
export const dynamic = 'force-dynamic'

// Define the settings interface
interface SiteSettings {
  id?: number;
  site_name: string;
  site_description: string;
  contact_email: string;
  support_email: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  enable_blog: boolean;
  enable_subscriptions: boolean;
  footer_text: string;
  meta_description: string;
  meta_keywords: string;
  maintenance_mode: boolean;
  updated_at?: string;
}

// Default settings
const defaultSettings: SiteSettings = {
  site_name: "Peña Lorenzo Sanz",
  site_description: "Peña Madridista Lorenzo Sanz Siempre Presente",
  contact_email: "info@lorenzosanz.com",
  support_email: "info@lorenzosanz.com",
  logo_url: "/logo.png",
  favicon_url: "/favicon.ico",
  primary_color: "#1e40af",
  secondary_color: "#ffffff",
  enable_blog: true,
  enable_subscriptions: true,
  footer_text: "© Peña Lorenzo Sanz. Todos los derechos reservados.",
  meta_description: "Peña Madridista Lorenzo Sanz - Aficionados del Real Madrid",
  meta_keywords: "real madrid, peña, lorenzo sanz, madridistas",
  maintenance_mode: false
}

export default function SiteSettingsPage() {
  const router = useRouter()
  const [authChecking, setAuthChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings)
  const [originalSettings, setOriginalSettings] = useState<SiteSettings>(defaultSettings)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Check if user is admin on client side
  useEffect(() => {
    async function checkAdminStatus() {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          console.error("Authentication error:", userError)
          router.push("/login?redirect=/admin/settings")
          return
        }
        
        // Check if user has admin role
        const { data: profile, error: profileError } = await supabase
          .from('miembros')
          .select('role')
          .eq('user_uuid', user.id)
          .single()
        
        if (profileError) {
          console.error("Error fetching profile:", profileError)
          router.push("/dashboard")
          return
        }
        
        if (profile?.role !== 'admin') {
          console.log("Non-admin user attempting to access admin settings page")
          router.push("/dashboard")
          return
        }
        
        setIsAdmin(true)
        
        // Fetch settings
        await fetchSettings()
      } catch (err) {
        console.error("Error checking admin status:", err)
        router.push("/dashboard")
      } finally {
        setAuthChecking(false)
      }
    }
    
    checkAdminStatus()
  }, [router])

  // Fetch settings from the database
  const fetchSettings = async () => {
    try {
      // Check if settings table exists
      const { data: tableExists } = await supabase
        .from('site_settings')
        .select('id')
        .limit(1)
      
      // If table doesn't exist or no settings, create default settings
      if (!tableExists || tableExists.length === 0) {
        console.log("No settings found, using defaults")
        setSettings(defaultSettings)
        setOriginalSettings(defaultSettings)
        return
      }
      
      // Fetch settings
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .order('id', { ascending: false })
        .limit(1)
        .single()
      
      if (error) {
        console.error("Error fetching settings:", error)
        setError("Error al cargar la configuración del sitio")
        return
      }
      
      if (data) {
        setSettings(data as SiteSettings)
        setOriginalSettings(data as SiteSettings)
      } else {
        setSettings(defaultSettings)
        setOriginalSettings(defaultSettings)
      }
    } catch (err) {
      console.error("Error in fetchSettings:", err)
      setError("Error al cargar la configuración del sitio")
    }
  }

  // Check for changes when settings are updated
  useEffect(() => {
    const settingsChanged = JSON.stringify(settings) !== JSON.stringify(originalSettings)
    setHasChanges(settingsChanged)
  }, [settings, originalSettings])

  // Handle saving settings
  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      
      // Check if settings table exists and create it if not
      const { error: tableCheckError } = await supabase
        .from('site_settings')
        .select('id')
        .limit(1)
      
      if (tableCheckError) {
        // Table might not exist, try to create it
        console.log("Settings table might not exist")
        // Note: This would typically be handled by a migration, but for simplicity
        // we're checking here. In a real app, use migrations instead.
      }
      
      // Check if we're updating or inserting
      if (settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from('site_settings')
          .update({
            ...settings,
            updated_at: new Date().toISOString()
          })
          .eq('id', settings.id)
        
        if (error) {
          throw new Error(`Error al actualizar la configuración: ${error.message}`)
        }
      } else {
        // Insert new settings
        const { data, error } = await supabase
          .from('site_settings')
          .insert({
            ...settings,
            updated_at: new Date().toISOString()
          })
          .select()
        
        if (error) {
          throw new Error(`Error al crear la configuración: ${error.message}`)
        }
        
        if (data && data[0]) {
          setSettings({...settings, id: data[0].id})
        }
      }
      
      // Update original settings to reflect saved state
      setOriginalSettings({...settings})
      setSuccess("Configuración guardada correctamente")
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null)
      }, 3000)
    } catch (err) {
      console.error("Error saving settings:", err)
      setError(err instanceof Error ? err.message : "Error al guardar la configuración")
    } finally {
      setSaving(false)
    }
  }

  // Handle input changes
  const handleChange = <K extends keyof SiteSettings>(field: K, value: SiteSettings[K]) => {
    setSettings({
      ...settings,
      [field]: value
    })
  }

  // Show loading state while checking authentication
  if (authChecking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" aria-label="Cargando"></div>
          <p className="mt-4 text-gray-600">Verificando permisos de administrador...</p>
        </div>
      </div>
    )
  }

  // If not admin, this will redirect (handled in useEffect)
  if (!isAdmin) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No tienes permisos para acceder a esta página</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <Button 
            variant="outline" 
            onClick={() => router.push("/admin")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al panel de administración
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">
            Configuración del Sitio
          </h1>
          <p className="text-gray-500 mt-1">
            Administra la configuración global del sitio web
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button 
            variant="outline" 
            onClick={() => setSettings(originalSettings)}
            disabled={saving || !hasChanges}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full" aria-hidden="true"></div>
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-8">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe className="h-4 w-4" aria-hidden="true" />
            <span>General</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" aria-hidden="true" />
            <span>Apariencia</span>
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center gap-2">
            <Mail className="h-4 w-4" aria-hidden="true" />
            <span>Contacto</span>
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" aria-hidden="true" />
            <span>Suscripciones</span>
          </TabsTrigger>
        </TabsList>
        
        {/* General Settings Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Configuración General</CardTitle>
              <CardDescription>
                Configura los ajustes básicos del sitio web
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="site_name">Nombre del Sitio</Label>
                  <Input 
                    id="site_name" 
                    value={settings.site_name} 
                    onChange={(e) => handleChange('site_name', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="site_description">Descripción del Sitio</Label>
                  <Input 
                    id="site_description" 
                    value={settings.site_description} 
                    onChange={(e) => handleChange('site_description', e.target.value)}
                  />
                </div>
              </div>

              <Separator className="my-6" />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Funcionalidades</h3>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="enable_blog" 
                    checked={settings.enable_blog}
                    onCheckedChange={(checked) => handleChange('enable_blog', checked)}
                  />
                  <Label htmlFor="enable_blog">Habilitar Blog</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="maintenance_mode" 
                    checked={settings.maintenance_mode}
                    onCheckedChange={(checked) => handleChange('maintenance_mode', checked)}
                  />
                  <Label htmlFor="maintenance_mode">Modo Mantenimiento</Label>
                </div>
              </div>

              <Separator className="my-6" />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">SEO</h3>
                <div className="space-y-2">
                  <Label htmlFor="meta_description">Meta Descripción</Label>
                  <Textarea 
                    id="meta_description" 
                    value={settings.meta_description} 
                    onChange={(e) => handleChange('meta_description', e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="meta_keywords">Meta Keywords</Label>
                  <Input 
                    id="meta_keywords" 
                    value={settings.meta_keywords} 
                    onChange={(e) => handleChange('meta_keywords', e.target.value)}
                    placeholder="palabra1, palabra2, palabra3"
                  />
                </div>
              </div>       
    
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Apariencia</CardTitle>
              <CardDescription>
                Configura la apariencia visual del sitio web
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="logo_url">URL del Logo</Label>
                  <Input 
                    id="logo_url" 
                    value={settings.logo_url} 
                    onChange={(e) => handleChange('logo_url', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="favicon_url">URL del Favicon</Label>
                  <Input 
                    id="favicon_url" 
                    value={settings.favicon_url} 
                    onChange={(e) => handleChange('favicon_url', e.target.value)}
                  />
                </div>
              </div>

              <Separator className="my-6" />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Colores</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="primary_color">Color Primario</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="primary_color" 
                        type="color"
                        value={settings.primary_color} 
                        onChange={(e) => handleChange('primary_color', e.target.value)}
                        className="w-16 h-10 p-1"
                        aria-label="Seleccionar color primario"
                      />
                      <Input 
                        value={settings.primary_color} 
                        onChange={(e) => handleChange('primary_color', e.target.value)}
                        className="flex-1"
                        aria-label="Código de color primario"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="secondary_color">Color Secundario</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="secondary_color" 
                        type="color"
                        value={settings.secondary_color} 
                        onChange={(e) => handleChange('secondary_color', e.target.value)}
                        className="w-16 h-10 p-1"
                        aria-label="Seleccionar color secundario"
                      />
                      <Input 
                        value={settings.secondary_color} 
                        onChange={(e) => handleChange('secondary_color', e.target.value)}
                        className="flex-1"
                        aria-label="Código de color secundario"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Pie de Página</h3>
                <div className="space-y-2">
                  <Label htmlFor="footer_text">Texto del Pie de Página</Label>
                  <Input 
                    id="footer_text" 
                    value={settings.footer_text} 
                    onChange={(e) => handleChange('footer_text', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Contact Tab */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>Información de Contacto</CardTitle>
              <CardDescription>
                Configura la información de contacto del sitio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Email de Contacto</Label>
                  <Input 
                    id="contact_email" 
                    type="email"
                    value={settings.contact_email} 
                    onChange={(e) => handleChange('contact_email', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="support_email">Email de Soporte</Label>
                  <Input 
                    id="support_email" 
                    type="email"
                    value={settings.support_email} 
                    onChange={(e) => handleChange('support_email', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Suscripciones</CardTitle>
              <CardDescription>
                Configura las opciones relacionadas con las suscripciones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="enable_subscriptions" 
                  checked={settings.enable_subscriptions}
                  onCheckedChange={(checked) => handleChange('enable_subscriptions', checked)}
                />
                <Label htmlFor="enable_subscriptions">Habilitar Suscripciones</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}