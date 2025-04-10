import Link from "next/link"
import { LoginForm } from "@/components/auth/login-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Iniciar Sesion</CardTitle>
          <CardDescription className="text-center">
            Introduce tu email y contraseña para iniciar sesion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <div className="mt-4 text-center text-sm flex items-center justify-center gap-3">
            <span>¿No tienes una cuenta?</span>
            <Link href="/register">
              <Button className="transition-all hover:bg-white hover:text-primary hover:border hover:border-black">
                Registrate
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}