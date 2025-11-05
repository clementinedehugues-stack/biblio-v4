#!/bin/bash

# Script de test de connexion réseau - Biblio V4
# Usage: ./test_login.sh [IP_ADDRESS]

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

# Test de connexion avec des identifiants
test_login() {
    local base_url=$1
    local username=$2
    local password=$3
    local user_type=$4
    
    log_info "Test de connexion $user_type: $username"
    
    # Préparer les données de connexion
    local login_data=$(cat <<EOF
{
    "username": "$username",
    "password": "$password"
}
EOF
)
    
    # Tentative de connexion
    local response=$(curl -s -w "\n%{http_code}" -X POST \
        "$base_url/auth/login" \
        -H "Content-Type: application/json" \
        -d "$login_data" 2>/dev/null)
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ]; then
        # Extraire le token
        local token=$(echo "$body" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
        
        if [ ! -z "$token" ]; then
            log_success "Connexion réussie pour $username ($user_type)"
            echo "   Token reçu: ${token:0:20}..."
            
            # Test d'accès à un endpoint protégé
            test_protected_endpoint "$base_url" "$token" "$username"
            return 0
        else
            log_error "Token non trouvé dans la réponse"
            return 1
        fi
    else
        log_error "Échec de connexion pour $username ($user_type)"
        echo "   Code HTTP: $http_code"
        echo "   Réponse: $body"
        return 1
    fi
}

# Test d'accès à un endpoint protégé
test_protected_endpoint() {
    local base_url=$1
    local token=$2
    local username=$3
    
    log_info "Test d'accès aux données utilisateur pour $username..."
    
    local response=$(curl -s -w "\n%{http_code}" \
        "$base_url/user-self/profile" \
        -H "Authorization: Bearer $token" 2>/dev/null)
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ]; then
        log_success "Accès aux données autorisé"
        
        # Extraire le nom d'utilisateur de la réponse
        local returned_username=$(echo "$body" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
        if [ "$returned_username" = "$username" ]; then
            log_success "Données utilisateur correctes"
        else
            log_warning "Nom d'utilisateur retourné différent: $returned_username"
        fi
    else
        log_error "Accès aux données refusé"
        echo "   Code HTTP: $http_code"
        echo "   Réponse: $body"
    fi
}

# Test de l'accessibilité du frontend
test_frontend_access() {
    local frontend_url=$1
    
    log_info "Test d'accès au frontend..."
    
    local response=$(curl -s -w "\n%{http_code}" "$frontend_url" 2>/dev/null)
    local http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        log_success "Frontend accessible"
        
        # Vérifier si c'est bien une application React
        local body=$(echo "$response" | head -n -1)
        if echo "$body" | grep -q "root\|React\|div id"; then
            log_success "Application React détectée"
        else
            log_warning "Contenu inattendu du frontend"
        fi
    else
        log_error "Frontend non accessible"
        echo "   Code HTTP: $http_code"
    fi
}

# Test complet de l'application
test_complete_application() {
    local ip_address=${1:-$(get_local_ip)}
    
    if [ -z "$ip_address" ]; then
        log_error "Impossible de déterminer l'adresse IP"
        return 1
    fi
    
    local backend_url="http://$ip_address:8000"
    local frontend_url="http://$ip_address:5173"
    
    echo ""
    echo -e "${CYAN}🧪 TEST COMPLET DE CONNEXION RÉSEAU${NC}"
    echo "======================================="
    echo ""
    echo -e "${BLUE}🌐 Adresse IP testée: ${CYAN}$ip_address${NC}"
    echo -e "${BLUE}🔧 Backend URL: ${CYAN}$backend_url${NC}"
    echo -e "${BLUE}🌐 Frontend URL: ${CYAN}$frontend_url${NC}"
    echo ""
    
    # Vérifier que l'API est accessible
    log_info "Vérification de l'accessibilité de l'API..."
    if ! curl -s "$backend_url/docs" > /dev/null 2>&1; then
        log_error "API backend non accessible sur $backend_url"
        return 1
    fi
    log_success "API backend accessible"
    
    echo ""
    
    # Test du frontend
    test_frontend_access "$frontend_url"
    
    echo ""
    
    # Tests de connexion avec différents utilisateurs
    echo -e "${BLUE}🔐 TESTS DE CONNEXION${NC}"
    echo "====================="
    echo ""
    
    # Utilisateurs de test connus
    local test_users=(
        "superadmin:AdminPass123:Admin"
        "moderator1:ModeratorPass123:Moderator"
        "viewer1:ViewerPass123:User"
    )
    
    local success_count=0
    local total_count=${#test_users[@]}
    
    for user_info in "${test_users[@]}"; do
        local username=$(echo "$user_info" | cut -d':' -f1)
        local password=$(echo "$user_info" | cut -d':' -f2)
        local user_type=$(echo "$user_info" | cut -d':' -f3)
        
        if test_login "$backend_url" "$username" "$password" "$user_type"; then
            ((success_count++))
        fi
        echo ""
    done
    
    # Résumé
    echo "======================================="
    echo -e "${BLUE}📊 RÉSUMÉ DU TEST${NC}"
    echo ""
    
    if [ $success_count -eq $total_count ]; then
        log_success "Tous les tests de connexion réussis ($success_count/$total_count)"
        echo ""
        echo -e "${GREEN}🎉 L'application est entièrement fonctionnelle en réseau !${NC}"
        echo ""
        echo -e "${CYAN}📱 Instructions pour les utilisateurs réseau:${NC}"
        echo "1. Connectez-vous au même réseau WiFi"
        echo "2. Ouvrez un navigateur web"
        echo "3. Allez sur: $frontend_url"
        echo "4. Connectez-vous avec un des comptes:"
        echo "   • Admin: superadmin / AdminPass123"
        echo "   • Moderator: moderator1 / ModeratorPass123"  
        echo "   • User: viewer1 / ViewerPass123"
    else
        log_warning "Certains tests ont échoué ($success_count/$total_count réussis)"
        echo ""
        echo "Vérifiez:"
        echo "• Que les utilisateurs de test existent"
        echo "• Que la base de données est accessible"
        echo "• Que les services backend fonctionnent"
    fi
    
    echo ""
    echo "======================================="
}

# Script principal
main() {
    case "${1:-}" in
        "help"|"-h"|"--help")
            echo "Usage: ./test_login.sh [IP_ADDRESS]"
            echo ""
            echo "Teste la connexion utilisateur depuis le réseau local"
            echo ""
            echo "Arguments:"
            echo "  IP_ADDRESS    Adresse IP à tester (détection automatique par défaut)"
            echo ""
            echo "Options:"
            echo "  help, -h, --help    Afficher cette aide"
            echo ""
            echo "Exemples:"
            echo "  ./test_login.sh                    # Test avec IP auto-détectée"
            echo "  ./test_login.sh 192.168.1.70       # Test avec IP spécifique"
            echo ""
            exit 0
            ;;
        "")
            test_complete_application
            ;;
        *)
            if [[ "$1" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
                test_complete_application "$1"
            else
                log_error "Adresse IP invalide: $1"
                echo "Format attendu: xxx.xxx.xxx.xxx"
                exit 1
            fi
            ;;
    esac
}

# Exécution
main "$@"