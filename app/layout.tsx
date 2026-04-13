import type { Metadata, Viewport } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/ThemeProvider"
import BottomNav from "@/components/BottomNav"

export const metadata: Metadata = {
  title: "OpsDesk — Timesheet Operations · Buzzworks",
  description: "Internal timesheet validation, policy checks, and payroll operations hub.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#09090e",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body className="app-bg">
        <ThemeProvider>
          {children}
          <BottomNav />
        </ThemeProvider>
      </body>
    </html>
  )
}
