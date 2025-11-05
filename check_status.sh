#!/bin/bash

# Script de vérification du statut des services Biblio V4
# Usage: ./check_status.sh

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
    echo -e "${GREEN}[✅]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠️ ]${NC} $1"
}

log_error() {
    echo -e "${RED}[❌]${NC} $1"
}

# Fonction pour vérifier un service HTTP
check_http_service() {
    local url=$1
    local name=$2
    
    if curl -s "$url" > /dev/null 2>&1; then
        log_success "$name est accessible sur $url"
        return 0
    else
        log_error "$name n'est pas accessible sur $url"
        return 1
    fi
}

# Fonction pour vérifier les conteneurs Docker
check_docker_containers() {
    log_info "Vérification des conteneurs Docker..."
    
    if command -v docker &> /dev/null; then
        if docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -q "biblio_"; then
            echo ""
            echo "📦 Conteneurs Docker actifs :"
            docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep "biblio_"
            echo ""
            log_success "Conteneurs backend trouvés"
        else
            log_warning "Aucun conteneur backend en cours d'exécution"
        fi
    else
        log_error "Docker n'est pas installé ou accessible"
    fi
}

# Fonction pour vérifier les processus frontend
check_frontend_processes() {
    log_info "Vérification du processus frontend..."
    
    if pgrep -f "vite" > /dev/null; then
        local pids=$(pgrep -f "vite")
        log_success "Processus frontend trouvés (PID: $pids)"
    else
        log_warning "Aucun processus frontend en cours d'exécution"
    fi
}

# Fonction pour obtenir l'adresse IP locale
get_local_ip() {
    local ip=$(ifconfig en0 | grep "inet " | awk '{print $2}' 2>/dev/null)
    if [ -z "$ip" ]; then
        ip=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
    fi
    echo "$ip"
}

# Fonction pour afficher le statut complet
show_full_status() {
    local local_ip=$(get_local_ip)
    
    echo ""
    echo "===========================================" 
    echo "📊 BIBLIO V4 - STATUT DES SERVICES"
    echo "==========================================="
    echo ""
    
    # Vérification des services HTTP
    log_info "Vérification de l'accessibilité des services..."
    echo ""
    
    backend_ok=false
    frontend_ok=false
    
    if check_http_service "http://localhost:8000/docs" "API Backend"; then
        backend_ok=true
    fi
    
    if check_http_service "http://localhost:5173" "Frontend"; then
        frontend_ok=true
    fi
    
    echo ""
    
    # Vérification des processus et conteneurs
    check_docker_containers
    check_frontend_processes
    
    echo ""
    echo "==========================================="
    echo "📋 RÉSUMÉ :"
    
    if [ "$backend_ok" = true ]; then
        echo "✅ Backend : FONCTIONNEL"
        echo "   🔗 API (local): http://localhost:8000"
        if [ ! -z "$local_ip" ]; then
            echo "   🌐 API (réseau): http://$local_ip:8000"
        fi
        echo "   📚 Docs (local): http://localhost:8000/docs"
        if [ ! -z "$local_ip" ]; then
            echo "   📚 Docs (réseau): http://$local_ip:8000/docs"
        fi
    else
        echo "❌ Backend : NON ACCESSIBLE"
    fi
    
    if [ "$frontend_ok" = true ]; then
        echo "✅ Frontend : FONCTIONNEL"
        echo "   🌐 App (local): http://localhost:5173"
        if [ ! -z "$local_ip" ]; then
            echo "   📱 App (réseau): http://$local_ip:5173"
        fi
    else
        echo "❌ Frontend : NON ACCESSIBLE"
    fi
    
    echo ""
    
    if [ "$backend_ok" = true ] && [ "$frontend_ok" = true ]; then
        echo "🎉 Tous les services sont opérationnels !"
        if [ ! -z "$local_ip" ]; then
            echo ""
            echo "📱 ACCÈS RÉSEAU LOCAL:"
            echo "   Partagez cette URL: http://$local_ip:5173"
            echo "   Accessible depuis tout appareil sur le même réseau WiFi"
        fi
    else
        echo "⚠️  Certains services ne sont pas accessibles."
        echo "   Utilisez ./start_services.sh pour les démarrer."
    fi
    
    echo "==========================================="
    echo ""
}

# Fonction pour vérifier uniquement l'état (sans messages détaillés)
quick_check() {
    local backend_up=false
    local frontend_up=false
    
    if curl -s "http://localhost:8000/docs" > /dev/null 2>&1; then
        backend_up=true
    fi
    
    if curl -s "http://localhost:5173" > /dev/null 2>&1; then
        frontend_up=true
    fi
    
    if [ "$backend_up" = true ] && [ "$frontend_up" = true ]; then
        echo "✅ Tous les services sont opérationnels"
        exit 0
    elif [ "$backend_up" = true ]; then
        echo "⚠️  Backend OK, Frontend KO"
        exit 1
    elif [ "$frontend_up" = true ]; then
        echo "⚠️  Frontend OK, Backend KO"
        exit 1
    else
        echo "❌ Aucun service n'est accessible"
        exit 2
    fi
}

# Script principal
main() {
    case "${1:-full}" in
        "quick"|"-q"|"--quick")
            quick_check
            ;;
        "full"|"-f"|"--full"|"")
            show_full_status
            ;;
        "help"|"-h"|"--help")
            echo "Usage: ./check_status.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  full, -f, --full     Affichage complet du statut (défaut)"
            echo "  quick, -q, --quick   Vérification rapide"
            echo "  help, -h, --help     Afficher cette aide"
            echo ""
            echo "Codes de sortie (mode quick):"
            echo "  0  Tous les services OK"
            echo "  1  Un service KO"
            echo "  2  Tous les services KO"
            ;;
        *)
            log_error "Option inconnue: $1"
            echo "Utilisez './check_status.sh help' pour voir l'aide"
            exit 1
            ;;
    esac
}

# Exécution du script principal
main "$@"