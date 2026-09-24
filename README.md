# 🏫 CSE Divo — Gestion Financière Scolaire

Application de gestion financière pour établissements scolaires — **React 18 + TypeScript + Tailwind CSS**, backend **Node.js/Express + MySQL** avec authentification réelle et temps réel (Socket.IO).

## Architecture

```
gesfinancelites/
├── src/               Frontend React (Vite)
├── server/             API Express + MySQL
│   ├── src/db/          Schéma SQL, migration, seed
│   ├── src/routes/      Routes REST par module
│   ├── src/middleware/  Authentification JWT, gestion d'erreurs
│   └── src/server.js    Point d'entrée (Express + Socket.IO)
├── docker-compose.yml   MySQL + API + frontend + Adminer, prêts à l'emploi
└── Dockerfile            Build du frontend (nginx)
```

Le frontend ne parle **jamais** directement à la base de données : toutes les lectures et écritures passent par l'API Express, qui applique les permissions par rôle côté serveur (`server/src/roles.js`) — c'est ce qui protège réellement les données, contrairement à l'ancienne version qui exposait une clé Supabase publique sans authentification.

### Périmètre fonctionnel

- **CRUD complet** (créer / modifier / historiser) : élèves, paiements, dépenses, clôtures de caisse, classes.
- **Lecture seule** (données migrées, pas de nouveaux formulaires dans cette version) : relances, vacataires, heures de vacation, personnel, paies du personnel, dettes, documents, journal d'audit.

## 🚀 Démarrage rapide avec Docker (recommandé)

Le moyen le plus simple de lancer l'application complète (MySQL + API + frontend), quel que soit l'endroit où vous l'hébergez ensuite.

```bash
cp .env.docker.example .env
# Éditez .env : changez au minimum JWT_SECRET et les mots de passe MySQL

docker compose up -d --build
```

- Frontend : http://localhost:8080
- API : http://localhost:4000
- Adminer (interface d'administration MySQL) : http://localhost:8081

Au premier démarrage, le conteneur `api` applique automatiquement le schéma et crée les comptes de démonstration (voir *Connexion* ci-dessous). C'est sans risque de relancer `docker compose up` plus tard : la migration et le seed sont idempotents (ils ne recréent rien qui existe déjà).

## 💻 Développement local sans Docker

Nécessite Node.js 20+ et un serveur MySQL 8 (ou MariaDB 10.11+) accessible.

### 1. Backend

```bash
cd server
cp .env.example .env
# Éditez .env avec les identifiants de votre base MySQL

npm install
npm run setup   # applique le schéma puis crée les comptes/classes de démo
npm run dev     # démarre l'API sur http://localhost:4000
```

### 2. Frontend

Dans un second terminal, à la racine du projet :

```bash
cp .env.example .env   # VITE_API_URL=http://localhost:4000 par défaut
npm install
npm run dev
```

Ouvrez [http://localhost:5173](http://localhost:5173)

---

## 🔐 Connexion

Chaque profil dispose désormais d'un **compte réel** (mot de passe haché en base, plus de code PIN partagé lisible par n'importe qui) :

| Profil | Mot de passe par défaut | Accès |
|---|---|---|
| 👔 Directeur | `1234` | Accès total |
| 💰 Caissière | `0000` | Élèves, paiements, caisse |
| 🗂️ Secrétaire | `0000` | Élèves, documents |
| 🎒 Éducateur | `0000` | Consultation |
| 📊 Comptable | `0000` | Statistiques, journal d'audit |
| 👁️ Consultation | `0000` | Lecture seule |

> ⚠️ **Changez ces mots de passe avant toute utilisation en production.** Le Directeur peut réinitialiser le mot de passe de n'importe quel profil (API `PUT /api/auth/reset-password`) ; chaque profil peut changer le sien depuis l'application une fois cette fonctionnalité exposée dans l'interface, ou via `PUT /api/auth/password`.

---

## 🌐 Déploiement en production

L'API et le frontend sont deux services indépendants (le frontend appelle l'API via `VITE_API_URL`). Vous pouvez les héberger ensemble ou séparément.

### Option 1 — Un VPS (le plus simple à maîtriser entièrement)

1. Installez Docker et Docker Compose sur le VPS.
2. Copiez le projet sur le serveur (`git clone` ou upload).
3. `cp .env.docker.example .env`, renseignez `JWT_SECRET`, les mots de passe MySQL, `CORS_ORIGIN` (l'URL publique de votre frontend) et `VITE_API_URL` (l'URL publique de votre API).
4. `docker compose up -d --build`
5. Mettez un reverse proxy devant (Nginx ou Caddy) pour le HTTPS avec Let's Encrypt, pointant vers les ports 8080 (frontend) et 4000 (API).

### Option 2 — Railway / Render (hébergement géré)

1. Créez un service **MySQL** managé (Railway propose un plugin MySQL en un clic ; Render propose PostgreSQL nativement mais pas MySQL géré — dans ce cas, utilisez [PlanetScale](https://planetscale.com) ou un VPS pour la base).
2. Créez un service **Web** à partir de `server/` (Dockerfile fourni, ou `npm install && npm run setup && npm start` comme commande de démarrage). Renseignez les variables d'environnement (`DATABASE_URL` ou `DB_HOST`/`DB_USER`/`DB_PASSWORD`/`DB_NAME`, `JWT_SECRET`, `CORS_ORIGIN`).
3. Créez un service **Static Site** ou **Web** à partir de la racine du projet pour le frontend (`npm run build`, dossier de sortie `dist/`). Renseignez `VITE_API_URL` avec l'URL du service backend.
4. Une fois les deux services démarrés, exécutez une fois `npm run setup` dans le service backend (console Railway/Render) pour créer le schéma et les comptes.

### Option 3 — Base de données externe + hébergement au choix

L'API ne dépend que d'une URL MySQL standard (`DATABASE_URL=mysql://user:pass@host:3306/db`). Vous pouvez donc utiliser n'importe quel MySQL managé (PlanetScale, AWS RDS, DigitalOcean Managed MySQL…) avec n'importe quel hébergeur Node.js (Railway, Render, Fly.io, un VPS…).

### Option 4 — Vercel (frontend) + Railway (backend) — ce dépôt

> ⚠️ **Vercel n'héberge que le frontend statique.** Si vous avez importé ce dépôt directement dans Vercel sans déployer `server/` ailleurs, l'application affichera "Connexion impossible. Vérifiez le serveur." / "Erreur lors de la création du compte." — c'est normal : il n'y a aucune API à joindre. Voici la marche à suivre complète :

1. **Déployez le backend sur Railway** (gratuit pour démarrer) :
   - [railway.app](https://railway.app) → *New Project* → *Provision MySQL* (base gérée en un clic).
   - Toujours dans le même projet Railway : *New* → *GitHub Repo* → sélectionnez ce dépôt, puis dans les *Settings* du service, mettez **Root Directory** = `server`.
   - Dans les variables d'environnement du service backend, ajoutez : `JWT_SECRET` (une longue valeur aléatoire), `CORS_ORIGIN` (l'URL de votre site Vercel, ex. `https://gesfinancelites.vercel.app`), et les identifiants MySQL (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` — Railway les fournit sur le service MySQL, onglet *Variables*).
   - Une fois déployé, ouvrez la console du service (*Settings* → *Deploy* → *Shell*, ou en local avec `railway run`) et exécutez `npm run setup` une seule fois pour créer les tables et les comptes de démonstration.
   - Notez l'URL publique générée par Railway pour ce service (*Settings* → *Networking* → *Generate Domain*), par ex. `https://gesfinancelites-api.up.railway.app`.

2. **Configurez le frontend sur Vercel** :
   - Project → *Settings* → *Environment Variables* → ajoutez `VITE_API_URL` = l'URL Railway obtenue ci-dessus (sans `/` final).
   - **Redéployez** (*Deployments* → ⋯ → *Redeploy*) : `VITE_API_URL` est injectée au moment du `build`, donc une variable ajoutée après coup n'a aucun effet tant qu'on n'a pas relancé un build.

3. Une fois les deux redéployés, la connexion et la création de compte fonctionneront normalement.

---

## 🔌 Temps réel

Le frontend se connecte en Socket.IO à l'API (authentifié par le même token JWT) et reçoit un événement `data:changed` à chaque création/modification, ce qui déclenche un rechargement automatique de la table concernée — sans qu'aucun utilisateur n'ait besoin de rafraîchir la page.

## 🗄️ Sauvegardes

Avec Docker, les données MySQL sont stockées dans le volume nommé `mysql_data`. Pour une sauvegarde manuelle :

```bash
docker compose exec mysql mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" gesfinancelites > backup.sql
```

## 🛠️ Stack technique

- **Frontend** : React 18, TypeScript, Vite, Tailwind CSS, Zustand, Socket.IO client
- **Backend** : Node.js, Express, MySQL (mysql2), JWT (jsonwebtoken), bcrypt, Zod, Socket.IO
- **Sécurité** : mots de passe hachés (bcrypt), permissions par rôle appliquées côté serveur, limitation du taux de connexion, en-têtes de sécurité (helmet)
