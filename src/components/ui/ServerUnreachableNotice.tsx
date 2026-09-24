import React from 'react'
import { ServerCrash } from 'lucide-react'
import { API_URL } from '@/lib/apiClient'

/**
 * Bannière affichée quand un appel à l'API échoue avant même d'obtenir une
 * réponse (fetch() a levé une exception) — typiquement parce que VITE_API_URL
 * pointe vers une adresse injoignable (ex: http://localhost:4000 depuis un
 * site déployé) ou que le backend n'est pas démarré/déployé.
 *
 * On affiche l'URL réellement utilisée : c'est souvent suffisant pour que
 * l'administrateur comprenne immédiatement le problème (ex: "ça pointe vers
 * localhost, il faut configurer VITE_API_URL sur l'hébergeur").
 */
export function ServerUnreachableNotice() {
  return (
    <div className="mt-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-3.5 text-sm">
      <div className="flex items-start gap-2.5">
        <ServerCrash className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-red-700 dark:text-red-300">Serveur injoignable</p>
          <p className="text-red-600/90 dark:text-red-300/80 mt-0.5">
            L'application n'arrive pas à contacter l'API à cette adresse :
          </p>
          <code className="block mt-1.5 px-2 py-1 rounded-md bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs break-all">
            {API_URL}
          </code>
          <p className="text-red-600/80 dark:text-red-300/70 mt-1.5 text-xs">
            Le backend n'est probablement pas déployé, ou la variable d'environnement{' '}
            <code className="px-1 py-0.5 rounded bg-red-100 dark:bg-red-900/40">VITE_API_URL</code>{' '}
            n'est pas configurée sur votre hébergeur (ex: Vercel → Project Settings → Environment
            Variables). Contactez votre administrateur si le problème persiste.
          </p>
        </div>
      </div>
    </div>
  )
}
