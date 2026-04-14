"use client"

import { useState } from "react"
import { Sparkles, X, ChevronRight, AlertTriangle, Lightbulb, Info, Zap } from "lucide-react"
import { aiInsights } from "@/lib/mock-data"

const priorityConfig = {
  high: { icon: AlertTriangle, color: "var(--danger)", bg: "var(--danger-bg)", border: "var(--danger-border)" },
  medium: { icon: Lightbulb, color: "var(--warn)", bg: "var(--warn-bg)", border: "var(--warn-border)" },
  low: { icon: Info, color: "var(--accent)", bg: "var(--accent-dim)", border: "var(--accent-border)" },
}

export default function AIAgentOrb() {
  const [isOpen, setIsOpen] = useState(false)
  const unread = aiInsights.filter((i) => !i.isRead).length

  return (
    <>
      {/* Floating orb */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-13 h-13 rounded-full flex items-center justify-center z-50 transition-transform duration-200 hover:scale-110 active:scale-95"
        style={{
          width: 52,
          height: 52,
          background: "var(--accent)",
        }}
      >
        <div className="animate-orb-pulse absolute inset-0 rounded-full" />
        <Sparkles size={20} className="text-white relative z-10" />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center z-10"
            style={{ background: "#FF6B6B", color: "#fff", border: "2px solid #090915" }}
          >
            {unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div
          className="fixed bottom-[76px] right-6 w-[320px] rounded-2xl z-50 overflow-hidden animate-fade-in"
          style={{
            background: "#0e0e16",
            border: "1px solid var(--border-strong)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: "var(--accent)" }}
              >
                <Zap size={12} className="text-white" />
              </div>
              <span className="text-[13px] font-semibold text-white">AI Insights</span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                style={{ background: "rgba(37,99,235,0.2)", color: "#A78BFA" }}
              >
                {unread} new
              </span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/35 hover:text-white/70 transition-colors">
              <X size={15} />
            </button>
          </div>

          {/* Status bar */}
          <div
            className="px-4 py-2 flex items-center gap-2 border-b border-white/[0.06]"
            style={{ background: "rgba(75,143,255,0.06)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-dot-blink" />
            <span className="text-[11px] text-blue-400 font-medium">
              Agent scanning 8 timesheets · 5 auto-validated
            </span>
          </div>

          {/* Insights */}
          <div className="max-h-[280px] overflow-y-auto p-3 space-y-2">
            {aiInsights.map((insight) => {
              const cfg = priorityConfig[insight.priority]
              const Icon = cfg.icon
              return (
                <div
                  key={insight.id}
                  className="p-3 rounded-xl cursor-pointer transition-all hover:opacity-90"
                  style={{
                    background: cfg.bg,
                    border: `1px solid ${insight.isRead ? "transparent" : cfg.border}`,
                    borderLeft: !insight.isRead ? `2px solid ${cfg.color}` : undefined,
                  }}
                >
                  <div className="flex items-start gap-2">
                    <Icon size={13} className="mt-0.5 flex-shrink-0" style={{ color: cfg.color }} />
                    <div>
                      <div className="text-[12px] font-semibold text-white/90 leading-tight">
                        {insight.title}
                      </div>
                      <div className="text-[11px] text-white/50 mt-1 leading-relaxed">
                        {insight.description}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-white/[0.08]">
            <div className="text-[11px] text-white/30 mb-1.5">
              Next: AI auto-approve low-risk timesheets — coming in v2
            </div>
            <button className="w-full text-[12px] text-violet-400 hover:text-violet-300 flex items-center justify-center gap-1 transition-colors font-medium">
              Open AI Agent panel <ChevronRight size={11} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
