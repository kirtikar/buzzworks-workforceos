"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Inbox,
  Building2,
  Users,
  FileText,
  CreditCard,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ClipboardCheck,
} from "lucide-react"
import clsx from "clsx"

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Overview", badge: null },
  { href: "/timesheets", icon: Inbox, label: "Timesheet Inbox", badge: "23" },
  { href: "/clients", icon: Building2, label: "Clients", badge: null },
  { href: "/employees", icon: Users, label: "Employees", badge: null },
  { href: "/policy", icon: FileText, label: "Policy Engine", badge: null },
  { href: "/payroll", icon: CreditCard, label: "Payroll", badge: "12" },
  { href: "/reports", icon: BarChart3, label: "Reports", badge: null },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <div
      className={clsx(
        "relative flex flex-col h-screen flex-shrink-0 transition-all duration-300 ease-in-out",
        "border-r border-white/[0.07]",
        collapsed ? "w-[68px]" : "w-[228px]"
      )}
      style={{ background: "rgba(9, 7, 20, 0.9)", backdropFilter: "blur(20px)" }}
    >
      {/* Logo */}
      <div
        className={clsx(
          "flex items-center gap-3 border-b border-white/[0.07]",
          collapsed ? "px-4 py-5 justify-center" : "px-4 py-5"
        )}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #00D4A5 0%, #8B5CF6 100%)" }}
        >
          <ClipboardCheck size={17} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <div className="font-bold text-sm text-white tracking-wide">OpsDesk</div>
            <div className="text-[10px] text-white/35 font-medium tracking-wider uppercase">
              Buzzworks
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group",
                isActive
                  ? "bg-white/[0.08] text-white"
                  : "text-white/45 hover:text-white/75 hover:bg-white/[0.05]"
              )}
            >
              {isActive && <span className="nav-active-dot" />}
              <item.icon
                size={17}
                className={clsx(
                  "flex-shrink-0 transition-colors",
                  isActive ? "text-teal-500" : "group-hover:text-white/60"
                )}
              />
              {!collapsed && (
                <>
                  <span className="text-[13px] font-medium flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                      style={{ background: "rgba(0,212,165,0.18)", color: "#00D4A5" }}
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

      {/* AI Agent */}
      <div className="px-2 pb-2">
        <div
          className={clsx(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all",
            collapsed ? "justify-center" : ""
          )}
          style={{
            background: "rgba(0, 200, 150, 0.07)",
            border: "1px solid rgba(0, 200, 150, 0.15)",
          }}
        >
          <div className="relative flex-shrink-0">
            <Sparkles size={16} style={{ color: "#00c896" }} />
            <span
              className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full animate-dot-blink"
              style={{ background: "#00c896" }}
            />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold" style={{ color: "#00c896" }}>AI Agent</div>
              <div className="text-[10px]" style={{ color: "var(--text-3)" }}>3 insights · active</div>
            </div>
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="px-2 pb-4 pt-2 border-t border-white/[0.06]">
        <Link
          href="/settings"
          className={clsx(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/35 hover:text-white/60 hover:bg-white/[0.04] transition-all",
            collapsed ? "justify-center" : ""
          )}
        >
          <Settings size={17} />
          {!collapsed && <span className="text-[13px] font-medium">Settings</span>}
        </Link>

        {/* User avatar */}
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-3 pt-3 mt-1 border-t border-white/[0.06]">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #00D4A5)", color: "#fff" }}
            >
              RS
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-white/80 truncate">Riya Shah</div>
              <div className="text-[10px] text-white/35 truncate">Ops Lead</div>
            </div>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[72px] w-6 h-6 rounded-full border border-white/[0.12] flex items-center justify-center z-10 transition-all hover:border-white/25"
        style={{ background: "#0f0a20" }}
      >
        {collapsed ? (
          <ChevronRight size={11} className="text-white/50" />
        ) : (
          <ChevronLeft size={11} className="text-white/50" />
        )}
      </button>
    </div>
  )
}
