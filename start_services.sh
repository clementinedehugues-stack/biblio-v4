#!/bin/bash

# Script de démarrage des services Biblio V4
# Usage: ./start_services.sh

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

# Fonction pour vérifier si Docker est installé et en cours d'exécution
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker n'est pas installé. Veuillez installer Docker pour continuer."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker n'est pas en cours d'exécution. Veuillez démarrer Docker."
        exit 1
    fi
    
    log_success "Docker est disponible"
}

# Fonction pour vérifier si Node.js est installé
check_node() {
    if ! command -v npm &> /dev/null; then
        log_error "Node.js/npm n'est pas installé. Veuillez installer Node.js pour continuer."
        exit 1
    fi
    
    log_success "Node.js est disponible"
}

# Fonction pour démarrer les services backend
start_backend() {
    log_info "Démarrage des services backend..."
    
    cd backend
    
    # Vérifier si les conteneurs existent déjà
    if docker-compose ps | grep -q "biblio_"; then
        log_info "Services backend déjà en cours d'exécution. Redémarrage..."
        docker-compose down
    fi
    
    # Démarrer les services
    docker-compose up -d
    
    # Attendre que les services soient prêts
    log_info "Attente que les services backend soient prêts..."
    sleep 5
    
    # Vérifier que l'API est accessible
    for i in {1..30}; do
        if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
            log_success "API backend accessible sur http://localhost:8000"
            break
        fi
        
        if [ $i -eq 30 ]; then
            log_error "Timeout: L'API backend n'est pas accessible après 30 secondes"
            exit 1
        fi
        
        sleep 1
    done
    
    cd ..
}

# Fonction pour démarrer le frontend
start_frontend() {
    log_info "Démarrage du frontend..."
    
    cd frontend
    
    # Vérifier si node_modules existe
    if [ ! -d "node_modules" ]; then
        log_info "Installation des dépendances frontend..."
        npm install
    fi
    
    # Démarrer le serveur de développement en arrière-plan
    log_info "Lancement du serveur de développement frontend..."
    npm run dev &
    FRONTEND_PID=$!
    
    # Attendre que le frontend soit prêt
    log_info "Attente que le frontend soit prêt..."
    sleep 3
    
    # Vérifier que le frontend est accessible
    for i in {1..20}; do
        if curl -s http://localhost:5173 > /dev/null 2>&1; then
            log_success "Frontend accessible sur http://localhost:5173"
            break
        fi
        
        if [ $i -eq 20 ]; then
            log_warning "Le frontend peut ne pas être complètement prêt, mais le processus est lancé"
            break
        fi
        
        sleep 1
    done
    
    cd ..
}

# Fonction pour obtenir l'adresse IP locale
get_local_ip() {
    local ip=$(ifconfig en0 | grep "inet " | awk '{print $2}' 2>/dev/null)
    if [ -z "$ip" ]; then
        ip=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
    fi
    echo "$ip"
}

# Fonction pour afficher le statut des services
show_status() {
    local local_ip=$(get_local_ip)
    
    echo ""
    echo "===========================================" 
    echo "🚀 BIBLIO V4 - SERVICES DÉMARRÉS"
    echo "==========================================="
    echo ""
    echo "📊 STATUT DES SERVICES:"
    echo ""
    
    # Statut backend
    if docker-compose -f backend/docker-compose.yml ps | grep -q "Up"; then
        echo "✅ Backend (API + Database): ACTIF"
        echo "   🔗 API (local): http://localhost:8000"
        if [ ! -z "$local_ip" ]; then
            echo "   🌐 API (réseau): http://$local_ip:8000"
        fi
        echo "   📚 Documentation (local): http://localhost:8000/docs"
        if [ ! -z "$local_ip" ]; then
            echo "   📚 Documentation (réseau): http://$local_ip:8000/docs"
        fi
        echo "   🗃️  Base de données: localhost:5432"
    else
        echo "❌ Backend: INACTIF"
    fi
    
    echo ""
    
    # Statut frontend
    if pgrep -f "vite" > /dev/null; then
        echo "✅ Frontend: ACTIF"
        echo "   🌐 Application (local): http://localhost:5173"
        if [ ! -z "$local_ip" ]; then
            echo "   🌐 Application (réseau): http://$local_ip:5173"
        fi
    else
        echo "❌ Frontend: INACTIF"
    fi
    
    echo ""
    echo "==========================================="
    echo "📱 ACCÈS RÉSEAU LOCAL:"
    if [ ! -z "$local_ip" ]; then
        echo "   Partagez ces URLs pour l'accès réseau:"
        echo "   📱 Frontend: http://$local_ip:5173"
        echo "   🔧 Backend: http://$local_ip:8000"
        echo ""
        echo "   Sur d'autres appareils (même réseau WiFi):"
        echo "   • Ouvrez un navigateur"
        echo "   • Allez sur http://$local_ip:5173"
    else
        echo "   ⚠️  Impossible de détecter l'IP locale"
    fi
    echo "==========================================="
    echo "📝 COMMANDES UTILES:"
    echo "   Arrêter backend: cd backend && docker-compose down"
    echo "   Voir logs backend: cd backend && docker-compose logs -f"
    echo "   Arrêter frontend: pkill -f vite"
    echo "==========================================="
    echo ""
}

# Fonction pour nettoyer en cas d'interruption
cleanup() {
    log_info "Nettoyage en cours..."
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    exit 0
}

# Capturer Ctrl+C pour nettoyer proprement
trap cleanup INT

# Script principal
main() {
    echo "🚀 DÉMARRAGE DES SERVICES BIBLIO V4"
    echo "===================================="
    echo ""
    
    # Vérifications préliminaires
    log_info "Vérification des prérequis..."
    check_docker
    check_node
    
    echo ""
    
    # Démarrage des services
    start_backend
    echo ""
    start_frontend
    
    # Affichage du statut
    show_status
    
    # Garder le script en vie
    log_info "Services démarrés! Appuyez sur Ctrl+C pour arrêter."
    wait
}

# Exécution du script principal
main "$@"