#!/bin/bash

# Script d'arrêt des services Biblio V4
# Usage: ./stop_services.sh

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages avec couleur
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Fonction pour arrêter le backend
stop_backend() {
    log_info "Arrêt des services backend..."
    
    cd backend
    
    if docker-compose ps | grep -q "biblio_"; then
        docker-compose down
        log_success "Services backend arrêtés"
    else
        log_warning "Aucun service backend en cours d'exécution"
    fi
    
    cd ..
}

# Fonction pour arrêter le frontend
stop_frontend() {
    log_info "Arrêt du frontend..."
    
    # Tuer tous les processus vite/frontend
    if pgrep -f "vite" > /dev/null; then
        pkill -f "vite" || true
        log_success "Frontend arrêté"
    else
        log_warning "Aucun processus frontend en cours d'exécution"
    fi
}

# Fonction pour afficher le statut final
show_final_status() {
    echo ""
    echo "==========================================="
    echo "🛑 BIBLIO V4 - SERVICES ARRÊTÉS"
    echo "==========================================="
    echo ""
    
    # Vérifier que tout est bien arrêté
    backend_running=false
    frontend_running=false
    
    if docker-compose -f backend/docker-compose.yml ps | grep -q "Up"; then
        backend_running=true
        echo "⚠️  Backend: ENCORE ACTIF"
    else
        echo "✅ Backend: ARRÊTÉ"
    fi
    
    if pgrep -f "vite" > /dev/null; then
        frontend_running=true
        echo "⚠️  Frontend: ENCORE ACTIF"
    else
        echo "✅ Frontend: ARRÊTÉ"
    fi
    
    echo ""
    
    if [ "$backend_running" = false ] && [ "$frontend_running" = false ]; then
        echo "🎉 Tous les services ont été arrêtés avec succès!"
    else
        echo "⚠️  Certains services sont encore en cours d'exécution."
        echo "   Vous pouvez les arrêter manuellement si nécessaire."
    fi
    
    echo "==========================================="
    echo ""
}

# Script principal
main() {
    echo "🛑 ARRÊT DES SERVICES BIBLIO V4"
    echo "==============================="
    echo ""
    
    stop_frontend
    echo ""
    stop_backend
    
    # Attendre un peu pour que tout s'arrête proprement
    sleep 2
    
    show_final_status
}

# Exécution du script principal
main "$@"