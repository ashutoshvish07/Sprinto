import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastContext = createContext(null)

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])
  const counterRef = useRef(0)

  const addToast = useCallback((message, type = 'success') => {
    const id = ++counterRef.current
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="animate-slideUp flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border max-w-sm bg-slate-800 border-slate-600">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.type === 'success' ? 'bg-emerald-400' : t.type === 'error' ? 'bg-red-400' : 'bg-blue-400'}`} />
            <span className="text-sm text-white">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
