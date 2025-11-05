#!/bin/bash

# Script de redémarrage des services Biblio V4
# Usage: ./restart_services.sh

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

# Script principal
main() {
    echo "🔄 REDÉMARRAGE DES SERVICES BIBLIO V4"
    echo "====================================="
    echo ""
    
    log_info "Phase 1: Arrêt des services en cours..."
    ./stop_services.sh
    
    echo ""
    log_info "Phase 2: Attente de 3 secondes..."
    sleep 3
    
    echo ""
    log_info "Phase 3: Démarrage des services..."
    
    # Démarrer les services en arrière-plan
    ./start_services.sh &
    START_PID=$!
    
    # Attendre un peu pour que les services se lancent
    sleep 10
    
    # Vérifier le statut
    echo ""
    log_info "Phase 4: Vérification du statut..."
    
    if ./check_status.sh quick > /dev/null 2>&1; then
        log_success "Redémarrage réussi ! Tous les services sont opérationnels."
        echo ""
        echo "🎉 Services disponibles :"
        echo "   🌐 Frontend: http://localhost:5173"
        echo "   🔧 Backend: http://localhost:8000"
        echo "   📚 Documentation: http://localhost:8000/docs"
    else
        log_warning "Les services redémarrent... Vérifiez le statut dans quelques secondes avec:"
        echo "   ./check_status.sh"
    fi
    
    echo ""
    log_info "Processus de démarrage en cours (PID: $START_PID)"
    log_info "Utilisez 'kill $START_PID' pour arrêter si nécessaire"
    echo ""
}

# Exécution du script principal
main "$@"