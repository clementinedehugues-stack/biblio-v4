# Migration de la base Render vers Neon

Ce guide explique comment basculer la base PostgreSQL hébergée sur Render vers Neon et reconnecter l'application (backend FastAPI) sans changer de code.

## Prérequis

- Accès au tableau de bord Neon avec un projet et une base créés.
- Chaîne de connexion Neon (Pooler recommandé) avec SSL activé.
- Un dump de la base actuelle (ex.: fichiers dans `backups/`), ou accès direct à l’ancienne base Render pour export.
- macOS avec `psql` installé (via `postgres.app` ou `brew install libpq` et ajout de `psql` au PATH).

## 1) Préparer la chaîne de connexion Neon

Neon fournit plusieurs URLs :

- Direct (sans pooler) : `postgresql://<user>:<password>@<host>/<db>`
- Pooler (recommandé en prod) : `postgresql://<user>:<password>@<pooler-host>/<db>`

Pour notre backend (SQLAlchemy + asyncpg), gardez le driver asynchrone et forcez SSL :

```
DATABASE_URL=postgresql+asyncpg://<user>:<password>@<host>/<db>?sslmode=require
```

Remplacez `<host>` par le host Neon (pooler ou direct). Sur Render, définissez cette variable dans `render.yaml` ou via le dashboard.

## 2) Importer les données dans Neon

Vous avez déjà des dumps dans `backups/` comme `bibliodb_YYYYMMDD_HHMM.dump`.

Étapes typiques (sur macOS, shell zsh) :

1. Créer la base (si non existante) dans Neon via l’UI.
2. Importer le dump avec `psql` (si dump en SQL) ou `pg_restore` (si format personnalisé).

### a) Dump SQL (plain)

```
psql "postgresql://<user>:<password>@<host>/<db>?sslmode=require" -f backups/bibliodb_20251130_1626.dump
```

### b) Dump au format personnalisé

```
pg_restore --no-owner --no-privileges \
  --dbname="postgresql://<user>:<password>@<host>/<db>?sslmode=require" \
  backups/bibliodb_20251130_1626.dump
```

Astuce : si les rôles diffèrent, utilisez `--role=<user>` ou recréez les rôles nécessaires dans Neon avant l’import.

## 3) Mettre à jour l’application

- Le code lit `DATABASE_URL` depuis l’environnement (`backend/core/config.py`). Aucun changement de code n’est nécessaire.
- Alembic s’adapte automatiquement et supprime `+asyncpg` pour ses opérations de migration.

Sur Render (`render.yaml`), assurez-vous d’avoir :

```
envVars:
  - key: DATABASE_URL
    sync: false  # définissez la valeur dans le dashboard Render
```

Définissez la valeur via le dashboard Render avec l’URL Neon et `?sslmode=require`.

## 4) Vérifications et tests

- Redéployez le service backend.
- Les migrations Alembic s’exécuteront au démarrage (`alembic upgrade head`).
- Lancez les tests rapides côté backend :
  - Authentification basique (scripts `simple_login_test.sh`, `test_login.sh`).
  - Routes document/ livre pour vérifier lecture/écriture.

## 5) Retours en arrière

Conservez vos dumps `backups/`. En cas de rollback, pointez `DATABASE_URL` vers l’ancienne base Render et redeployez.

## Notes

- Neon impose SSL : gardez `?sslmode=require`.
- Utilisez l’URL du pooler pour limiter les erreurs de connexions concurrentes.
- Le projet utilise `postgresql+asyncpg` et des UUID `postgresql.UUID(as_uuid=True)` dans les migrations : Neon est compatible.
