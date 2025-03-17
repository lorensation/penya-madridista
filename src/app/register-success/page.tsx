import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function RegisterSuccess() {
  return (
    <div className="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
          <svg
            className="mx-auto h-12 w-12 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-primary">¡Registro Exitoso!</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Hemos enviado un correo electrónico de confirmación a tu dirección de correo. Por favor, verifica tu bandeja
            de entrada y sigue las instrucciones para activar tu cuenta.
          </p>
          <div className="mt-6">
            <Link href="/login">
              <Button className="w-full bg-primary hover:bg-secondary">Ir a Iniciar Sesión</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

