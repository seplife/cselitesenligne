/** Statut financier d'un élève, à partir de ce qui est dû et de ce qui est payé. */
export function statutOf(totalDu, totalPaye) {
  if (totalDu === 0) return 'SOLDE'
  if (totalPaye >= totalDu) return totalPaye > totalDu ? 'CREDIT' : 'SOLDE'
  return 'NON_SOLDE'
}

function yearPrefix(anneeScolaire) {
  return (anneeScolaire || '').slice(0, 4) || new Date().getFullYear().toString()
}

export function formatMatricule(anneeScolaire, counter) {
  return `E${yearPrefix(anneeScolaire)}-${String(counter).padStart(4, '0')}`
}

export function formatRecu(anneeScolaire, counter) {
  return `R${yearPrefix(anneeScolaire)}-${String(counter).padStart(5, '0')}`
}

export function formatDepense(anneeScolaire, counter) {
  return `D${yearPrefix(anneeScolaire)}-${String(counter).padStart(4, '0')}`
}

/**
 * Incrémente un compteur de `settings` de façon atomique (verrou de ligne)
 * et renvoie la valeur à utiliser. `conn` doit être une connexion déjà dans
 * une transaction (voir db/pool.js -> withTransaction).
 */
export async function nextCounter(conn, field) {
  const [rows] = await conn.query(`SELECT ${field} AS value FROM settings WHERE id = 'main' FOR UPDATE`)
  const value = rows[0]?.value ?? 1
  await conn.query(`UPDATE settings SET ${field} = ? WHERE id = 'main'`, [value + 1])
  return value
}
