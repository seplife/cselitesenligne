import jwt from 'jsonwebtoken'
import { hasPerm } from '../roles.js'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: 'Authentification requise.' })
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.auth = payload // { sub, role, label }
    next()
  } catch {
    return res.status(401).json({ error: 'Session invalide ou expirée.' })
  }
}

/** Restreint l'accès à une liste de rôles. À utiliser après requireAuth. */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'Accès non autorisé pour ce rôle.' })
    }
    next()
  }
}

/** Restreint l'accès aux rôles disposant de la permission `key` (voir roles.js). */
export function requirePerm(key) {
  return (req, res, next) => {
    if (!req.auth || !hasPerm(req.auth.role, key)) {
      return res.status(403).json({ error: 'Action non autorisée pour ce profil.' })
    }
    next()
  }
}
