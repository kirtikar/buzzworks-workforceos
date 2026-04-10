import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/ThemeProvider"

export const metadata: Metadata = {
  title: "OpsDesk — Timesheet Operations · Buzzworks",
  description: "Internal timesheet validation, policy checks, and payroll operations hub.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body className="app-bg">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
