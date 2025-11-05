# Backend

API FastAPI avec authentification JWT et base PostgreSQL locale.

## Prérequis
- Python 3.11+ (3.13 OK)
- Docker (pour la base locale)
- Virtualenv activé (ex: `.venv`)

## 1. Stack Docker (API + PostgreSQL)

```
docker compose up -d --build
```

- Service `db` : PostgreSQL 15 avec identifiants `postgres / postgres`, base `biblio`.
- Service `api` : lance `uvicorn main:app --reload` sur `http://localhost:8000`.
- Pour vérifier : `docker compose logs -f api` et `docker compose ps`.

Exécuter une commande dans le conteneur API :

```
docker compose exec api python -m backend.tests.quick_db_check
```

La connexion à PostgreSQL se fait via l'hôte `db` à l'intérieur du réseau Docker. Pour accéder à la base depuis l’hôte : `psql postgresql://postgres:postgres@localhost:5432/biblio`.

## 2. Configurer l'environnement (exécution hors Docker)

Copier le modèle :

```
cp backend/.env.local.sample backend/.env
```

Les variables principales :

```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/biblio
JWT_SECRET_KEY=be34d851ba9eab899e027e79bf4c61a6cc17cfeca51f01cf5f2a0a3fe39dddd7d7fc660cdf4054f303ef0ee478e21717f7f511135abca601855f05c149bc9e7b
JWT_ALGORITHM=HS256
```

## 3. Installer les dépendances

```
pip install -r backend/requirements.txt
```

## 4. Vérifier la connexion DB

```
python -m backend.tests.quick_db_check
```

Sortie attendue :
- `SELECT 1 = 1`
- `server_version = ...`

## 5. Lancer l'API

```
python -m uvicorn backend.main:app --reload
```

Endpoints clés :
- POST `/auth/create` (la première requête doit créer un admin)
- POST `/auth/login`
- GET `/auth/me`

## 🔐 Identifiants de test (dev)

Vous pouvez créer des comptes de test avec le script dédié (idempotent) :

```
python -m backend.scripts.seed_test_users
```

Comptes créés (si absents) :

- Admin     → username: `superadmin`  | password: `AdminPass123`
- Moderator → username: `moderator1`  | password: `ModeratorPass123`
- User      → username: `viewer1`     | password: `ViewerPass123`

Prérequis : base PostgreSQL accessible via `DATABASE_URL` dans `backend/.env` (voir plus haut).

## Utiliser une base distante (optionnel)
Remplacer `DATABASE_URL` par la chaîne distante voulue. Si vous utilisez Supabase, ajoutez `sslmode=require` côté URL et laissez `postgresql+asyncpg://` pour garder le driver asynchrone.

## Migrations (à venir)
Alembic sera utilisé pour créer la table `users` et le schéma complet.

## 📄 Gestion des documents PDF

- Endpoint `POST /documents/upload`
	- Réservé aux administrateurs (`Authorization: Bearer <token>`)
	- Form-data : `book_id`, `file` (PDF)
	- Sauvegarde le fichier dans `UPLOAD_DIR` (défaut `/workspace/uploads`) puis indexe le texte extrait (pypdf).
	- Miniature: activable via `GENERATE_THUMBNAILS_ON_UPLOAD=true` (par défaut `false` hors Docker). Si Poppler est installé, une miniature JPEG est générée dans `UPLOAD_DIR/thumbnails/` et l'URL publique est mise dans `thumbnail_path`.
- Endpoint `GET /documents/search?query=mot`
	- Retourne les livres dont les PDF contiennent le terme recherché (recherche simple via `ILIKE`).
- Modèle `Document` lié à `Book` (UUID, nom de fichier, texte extrait, date d’upload) avec migration Alembic dédiée (`7c4020728880_add_documents_table`).
- Configuration : `UPLOAD_DIR` peut être redéfini (ex : `export UPLOAD_DIR=$(pwd)/uploads`) avant de lancer l’API ou les tests.
- Tests : lancer `pytest backend/tests/test_documents_api.py -q` pour vérifier l’upload et la recherche.

## �️ Miniatures (thumbnails) PDF

- Lors de la création d'un livre via `POST /books/create_with_file`, l'API tente de générer automatiquement une miniature JPEG de la première page du PDF.
- Le fichier est écrit dans `UPLOAD_DIR/thumbnails/<book_id>_thumb.jpg` et l'URL publique est exposée dans le champ `thumbnail_path` du livre (ex: `http://localhost:8000/uploads/thumbnails/<book_id>_thumb.jpg`).
- Dépendances:
	- Python: `pdf2image`, `Pillow` (déjà incluses dans `backend/requirements.txt`).
	- Système: [Poppler](https://poppler.freedesktop.org/) requis par `pdf2image`.
		- macOS (Homebrew): `brew install poppler`
		- Ubuntu/Debian: `sudo apt-get install -y poppler-utils`
		- Windows: installer Poppler et ajouter `bin` au `PATH`.
- Si Poppler n'est pas installé ou si la conversion échoue, l'upload du PDF continue sans bloquer et `thumbnail_path` restera `null`.

### Configuration

- `UPLOAD_DIR`: répertoire de stockage (défaut: `/workspace/uploads` en local, `/data/uploads` en Docker)
- `GENERATE_THUMBNAILS_ON_UPLOAD`: `true|false` (défaut: `false`). En Docker Compose, elle est activée par défaut.

## �👤 Gestion des utilisateurs (username seulement)

- Authentification : `/auth/login` accepte `username` + `password`.
- Bootstrap : `/auth/create` permet de créer le tout premier admin (doit avoir `role=admin`), puis nécessite un jeton admin.
- Administration (`/admin/users` – dépendance `get_current_admin_user`) :
	- `POST /admin/users/` : créer un compte (`username`, `full_name`, `role`, `password`).
	- `GET /admin/users/` : lister tous les comptes.
	- `PUT /admin/users/{id}/password` : réinitialiser le mot de passe.
	- `DELETE /admin/users/{id}` : supprimer un compte.
- Espace utilisateur (`/users/me`) :
	- `GET /users/me` : profil (id, username, role, timestamps).
	- `PUT /users/me/password` : changer son mot de passe (ancienne + nouvelle valeur).
- Service `backend/services/user_service.py` encapsule le hash/verify (Passlib bcrypt), le changement et la réinitialisation de mot de passe.
- Nouvelle migration : `26312aa6760a_add_user_management_via_username.py` (suppression `email`, ajout `username`).