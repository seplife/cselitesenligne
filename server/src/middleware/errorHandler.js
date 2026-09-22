export function errorHandler(err, req, res, _next) {
  console.error(err)
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Données invalides.', details: err.errors })
  }
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Cette valeur existe déjà (doublon).' })
  }
  const status = err.status || 500
  res.status(status).json({ error: err.message || 'Erreur interne du serveur.' })
}
