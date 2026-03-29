import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

const WS_URL = 'ws://localhost:8000/api/v1/ws/kds'
const RECONNECT_DELAY_MS = 3000

export function useKdsWebSocket() {
  const qc = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmounted = useRef(false)
  const [isConnected, setIsConnected] = useState(false)

  function connect() {
    if (unmounted.current) return

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => setIsConnected(true)

    ws.onmessage = () => {
      qc.invalidateQueries({ queryKey: ['orders', 'open', 'unserved'] })
    }

    ws.onclose = () => {
      setIsConnected(false)
      if (unmounted.current) return
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS)
    }

    ws.onerror = () => {
      ws.close()
    }
  }

  useEffect(() => {
    unmounted.current = false
    connect()

    return () => {
      unmounted.current = true
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { isConnected }
}
