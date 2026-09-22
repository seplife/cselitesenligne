import mysql from 'mysql2/promise'
import 'dotenv/config'

if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
  throw new Error(
    '❌ Configuration base de données manquante. Renseignez DATABASE_URL (ou DB_HOST/DB_USER/DB_PASSWORD/DB_NAME) dans server/.env'
  )
}

export const pool = process.env.DATABASE_URL
  ? mysql.createPool(process.env.DATABASE_URL)
  : mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      dateStrings: true,
    })

/** Exécute une requête paramétrée (placeholders `?`). */
export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params)
  return rows
}

/**
 * Exécute une série d'opérations dans une transaction MySQL.
 * `fn` reçoit une connexion dédiée sur laquelle utiliser `.query(...)`.
 */
export async function withTransaction(fn) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const result = await fn(conn)
    await conn.commit()
    return result
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}
