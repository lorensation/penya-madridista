import type React from "react"
import type { Metadata } from "next"
import DashboardSidebar from "@/components/dashboard/sidebar"

export const metadata: Metadata = {
  title: "Panel de Socio - Peña Lorenzo Sanz",
  description: "Panel de control para socios de la Peña Lorenzo Sanz",
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardSidebar />
      <div className="flex-1 p-4 md:p-8">{children}</div>
    </div>
  )
}

