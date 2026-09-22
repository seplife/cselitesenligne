// Connexion Socket.IO — remplace Supabase Realtime. Le serveur émet
// 'data:changed' avec { table } à chaque mutation ; les abonnés rechargent
// la tranche de données concernée via le apiClient.
import { io, type Socket } from 'socket.io-client'
import { API_URL, getToken } from './apiClient'

let socket: Socket | null = null

export function connectRealtime(onChange: (table: string) => void): () => void {
  const token = getToken()
  if (!token) return () => {}

  socket = io(API_URL, { auth: { token }, transports: ['websocket', 'polling'] })

  socket.on('data:changed', (payload: { table: string }) => {
    onChange(payload.table)
  })

  return () => {
    socket?.disconnect()
    socket = null
  }
}

export function disconnectRealtime() {
  socket?.disconnect()
  socket = null
}
