import { getInitials } from '../utils/helpers'

// ─── Avatar ───────────────────────────────────────────────────────────────────
export const Avatar = ({ user, size = 'md' }) => {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-8 h-8 text-xs', lg: 'w-10 h-10 text-sm', xl: 'w-12 h-12 text-base' }
  const initials = user?.avatar || getInitials(user?.name || '')
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0`}
      style={{ backgroundColor: user?.color || '#6366f1' }}
      title={user?.name}
    >
      {initials}
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────
export const Badge = ({ children, className = '' }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
    {children}
  </span>
)

// ─── Button ───────────────────────────────────────────────────────────────────
export const Button = ({ children, variant = 'primary', size = 'md', disabled, onClick, type = 'button', className = '', loading }) => {
  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-white',
    ghost: 'bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white',
    danger: 'bg-red-600 hover:bg-red-500 text-white',
    outline: 'border border-slate-600 hover:border-slate-500 bg-transparent text-slate-300 hover:text-white',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
  }
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────
export const Input = ({ label, error, className = '', ...props }) => (
  <div className={className}>
    {label && <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">{label}</label>}
    <input
      {...props}
      className={`w-full bg-slate-800 border ${error ? 'border-red-500' : 'border-slate-600'} rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors`}
    />
    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
  </div>
)

// ─── Textarea ─────────────────────────────────────────────────────────────────
export const Textarea = ({ label, error, className = '', ...props }) => (
  <div className={className}>
    {label && <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">{label}</label>}
    <textarea
      {...props}
      className={`w-full bg-slate-800 border ${error ? 'border-red-500' : 'border-slate-600'} rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none`}
    />
    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
  </div>
)

// ─── Select ───────────────────────────────────────────────────────────────────
export const Select = ({ label, error, className = '', children, ...props }) => (
  <div className={className}>
    {label && <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">{label}</label>}
    <select
      {...props}
      className={`w-full bg-slate-800 border ${error ? 'border-red-500' : 'border-slate-600'} rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors`}
    >
      {children}
    </select>
    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
  </div>
)

// ─── Modal ────────────────────────────────────────────────────────────────────
export const Modal = ({ title, onClose, children, wide = false }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn" />
    <div
      className={`relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full animate-slideUp overflow-hidden ${wide ? 'max-w-2xl' : 'max-w-md'}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
)

// ─── Spinner ──────────────────────────────────────────────────────────────────
export const Spinner = ({ size = 'md' }) => {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
  return (
    <svg className={`animate-spin ${s[size]} text-indigo-400`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export const Card = ({ children, className = '', hover = false }) => (
  <div className={`bg-slate-900/60 border border-slate-700/60 rounded-2xl ${hover ? 'hover:border-slate-600 transition-colors' : ''} ${className}`}>
    {children}
  </div>
)

// ─── Empty State ──────────────────────────────────────────────────────────────
export const EmptyState = ({ title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-slate-600">
        <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h6M9 12h6M9 15h4" />
      </svg>
    </div>
    <h3 className="text-white font-semibold mb-1">{title}</h3>
    <p className="text-slate-500 text-sm mb-4 max-w-xs">{description}</p>
    {action}
  </div>
)

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
export const ConfirmDialog = ({ title, message, onConfirm, onCancel, danger = false }) => (
  <Modal title={title} onClose={onCancel}>
    <p className="text-slate-400 text-sm mb-6">{message}</p>
    <div className="flex gap-3">
      <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
      <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} className="flex-1">Confirm</Button>
    </div>
  </Modal>
)
