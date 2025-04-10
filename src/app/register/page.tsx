import Link from "next/link"
import { RegisterForm } from "@/components/auth/register-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Crear Cuenta</CardTitle>
          <CardDescription className="text-center">
            Introduce tus datos para registrarte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
          <div className="mt-4 text-center text-sm flex items-center justify-center gap-3">
            <span>¿Ya tienes una cuenta?</span>
            <Link href="/login">
              <Button className="transition-all hover:bg-white hover:text-primary hover:border hover:border-black">
                Iniciar Sesión
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}