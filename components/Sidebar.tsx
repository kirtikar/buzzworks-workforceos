"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Inbox, Building2, Users, FileText,
  CreditCard, BarChart3, Settings, ChevronLeft, ChevronRight,
  Zap, ClipboardCheck, Plug, Bot,
} from "lucide-react"
import clsx from "clsx"

const navItems = [
  { href: "/",              icon: LayoutDashboard, label: "Overview",        badge: null },
  { href: "/timesheets",    icon: Inbox,           label: "Timesheet Inbox", badge: "23" },
  { href: "/clients",       icon: Building2,       label: "Clients",         badge: null },
  { href: "/employees",     icon: Users,           label: "Employees",       badge: null },
  { href: "/policy",        icon: FileText,        label: "Policy Engine",   badge: null },
  { href: "/payroll",       icon: CreditCard,      label: "Payroll",         badge: "12" },
  { href: "/reports",       icon: BarChart3,       label: "Reports",         badge: null },
  { href: "/integrations",  icon: Plug,            label: "Integrations",    badge: "10" },
  { href: "/agents",        icon: Bot,             label: "AI Agents",       badge: "6" },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <div
      className={clsx(
        "relative hidden lg:flex flex-col h-screen flex-shrink-0 transition-all duration-300 ease-in-out sidebar-surface",
        collapsed ? "w-[64px]" : "w-[220px]"
      )}
    >
      {/* Logo */}
      <div className={clsx(
        "flex items-center gap-3 py-5 border-b",
        collapsed ? "px-4 justify-center" : "px-5",
      )} style={{ borderColor: "var(--border)" }}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--accent)" }}
        >
          <ClipboardCheck size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <div className="font-bold text-[14px] tracking-tight" style={{ color: "var(--text-1)" }}>OpsDesk</div>
            <div className="text-[10px] font-medium tracking-wider uppercase" style={{ color: "var(--text-3)" }}>Buzzworks</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group",
                isActive
                  ? "text-white"
                  : "hover:text-white/80"
              )}
              style={{
                background: isActive ? "var(--accent-dim)" : "transparent",
                color: isActive ? "var(--text-1)" : "var(--text-3)",
              }}
            >
              {isActive && <span className="nav-active-dot" />}
              <item.icon
                size={16}
                className="flex-shrink-0 transition-colors"
                style={{ color: isActive ? "var(--accent)" : undefined }}
              />
              {!collapsed && (
                <>
                  <span className="text-[13px] font-medium flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                      style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          )
        })}
      </nav>

      {/* AI Agent status */}
      <div className="px-2 pb-2">
        <div
          className={clsx(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all",
            collapsed ? "justify-center" : ""
          )}
          style={{ background: "var(--accent-dim)", border: "1px solid var(--accent-border)" }}
        >
          <div className="relative flex-shrink-0">
            <Zap size={14} style={{ color: "var(--accent)" }} />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full animate-dot-blink" style={{ background: "var(--accent)" }} />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold" style={{ color: "var(--accent)" }}>AI Agents</div>
              <div className="text-[10px]" style={{ color: "var(--text-3)" }}>5 active · 48 today</div>
            </div>
          )}
        </div>
      </div>

      {/* Settings + Avatar */}
      <div className="px-2 pb-4 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
        <Link
          href="/settings"
          className={clsx(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
            collapsed ? "justify-center" : ""
          )}
          style={{ color: "var(--text-3)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
        >
          <Settings size={16} />
          {!collapsed && <span className="text-[13px] font-medium">Settings</span>}
        </Link>
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-3 pt-3 mt-1 border-t" style={{ borderColor: "var(--border)" }}>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 text-white"
              style={{ background: "var(--accent)" }}
            >
              RS
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold truncate" style={{ color: "var(--text-1)" }}>Riya Shah</div>
              <div className="text-[10px] truncate" style={{ color: "var(--text-3)" }}>Ops Lead</div>
            </div>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[72px] w-6 h-6 rounded-full flex items-center justify-center z-10 transition-all"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-strong)",
          color: "var(--text-3)",
        }}
      >
        {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
      </button>
    </div>
  )
}
