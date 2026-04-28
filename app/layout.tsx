import type { Metadata } from "next"
import "./globals.css"
import SessionProvider from "@/app/components/providers/SessionProvider"
import ViewingSessionProvider from "@/app/components/providers/ViewingSessionProvider"

export const metadata: Metadata = {
  title: "WiserWits - Partner ERP Portal",
  description: "Comprehensive management system for schools, coaching centres, colleges, and other partners",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <ViewingSessionProvider>{children}</ViewingSessionProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
