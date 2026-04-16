"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Inbox, Building2, Users, FileText, Scale,
  CreditCard, BarChart3, Settings, Plug, Bot, Zap,
} from "lucide-react"

const NAV = [
  { href: "/",              icon: LayoutDashboard, label: "Home"            },
  { href: "/timesheets",    icon: Inbox,           label: "Timesheets"      },
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
    <aside className="hidden lg:flex flex-col h-screen w-[220px] flex-shrink-0 sidebar-surface">

      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--accent)" }}
          >
            <span className="text-white text-xs font-bold">O</span>
          </div>
          <span className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--text-1)" }}>
            OpsDesk
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV.map(item => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
              style={{
                background: active ? "var(--accent-dim)" : "transparent",
                color:      active ? "var(--accent)" : "var(--text-2)",
                fontWeight:  active ? 600 : 400,
              }}
            >
              <item.icon size={18} strokeWidth={active ? 2 : 1.5} />
              <span className="text-[13px]">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-5 space-y-2">
        {/* AI Agents pill */}
        <Link href="/agents">
          <div
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors"
            style={{ background: "var(--accent-dim)" }}
          >
            <Zap size={15} style={{ color: "var(--accent)" }} />
            <div className="flex-1">
              <div className="text-xs font-medium" style={{ color: "var(--accent)" }}>5 agents active</div>
            </div>
            <span className="w-1.5 h-1.5 rounded-full animate-dot-blink" style={{ background: "var(--accent)" }} />
          </div>
        </Link>

        {/* Settings */}
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
          style={{ color: "var(--text-3)" }}
        >
          <Settings size={18} strokeWidth={1.5} />
          <span className="text-[13px]">Settings</span>
        </Link>

        {/* User */}
        <div className="flex items-center gap-2.5 px-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
            style={{ background: "var(--accent)" }}
          >
            RS
          </div>
          <div>
            <div className="text-[13px] font-medium" style={{ color: "var(--text-1)" }}>Riya Shah</div>
            <div className="text-[11px]" style={{ color: "var(--text-3)" }}>Ops Lead</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
