#!/bin/bash

# Script de test réseau - Biblio V4
# Usage: ./test_network.sh

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✅]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[⚠️ ]${NC} $1"; }
log_error() { echo -e "${RED}[❌]${NC} $1"; }

# Fonction pour obtenir l'IP locale
get_local_ip() {
    local ip=$(ifconfig en0 | grep "inet " | awk '{print $2}' 2>/dev/null)
    if [ -z "$ip" ]; then
        ip=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
    fi
    echo "$ip"
}

# Test de connectivité réseau
test_network_connectivity() {
    local local_ip=$(get_local_ip)
    
    echo "🌐 TEST DE CONNECTIVITÉ RÉSEAU"
    echo "==============================="
    echo ""
    
    if [ -z "$local_ip" ]; then
        log_error "Impossible de détecter l'adresse IP locale"
        return 1
    fi
    
    log_success "IP locale détectée: $local_ip"
    
    # Test ping vers la passerelle
    local gateway=$(route get default | grep gateway | awk '{print $2}' 2>/dev/null)
    if [ ! -z "$gateway" ]; then
        log_info "Test de connectivité vers la passerelle ($gateway)..."
        if ping -c 1 -W 3000 "$gateway" > /dev/null 2>&1; then
            log_success "Passerelle accessible"
        else
            log_warning "Passerelle non accessible"
        fi
    fi
    
    return 0
}

# Test des ports
test_ports() {
    echo ""
    echo "🔍 TEST DES PORTS"
    echo "=================="
    echo ""
    
    local ports=("5173" "8000" "5432")
    local local_ip=$(get_local_ip)
    
    for port in "${ports[@]}"; do
        log_info "Test du port $port..."
        
        # Test local
        if nc -z localhost "$port" 2>/dev/null; then
            log_success "Port $port accessible en local"
            
            # Test réseau si IP disponible
            if [ ! -z "$local_ip" ]; then
                if nc -z "$local_ip" "$port" 2>/dev/null; then
                    log_success "Port $port accessible depuis le réseau ($local_ip)"
                else
                    log_warning "Port $port non accessible depuis le réseau"
                fi
            fi
        else
            log_error "Port $port non accessible en local"
        fi
    done
}

# Test des services HTTP
test_http_services() {
    echo ""
    echo "🌐 TEST DES SERVICES HTTP"
    echo "========================="
    echo ""
    
    local local_ip=$(get_local_ip)
    local urls=(
        "http://localhost:5173|Frontend Local"
        "http://localhost:8000|Backend Local"
        "http://localhost:8000/docs|API Docs Local"
    )
    
    if [ ! -z "$local_ip" ]; then
        urls+=(
            "http://$local_ip:5173|Frontend Réseau"
            "http://$local_ip:8000|Backend Réseau"
            "http://$local_ip:8000/docs|API Docs Réseau"
        )
    fi
    
    for url_info in "${urls[@]}"; do
        local url=$(echo "$url_info" | cut -d'|' -f1)
        local name=$(echo "$url_info" | cut -d'|' -f2)
        
        log_info "Test de $name..."
        
        if curl -s --max-time 5 "$url" > /dev/null 2>&1; then
            log_success "$name accessible: $url"
        else
            log_error "$name non accessible: $url"
        fi
    done
}

# Test du pare-feu (macOS)
test_firewall() {
    echo ""
    echo "🛡️  TEST DU PARE-FEU"
    echo "==================="
    echo ""
    
    if command -v pfctl &> /dev/null; then
        local firewall_status=$(sudo pfctl -s info 2>/dev/null | grep "Status" | awk '{print $2}' || echo "unknown")
        
        if [ "$firewall_status" = "Enabled" ]; then
            log_warning "Pare-feu système activé"
            echo "   Vérifiez que les ports 5173 et 8000 sont autorisés"
        else
            log_success "Pare-feu système désactivé"
        fi
    fi
    
    # Vérifier les paramètres du pare-feu macOS
    if [ -f "/usr/libexec/ApplicationFirewall/socketfilterfw" ]; then
        local app_firewall=$(/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null | grep "enabled" || echo "disabled")
        
        if [[ "$app_firewall" == *"enabled"* ]]; then
            log_warning "Pare-feu applicatif activé"
            echo "   Autorisez les connexions pour Node.js et Docker"
        else
            log_success "Pare-feu applicatif désactivé"
        fi
    fi
}

# Diagnostic complet
full_diagnostic() {
    echo ""
    echo "🔧 DIAGNOSTIC RÉSEAU COMPLET"
    echo "============================"
    echo ""
    
    # Informations système
    log_info "Système: $(uname -s) $(uname -r)"
    log_info "Interface principale: $(route get default | grep interface | awk '{print $2}' 2>/dev/null || echo "unknown")"
    
    local local_ip=$(get_local_ip)
    if [ ! -z "$local_ip" ]; then
        log_info "Adresse IP: $local_ip"
        log_info "Sous-réseau: $(echo "$local_ip" | cut -d'.' -f1-3).0/24"
    fi
    
    # Processus en écoute
    echo ""
    log_info "Processus en écoute sur les ports Biblio V4:"
    
    local listening_processes=$(lsof -i :5173,8000,5432 2>/dev/null || echo "Aucun")
    if [ "$listening_processes" != "Aucun" ]; then
        echo "$listening_processes"
    else
        log_warning "Aucun processus en écoute détecté"
    fi
}

# Suggestions d'amélioration
show_suggestions() {
    echo ""
    echo "💡 SUGGESTIONS D'AMÉLIORATION"
    echo "============================="
    echo ""
    
    # Vérifier nc (netcat)
    if ! command -v nc &> /dev/null; then
        log_warning "netcat (nc) non installé - install avec: brew install netcat"
    fi
    
    # Vérifier qrencode
    if ! command -v qrencode &> /dev/null; then
        log_info "Pour les QR codes: brew install qrencode"
    fi
    
    # Vérifier nmap
    if ! command -v nmap &> /dev/null; then
        log_info "Pour les tests réseau avancés: brew install nmap"
    fi
    
    echo ""
    echo "🔧 Commandes utiles:"
    echo "   ./network_access.sh     # Afficher les URLs réseau"
    echo "   make network-urls       # URLs via Make"
    echo "   ./check_status.sh       # Statut des services"
    echo "   lsof -i :5173,8000      # Processus sur les ports"
    echo ""
}

# Script principal
main() {
    echo "🧪 BIBLIO V4 - TEST RÉSEAU"
    echo "=========================="
    
    case "${1:-all}" in
        "connectivity"|"conn")
            test_network_connectivity
            ;;
        "ports")
            test_ports
            ;;
        "http")
            test_http_services
            ;;
        "firewall"|"fw")
            test_firewall
            ;;
        "diagnostic"|"diag")
            full_diagnostic
            ;;
        "all"|"")
            test_network_connectivity
            test_ports
            test_http_services
            test_firewall
            full_diagnostic
            show_suggestions
            ;;
        "help"|"-h"|"--help")
            echo "Usage: ./test_network.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  all          Test complet (défaut)"
            echo "  connectivity Test de connectivité réseau"
            echo "  ports        Test des ports"
            echo "  http         Test des services HTTP"
            echo "  firewall     Test du pare-feu"
            echo "  diagnostic   Diagnostic système"
            echo "  help         Afficher cette aide"
            echo ""
            exit 0
            ;;
        *)
            log_error "Option inconnue: $1"
            echo "Utilisez './test_network.sh help' pour voir l'aide"
            exit 1
            ;;
    esac
    
    echo ""
    echo "✅ Test terminé !"
}

# Exécution
main "$@"