import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { authAPI } from '../api/services'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const refreshTimerRef = useRef(null)

  // Feature 1: Schedule silent refresh before 15min access token expires
  const scheduleRefresh = useCallback((refreshToken) => {
    clearTimeout(refreshTimerRef.current)
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const { data } = await authAPI.refresh(refreshToken)
        localStorage.setItem('nexus_token', data.accessToken)
        scheduleRefresh(refreshToken) // schedule again
      } catch {
        logout()
      }
    }, 14 * 60 * 1000) // 14 minutes
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('nexus_token')
    const refreshToken = localStorage.getItem('nexus_refresh_token')
    const savedUser = localStorage.getItem('nexus_user')

    if (token && savedUser) {
      setUser(JSON.parse(savedUser))
      if (refreshToken) scheduleRefresh(refreshToken)

      authAPI.me()
        .then(({ data }) => {
          setUser(data.user)
          localStorage.setItem('nexus_user', JSON.stringify(data.user))
        })
        .catch(() => {
          if (refreshToken) {
            authAPI.refresh(refreshToken)
              .then(({ data }) => {
                localStorage.setItem('nexus_token', data.accessToken)
                return authAPI.me()
              })
              .then(({ data }) => {
                setUser(data.user)
                localStorage.setItem('nexus_user', JSON.stringify(data.user))
              })
              .catch(() => logout())
          } else {
            logout()
          }
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }

    return () => clearTimeout(refreshTimerRef.current)
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password })
    localStorage.setItem('nexus_token', data.accessToken)
    localStorage.setItem('nexus_refresh_token', data.refreshToken)
    localStorage.setItem('nexus_user', JSON.stringify(data.user))
    setUser(data.user)
    scheduleRefresh(data.refreshToken)
    return data.user
  }, [scheduleRefresh])

  const register = useCallback(async (formData) => {
    const { data } = await authAPI.register(formData)
    localStorage.setItem('nexus_token', data.accessToken)
    localStorage.setItem('nexus_refresh_token', data.refreshToken)
    localStorage.setItem('nexus_user', JSON.stringify(data.user))
    setUser(data.user)
    scheduleRefresh(data.refreshToken)
    return data.user
  }, [scheduleRefresh])

  const logout = useCallback(async () => {
    clearTimeout(refreshTimerRef.current)
    try { await authAPI.logout() } catch (_) {}
    localStorage.removeItem('nexus_token')
    localStorage.removeItem('nexus_refresh_token')
    localStorage.removeItem('nexus_user')
    setUser(null)
  }, [])

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser)
    localStorage.setItem('nexus_user', JSON.stringify(updatedUser))
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
