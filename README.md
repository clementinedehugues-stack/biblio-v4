# 📚 Biblio V4 - Système de Gestion de Bibliothèque

Application moderne de gestion de bibliothèque développée avec FastAPI (backend) et React (frontend).

## 🚀 Démarrage Rapide

### Utilisation des Scripts Automatisés (Recommandé)

```bash
# Démarrer tous les services
./start_services.sh

# Vérifier le statut des services
./check_status.sh

# Obtenir les URLs d'accès réseau
./network_access.sh

# Redémarrer les services
./restart_services.sh

# Arrêter tous les services
./stop_services.sh
```

### URLs d'Accès

#### Accès Local
- 🌐 **Frontend** : [http://localhost:5173](http://localhost:5173)
- 🔧 **API Backend** : [http://localhost:8000](http://localhost:8000)
- 📚 **Documentation API** : [http://localhost:8000/docs](http://localhost:8000/docs)

#### Accès Réseau Local 📱
Pour accéder depuis d'autres appareils sur le même réseau WiFi :

```bash
# Obtenir les URLs réseau
./network_access.sh

# Ou avec Make
make network-urls
```

**URLs typiques** (votre IP peut différer) :
- 📱 **Frontend** : `http://192.168.1.70:5173`
- 🔧 **Backend** : `http://192.168.1.70:8000`
- 📚 **Documentation** : `http://192.168.1.70:8000/docs`

> 💡 **Compatible avec** : smartphones, tablettes, autres ordinateurs, Smart TV

## 📋 Prérequis

- **Docker** et **Docker Compose**
- **Node.js** (version 18 ou supérieure)
- **npm** ou **yarn**

## 🏗️ Architecture

```
BIBLIO V4/
├── 🚀 Scripts de gestion
│   ├── start_services.sh      # Démarrage automatique
│   ├── stop_services.sh       # Arrêt des services
│   ├── restart_services.sh    # Redémarrage
│   ├── check_status.sh        # Vérification du statut
│   └── .env.scripts           # Configuration
├── 🔧 backend/               # API FastAPI + PostgreSQL
├── 🌐 frontend/              # Application React
└── 📖 docs/                  # Documentation
```

## 🛠️ Installation Manuelle

### Backend

```bash
cd backend
docker-compose up -d
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 📖 Documentation Complète

- **Scripts** : Voir [SCRIPTS_README.md](SCRIPTS_README.md) pour l'utilisation détaillée des scripts
- **Backend** : Voir [backend/README.md](backend/README.md)
- **Frontend** : Voir [frontend/README.md](frontend/README.md)
- **Migration DB (Neon)** : Voir [docs/NEON_MIGRATION.md](docs/NEON_MIGRATION.md)

## 🐛 Dépannage

### Problèmes Courants

1. **Docker n'est pas en cours d'exécution**
   ```bash
   # Démarrer Docker Desktop
   open -a Docker  # macOS
   ```

2. **Ports déjà utilisés**
   ```bash
   # Vérifier les ports utilisés
   lsof -i :8000  # Backend
   lsof -i :5173  # Frontend
   ```

3. **Services qui ne démarrent pas**
   ```bash
   # Voir les logs
   ./check_status.sh
   cd backend && docker-compose logs -f
   ```

### Commandes de Diagnostic

```bash
# Statut complet des services
./check_status.sh

# Statut rapide
./check_status.sh quick

# Logs des conteneurs
cd backend && docker-compose logs -f

# Processus en cours
ps aux | grep -E "(vite|uvicorn)"
```

## 🔧 Développement

### Structure du Projet

- **Backend** : FastAPI + PostgreSQL + Docker
- **Frontend** : React + TypeScript + Vite + TailwindCSS
- **Base de données** : PostgreSQL avec migrations Alembic
- **Documentation** : Auto-générée avec FastAPI

### Workflow de Développement

1. Démarrer les services : `./start_services.sh`
2. Développer et tester
3. Vérifier le statut : `./check_status.sh`
4. Arrêter : `./stop_services.sh`

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🆘 Support

Pour obtenir de l'aide :

1. Consultez la documentation dans `docs/`
2. Vérifiez les [issues existantes](../../issues)
3. Créez une nouvelle issue si nécessaire

---

*Développé avec ❤️ pour la gestion moderne de bibliothèques*