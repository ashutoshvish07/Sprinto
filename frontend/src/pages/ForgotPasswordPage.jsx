import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authAPI } from '../api/services'
import { Input, Button } from '../components/ui'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!email.trim()) { setError('Email is required'); return }
    setLoading(true)
    setError('')
    try {
      await authAPI.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -20%, #1e1b4b 0%, #0f172a 70%)' }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
            </div>
            <span className="text-2xl font-bold text-white">Sprinto</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-8 shadow-2xl">
          {!sent ? (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-semibold text-white">Forgot your password?</h1>
                <p className="text-slate-400 text-sm mt-1">Enter your email and we'll send you a reset link.</p>
              </div>

              <div className="space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  placeholder="you@example.com"
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  error={error}
                />
                <Button onClick={handleSubmit} loading={loading} className="w-full" size="lg">
                  Send Reset Link
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-indigo-400">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Check your inbox</h2>
              <p className="text-slate-400 text-sm mb-2">
                If <span className="text-white">{email}</span> is registered, a reset link has been sent.
              </p>
              <p className="text-slate-500 text-xs">The link expires in 1 hour.</p>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-slate-700/60 text-center">
            <Link to="/login" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
