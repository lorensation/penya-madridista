import type React from "react"
import type { Metadata } from "next"
import AdminSidebar from "@/components/admin/sidebar"

export const metadata: Metadata = {
  title: "Admin Panel - Peña Lorenzo Sanz",
  description: "Panel de administración de la Peña Lorenzo Sanz",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 p-4 md:p-8">{children}</div>
    </div>
  )
}

