# 📚 API Reference - Biblio V4

Documentation complète de l'API FastAPI pour le système de gestion de bibliothèque.

## 🌐 Base URL

- **Développement** : `http://localhost:8000`
- **Documentation interactive** : `http://localhost:8000/docs`

## 🔐 Authentification

L'API utilise l'authentification JWT Bearer Token.

### Obtenir un token

```http
POST /auth/login
Content-Type: application/json

{
  "username": "superadmin",
  "password": "AdminPass123"
}
```

**Réponse :**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Utiliser le token

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🔐 Authentication Endpoints

### POST /auth/login
Authentifier un utilisateur et obtenir un token d'accès.

**Corps de la requête :**
```json
{
  "username": "string",
  "password": "string"
}
```

**Réponse :**
```json
{
  "access_token": "string",
  "token_type": "bearer"
}
```

**Codes de statut :**
- `200` : Authentification réussie
- `401` : Identifiants incorrects

---

### POST /auth/create
Créer un nouveau compte utilisateur.

**En-têtes :** `Authorization: Bearer <token>` (optionnel pour le premier admin)

**Corps de la requête :**
```json
{
  "username": "string",
  "password": "string",
  "full_name": "string",
  "role": "user|moderator|admin"
}
```

**Réponse :**
```json
{
  "id": "uuid",
  "username": "string",
  "full_name": "string",
  "role": "string",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**Codes de statut :**
- `201` : Utilisateur créé
- `400` : Données invalides
- `403` : Permissions insuffisantes

---

### GET /auth/me
Obtenir les informations du profil de l'utilisateur actuel.

**En-têtes :** `Authorization: Bearer <token>`

**Réponse :**
```json
{
  "id": "uuid",
  "username": "string",
  "full_name": "string",
  "role": "string",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**Codes de statut :**
- `200` : Succès
- `401` : Token invalide

---

## 📚 Books Endpoints

### GET /books/
Récupérer la liste des livres avec filtrage optionnel.

**Paramètres de requête :**
- `category` (optionnel) : Filtrer par catégorie
- `author` (optionnel) : Filtrer par auteur
- `language` (optionnel) : Filtrer par langue (`FR` ou `EN`)

**Exemple :**
```http
GET /books/?category=histoire&author=Victor%20Hugo&language=FR
```

**Réponse :**
```json
[
  {
    "id": "uuid",
    "title": "Les Misérables",
    "author": "Victor Hugo",
    "description": "Roman historique français",
    "cover_image_url": "https://example.com/cover.jpg",
    "thumbnail_path": "/uploads/thumbnails/uuid_thumb.jpg",
    "category": "histoire",
    "tags": ["classique", "littérature"],
    "language": "FR",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "has_document": true,
    "stream_endpoint": "/books/uuid/stream"
  }
]
```

**Codes de statut :**
- `200` : Succès

---

### GET /books/{book_id}
Récupérer les détails d'un livre spécifique.

**Paramètres de chemin :**
- `book_id` : UUID du livre

**Réponse :**
```json
{
  "id": "uuid",
  "title": "string",
  "author": "string",
  "description": "string",
  "cover_image_url": "string",
  "thumbnail_path": "string",
  "category": "string",
  "tags": ["string"],
  "language": "FR|EN",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "has_document": true,
  "stream_endpoint": "string"
}
```

**Codes de statut :**
- `200` : Succès
- `404` : Livre non trouvé

---

### POST /books/
Créer un nouveau livre (admin/moderator seulement).

**En-têtes :** `Authorization: Bearer <token>`

**Corps de la requête :**
```json
{
  "title": "string",
  "author": "string",
  "description": "string",
  "cover_image_url": "string",
  "category": "string",
  "tags": ["string"],
  "language": "FR|EN"
}
```

**Réponse :**
```json
{
  "id": "uuid",
  "title": "string",
  "author": "string",
  "description": "string",
  "cover_image_url": "string",
  "thumbnail_path": null,
  "category": "string",
  "tags": ["string"],
  "language": "FR|EN",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "has_document": false,
  "stream_endpoint": null
}
```

**Codes de statut :**
- `201` : Livre créé
- `403` : Permissions insuffisantes
- `400` : Données invalides

---

### POST /books/create_with_file
Créer un livre avec upload de fichier PDF en une seule requête.

**En-têtes :** `Authorization: Bearer <token>`

**Corps de la requête (multipart/form-data) :**
- `title` : Titre du livre
- `author` : Auteur du livre
- `category` : Catégorie
- `language` : Langue (`FR` ou `EN`)
- `description` (optionnel) : Description
- `file` : Fichier PDF

**Exemple avec curl :**
```bash
curl -X POST "http://localhost:8000/books/create_with_file" \
  -H "Authorization: Bearer <token>" \
  -F "title=Mon Livre" \
  -F "author=Auteur Exemple" \
  -F "category=fiction" \
  -F "language=FR" \
  -F "description=Description du livre" \
  -F "file=@document.pdf"
```

**Réponse :** Même format que POST /books/

**Codes de statut :**
- `201` : Livre et document créés
- `403` : Permissions insuffisantes
- `400` : Fichier non PDF ou trop volumineux

---

### PUT /books/{book_id}
Mettre à jour un livre existant (admin/moderator seulement).

**En-têtes :** `Authorization: Bearer <token>`

**Paramètres de chemin :**
- `book_id` : UUID du livre

**Corps de la requête :**
```json
{
  "title": "string",
  "author": "string",
  "description": "string",
  "cover_image_url": "string",
  "category": "string",
  "tags": ["string"],
  "language": "FR|EN"
}
```

**Codes de statut :**
- `200` : Livre mis à jour
- `403` : Permissions insuffisantes
- `404` : Livre non trouvé

---

### DELETE /books/{book_id}
Supprimer un livre (admin/moderator seulement).

**En-têtes :** `Authorization: Bearer <token>`

**Paramètres de chemin :**
- `book_id` : UUID du livre

**Codes de statut :**
- `204` : Livre supprimé
- `403` : Permissions insuffisantes
- `404` : Livre non trouvé

---

### POST /books/{book_id}/stream-token
Obtenir un token temporaire pour streamer le PDF d'un livre.

**En-têtes :** `Authorization: Bearer <token>`

**Paramètres de chemin :**
- `book_id` : UUID du livre

**Réponse :**
```json
{
  "token": "temporary-stream-token",
  "stream_endpoint": "/books/uuid/stream",
  "expires_in": 3600
}
```

**Codes de statut :**
- `200` : Token généré
- `404` : Livre ou document non trouvé
- `401` : Non authentifié

---

### GET /books/{book_id}/stream
Streamer le contenu PDF d'un livre.

**Paramètres de chemin :**
- `book_id` : UUID du livre

**Paramètres de requête :**
- `token` : Token temporaire obtenu via `/stream-token`

**Réponse :** Flux binaire PDF

**En-têtes de réponse :**
- `Content-Type: application/pdf`
- `Content-Disposition: inline; filename="titre-du-livre.pdf"`

**Codes de statut :**
- `200` : Streaming réussi
- `403` : Token invalide ou expiré
- `404` : Livre ou document non trouvé

---

## 📄 Documents Endpoints

### GET /documents/
Lister tous les documents uploadés (admin seulement).

**En-têtes :** `Authorization: Bearer <token>` (admin)

**Réponse :**
```json
[
  {
    "id": "uuid",
    "book_id": "uuid",
    "filename": "document.pdf",
    "storage_path": "uploads/uuid_document.pdf",
    "extracted_text": "Contenu extrait du PDF...",
    "uploaded_at": "2024-01-01T00:00:00Z"
  }
]
```

**Codes de statut :**
- `200` : Succès
- `403` : Permissions insuffisantes

---

### POST /documents/upload
Uploader un document PDF pour un livre existant (admin seulement).

**En-têtes :** `Authorization: Bearer <token>` (admin)

**Corps de la requête (multipart/form-data) :**
- `book_id` : UUID du livre
- `file` : Fichier PDF (max 60MB)

**Réponse :**
```json
{
  "id": "uuid",
  "book_id": "uuid",
  "filename": "document.pdf",
  "storage_path": "uploads/uuid_document.pdf",
  "extracted_text": "Contenu extrait...",
  "uploaded_at": "2024-01-01T00:00:00Z"
}
```

**Codes de statut :**
- `201` : Document uploadé
- `400` : Fichier non PDF ou trop volumineux
- `403` : Permissions insuffisantes
- `404` : Livre non trouvé

---

### GET /documents/search
Rechercher dans le contenu des documents PDF.

**Paramètres de requête :**
- `q` : Terme de recherche

**Exemple :**
```http
GET /documents/search?q=histoire%20de%20france
```

**Réponse :**
```json
[
  {
    "id": "uuid",
    "title": "Histoire de France",
    "author": "Jules Michelet",
    "description": "Histoire complète de la France",
    "cover_image_url": "string",
    "thumbnail_path": "string",
    "category": "histoire",
    "tags": ["histoire", "france"],
    "language": "FR",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "has_document": true,
    "stream_endpoint": "/books/uuid/stream"
  }
]
```

**Codes de statut :**
- `200` : Résultats de recherche

---

### POST /documents/regenerate_thumbnails
Régénérer toutes les miniatures de documents (admin seulement).

**En-têtes :** `Authorization: Bearer <token>` (admin)

**Réponse :**
```json
{
  "message": "Thumbnail regeneration started",
  "processed": 15,
  "errors": 2
}
```

**Codes de statut :**
- `200` : Régénération terminée
- `403` : Permissions insuffisantes

---

## 🗂️ Categories Endpoints

### GET /categories/
Lister toutes les catégories.

**Réponse :**
```json
[
  {
    "name": "histoire",
    "created_at": "2024-01-01T00:00:00Z"
  },
  {
    "name": "fiction",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

**Codes de statut :**
- `200` : Succès

---

### POST /categories/
Créer une nouvelle catégorie (admin/moderator seulement).

**En-têtes :** `Authorization: Bearer <token>`

**Corps de la requête :**
```json
{
  "name": "nouvelle-categorie"
}
```

**Réponse :**
```json
{
  "name": "nouvelle-categorie",
  "created_at": "2024-01-01T00:00:00Z"
}
```

**Codes de statut :**
- `201` : Catégorie créée
- `403` : Permissions insuffisantes
- `400` : Nom invalide ou déjà existant

---

### DELETE /categories/{name}
Supprimer une catégorie (admin/moderator seulement).

**En-têtes :** `Authorization: Bearer <token>`

**Paramètres de chemin :**
- `name` : Nom de la catégorie

**Codes de statut :**
- `204` : Catégorie supprimée
- `403` : Permissions insuffisantes
- `404` : Catégorie non trouvée
- `400` : Catégorie utilisée par des livres

---

## 💬 Comments Endpoints

### GET /comments/
Lister les commentaires avec filtrage optionnel.

**Paramètres de requête :**
- `book_id` (optionnel) : UUID du livre
- `limit` (optionnel) : Nombre max de résultats (défaut: 100)

**Exemple :**
```http
GET /comments/?book_id=uuid&limit=10
```

**Réponse :**
```json
[
  {
    "id": "uuid",
    "book_id": "uuid",
    "user_id": "uuid",
    "content": "Excellent livre, très instructif !",
    "created_at": "2024-01-01T00:00:00Z",
    "user": {
      "username": "user1",
      "full_name": "Utilisateur Un"
    },
    "book": {
      "title": "Histoire de France",
      "author": "Jules Michelet"
    }
  }
]
```

**Codes de statut :**
- `200` : Succès

---

### POST /comments/
Créer un nouveau commentaire.

**En-têtes :** `Authorization: Bearer <token>`

**Corps de la requête :**
```json
{
  "book_id": "uuid",
  "content": "Mon commentaire sur ce livre..."
}
```

**Réponse :**
```json
{
  "id": "uuid",
  "book_id": "uuid",
  "user_id": "uuid",
  "content": "Mon commentaire sur ce livre...",
  "created_at": "2024-01-01T00:00:00Z",
  "user": {
    "username": "user1",
    "full_name": "Utilisateur Un"
  },
  "book": {
    "title": "Histoire de France",
    "author": "Jules Michelet"
  }
}
```

**Codes de statut :**
- `201` : Commentaire créé
- `401` : Non authentifié
- `404` : Livre non trouvé
- `400` : Contenu invalide

---

## 👤 User Management Endpoints

### GET /admin/users/
Lister tous les utilisateurs (admin seulement).

**En-têtes :** `Authorization: Bearer <token>` (admin)

**Réponse :**
```json
[
  {
    "id": "uuid",
    "username": "user1",
    "full_name": "Utilisateur Un",
    "role": "user",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

**Codes de statut :**
- `200` : Succès
- `403` : Permissions insuffisantes

---

### POST /admin/users/
Créer un nouvel utilisateur (admin seulement).

**En-têtes :** `Authorization: Bearer <token>` (admin)

**Corps de la requête :**
```json
{
  "username": "nouvel-user",
  "password": "MotDePasse123",
  "full_name": "Nouvel Utilisateur",
  "role": "user|moderator|admin"
}
```

**Réponse :** Même format que GET /admin/users/

**Codes de statut :**
- `201` : Utilisateur créé
- `403` : Permissions insuffisantes
- `400` : Données invalides

---

### PUT /admin/users/{user_id}/password
Réinitialiser le mot de passe d'un utilisateur (admin seulement).

**En-têtes :** `Authorization: Bearer <token>` (admin)

**Paramètres de chemin :**
- `user_id` : UUID de l'utilisateur

**Corps de la requête :**
```json
{
  "new_password": "NouveauMotDePasse123"
}
```

**Codes de statut :**
- `200` : Mot de passe mis à jour
- `403` : Permissions insuffisantes
- `404` : Utilisateur non trouvé

---

### DELETE /admin/users/{user_id}
Supprimer un utilisateur (admin seulement).

**En-têtes :** `Authorization: Bearer <token>` (admin)

**Paramètres de chemin :**
- `user_id` : UUID de l'utilisateur

**Codes de statut :**
- `204` : Utilisateur supprimé
- `403` : Permissions insuffisantes
- `404` : Utilisateur non trouvé

---

## 👤 User Self-Management Endpoints

### GET /users/me
Obtenir son propre profil utilisateur.

**En-têtes :** `Authorization: Bearer <token>`

**Réponse :**
```json
{
  "id": "uuid",
  "username": "string",
  "full_name": "string",
  "role": "string",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**Codes de statut :**
- `200` : Succès
- `401` : Non authentifié

---

### PUT /users/me/password
Changer son propre mot de passe.

**En-têtes :** `Authorization: Bearer <token>`

**Corps de la requête :**
```json
{
  "current_password": "AncienMotDePasse",
  "new_password": "NouveauMotDePasse123"
}
```

**Réponse :** Même format que GET /users/me

**Codes de statut :**
- `200` : Mot de passe mis à jour
- `401` : Mot de passe actuel incorrect
- `400` : Nouveau mot de passe invalide

---

## ⚠️ Codes d'erreur

### Codes de statut HTTP

- `200` : Succès
- `201` : Créé avec succès
- `204` : Succès sans contenu
- `400` : Requête invalide
- `401` : Non authentifié
- `403` : Permissions insuffisantes
- `404` : Ressource non trouvée
- `422` : Entité non traitable (erreur de validation)
- `500` : Erreur serveur interne

### Format des erreurs

```json
{
  "detail": "Description de l'erreur"
}
```

### Erreurs de validation (422)

```json
{
  "detail": [
    {
      "loc": ["body", "field_name"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## 🔧 Utilisation avec différents clients

### curl

```bash
# Authentification
TOKEN=$(curl -s -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"AdminPass123"}' \
  | jq -r '.access_token')

# Utiliser le token
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/books/"
```

### JavaScript/Fetch

```javascript
// Authentification
const response = await fetch('http://localhost:8000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'superadmin',
    password: 'AdminPass123'
  })
});
const { access_token } = await response.json();

// Utiliser le token
const books = await fetch('http://localhost:8000/books/', {
  headers: { 'Authorization': `Bearer ${access_token}` }
}).then(r => r.json());
```

### Python/requests

```python
import requests

# Authentification
response = requests.post('http://localhost:8000/auth/login', json={
    'username': 'superadmin',
    'password': 'AdminPass123'
})
token = response.json()['access_token']

# Utiliser le token
headers = {'Authorization': f'Bearer {token}'}
books = requests.get('http://localhost:8000/books/', headers=headers).json()
```

---

## 📊 Limites et quotas

- **Taille max des fichiers PDF** : 60MB
- **Formats acceptés** : PDF uniquement
- **Token JWT** : Expire après 30 minutes (configurable)
- **Recherche** : Limitée à 1000 résultats par requête
- **Upload simultané** : 5 fichiers max par utilisateur

---

*Documentation générée automatiquement. Pour la documentation interactive complète, visitez `/docs` sur votre instance de l'API.*