# Makefile pour Biblio V4
# Usage: make [target]

.PHONY: help start stop restart status clean logs

# Cible par défaut
help: ## Afficher cette aide
	@echo "📚 Biblio V4 - Commandes Make disponibles:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "🔗 URLs d'accès LOCAL:"
	@echo "  Frontend:      http://localhost:5173"
	@echo "  Backend:       http://localhost:8000"
	@echo "  Documentation: http://localhost:8000/docs"
	@echo ""
	@echo "🌐 URLs d'accès RÉSEAU:"
	@LOCAL_IP=$$(ifconfig en0 | grep "inet " | awk '{print $$2}' 2>/dev/null || echo "IP_NOT_FOUND"); \
	if [ "$$LOCAL_IP" != "IP_NOT_FOUND" ] && [ -n "$$LOCAL_IP" ]; then \
		echo "  Frontend:      http://$$LOCAL_IP:5173"; \
		echo "  Backend:       http://$$LOCAL_IP:8000"; \
		echo "  Documentation: http://$$LOCAL_IP:8000/docs"; \
		echo "  📱 Partageable sur le réseau WiFi local"; \
	else \
		echo "  ⚠️  IP locale non détectée"; \
	fi

start: ## Démarrer tous les services
	@./start_services.sh

stop: ## Arrêter tous les services
	@./stop_services.sh

restart: ## Redémarrer tous les services
	@./restart_services.sh

status: ## Vérifier le statut des services
	@./check_status.sh

quick-status: ## Vérification rapide du statut
	@./check_status.sh quick

logs: ## Afficher les logs des services backend
	@cd backend && docker-compose logs -f

clean: ## Nettoyer les conteneurs et volumes
	@echo "🧹 Nettoyage des conteneurs et volumes..."
	@cd backend && docker-compose down -v
	@docker system prune -f
	@echo "✅ Nettoyage terminé"

dev-backend: ## Démarrer uniquement le backend
	@echo "🚀 Démarrage du backend uniquement..."
	@cd backend && docker-compose up -d

dev-frontend: ## Démarrer uniquement le frontend
	@echo "🚀 Démarrage du frontend uniquement..."
	@cd frontend && npm run dev

install-frontend: ## Installer les dépendances frontend
	@echo "📦 Installation des dépendances frontend..."
	@cd frontend && npm install

build-frontend: ## Builder le frontend pour la production
	@echo "🏗️  Build du frontend..."
	@cd frontend && npm run build

lint-frontend: ## Linter le code frontend
	@echo "🔍 Lint du frontend..."
	@cd frontend && npm run lint

# Commandes de développement
docker-build: ## Rebuilder les images Docker
	@echo "🐳 Rebuild des images Docker..."
	@cd backend && docker-compose build --no-cache

docker-clean: ## Nettoyer complètement Docker
	@echo "🧹 Nettoyage complet Docker..."
	@cd backend && docker-compose down -v --rmi all
	@docker system prune -af --volumes

# Utilitaires
open-browser: ## Ouvrir les URLs dans le navigateur
	@echo "🌐 Ouverture des URLs..."
	@open http://localhost:5173 || echo "Frontend: http://localhost:5173"
	@open http://localhost:8000/docs || echo "API Docs: http://localhost:8000/docs"

network-urls: ## Afficher les URLs d'accès réseau
	@echo "🌐 URLs d'accès réseau local:"
	@LOCAL_IP=$$(ifconfig en0 | grep "inet " | awk '{print $$2}' 2>/dev/null); \
	if [ -n "$$LOCAL_IP" ]; then \
		echo "  📱 Frontend:      http://$$LOCAL_IP:5173"; \
		echo "  🔧 Backend:       http://$$LOCAL_IP:8000"; \
		echo "  📚 Documentation: http://$$LOCAL_IP:8000/docs"; \
		echo ""; \
		echo "💡 Partagez ces URLs avec d'autres appareils sur le même réseau WiFi"; \
		echo "   (smartphones, tablettes, autres ordinateurs)"; \
	else \
		echo "  ⚠️  Impossible de détecter l'adresse IP locale"; \
	fi

check-ports: ## Vérifier quels processus utilisent les ports
	@echo "🔍 Vérification des ports utilisés:"
	@echo "Port 5173 (Frontend):"
	@lsof -i :5173 || echo "  Port libre"
	@echo "Port 8000 (Backend):"
	@lsof -i :8000 || echo "  Port libre"
	@echo "Port 5432 (PostgreSQL):"
	@lsof -i :5432 || echo "  Port libre"