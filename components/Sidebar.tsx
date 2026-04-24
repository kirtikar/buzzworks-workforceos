"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Inbox, Building2, Users, FileText, Scale,
  Settings, Plug, Bot, Zap,
} from "lucide-react"

const NAV = [
  { href: "/",              icon: LayoutDashboard, label: "Home"           },
  { href: "/timesheets",    icon: Inbox,           label: "Inbox"          },
  { href: "/clients",       icon: Building2,       label: "Clients"        },
  { href: "/employees",     icon: Users,           label: "Employees"      },
  { href: "/compliance",    icon: Scale,           label: "Compliance"     },
  { href: "/policy",        icon: FileText,        label: "Policies"       },
  { href: "/integrations",  icon: Plug,            label: "Integrations"   },
  { href: "/agents",        icon: Bot,             label: "AI Agents"      },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col h-screen w-[240px] flex-shrink-0 sidebar-surface">

      {/* Logo */}
      <div className="px-6 pt-6 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "var(--primary-600)" }}>
            <span className="text-white text-sm font-bold">B</span>
          </div>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>Buzz Agent Dash</div>
            <div className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Buzzworks</div>
          </div>
        </div>
      </div>

      {/* Nav — UX rule: text in neutral for inactive, primary-700 for active */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV.map(item => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
              style={{
                background: active ? "var(--primary-50)" : "transparent",
                color:      active ? "var(--primary-700)" : "var(--neutral-600)",
                fontWeight:  active ? 600 : 500,
              }}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r"
                  style={{ background: "var(--primary-500)" }} />
              )}
              <item.icon size={20} strokeWidth={active ? 2 : 1.5} />
              <span className="text-[14px]">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-5 space-y-3">
        {/* AI Agents status — primary-50 wash, primary-700 text for contrast */}
        <div className="mx-1 px-3 py-2.5 rounded-xl"
          style={{ background: "var(--primary-50)", border: "1px solid var(--primary-100)" }}>
          <div className="flex items-center gap-2">
            <Zap size={14} style={{ color: "var(--primary-700)" }} />
            <span className="text-[12px] font-medium" style={{ color: "var(--primary-700)" }}>5 agents active</span>
            <span className="w-1.5 h-1.5 rounded-full animate-dot-blink ml-auto" style={{ background: "var(--success)" }} />
          </div>
        </div>

        {/* Settings */}
        <Link href="/settings"
          className="flex items-center gap-3 px-4 py-2 rounded-lg transition-colors"
          style={{ color: "var(--neutral-500)" }}>
          <Settings size={20} strokeWidth={1.5} />
          <span className="text-[14px]">Settings</span>
        </Link>

        {/* User */}
        <div className="flex items-center gap-3 px-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold"
            style={{ background: "var(--primary-600)", color: "#fff" }}>
            RS
          </div>
          <div>
            <div className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>Riya Shah</div>
            <div className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Ops Lead</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
