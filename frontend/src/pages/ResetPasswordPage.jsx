import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../api/services'
import { Input, Button } from '../components/ui'

export default function ResetPasswordPage() {
  const { token } = useParams()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError('')
    try {
      await authAPI.resetPassword(token, password)
      setDone(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. Link may have expired.')
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
          {!done ? (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-semibold text-white">Set new password</h1>
                <p className="text-slate-400 text-sm mt-1">Choose a strong password for your account.</p>
              </div>

              <div className="space-y-4">
                <Input
                  label="New Password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  placeholder="Min 6 characters"
                />
                <Input
                  label="Confirm Password"
                  type="password"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setError('') }}
                  placeholder="Repeat your password"
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />

                {/* Password strength indicator */}
                {password.length > 0 && (
                  <div>
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            password.length >= i * 3
                              ? password.length >= 12
                                ? 'bg-emerald-500'
                                : password.length >= 8
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                              : 'bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">
                      {password.length < 6 ? 'Too short' : password.length < 8 ? 'Weak' : password.length < 12 ? 'Good' : 'Strong'}
                    </p>
                  </div>
                )}

                {error && <p className="text-red-400 text-sm">{error}</p>}
                <Button onClick={handleSubmit} loading={loading} className="w-full" size="lg">
                  Reset Password
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-emerald-400">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Password Reset!</h2>
              <p className="text-slate-400 text-sm mb-4">Your password has been updated successfully.</p>
              <p className="text-slate-500 text-xs">Redirecting to login in 3 seconds...</p>
              <Link to="/login" className="mt-3 inline-block text-indigo-400 hover:text-indigo-300 text-sm">
                Go to Login →
              </Link>
            </div>
          )}

          {!done && (
            <div className="mt-6 pt-6 border-t border-slate-700/60 text-center">
              <Link to="/login" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                ← Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
