"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Inbox, Building2, CreditCard, MoreHorizontal,
  Users, FileText, BarChart3, Plug, Bot, Settings, X, ClipboardCheck,
} from "lucide-react"
import clsx from "clsx"

const PRIMARY = [
  { href: "/",           icon: LayoutDashboard, label: "Overview",   badge: null },
  { href: "/timesheets", icon: Inbox,           label: "Timesheets", badge: "23" },
  { href: "/clients",    icon: Building2,       label: "Clients",    badge: null },
  { href: "/payroll",    icon: CreditCard,      label: "Payroll",    badge: "12" },
]

const MORE = [
  { href: "/employees",    icon: Users,      label: "Employees"    },
  { href: "/policy",       icon: FileText,   label: "AI Engine"    },
  { href: "/reports",      icon: BarChart3,  label: "Reports"      },
  { href: "/integrations", icon: Plug,       label: "Integrations" },
  { href: "/agents",       icon: Bot,        label: "AI Agents"    },
  { href: "/settings",     icon: Settings,   label: "Settings"     },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href)

  const moreActive = MORE.some(i => isActive(i.href))

  return (
    <>
      {/* Overlay backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* More drawer */}
      {open && (
        <div
          className="fixed bottom-[64px] left-0 right-0 z-50 lg:hidden rounded-t-2xl px-4 pt-4 pb-6 animate-fade-in"
          style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", borderBottom: "none" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,var(--accent),#2563EB)" }}>
                <ClipboardCheck size={14} className="text-white" />
              </div>
              <span className="text-[13px] font-bold" style={{ color: "var(--text-1)" }}>OpsDesk</span>
            </div>
            <button onClick={() => setOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg"
              style={{ color: "var(--text-3)", background: "var(--surface)" }}>
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {MORE.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                <div className={clsx(
                  "flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all",
                  isActive(item.href) ? "bg-white/[0.1]" : "bg-white/[0.04] active:bg-white/[0.08]"
                )}>
                  <item.icon size={20} style={{ color: isActive(item.href) ? "var(--accent)" : "var(--text-2)" }} />
                  <span className="text-[11px] font-medium" style={{ color: isActive(item.href) ? "var(--text-1)" : "var(--text-2)" }}>
                    {item.label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center lg:hidden bottom-nav-surface"
        style={{
          backdropFilter: "blur(20px)",
          height: 64,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {[...PRIMARY].map(item => (
          <Link key={item.href} href={item.href} className="flex-1">
            <div className={clsx(
              "flex flex-col items-center justify-center gap-1 h-full min-h-[44px] transition-all relative",
              isActive(item.href) ? "text-white" : "text-white/40"
            )}>
              {isActive(item.href) && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{ background: "var(--accent)" }} />
              )}
              <div className="relative">
                <item.icon size={20} style={{ color: isActive(item.href) ? "var(--accent)" : undefined }} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2.5 text-[9px] font-bold px-1 rounded-full"
                    style={{ background: "var(--accent)", color: "#021a14", lineHeight: "14px" }}>
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </div>
          </Link>
        ))}

        {/* More */}
        <button className="flex-1" onClick={() => setOpen(v => !v)}>
          <div className={clsx(
            "flex flex-col items-center justify-center gap-1 h-full min-h-[44px] transition-all relative",
            moreActive || open ? "text-white" : "text-white/40"
          )}>
            {(moreActive || open) && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{ background: "var(--accent)" }} />
            )}
            <MoreHorizontal size={20} style={{ color: moreActive || open ? "var(--accent)" : undefined }} />
            <span className="text-[10px] font-medium">More</span>
          </div>
        </button>
      </nav>
    </>
  )
}
