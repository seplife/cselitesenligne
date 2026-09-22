import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import mysql from 'mysql2/promise'
import 'dotenv/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function migrate() {
  const sql = readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')

  const connConfig = process.env.DATABASE_URL
    ? process.env.DATABASE_URL
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      }

  // multipleStatements est nécessaire ici (et seulement ici) pour exécuter
  // le fichier schema.sql en un seul appel ; jamais activé sur le pool
  // applicatif, pour éviter tout risque d'injection multi-requêtes.
  const connection =
    typeof connConfig === 'string'
      ? await mysql.createConnection(connConfig + (connConfig.includes('?') ? '&' : '?') + 'multipleStatements=true')
      : await mysql.createConnection({ ...connConfig, multipleStatements: true })

  try {
    console.log('Application du schéma sur la base de données…')
    await connection.query(sql)
    console.log('✅ Schéma appliqué avec succès.')
  } finally {
    await connection.end()
  }
}

migrate().catch((err) => {
  console.error('❌ Échec de la migration :', err)
  process.exit(1)
})
