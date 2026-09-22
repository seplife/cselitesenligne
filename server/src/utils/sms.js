/**
 * Service SMS — Orange SMS API (Côte d'Ivoire)
 * Documentation: https://developer.orange.com/apis/sms-ci/getting-started
 *
 * Configuration requise dans .env :
 *   ORANGE_SMS_CLIENT_ID=votre_client_id
 *   ORANGE_SMS_CLIENT_SECRET=votre_client_secret
 *   ORANGE_SMS_SENDER=CSE Divo    (nom expéditeur, max 11 chars)
 *   FONDATEUR_TEL=0707874970       (numéro du fondateur)
 */
import axios from 'axios'

const ORANGE_TOKEN_URL = 'https://api.orange.com/oauth/v3/token'
const ORANGE_SMS_URL = 'https://api.orange.com/smsmessaging/v1/outbound'

let _cachedToken = null
let _tokenExpiry = 0

/**
 * Obtenir un token OAuth2 Orange (avec cache pour ne pas re-demander à chaque SMS)
 */
async function getOrangeToken() {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken

  const clientId = process.env.ORANGE_SMS_CLIENT_ID
  const clientSecret = process.env.ORANGE_SMS_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('ORANGE_SMS_CLIENT_ID et ORANGE_SMS_CLIENT_SECRET doivent être configurés dans .env')
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const response = await axios.post(
    ORANGE_TOKEN_URL,
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
    }
  )

  _cachedToken = response.data.access_token
  _tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000
  return _cachedToken
}

/**
 * Formater un numéro de téléphone ivoirien en format international E.164
 * Ex: 0707874970 → tel:+2250707874970
 */
function formatCIVNumber(num) {
  if (!num) return null
  const cleaned = num.replace(/\s+/g, '').replace(/[^0-9+]/g, '')
  if (cleaned.startsWith('+225')) return `tel:${cleaned}`
  if (cleaned.startsWith('225')) return `tel:+${cleaned}`
  if (cleaned.startsWith('0') && cleaned.length === 10) return `tel:+225${cleaned.slice(1)}`
  if (cleaned.length === 8) return `tel:+225${cleaned}`
  return `tel:+225${cleaned}`
}

/**
 * Envoyer un SMS via l'API Orange
 * @param {string} to - Numéro de téléphone du destinataire (format local ou international)
 * @param {string} message - Contenu du SMS
 */
export async function sendSMS(to, message) {
  if (!process.env.ORANGE_SMS_CLIENT_ID) {
    console.log(`[SMS simulé → ${to}]: ${message}`)
    return { simulated: true }
  }

  try {
    const token = await getOrangeToken()
    const senderAddress = formatCIVNumber(process.env.ORANGE_SMS_SENDER_TEL || '0000000000')
    const senderName = process.env.ORANGE_SMS_SENDER || 'CSEDivo'
    const toAddress = formatCIVNumber(to)

    const url = `${ORANGE_SMS_URL}/${encodeURIComponent(senderAddress)}/requests`

    const response = await axios.post(
      url,
      {
        outboundSMSMessageRequest: {
          address: toAddress,
          senderAddress,
          senderName,
          outboundSMSTextMessage: { message },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    )

    console.log(`[SMS envoyé → ${to}]`, response.data)
    return response.data
  } catch (err) {
    console.error('[SMS erreur]', err.response?.data || err.message)
    // Ne pas faire planter l'inscription si le SMS échoue
    return { error: err.message }
  }
}

/**
 * SMS de notification — nouvel élève inscrit
 */
export async function notifyNouvelEleve(student) {
  const fondateurTel = process.env.FONDATEUR_TEL || '0707874970'
  const reste = student.total_du - (student.total_paye || 0)
  const message =
    `🏫 CSE DIVO - Nouvel élève inscrit\n` +
    `Nom: ${student.nom} ${student.prenoms}\n` +
    `Matricule: ${student.matricule}\n` +
    `Classe: ${student.classe_nom || 'Non assignée'}\n` +
    `Total dû: ${student.total_du?.toLocaleString('fr-FR')} FCFA\n` +
    `Date: ${new Date().toLocaleDateString('fr-FR')}`

  return sendSMS(fondateurTel, message)
}

/**
 * SMS de récapitulatif journalier (envoyé en fin de journée)
 */
export async function notifyRecapJournalier(date, nbInscrits, totalMontant, listeNoms) {
  const fondateurTel = process.env.FONDATEUR_TEL || '0707874970'
  const dateStr = new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  let message =
    `📊 CSE DIVO - Récap du ${dateStr}\n` +
    `Élèves inscrits: ${nbInscrits}\n` +
    `Montant total dû: ${totalMontant.toLocaleString('fr-FR')} FCFA\n`

  if (listeNoms && listeNoms.length > 0) {
    const noms = listeNoms.slice(0, 5).join(', ')
    message += `Élèves: ${noms}${listeNoms.length > 5 ? ` (+${listeNoms.length - 5})` : ''}`
  }

  return sendSMS(fondateurTel, message)
}
