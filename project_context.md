# 📘 Project Context — Bibliothèque en Ligne

## 🏗️ Objectif du Projet
Créer une **bibliothèque en ligne bilingue (FR/EN)** permettant de consulter gratuitement des fichiers PDF.  
L’application doit être **sécurisée, moderne et responsive**, avec gestion des rôles (Administrateur, Modérateur, Utilisateur).

### 🎯 Objectif principal
> Fournir une base de données de documents PDF consultables en ligne gratuitement, avec recherche multilingue et lecture intégrée sans téléchargement direct.

---

## 👥 Gestion des Rôles Utilisateurs

| Rôle | Permissions |
|------|--------------|
| **Administrateur** | Peut ajouter/supprimer des livres, créer/supprimer des comptes utilisateurs, créer/supprimer des catégories. |
| **Modérateur** | Peut ajouter des livres et créer des catégories, mais ne peut pas supprimer ni gérer les utilisateurs. |
| **Utilisateur standard** | Peut consulter les livres, créer des favoris, ajouter des commentaires et notes personnelles. |

---

## 📚 Gestion du Contenu

- **Ajout de PDF** : Administrateur et Modérateur uniquement.  
- **Catégorisation** : Création et suppression de catégories par Admin/Modérateur.  
- **Métadonnées stockées** : titre, auteur, description, langue, résumé.  
- **Protection** : affichage par fragments (pas de téléchargement direct, clic droit désactivé).  
- **Recherche avancée** : par texte intégral, métadonnées, langue, auteur, catégorie.  

---

## 🌐 Fonctionnalités Multilingues (FR/EN)
- Sélection de la langue du livre obligatoire à l’upload.  
- Interface bilingue (FR/EN) avec bouton de changement de langue (en haut à droite).  
- Détection automatique de la langue du navigateur.  
- Sauvegarde de la préférence utilisateur.  
- Filtrage et recherche par langue.  

---

## 💡 Fonctionnalités Clés
- Authentification JWT (Admin crée les comptes).  
- Historique de lecture + niveau de progression par livre.  
- Favoris, annotations, marque-pages, mode nuit, zoom, plein écran.  
- Recommandations basées sur : historique de lecture, livres populaires, nouveautés.  
- Commentaires et évaluations possibles sur chaque livre.  
- Recherche plein-texte avec suggestions automatiques.  

---

## 🎨 Interface et Design
- Style : **moderne, professionnel et corporate**.  
- **Thème** : palette sobre et professionnelle (ton neutre, accent discret).  
- Interface responsive (mobile, tablette, desktop).  
- Lecteur intégré (PDF.js) avec surlignage, annotations, et watermark utilisateur.  

---

## ⚙️ Stack Technique Recommandée

| Composant | Technologie |
|------------|-------------|
| **Backend** | Python – FastAPI |
| **Base de données** | **PostgreSQL** (transférable vers Supabase pour déploiement) |
| **ORM** | SQLAlchemy |
| **Frontend** | React + Tailwind CSS |
| **PDF viewer** | PDF.js |
| **Extraction texte** | PyMuPDF ou pdfminer.six |
| **Auth** | JWT + bcrypt |
| **Hébergement (test)** | Supabase (DB+Storage) + Vercel (frontend) |
| **Recherche plein-texte** | PostgreSQL tsvector (FR/EN) |
| **CI/CD** | GitHub Actions (facultatif) |

> **Note :** La base de données est conçue pour être compatible et **transférable facilement vers Supabase** (migrations SQL/pg_dump supportés).

---

## 🧩 Architecture du Projet

```
bibliotheque/
│
├── backend/              ← FastAPI (ChatGPT & Claude)
│   ├── main.py
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── tests/
│   └── requirements.txt
│
├── frontend/             ← React/Tailwind (Copilot & Gemini)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── i18n/
│   │   ├── assets/
│   │   └── styles/
│   └── package.json
│
└── docs/                 ← Documentation (Claude)
    ├── README.md
    ├── API_REFERENCE.md
    └── ARCHITECTURE.md
```

---

## 🔗 API Principales

| Endpoint | Méthode | Description |
|-----------|----------|--------------|
| `/auth/login` | POST | Authentification utilisateur |
| `/auth/create` | POST | Création de compte par admin |
| `/books/upload` | POST | Upload PDF (Admin/Modérateur) |
| `/books/search` | GET | Recherche avancée |
| `/books/{id}` | GET | Détails d’un livre |
| `/books/{id}/page/{n}` | GET | Lecture d’une page (stream sécurisé) |
| `/books/{id}/comments` | POST/GET | Commentaires |
| `/categories` | GET/POST/DELETE | Gestion des catégories |

---

## 🧠 Répartition des Agents IA

| Agent | Rôle | Zone du projet | Tâches |
|--------|------|----------------|--------|
| **GPT-5 (Architecte)** | Architecte & Dev Backend | `/backend` | Créer API, modèles SQL, endpoints, sécurité, coordination générale |
| **GPT-5 Codex** | Ingénieur Backend | `/backend` | Implémenter routes FastAPI, migrations, logique métier |
| **Claude Sonnet 3.7** | Analyste & Doc | `/backend`, `/docs` | Optimiser code, écrire docstrings/tests, documenter API |
| **Claude Haiku 4.5** | Relecteur & testeur | `/backend/tests` | Générer tests unitaires, QA |
| **Gemini Pro** | Designer & Traduction | `/frontend/src/i18n` | UI/UX, thèmes Tailwind, i18n, textes d’interface |
| **Gemini Flash** | Optimiseur frontend | `/frontend` | Optimiser performance et rendu |
| **Grok Code Fast 1** | Prototypeur | `/backend` & `/frontend` | Générer squelettes à raffiner |
| **ChatGPT (toi)** | Coordinateur | racine | Superviser et fusionner les contributions IA |

---

## 🔒 Sécurité & Protection
- Pas de lien direct vers le fichier PDF.  
- Streaming page par page avec token temporaire.  
- Clic droit désactivé.  
- Option watermark dynamique (nom utilisateur + timestamp).  
- Validation stricte des fichiers uploadés (taille, format, type MIME).  

---

## ⚡ Performance
- 200 utilisateurs simultanés prévus.  
- 5000 livres max, moyenne 30 Mo chacun.  
- Mise en cache des requêtes de recherche.  
- Lazy loading pour les pages PDF.  

---

## 🚀 Livrables (MVP)
1. Backend FastAPI complet avec Auth + Upload + Lecture + Recherche.  
2. Frontend React avec lecteur PDF, login et navigation bilingue.  
3. Documentation claire (README + API Reference).  
4. Déploiement test sur Supabase + Vercel.

---

## 📅 Étapes de développement suggérées
1. **Sprint 1 – Backend** : Auth + Upload + DB + Extraction texte.  
2. **Sprint 2 – Frontend** : UI/UX + i18n + Lecteur PDF.  
3. **Sprint 3 – Recherche avancée + Sécurité + Recommandations.**  

---

## ✍️ Note finale
> Langue principale par défaut : **Français (avec bascule vers Anglais)**.  
> Le projet est conçu pour être déployé sur Supabase si besoin.
