import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'

const WSContext = createContext(null)

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

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//localhost:5000`
    // const wsUrl = `${protocol}//${window.location.host}`

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        console.log('⚡ WebSocket connected')
        // Register user
        ws.send(JSON.stringify({ type: 'register', userId: user._id, userName: user.name }))
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setLastMessage(data)
          // Notify all listeners
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
