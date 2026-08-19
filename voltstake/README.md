# VoltStake — plateforme de démonstration (jetons 100% fictifs)

Clone conceptuel original (design néon sombre) d'une plateforme type "casino crypto", avec une monnaie
**entièrement fictive (VLT)**, sans conversion réelle, sans lien avec BCH.games. Usage démo/portfolio uniquement.

## Structure

```
voltstake/
  backend/     API Express + SQLite (auth JWT, wallet fictif, jeux)
  frontend/    Next.js (React) — interface utilisateur néon
```

## Jeux inclus
- **Dice** : pari sur un seuil 2-98, over/under, multiplicateur dynamique.
- **Crash** : mise + multiplicateur cible d'encaissement.
- **Mines** : grille 5x5, choix du nombre de mines, retrait à tout moment.

## Démarrage rapide

### 1. Backend
```bash
cd backend
cp .env.example .env   # puis modifier JWT_SECRET
npm install
npm run dev             # http://localhost:4000
```

### 2. Frontend
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev              # http://localhost:3000
```

Créez un compte : vous recevez automatiquement 1000 jetons VLT fictifs.

## Déploiement en production

- **Backend** : `npm start` derrière un reverse proxy (nginx) avec HTTPS. Définissez un `JWT_SECRET` fort et
  `CORS_ORIGIN` pointant vers le domaine du frontend. La base SQLite (`voltstake.db`) doit être sur un volume
  persistant.
- **Frontend** : `npm run build && npm start`, ou déploiement statique/serveur (Vercel, VPS...). Définissez
  `NEXT_PUBLIC_API_URL` vers l'URL publique de l'API.

## Avertissement important

Ce projet est fourni à titre **éducatif / démonstration technique**. Le jeton VLT n'a **aucune valeur réelle**,
n'est **ni achetable ni échangeable** contre de l'argent ou une cryptomonnaie réelle. Toute mise en production
d'une plateforme de jeu d'argent réel est soumise à des régimes de licence stricts selon les juridictions — ce
code ne doit pas être utilisé pour opérer un service de gambling réel sans les autorisations légales requises.
