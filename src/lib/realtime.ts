// Temps réel.
//  • Mode local : les modifications faites dans ce navigateur (y compris dans
//    un autre onglet) sont diffusées par lib/localApi.ts.
//  • Mode serveur : Socket.IO, le serveur émet 'data:changed' avec { table }.
import type { Socket } from 'socket.io-client'
import { API_URL, LOCAL_MODE, getToken } from './apiClient'
import { subscribeLocalChanges } from './localApi'

let cleanup: (() => void) | null = null

export function connectRealtime(onChange: (table: string) => void): () => void {
  disconnectRealtime()
  const token = getToken()
  if (!token) return () => {}

  if (LOCAL_MODE) {
    cleanup = subscribeLocalChanges(onChange)
    return disconnectRealtime
  }

  let socket: Socket | null = null
  let cancelled = false
  import('socket.io-client').then(({ io }) => {
    if (cancelled) return
    socket = io(API_URL, { auth: { token }, transports: ['websocket', 'polling'] })
    socket.on('data:changed', (payload: { table: string }) => onChange(payload.table))
  }).catch(e => console.warn('Temps réel indisponible', e))

  cleanup = () => {
    cancelled = true
    socket?.disconnect()
    socket = null
  }
  return disconnectRealtime
}

export function disconnectRealtime() {
  cleanup?.()
  cleanup = null
}
