import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/context/AuthContext"
import { Toaster } from "@/components/ui/use-toast"
import CookieConsent from '@/components/cookie-consent'
import AnalyticsProvider from '@/components/analytics-provider'
import { Analytics as VercelAnalytics } from '@vercel/analytics/next';

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Peña Lorenzo Sanz - Real Madrid Fan Club",
  description:
    "Official website of Peña Lorenzo Sanz, a Real Madrid fan club dedicated to honoring the legacy of Lorenzo Sanz.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider 
          attribute="class" 
          defaultTheme="light" 
          enableSystem 
          disableTransitionOnChange
        >
          <AuthProvider>
            <Header />
            <main className="min-h-screen">{children}</main>
            <Footer />
            <Toaster />
            <CookieConsent />
            <AnalyticsProvider />
            <VercelAnalytics />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}



