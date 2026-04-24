"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ClipboardCheck, Eye, EyeOff, ArrowRight, Sparkles } from "lucide-react"

const DEMO_EMAIL = "agentic@buzzworks.com"
const DEMO_PASSWORD = "buzzworks@123"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState(DEMO_EMAIL)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    await new Promise((r) => setTimeout(r, 600))

    if (email.trim() === DEMO_EMAIL && password === DEMO_PASSWORD) {
      document.cookie = "ops_session=active; path=/; max-age=28800; SameSite=Strict"
      router.push("/")
    } else {
      setError("Invalid credentials. Check the prefilled values.")
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "var(--bg)" }}
    >
      {/* Card */}
      <div className="w-full max-w-[380px]">
        {/* Logo block */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: "var(--accent)" }}
          >
            <ClipboardCheck size={20} style={{ color: "#ffffff" }} />
          </div>
          <div className="text-[24px] font-black tracking-tight" style={{ color: "var(--text-1)" }}>
            Agent Dashboard
          </div>
          <div className="text-[12px] mt-1" style={{ color: "var(--text-3)" }}>
            For Buzzworks Agent Managers
          </div>
        </div>

        {/* Form card */}
        <div className="login-card p-7">
          <div className="text-[14px] font-semibold mb-1" style={{ color: "var(--text-1)" }}>
            Sign in
          </div>
          <div className="text-[12px] mb-6" style={{ color: "var(--text-3)" }}>
            Access restricted to Buzzworks Agent Managers
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: "var(--text-2)" }}>
                Email address
              </label>
              <input
                type="email"
                className="login-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: "var(--text-2)" }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="login-input pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                  style={{ color: "var(--text-3)" }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="text-[12px] px-3 py-2 rounded-lg"
                style={{ background: "var(--danger-bg)", color: "var(--danger)", border: "1px solid var(--danger-border)" }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-teal flex items-center justify-center gap-2 py-3 mt-2"
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <>
                  Sign in <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-[11px]" style={{ color: "var(--text-3)" }}>prefilled for evaluation</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          {/* Prefilled hint */}
          <div
            className="p-3 rounded-xl space-y-1.5"
            style={{ background: "var(--accent-dim)", border: "1px solid var(--accent-border)" }}
          >
            <div className="flex items-center gap-2">
              <Sparkles size={11} style={{ color: "var(--accent)" }} />
              <span className="text-[11px] font-medium" style={{ color: "var(--accent)" }}>Dev access credentials</span>
            </div>
            <div className="text-[11px] font-mono" style={{ color: "var(--text-2)" }}>
              {DEMO_EMAIL}
            </div>
            <div className="text-[11px] font-mono" style={{ color: "var(--text-2)" }}>
              {DEMO_PASSWORD}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-[11px]" style={{ color: "var(--text-3)" }}>
          © 2026 Buzzworks · Internal tool · Not for public distribution
        </div>
      </div>
    </div>
  )
}
