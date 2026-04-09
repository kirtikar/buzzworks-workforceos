import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "OpsDesk — Timesheet Operations · Buzzworks",
  description: "Internal timesheet validation, policy checks, and payroll operations hub.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="app-bg">{children}</body>
    </html>
  )
}
