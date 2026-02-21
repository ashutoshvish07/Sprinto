import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../api/services'
import { Spinner } from '../components/ui'

export default function VerifyEmailPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading') // loading | success | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    const verify = async () => {
      try {
        const { data } = await authAPI.verifyEmail(token)
        setStatus('success')
        setMessage(data.message)
        // Redirect to login after 3 seconds
        setTimeout(() => navigate('/login'), 3000)
      } catch (err) {
        setStatus('error')
        setMessage(err.response?.data?.message || 'Verification failed')
      }
    }
    verify()
  }, [token])

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -20%, #1e1b4b 0%, #0f172a 70%)' }}
    >
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <div className="inline-flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
          </div>
          <span className="text-2xl font-bold text-white">Sprinto</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-10 shadow-2xl">
          {status === 'loading' && (
            <>
              <Spinner size="lg" />
              <p className="text-slate-400 mt-4">Verifying your email...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-emerald-400">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Email Verified!</h2>
              <p className="text-slate-400 text-sm mb-6">{message}</p>
              <p className="text-slate-500 text-xs">Redirecting to login in 3 seconds...</p>
              <Link to="/login" className="mt-4 inline-block text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
                Go to Login →
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-8 h-8 text-red-400">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Verification Failed</h2>
              <p className="text-slate-400 text-sm mb-6">{message}</p>
              <p className="text-slate-500 text-xs mb-4">The link may have expired (valid for 24 hours).</p>
              <Link to="/login" className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
                Back to Login →
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
