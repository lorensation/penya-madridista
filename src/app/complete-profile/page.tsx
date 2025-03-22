import MemberRegistrationForm from "@/components/member/member-registration-form"

export const metadata = {
  title: "Completa tu Perfil | Peña Madridista",
  description: "Completa tu registro como miembro de la Peña Madridista",
}

export default function CompleteProfilePage() {
  return (
    <div className="container py-12">
      <MemberRegistrationForm />
    </div>
  )
}

