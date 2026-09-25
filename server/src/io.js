import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'

let ioInstance = null

/**
 * Initialise Socket.IO sur le serveur HTTP existant. Remplace Supabase
 * Realtime : chaque mutation notifie tous les clients connectés et
 * authentifiés, qui rechargent alors la tranche de données concernée.
 */
export function initIO(httpServer, corsOrigin) {
  ioInstance = new Server(httpServer, {
    cors: { origin: corsOrigin || '*' },
  })

  ioInstance.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (!token) return next(new Error('unauthorized'))
      jwt.verify(token, process.env.JWT_SECRET)
      next()
    } catch {
      next(new Error('unauthorized'))
    }
  })

  ioInstance.on('connection', () => {
    // Rien à faire à la connexion : les clients écoutent simplement
    // l'événement 'data:changed' diffusé par emitChange().
  })

  return ioInstance
}

/** Notifie tous les clients qu'une table a changé, pour qu'ils la rechargent. */
export function emitChange(table) {
  ioInstance?.emit('data:changed', { table })
}
