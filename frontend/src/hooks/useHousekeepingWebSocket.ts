import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

const WS_URL = 'ws://localhost:8000/api/v1/ws/housekeeping'
const RECONNECT_DELAY_MS = 3000

export interface HkNotification {
  id: number
  room_number: string
  type: 'room_dirty' | 'housekeeping_update'
  housekeeping?: string
  timestamp: Date
}

export function useHousekeepingWebSocket() {
  const qc = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmounted = useRef(false)
  const [isConnected, setIsConnected] = useState(false)
  const [notifications, setNotifications] = useState<HkNotification[]>([])
  const notifId = useRef(0)

  function connect() {
    if (unmounted.current) return

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => setIsConnected(true)

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as {
          type: string
          room_number: string
          housekeeping?: string
        }
        if (msg.type === 'room_dirty' || msg.type === 'housekeeping_update') {
          qc.invalidateQueries({ queryKey: ['rooms'] })
          setNotifications((prev) => [
            {
              id: ++notifId.current,
              room_number: msg.room_number,
              type: msg.type as HkNotification['type'],
              housekeeping: msg.housekeeping,
              timestamp: new Date(),
            },
            ...prev.slice(0, 4), // keep last 5
          ])
        }
      } catch {
        // ignore malformed messages
      }
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

  function dismissNotification(id: number) {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return { isConnected, notifications, dismissNotification }
}
