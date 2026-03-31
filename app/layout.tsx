import type { Metadata } from "next"
import "./globals.css"
import SessionProvider from "@/app/components/providers/SessionProvider"

export const metadata: Metadata = {
  title: "WiserWits - School ERP Portal",
  description: "Comprehensive school management system",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
