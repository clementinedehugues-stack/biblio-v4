# 🔧 Backend - Biblio V4

API FastAPI moderne avec authentification JWT et base de données PostgreSQL.

## 📋 Vue d'ensemble

L'API backend fournit :
- 🔐 **Authentification JWT** avec rôles utilisateur (admin, moderator, user)
- 📚 **Gestion des livres** avec upload PDF et recherche full-text
- 🗂️ **Système de catégories** hiérarchique
- 💬 **Système de commentaires** sur les livres
- 🔍 **Recherche avancée** dans les documents PDF
- 📊 **Gestion des utilisateurs** (admin uniquement)

## 🚀 Démarrage Rapide

### Avec Docker (Recommandé)

```bash
# Démarrer les services (API + PostgreSQL)
docker compose up -d --build

# Vérifier le statut
docker compose ps
docker compose logs -f api

# URLs d'accès
# API: http://localhost:8000
# Documentation: http://localhost:8000/docs
# Base de données: postgresql://postgres:postgres@localhost:5432/biblio
```

### Configuration manuelle

1. **Prérequis**
   - Python 3.11+ (testé avec 3.13)
   - PostgreSQL 15+
   - Virtual environment activé

2. **Installation**
   ```bash
   # Copier la configuration
   cp .env.local.sample .env
   
   # Installer les dépendances
   pip install -r requirements.txt
   
   # Appliquer les migrations
   alembic upgrade head
   
   # Démarrer l'API
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

## 🏗️ Architecture

```
backend/
├── 📁 core/                 # Configuration et sécurité
│   ├── config.py           # Paramètres de l'application
│   └── security.py         # JWT et hachage des mots de passe
├── 📁 models/               # Modèles SQLAlchemy
│   ├── user.py             # Modèle utilisateur avec rôles
│   ├── book.py             # Modèle livre avec métadonnées
│   ├── document.py         # Modèle document PDF
│   ├── category.py         # Modèle catégorie
│   └── comment.py          # Modèle commentaire
├── 📁 schemas/              # Schémas Pydantic pour validation
│   ├── auth.py             # Schémas d'authentification
│   ├── book.py             # Schémas de livre
│   ├── document.py         # Schémas de document
│   └── ...
├── 📁 routes/               # Endpoints de l'API
│   ├── auth.py             # Authentification (login, register)
│   ├── books.py            # CRUD livres et streaming PDF
│   ├── documents.py        # Upload et recherche documents
│   ├── categories.py       # Gestion des catégories
│   ├── comments.py         # Système de commentaires
│   └── ...
├── 📁 services/             # Logique métier
│   ├── auth.py             # Services d'authentification
│   ├── books.py            # Services de gestion des livres
│   └── ...
├── 📁 migrations/           # Migrations Alembic
└── 📁 tests/                # Tests automatisés
```

## 🔧 Configuration

### Variables d'environnement

```env
# Base de données
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/biblio

# JWT
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# Upload de fichiers
UPLOAD_DIR=./uploads
PDF_UPLOAD_MAX_BYTES=62914560  # 60MB

# CORS
CORS_ALLOW_ORIGINS=http://localhost:5173,http://localhost:5174
CORS_ALLOW_ORIGIN_REGEX=

# URL publique pour les fichiers
PUBLIC_API_BASE_URL=http://localhost:8000
```

## 🗃️ Base de données

### Structure

- **users** : Utilisateurs avec rôles (admin/moderator/user)
- **categories** : Catégories de livres
- **books** : Livres avec métadonnées et relation vers documents
- **documents** : Documents PDF avec indexation full-text
- **comments** : Commentaires des utilisateurs sur les livres

### Migrations

```bash
# Créer une nouvelle migration
alembic revision --autogenerate -m "Description du changement"

# Appliquer les migrations
alembic upgrade head

# Voir l'historique
alembic history

# Revenir à une version précédente
alembic downgrade -1
```

## 🔐 Authentification & Autorisation

### Rôles utilisateur

- **USER** : Consultation et commentaires
- **MODERATOR** : Création/modification de livres et documents
- **ADMIN** : Toutes les permissions + gestion des utilisateurs

### Endpoints protégés

```python
# Authentification requise
@router.get("/protected")
async def protected_endpoint(current_user: User = Depends(get_current_user)):
    pass

# Rôle admin requis
@router.post("/admin-only")
async def admin_endpoint(_: User = Depends(get_current_admin_user)):
    pass
```

### Identifiants de test (développement)

```bash
# Créer des comptes de test
python -m backend.scripts.seed_test_users
```

Comptes créés :
- **Admin** : `superadmin` / `AdminPass123`
- **Moderator** : `moderator1` / `ModeratorPass123`
- **User** : `viewer1` / `ViewerPass123`

## 📁 Gestion des fichiers

### Upload de documents

- **Format accepté** : PDF uniquement
- **Taille max** : 60MB (configurable)
- **Stockage** : Système de fichiers local dans `./uploads/`
- **Thumbnails** : Génération automatique dans `./uploads/thumbnails/`

### Streaming sécurisé

```python
# Obtenir un token de streaming
POST /books/{book_id}/stream-token

# Streamer le document
GET /books/{book_id}/stream?token=xyz
```

### Miniatures PDF

- Génération automatique de thumbnails JPEG (première page)
- Dépendance : Poppler (`brew install poppler` sur macOS)
- Configuration : `GENERATE_THUMBNAILS_ON_UPLOAD=true`

## 🔍 Recherche full-text

### Indexation automatique

- Extraction du texte des PDF lors de l'upload
- Indexation PostgreSQL avec extension `pg_trgm`
- Recherche dans le contenu et les métadonnées

### Utilisation

```bash
GET /documents/search?q=terme%20de%20recherche
```

## 🧪 Tests

### Lancement des tests

```bash
# Tous les tests
pytest

# Tests spécifiques
pytest tests/test_books_api.py

# Avec couverture
pytest --cov=backend tests/

# Test rapide de la DB
python -m backend.tests.quick_db_check
```

### Structure des tests

- **test_auth.py** : Tests d'authentification
- **test_books_api.py** : Tests CRUD livres
- **test_documents_api.py** : Tests upload et recherche
- **conftest.py** : Configuration des fixtures

## 🚀 Déploiement

### Docker Production

```bash
# Build l'image
docker build -t biblio-backend .

# Lancer avec variables d'environnement
docker run -e DATABASE_URL=... -p 8000:8000 biblio-backend
```

### Variables de production

```env
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/dbname
JWT_SECRET_KEY=secure-random-key-256-bits
UPLOAD_DIR=/app/uploads
PUBLIC_API_BASE_URL=https://your-domain.com/api
```

## 🐛 Dépannage

### Problèmes courants

1. **Erreur de connexion DB**
   ```bash
   # Vérifier que PostgreSQL est démarré
   docker compose ps
   
   # Tester la connexion
   psql postgresql://postgres:postgres@localhost:5432/biblio
   ```

2. **Erreur JWT**
   ```bash
   # Vérifier la clé secrète
   echo $JWT_SECRET_KEY
   
   # Générer une nouvelle clé
   python -c "import secrets; print(secrets.token_hex(64))"
   ```

3. **Problème d'upload**
   ```bash
   # Vérifier les permissions du dossier
   ls -la ./uploads/
   
   # Créer le dossier si nécessaire
   mkdir -p ./uploads/thumbnails
   ```

### Logs utiles

```bash
# Logs du conteneur API
docker compose logs -f api

# Logs de la base de données
docker compose logs -f db

# Logs en mode développement
uvicorn main:app --reload --log-level debug
```

## 📚 Documentation API

- **Swagger UI** : http://localhost:8000/docs
- **ReDoc** : http://localhost:8000/redoc
- **OpenAPI JSON** : http://localhost:8000/openapi.json

---

*Pour plus d'informations, consultez le [README principal](../README.md) et la [documentation API](../docs/API_REFERENCE.md)*