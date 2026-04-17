"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Inbox, Building2, Users, FileText, Scale,
  Settings, Plug, Bot, Zap,
} from "lucide-react"

const NAV = [
  { href: "/",              icon: LayoutDashboard, label: "Home"            },
  { href: "/timesheets",    icon: Inbox,           label: "Inbox"           },
  { href: "/clients",       icon: Building2,       label: "Clients"         },
  { href: "/employees",     icon: Users,           label: "Employees"       },
  { href: "/compliance",    icon: Scale,           label: "AI Compliance"   },
  { href: "/policy",        icon: FileText,        label: "AI Policy"       },
  { href: "/integrations",  icon: Plug,            label: "Integrations"    },
  { href: "/agents",        icon: Bot,             label: "AI Agents"       },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col h-screen w-[220px] flex-shrink-0 sidebar-surface">

      {/* Logo */}
      <div className="px-5 pt-7 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--accent)" }}>
            <span className="text-white text-sm font-bold">O</span>
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-white">
            OpsDesk
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {NAV.map(item => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
              style={{
                background: active ? "rgba(124,111,228,0.15)" : "transparent",
                color:      active ? "#FFFFFF" : "var(--nav-text)",
              }}
            >
              <item.icon size={18} strokeWidth={active ? 2 : 1.5} />
              <span className="text-[13px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-5 space-y-2">
        {/* AI pill */}
        <Link href="/agents">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
            style={{ background: "rgba(124,111,228,0.12)" }}>
            <Zap size={15} style={{ color: "var(--accent)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>5 agents active</span>
            <span className="w-1.5 h-1.5 rounded-full animate-dot-blink ml-auto" style={{ background: "#059669" }} />
          </div>
        </Link>

        {/* Settings */}
        <Link href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
          style={{ color: "var(--nav-text)" }}>
          <Settings size={18} strokeWidth={1.5} />
          <span className="text-[13px]">Settings</span>
        </Link>

        {/* User */}
        <div className="flex items-center gap-2.5 px-3 pt-3" style={{ borderTop: "1px solid var(--nav-border)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
            style={{ background: "var(--accent)", color: "#fff" }}>
            RS
          </div>
          <div>
            <div className="text-[13px] font-medium text-white">Riya Shah</div>
            <div className="text-[11px]" style={{ color: "var(--nav-text)" }}>Ops Lead</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
