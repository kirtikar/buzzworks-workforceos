"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Inbox, Building2, Users, FileText, Scale,
  CreditCard, BarChart3, Settings, Zap, ClipboardCheck, Plug, Bot,
} from "lucide-react"

const navItems = [
  { href: "/",              icon: LayoutDashboard, label: "Overview"        },
  { href: "/timesheets",    icon: Inbox,           label: "Timesheet Inbox" },
  { href: "/clients",       icon: Building2,       label: "Clients"         },
  { href: "/employees",     icon: Users,           label: "Employees"       },
  { href: "/compliance",    icon: Scale,           label: "Compliance"      },
  { href: "/policy",        icon: FileText,        label: "AI Engine"       },
  { href: "/payroll",       icon: CreditCard,      label: "Payroll"         },
  { href: "/reports",       icon: BarChart3,       label: "Reports"         },
  { href: "/integrations",  icon: Plug,            label: "Integrations"    },
  { href: "/agents",        icon: Bot,             label: "AI Agents"       },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="hidden lg:flex flex-col h-screen w-[230px] flex-shrink-0 sidebar-surface">

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--accent)" }}
        >
          <ClipboardCheck size={18} className="text-white" />
        </div>
        <div>
          <div className="text-sm font-bold tracking-tight" style={{ color: "var(--text-1)" }}>OpsDesk</div>
          <div className="text-[10px] font-medium tracking-wider uppercase" style={{ color: "var(--text-3)" }}>Buzzworks</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150"
              style={{
                background: isActive ? "var(--accent-dim)" : "transparent",
                color: isActive ? "var(--accent)" : "var(--text-3)",
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.background = "var(--surface-hover)"
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.background = "transparent"
              }}
            >
              {isActive && (
                <span
                  className="absolute left-0 w-[3px] h-5 rounded-r-sm"
                  style={{ background: "var(--accent)" }}
                />
              )}
              <item.icon size={18} className="flex-shrink-0" />
              <span className="text-[13px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* AI Agents status */}
      <div className="px-3 pb-3">
        <Link href="/agents">
          <div
            className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all"
            style={{ background: "var(--accent-dim)", border: "1px solid var(--accent-border)" }}
          >
            <div className="relative flex-shrink-0">
              <Zap size={16} style={{ color: "var(--accent)" }} />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full animate-dot-blink" style={{ background: "var(--accent)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold" style={{ color: "var(--accent)" }}>AI Agents</div>
              <div className="text-[10px]" style={{ color: "var(--text-3)" }}>5 active · 48 today</div>
            </div>
          </div>
        </Link>
      </div>

      {/* Settings + User */}
      <div className="px-3 pb-5 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
          style={{ color: "var(--text-3)" }}
          onMouseEnter={e => {
            e.currentTarget.style.color = "var(--text-1)"
            e.currentTarget.style.background = "var(--surface-hover)"
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = "var(--text-3)"
            e.currentTarget.style.background = "transparent"
          }}
        >
          <Settings size={18} />
          <span className="text-[13px] font-medium">Settings</span>
        </Link>
        <div className="flex items-center gap-3 px-3 pt-4 mt-2 border-t" style={{ borderColor: "var(--border)" }}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
            style={{ background: "var(--accent)" }}
          >
            RS
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate" style={{ color: "var(--text-1)" }}>Riya Shah</div>
            <div className="text-[11px] truncate" style={{ color: "var(--text-3)" }}>Ops Lead</div>
          </div>
        </div>
      </div>
    </div>
  )
}
