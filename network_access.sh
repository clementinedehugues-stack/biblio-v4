#!/bin/bash

# Script d'information sur l'accès réseau - Biblio V4
# Usage: ./network_access.sh

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Fonction pour obtenir l'adresse IP locale
get_local_ip() {
    local ip=$(ifconfig en0 | grep "inet " | awk '{print $2}' 2>/dev/null)
    if [ -z "$ip" ]; then
        ip=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
    fi
    echo "$ip"
}

# Fonction pour vérifier si les services sont actifs
check_services() {
    local backend_ok=false
    local frontend_ok=false
    
    if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
        backend_ok=true
    fi
    
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        frontend_ok=true
    fi
    
    echo "$backend_ok $frontend_ok"
}

# Fonction pour générer un QR code (si qrencode est installé)
generate_qr() {
    local url=$1
    if command -v qrencode &> /dev/null; then
        echo ""
        echo -e "${CYAN}📱 QR Code pour accès mobile:${NC}"
        qrencode -t ANSI "$url"
        echo ""
    fi
}

# Fonction principale
main() {
    local local_ip=$(get_local_ip)
    local services_status=($(check_services))
    local backend_ok=${services_status[0]}
    local frontend_ok=${services_status[1]}
    
    echo ""
    echo -e "${MAGENTA}🌐 BIBLIO V4 - ACCÈS RÉSEAU LOCAL${NC}"
    echo "=========================================="
    echo ""
    
    if [ -z "$local_ip" ]; then
        echo -e "${RED}❌ Impossible de détecter l'adresse IP locale${NC}"
        echo ""
        echo "Solutions possibles:"
        echo "• Vérifiez votre connexion réseau"
        echo "• Connectez-vous au WiFi"
        echo "• Essayez: ifconfig | grep 'inet '"
        echo ""
        exit 1
    fi
    
    echo -e "${GREEN}🔍 Adresse IP détectée: ${CYAN}$local_ip${NC}"
    echo ""
    
    # Statut des services
    echo -e "${BLUE}📊 STATUT DES SERVICES:${NC}"
    echo ""
    
    if [ "$backend_ok" = "true" ]; then
        echo -e "✅ ${GREEN}Backend API: ACTIF${NC}"
    else
        echo -e "❌ ${RED}Backend API: INACTIF${NC}"
    fi
    
    if [ "$frontend_ok" = "true" ]; then
        echo -e "✅ ${GREEN}Frontend: ACTIF${NC}"
    else
        echo -e "❌ ${RED}Frontend: INACTIF${NC}"
    fi
    
    echo ""
    
    if [ "$backend_ok" = "false" ] || [ "$frontend_ok" = "false" ]; then
        echo -e "${YELLOW}⚠️  Certains services ne sont pas actifs${NC}"
        echo "   Démarrez-les avec: ./start_services.sh"
        echo ""
    fi
    
    # URLs d'accès
    echo "=========================================="
    echo -e "${CYAN}📱 URLS D'ACCÈS RÉSEAU LOCAL:${NC}"
    echo ""
    
    if [ "$frontend_ok" = "true" ]; then
        echo -e "🌐 ${GREEN}Frontend (Application principale):${NC}"
        echo -e "   ${CYAN}http://$local_ip:5173${NC}"
        echo ""
    fi
    
    if [ "$backend_ok" = "true" ]; then
        echo -e "🔧 ${GREEN}Backend API:${NC}"
        echo -e "   ${CYAN}http://$local_ip:8000${NC}"
        echo ""
        echo -e "📚 ${GREEN}Documentation API:${NC}"
        echo -e "   ${CYAN}http://$local_ip:8000/docs${NC}"
        echo ""
    fi
    
    # Instructions d'accès
    echo "=========================================="
    echo -e "${BLUE}📱 INSTRUCTIONS D'ACCÈS:${NC}"
    echo ""
    echo "1. Assurez-vous que l'appareil cible est sur le même réseau WiFi"
    echo "2. Ouvrez un navigateur web sur l'appareil"
    echo "3. Tapez l'URL dans la barre d'adresse:"
    echo -e "   ${CYAN}http://$local_ip:5173${NC}"
    echo ""
    echo -e "${YELLOW}💡 Appareils compatibles:${NC}"
    echo "   • Smartphones (iPhone, Android)"
    echo "   • Tablettes (iPad, Android)"
    echo "   • Autres ordinateurs (Windows, Mac, Linux)"
    echo "   • Smart TV avec navigateur"
    echo ""
    
    # QR Code si disponible
    if [ "$frontend_ok" = "true" ]; then
        generate_qr "http://$local_ip:5173"
    fi
    
    # Informations réseau
    echo "=========================================="
    echo -e "${BLUE}🔧 INFORMATIONS RÉSEAU:${NC}"
    echo ""
    echo -e "Interface réseau: ${CYAN}$(route get default | grep interface | awk '{print $2}' 2>/dev/null || echo "en0")${NC}"
    echo -e "Adresse IP locale: ${CYAN}$local_ip${NC}"
    echo -e "Ports utilisés: ${CYAN}5173 (Frontend), 8000 (Backend)${NC}"
    echo ""
    
    # Dépannage
    echo "=========================================="
    echo -e "${YELLOW}🔧 DÉPANNAGE:${NC}"
    echo ""
    echo "Si l'accès ne fonctionne pas:"
    echo ""
    echo "• Vérifiez que le pare-feu autorise les connexions sur les ports 5173 et 8000"
    echo "• Assurez-vous que les appareils sont sur le même réseau WiFi"
    echo "• Redémarrez les services: ./restart_services.sh"
    echo "• Vérifiez l'état avec: ./check_status.sh"
    echo ""
    echo -e "${CYAN}🆘 Commandes utiles:${NC}"
    echo "   make network-urls    # Réafficher les URLs"
    echo "   ./check_status.sh    # Vérifier l'état des services"
    echo "   ./restart_services.sh # Redémarrer si nécessaire"
    echo ""
    echo "=========================================="
}

# Vérifier les arguments
case "${1:-}" in
    "help"|"-h"|"--help")
        echo "Usage: ./network_access.sh"
        echo ""
        echo "Affiche les informations d'accès réseau pour Biblio V4"
        echo "Montre les URLs à utiliser depuis d'autres appareils"
        echo "sur le même réseau WiFi."
        echo ""
        echo "Options:"
        echo "  help, -h, --help     Afficher cette aide"
        echo ""
        exit 0
        ;;
    "")
        main
        ;;
    *)
        echo "Option inconnue: $1"
        echo "Utilisez './network_access.sh help' pour voir l'aide"
        exit 1
        ;;
esac