# 🏫 CSE Divo — Gestion Financière Scolaire

Application de gestion financière du Cours Secondaire Élites de Divo — **React 18 + TypeScript + Vite + Tailwind CSS**.

En ligne : **https://seplife.github.io/cselitesenligne/**

## Fonctionnement

GitHub Pages n'héberge que des fichiers statiques : il ne peut pas faire tourner de serveur Node.js ni de base MySQL.
L'application fonctionne donc par défaut en **mode local** : toute la logique (comptes, élèves, paiements, dépenses,
clôtures de caisse, journal d'audit…) s'exécute dans le navigateur et les données sont enregistrées dans le
`localStorage` de l'appareil (`src/lib/localApi.ts`).

- Les mots de passe sont hachés (PBKDF2-SHA256 avec sel), jamais stockés en clair.
- Les permissions par profil (Directeur, Caissière…) sont appliquées à chaque action.
- Les onglets ouverts dans le même navigateur se synchronisent automatiquement.
- **Paramètres → Sauvegarde des données** : exporter un fichier `.json` et le restaurer sur un autre
  ordinateur ou après avoir vidé le navigateur. **Faites-le régulièrement** : vider les données du navigateur
  efface tout.

> ⚠️ En mode local, chaque appareil a ses propres données. Pour que plusieurs personnes travaillent sur les
> mêmes données depuis des ordinateurs différents, il faut un serveur (voir *Mode serveur* plus bas).

## 🔐 Comptes par défaut

Créés automatiquement au premier lancement sur chaque appareil :

| Identifiant | Mot de passe | Accès |
|---|---|---|
| `directeur` | `1234` | Accès total |
| `caissiere` | `0000` | Élèves, paiements, caisse |
| `secretaire` | `0000` | Élèves, documents |
| `educateur` | `0000` | Consultation élèves |
| `comptable` | `0000` | Statistiques, journal d'audit |
| `consultation` | `0000` | Lecture seule |

Vous pouvez aussi créer un compte avec le bouton **Créer un compte**. Changez les mots de passe par défaut
(bouton **Mot de passe** dans le menu ; le Directeur peut réinitialiser tous les comptes dans **Paramètres**).

## 🚀 Déploiement sur GitHub Pages

Le fichier `.github/workflows/deploy.yml` construit et publie le site à chaque `push` sur `main`.

1. Sur GitHub : **Settings → Pages → Build and deployment → Source : GitHub Actions** (une seule fois).
2. Poussez sur `main`. Le déploiement apparaît dans l'onglet **Actions** (1 à 2 minutes).

## 💻 Développement local

Nécessite Node.js 20+.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # vérifie les types et génère dist/
```

## 🌐 Mode serveur (optionnel)

Si vous déployez plus tard une API Express/MySQL (Railway, Render, VPS…) exposant les mêmes routes
`/api/...`, définissez son URL au moment du build :

- sur GitHub : **Settings → Secrets and variables → Actions → Variables → `VITE_API_URL`** = `https://votre-api.exemple.com`
- en local : fichier `.env` avec `VITE_API_URL=http://localhost:4000`

L'application passe alors automatiquement en mode serveur (requêtes HTTP + JWT, temps réel Socket.IO).
L'ancien code du serveur se trouve dans l'historique Git (commit `92babde`, dossier `server/`).

## 🛠️ Stack technique

React 18, TypeScript, Vite, Tailwind CSS, Zustand, Recharts, jsPDF, xlsx, qrcode.
