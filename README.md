# 🏫 CSE Divo — Gestion Financière Scolaire

Application moderne de gestion financière pour établissements scolaires — **React 18 + TypeScript + Tailwind CSS + Supabase**

## 🚀 Installation rapide

### 1. Créer votre projet Supabase

1. Allez sur [supabase.com](https://supabase.com) et créez un compte (gratuit)
2. Créez un nouveau projet
3. Notez l'**URL du projet** et la **clé anon** (dans Paramètres > API)

### 2. Configurer la base de données

Dans votre projet Supabase, allez dans **SQL Editor** et collez tout le contenu du fichier :
```
supabase/migrations/001_initial.sql
```
Cliquez **Run** pour créer toutes les tables.

### 3. Configurer l'application

Copiez le fichier `.env.example` en `.env` et remplissez vos valeurs :

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-anon-key
```

### 4. Installer et lancer

```bash
npm install
npm run dev
```

Ouvrez [http://localhost:5173](http://localhost:5173)

---

## 🔐 Connexion

| Profil | PIN par défaut | Accès |
|---|---|---|
| 👔 Directeur | `1234` | Accès total |
| 💰 Caissière | `0000` | Paiements, caisse |
| 🗂️ Secrétaire | `0000` | Élèves, documents |
| 🎒 Éducateur | `0000` | Consultation |
| 📊 Comptable | `0000` | Statistiques, audit |
| 👁️ Consultation | `0000` | Lecture seule |

> Modifiez les PINs dans **Paramètres** (accès Directeur uniquement)

---

## 📱 Fonctionnalités

| Module | Description |
|---|---|
| 📊 Tableau de bord | KPIs temps réel, graphiques, alertes |
| 🔐 Coffre-fort | Vue synthétique financière (Directeur) |
| 🎓 Élèves | CRUD, fiches détaillées, export Excel/PDF |
| 💵 Paiements | Enregistrement, reçus imprimables |
| 🔳 QR & Scanner | Génération QR par élève, carte scolaire |
| 🔔 Relances | Liste impayés, messages SMS/WhatsApp |
| 📈 Statistiques | Recouvrement par classe et niveau |
| ⚠️ Alertes | Détection anomalies automatiques |
| 💰 Caisse & Dépenses | Journal quotidien, workflow validation |
| 🧑‍🏫 Vacataires | Heures, validation, paiements |
| 👥 Personnel | Paie mensuelle, bulletins |
| 🗓️ Calendrier | Vue mensuelle des paiements |
| 💳 Dettes | Suivi des engagements |
| 📁 Documents | Gestion documentaire |
| 🕵️ Audit | Journal complet des actions |
| 🏷️ Classes | Configuration frais de scolarité |
| ⚙️ Paramètres | PINs, paramètres école |

---

## 🛠️ Stack technique

- **React 18** + **TypeScript**
- **Tailwind CSS v3** (dark mode inclus)
- **Supabase** (PostgreSQL cloud + Realtime)
- **Zustand** (state management)
- **Recharts** (graphiques)
- **jsPDF + autoTable** (export PDF)
- **XLSX** (export Excel)
- **Lucide React** (icônes)
- **Vite** (build tool)

---

## 📁 Structure

```
src/
├── components/
│   ├── layout/       # Sidebar, Layout
│   └── ui/           # Button, Card, Modal, Table, Badge, FormFields
├── lib/
│   ├── supabase.ts   # Client Supabase
│   ├── utils.ts      # Formatage, dates, calculs
│   └── exports.ts    # PDF & Excel
├── pages/            # 17 pages
├── store/            # Zustand store (données + permissions)
├── types/            # Types TypeScript
└── App.tsx           # Routing principal
```

---

## 🔄 Mise à jour

```bash
git pull
npm install
npm run build
```

---

*Développé pour le Cours Secondaire Élites Divo — Côte d'Ivoire* 🇨🇮
