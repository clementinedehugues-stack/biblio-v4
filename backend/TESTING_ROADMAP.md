# 🎯 Guide des Tests Recommandés - Phase 2

## Vue d'ensemble

Ce document détaille les tests à implémenter pour augmenter la couverture de 50% à 80%+.

---

## 🔴 Priorité 1 : Upload & Documents (Impact +15%)

### Actuellement testé : 45% de `services/documents.py`

### À Tester

#### 1. Upload PDF avec Validation
```python
# tests/test_documents_full.py

async def test_upload_valid_pdf():
    """Upload d'un PDF valide + indexation"""
    # Créer un vrai PDF minimal
    # Vérifier création document
    # Vérifier extraction texte
    # Vérifier indexation en BDD

async def test_upload_exceeds_size_limit():
    """Rejet PDF > limite (60MB par défaut)"""
    # Créer gros fichier
    # Vérifier erreur 413

async def test_upload_corrupted_pdf():
    """Gestion PDF corrompu"""
    # Upload PDF invalide
    # Vérifier cleanup fichier
    # Vérifier erreur 400

async def test_upload_creates_thumbnail():
    """Génération miniature (si activée)"""
    # Upload avec GENERATE_THUMBNAILS_ON_UPLOAD=true
    # Vérifier création thumbnail.jpg
    # Vérifier stockage path en DB
```

#### 2. Téléchargement PDF Sécurisé
```python
async def test_stream_document_with_token():
    """Téléchargement PDF authentifié"""
    # Générer token stream
    # Télécharger via GET /documents/stream/{token}
    # Vérifier content-type PDF

async def test_stream_document_expired_token():
    """Token stream expiré"""
    # Attendre expiration
    # Vérifier erreur 401

async def test_stream_document_invalid_token():
    """Token stream malformé"""
    # Envoyer token invalide
    # Vérifier erreur 403
```

#### 3. Recherche Documentaire
```python
async def test_search_multiple_results():
    """Recherche retournant plusieurs résultats"""
    # Créer 3 books avec différents documents
    # Rechercher terme commun
    # Vérifier 3 résultats

async def test_search_case_insensitive():
    """Recherche insensible à la casse"""
    # Upload "Python Guide"
    # Chercher "python" ou "PYTHON"
    # Vérifier résultat trouvé

async def test_search_phrase():
    """Recherche phrase exacte"""
    # Upload PDF avec phrase spécifique
    # Chercher phrase exacte
    # Vérifier match
```

**Fichier** : Créer `tests/test_documents_full.py`  
**Couverture Impact** : +10% (45% → 55%)  
**Temps** : 3-4 heures

---

## 🟠 Priorité 2 : Books - CRUD Complet (Impact +12%)

### Actuellement testé : 24% de `routes/books.py`

### À Tester

#### 1. Suppression Livres
```python
async def test_delete_book_success():
    """Suppression d'un livre existant"""
    # Admin supprime livre
    # Vérifier 204 No Content
    # Vérifier livre non trouvable après

async def test_delete_book_cascades():
    """Suppression livre supprime documents"""
    # Créer book + document
    # Supprimer book
    # Vérifier documents supprimés aussi

async def test_delete_book_not_found():
    """Suppression livre inexistant"""
    # Essayer supprimer ID inexistant
    # Vérifier 404

async def test_delete_requires_admin():
    """Seul admin peut supprimer"""
    # User essaie supprimer
    # Vérifier 403
```

#### 2. Édition Livres
```python
async def test_update_book_partial():
    """Update partielle (certains champs)"""
    # Mettre à jour que le titre
    # Vérifier autres champs conservés

async def test_update_book_with_thumbnail():
    """Update avec génération thumbnail"""
    # Upload PDF + update thumbnail
    # Vérifier URL thumbnail en response

async def test_update_all_fields():
    """Update tous les champs"""
    # Modifier titre, auteur, catégorie, tags...
    # Vérifier tous changements persistés
```

#### 3. Gestion Tags
```python
async def test_book_tags_json_storage():
    """Tags stockés en JSON"""
    # Créer book avec tags: ["python", "programming"]
    # Récupérer et vérifier structure JSON

async def test_add_tags_to_existing_book():
    """Ajouter tags à book existant"""
    # Update book.tags
    # Vérifier persistance
```

#### 4. Thumbnails
```python
async def test_thumbnail_url_generation():
    """URL thumbnail en réponse"""
    # Upload PDF
    # Vérifier response.thumbnail_path non None
    # Vérifier accessible via /uploads/thumbnails/{id}
```

**Fichier** : Améliorer `tests/test_books_crud.py`  
**Couverture Impact** : +10% (24% → 34%)  
**Temps** : 3-4 heures

---

## 🟡 Priorité 3 : Categories - CRUD (Impact +8%)

### Actuellement testé : 21% de `services/categories.py`

### À Tester

```python
# tests/test_categories.py

async def test_create_category():
    """Créer nouvelle catégorie"""
    
async def test_list_categories():
    """Lister toutes catégories"""
    
async def test_delete_category():
    """Supprimer catégorie (avec constraints)"""
    
async def test_category_unique_constraint():
    """Catégories uniques par nom"""
    
async def test_category_foreign_key():
    """FK constraint books.category"""
```

**Fichier** : Créer `tests/test_categories_crud.py`  
**Couverture Impact** : +5% (21% → 26%)  
**Temps** : 2-3 heures

---

## 🟡 Priorité 4 : Admin Users Management (Impact +8%)

### Actuellement testé : 35% de `routes/admin_users.py`

### À Tester

```python
# tests/test_admin_users.py

async def test_admin_list_users():
    """Admin voir tous les utilisateurs"""

async def test_admin_change_user_role():
    """Admin changer rôle utilisateur"""
    # USER → MODERATOR → ADMIN

async def test_admin_delete_user():
    """Admin supprimer utilisateur"""
    
async def test_admin_reset_password():
    """Admin réinitialiser mot de passe"""
    
async def test_non_admin_cannot_manage():
    """User ne peut pas gérer users"""
```

**Fichier** : Améliorer `tests/test_admin_users.py`  
**Couverture Impact** : +5% (35% → 40%)  
**Temps** : 2-3 heures

---

## 🟢 Priorité 5 : Comments & Autres (Impact +5%)

### À Tester

```python
# tests/test_comments.py

async def test_create_comment():
    """Ajouter commentaire sur document"""

async def test_list_comments():
    """Lister commentaires par document"""

async def test_delete_comment_author():
    """Auteur peut supprimer son commentaire"""

async def test_delete_comment_admin():
    """Admin peut supprimer tout commentaire"""
```

**Temps** : 2-3 heures

---

## 📊 Tableau de Synthèse

| Priorité | Module | Tests | Impact | Temps | Total |
|----------|--------|-------|--------|-------|-------|
| 1 | Documents | 8 | +10% | 4h | 4h |
| 2 | Books | 10 | +10% | 4h | 8h |
| 3 | Categories | 5 | +5% | 2h | 10h |
| 4 | Admin Users | 8 | +5% | 3h | 13h |
| 5 | Comments | 5 | +3% | 2h | 15h |
| 6 | E2E & Perf | 10 | +10% | 5h | 20h |

---

## 🎯 Milestones de Couverture

| Phase | Couverture | Tests | Délai |
|-------|-----------|-------|-------|
| Current | 50% | 36 | ✅ |
| Après P1 | 60% | 44 | +4h |
| Après P2 | 70% | 54 | +8h |
| Après P3-4 | 80% | 77 | +13h |
| Après P5-6 | 90%+ | 97 | +20h |

---

## 📋 Template pour Chaque Test

```python
@pytest.mark.asyncio
async def test_<functionality>_<scenario>(client: AsyncClient, admin_token: str):
    """
    Test <description>
    
    Given: <état initial>
    When: <action>
    Then: <résultat attendu>
    """
    # Setup
    
    # Act
    response = await client.<method>(
        "<route>",
        json=<payload>,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    # Assert
    assert response.status_code == <expected_code>
    assert response.json()["field"] == <expected_value>
```

---

## ✅ Checklist d'Implémentation

- [ ] Phase 1 : Documents (8 tests)
  - [ ] Upload validation
  - [ ] Stream PDF
  - [ ] Recherche
  
- [ ] Phase 2 : Books (10 tests)
  - [ ] Suppression
  - [ ] Édition
  - [ ] Tags & Thumbnails
  
- [ ] Phase 3 : Categories (5 tests)
  - [ ] CRUD complet
  - [ ] Constraints
  
- [ ] Phase 4 : Admin (8 tests)
  - [ ] Gestion utilisateurs
  
- [ ] Phase 5 : Autres (5 tests)
  - [ ] Comments
  
- [ ] Phase 6 : Intégration (10 tests)
  - [ ] E2E workflows
  - [ ] Performance tests

---

## 🚀 Commandes pour Lancer les Tests

```bash
# Phase 1
pytest tests/test_documents_full.py -v

# Phase 2
pytest tests/test_books_crud.py -v

# Tout
pytest tests/ --cov=backend --cov-report=html

# Voir progression couverture
pytest --cov-report=term-missing:skip-covered
```

---

**Total Effort** : ~20-25 heures  
**Couverture Attendue** : 50% → 90%+  
**ROI** : Très élevé (20x plus de tests)

Commencer par Phase 1 pour le maximum d'impact ! 🚀
