import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'

const WSContext = createContext(null)
const getWsUrl = () => {
  // Use explicit env variable if set (recommended)
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL

  // Local development
  if (import.meta.env.DEV) return 'ws://localhost:5000'

  // Production fallback — derive from API URL
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
      .replace('/api', '')
      .replace('https://', 'wss://')
      .replace('http://', 'ws://')
  }

  return 'ws://localhost:5000'
}

export const WSProvider = ({ children }) => {
  const { user } = useAuth()
  const wsRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState(null)
  const listenersRef = useRef(new Map())
  const reconnectTimer = useRef(null)



const connect = useCallback(() => {
  if (!user) return
  if (wsRef.current?.readyState === WebSocket.OPEN) return

  const wsUrl = getWsUrl()
  console.log('Connecting WebSocket to:', wsUrl) // helpful for debugging

  try {
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      console.log('⚡ WebSocket connected')
      ws.send(JSON.stringify({ type: 'register', userId: user._id, userName: user.name }))
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setLastMessage(data)
        listenersRef.current.forEach((callback) => callback(data))
      } catch (e) {
        console.error('WS parse error', e)
      }
    }

    ws.onclose = () => {
      setConnected(false)
      console.log('WebSocket disconnected, reconnecting in 3s...')
      reconnectTimer.current = setTimeout(connect, 3000)
    }

    ws.onerror = (err) => {
      console.error('WS error', err)
      ws.close()
    }
  } catch (err) {
    console.error('WS connection failed', err)
  }
}, [user])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  const subscribe = useCallback((id, callback) => {
    listenersRef.current.set(id, callback)
    return () => listenersRef.current.delete(id)
  }, [])

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  return (
    <WSContext.Provider value={{ connected, lastMessage, subscribe, send }}>
      {children}
    </WSContext.Provider>
  )
}

export const useWS = () => useContext(WSContext)
