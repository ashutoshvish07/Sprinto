import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Button, Input } from '../components/ui'

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@sprinto.com', password: 'admin123', color: '#6366f1' },
  { role: 'Manager', email: 'manager@sprinto.com', password: 'manager123', color: '#0ea5e9' },
  { role: 'User', email: 'sam@sprinto.com', password: 'password123', color: '#10b981' },
]

export default function LoginPage() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [email, setEmail] = useState('admin@sprinto.com')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill all fields'); return }
    setLoading(true)
    setError('')
    try {
      await login(email, password)
      toast.success('Welcome back!')
      navigate('/')
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed'
      // Feature 4: Show rate limit message clearly
      if (err.response?.status === 429) {
        setError('Too many login attempts. Please wait 15 minutes.')
      } else {
        setError(msg)
      }
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
          <p className="text-slate-400 text-sm">Project Management, Reimagined</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur border border-slate-700/60 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-lg font-semibold text-white mb-6">Sign in to your workspace</h1>

          <div className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              placeholder="you@example.com"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-slate-400 uppercase tracking-wider">Password</label>
                {/* Feature 3: Forgot Password link */}
                <Link to="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                placeholder="••••••••"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 flex-shrink-0">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <Button onClick={handleLogin} loading={loading} className="w-full" size="lg">
              Sign In
            </Button>
          </div>

          {/* Demo quick access */}
          <div className="mt-6 pt-6 border-t border-slate-700/60">
            <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider">Quick Demo Access</p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((d) => (
                <button
                  key={d.role}
                  onClick={() => { setEmail(d.email); setPassword(d.password) }}
                  className="p-3 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-800/40 hover:bg-slate-800 transition-all group"
                >
                  <div className="w-6 h-6 rounded-full mx-auto mb-2" style={{ background: d.color }} />
                  <span className="text-xs text-slate-400 group-hover:text-white transition-colors">{d.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* <p className="text-center text-xs text-slate-600 mt-4 flex items-center justify-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          JWT Access + Refresh Tokens · Helmet · Rate Limited
        </p> */}
      </div>
    </div>
  )
}
