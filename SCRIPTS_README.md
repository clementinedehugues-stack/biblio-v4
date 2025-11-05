# 🚀 Scripts de Gestion des Services - Biblio V4

Ce dossier contient des scripts pour faciliter le démarrage et l'arrêt des services de l'application Biblio V4.

## 📋 Prérequis

- **Docker** et **Docker Compose** installés et en cours d'exécution
- **Node.js** et **npm** installés
- **curl** installé (pour les vérifications de santé)

## 🎯 Scripts Disponibles

### `./start_services.sh` - Démarrage des Services

Ce script démarre automatiquement tous les services nécessaires :

- ✅ Vérifie les prérequis (Docker, Node.js)
- 🐳 Démarre les services backend (PostgreSQL + FastAPI) via Docker Compose
- ⚛️ Installe les dépendances frontend si nécessaire
- 🌐 Lance le serveur de développement frontend (Vite)
- 🔍 Vérifie que tous les services sont accessibles
- 📊 Affiche le statut des services

**Usage :**
```bash
./start_services.sh
```

**Services démarrés :**
- Backend API : http://localhost:8000
- Documentation API : http://localhost:8000/docs
- Frontend : http://localhost:5173
- Base de données PostgreSQL : localhost:5432

### `./stop_services.sh` - Arrêt des Services

Ce script arrête proprement tous les services :

- 🛑 Arrête le serveur frontend
- 🐳 Arrête les conteneurs Docker backend
- ✅ Vérifie que tout est bien arrêté

**Usage :**
```bash
./stop_services.sh
```

## 🔧 Utilisation

### Démarrage Rapide
```bash
# Cloner et accéder au projet
cd "BIBLIO V4"

# Démarrer tous les services
./start_services.sh
```

### Arrêt des Services
```bash
# Arrêter tous les services
./stop_services.sh
```

### Redémarrage
```bash
# Arrêter puis redémarrer
./stop_services.sh && ./start_services.sh
```

## 🐛 Dépannage

### Problèmes Courants

**Docker n'est pas en cours d'exécution :**
```bash
# Démarrer Docker Desktop ou le service Docker
open -a Docker # macOS
```

**Port déjà utilisé :**
```bash
# Vérifier quels processus utilisent les ports
lsof -i :8000  # Backend
lsof -i :5173  # Frontend
lsof -i :5432  # PostgreSQL
```

**Services qui ne démarrent pas :**
```bash
# Voir les logs des conteneurs
cd backend && docker-compose logs -f

# Redémarrer les conteneurs
cd backend && docker-compose down && docker-compose up -d
```

### Commandes Manuelles

Si les scripts ne fonctionnent pas, vous pouvez démarrer manuellement :

**Backend :**
```bash
cd backend
docker-compose up -d
```

**Frontend :**
```bash
cd frontend
npm install  # Si première fois
npm run dev
```

## 📝 Structure des Services

```
BIBLIO V4/
├── start_services.sh     # 🚀 Script de démarrage
├── stop_services.sh      # 🛑 Script d'arrêt
├── backend/
│   ├── docker-compose.yml
│   └── ...
└── frontend/
    ├── package.json
    └── ...
```

## 🎨 Fonctionnalités des Scripts

### Fonctionnalités de `start_services.sh`
- ✅ Vérification automatique des prérequis
- 🔄 Redémarrage automatique si les services sont déjà en cours
- ⏱️ Vérifications de santé avec timeout
- 🎨 Messages colorés et informatifs
- 📊 Affichage du statut final
- 🧹 Nettoyage propre en cas d'interruption (Ctrl+C)

### Fonctionnalités de `stop_services.sh`
- 🛑 Arrêt gracieux de tous les services
- ✅ Vérification que tout est bien arrêté
- 📊 Rapport final de l'état des services

## 🆘 Support

En cas de problème avec les scripts :

1. Vérifiez que tous les prérequis sont installés
2. Consultez les logs avec `docker-compose logs -f`
3. Essayez de redémarrer Docker
4. Utilisez les commandes manuelles en cas de besoin

---

*Créé pour Biblio V4 - Système de gestion de bibliothèque*