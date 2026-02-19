import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Button, Input } from '../components/ui'

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@nexus.com', password: 'admin123', color: '#6366f1' },
  { role: 'Manager', email: 'manager@nexus.com', password: 'manager123', color: '#0ea5e9' },
  { role: 'User', email: 'sam@nexus.com', password: 'password123', color: '#10b981' },
]

export default function LoginPage() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [email, setEmail] = useState('admin@nexus.com')
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
      setError(err.response?.data?.message || 'Login failed')
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
            <span className="text-2xl font-bold text-white">Nexus</span>
          </div>
          <p className="text-slate-400 text-sm">Project Management, Reimagined</p>
        </div>

        {/* Card */}
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
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              placeholder="••••••••"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button onClick={handleLogin} loading={loading} className="w-full" size="lg">
              Sign In
            </Button>
          </div>

          {/* Demo */}
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

        <p className="text-center text-xs text-slate-600 mt-4 flex items-center justify-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Secured with JWT · Run <code className="bg-slate-800 px-1 rounded">npm run seed</code> first
        </p>
      </div>
    </div>
  )
}
