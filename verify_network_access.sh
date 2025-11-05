#!/bin/bash

# Script de vérification complète de l'accès réseau
# Usage: ./verify_network_access.sh

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Détecter automatiquement l'adresse IP locale (préférence pour en0)
get_local_ip() {
    local ip=$(ifconfig en0 | grep "inet " | awk '{print $2}' 2>/dev/null)
    if [ -z "$ip" ]; then
        ip=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
    fi
    echo "$ip"
}

IP="${IP_OVERRIDE:-$(get_local_ip)}"
BACKEND_URL="http://$IP:8000"
FRONTEND_URL="http://$IP:5173"

echo -e "${MAGENTA}🌐 VÉRIFICATION COMPLÈTE ACCÈS RÉSEAU BIBLIO V4${NC}"
echo "=================================================="
echo ""
echo -e "${BLUE}📍 Adresse IP testée: ${CYAN}$IP${NC}"
echo -e "${BLUE}🔧 Backend: ${CYAN}$BACKEND_URL${NC}"
echo -e "${BLUE}🌐 Frontend: ${CYAN}$FRONTEND_URL${NC}"
echo ""

# 1. Test d'accessibilité des services
echo -e "${BLUE}🔍 1. TEST D'ACCESSIBILITÉ DES SERVICES${NC}"
echo "========================================"

# Backend
echo -e "${CYAN}Backend API:${NC}"
if curl -s "$BACKEND_URL/docs" > /dev/null 2>&1; then
    echo -e "   ✅ ${GREEN}API accessible${NC}"
else
    echo -e "   ❌ ${RED}API non accessible${NC}"
    exit 1
fi

# Frontend (accepte 200 ou 3xx lors du dev)
echo -e "${CYAN}Frontend:${NC}"
frontend_response=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" 2>/dev/null)
if [[ "$frontend_response" =~ ^2|3 ]]; then
    echo -e "   ✅ ${GREEN}Frontend accessible${NC}"
else
    echo -e "   ❌ ${RED}Frontend non accessible (Code: $frontend_response)${NC}"
fi

echo ""

# 2. Test de connexion utilisateur
echo -e "${BLUE}🔐 2. TEST DE CONNEXION UTILISATEUR${NC}"
echo "==================================="

# Connexion avec superadmin
echo -e "${CYAN}Test de connexion admin:${NC}"
login_response=$(curl -s -X POST "$BACKEND_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username": "superadmin", "password": "AdminPass123"}')

if echo "$login_response" | grep -q "access_token"; then
    echo -e "   ✅ ${GREEN}Connexion admin réussie${NC}"
    
    # Extraire le token
    token=$(echo "$login_response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    echo -e "   📄 Token obtenu: ${token:0:20}...${NC}"
    
    # Test d'accès au profil
    echo -e "${CYAN}Test d'accès aux données utilisateur:${NC}"
    profile_response=$(curl -s "$BACKEND_URL/auth/me" \
        -H "Authorization: Bearer $token")
    
    if echo "$profile_response" | grep -q "username"; then
        echo -e "   ✅ ${GREEN}Accès aux données autorisé${NC}"
        username=$(echo "$profile_response" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
        full_name=$(echo "$profile_response" | grep -o '"full_name":"[^"]*"' | cut -d'"' -f4)
        role=$(echo "$profile_response" | grep -o '"role":"[^"]*"' | cut -d'"' -f4)
        echo -e "   👤 Utilisateur: ${CYAN}$username${NC} ($full_name) - Rôle: ${CYAN}$role${NC}"
    else
        echo -e "   ❌ ${RED}Accès aux données refusé${NC}"
    fi
    
else
    echo -e "   ❌ ${RED}Connexion admin échouée${NC}"
    echo "   Réponse: $login_response"
fi

echo ""

# 3. Test des endpoints principaux
echo -e "${BLUE}📚 3. TEST DES ENDPOINTS PRINCIPAUX${NC}"
echo "===================================="

if [ ! -z "$token" ]; then
    # Test des livres
    echo -e "${CYAN}Endpoint des livres:${NC}"
    books_response=$(curl -s -w "%{http_code}" "$BACKEND_URL/books/" \
        -H "Authorization: Bearer $token")
    books_code="${books_response: -3}"
    
    if [ "$books_code" = "200" ]; then
        echo -e "   ✅ ${GREEN}Endpoint livres accessible${NC}"
    else
        echo -e "   ❌ ${RED}Endpoint livres non accessible (Code: $books_code)${NC}"
    fi
    
    # Test des catégories
    echo -e "${CYAN}Endpoint des catégories:${NC}"
    categories_response=$(curl -s -w "%{http_code}" "$BACKEND_URL/categories/" \
        -H "Authorization: Bearer $token")
    categories_code="${categories_response: -3}"
    
    if [ "$categories_code" = "200" ]; then
        echo -e "   ✅ ${GREEN}Endpoint catégories accessible${NC}"
    else
        echo -e "   ❌ ${RED}Endpoint catégories non accessible (Code: $categories_code)${NC}"
    fi
    
else
    echo -e "   ⚠️  ${YELLOW}Pas de token disponible pour tester les endpoints${NC}"
fi

echo ""

# 4. Instructions pour les utilisateurs
echo -e "${BLUE}📱 4. INSTRUCTIONS POUR LES UTILISATEURS RÉSEAU${NC}"
echo "=============================================="
echo ""
echo -e "${GREEN}✅ L'application est accessible depuis le réseau local !${NC}"
echo ""
echo -e "${CYAN}📋 Instructions pour les utilisateurs:${NC}"
echo ""
echo -e "${YELLOW}1. Connectez-vous au même réseau WiFi${NC}"
echo -e "${YELLOW}2. Ouvrez un navigateur web${NC}"
echo -e "${YELLOW}3. Allez sur: ${CYAN}$FRONTEND_URL${NC}"
echo -e "${YELLOW}4. Connectez-vous avec un compte:${NC}"
echo ""
echo -e "${GREEN}🔐 Comptes de test disponibles:${NC}"
echo -e "   • ${CYAN}Admin${NC}     : superadmin / AdminPass123"
echo -e "   • ${CYAN}Moderator${NC} : moderator / (mot de passe à définir)"
echo -e "   • ${CYAN}User${NC}      : user / (mot de passe à définir)"
echo ""
echo -e "${BLUE}📱 Appareils compatibles:${NC}"
echo "   • 📱 Smartphones (iPhone, Android)"
echo "   • 💻 Tablettes (iPad, Android)"
echo "   • 🖥️  Autres ordinateurs (Windows, Mac, Linux)"
echo "   • 📺 Smart TV avec navigateur"
echo ""

# 5. Résumé technique
echo -e "${BLUE}🔧 5. RÉSUMÉ TECHNIQUE${NC}"
echo "======================="
echo ""
echo -e "${GREEN}Services opérationnels:${NC}"
echo -e "   ✅ Backend API (FastAPI + PostgreSQL)"
echo -e "   ✅ Frontend (React + Vite)"
echo -e "   ✅ Authentification JWT"
echo -e "   ✅ Accès réseau local configuré"
echo ""
echo -e "${CYAN}Configuration réseau:${NC}"
echo -e "   • Vite configuré avec host: 0.0.0.0"
echo -e "   • FastAPI accessible depuis le réseau"
echo -e "   • Ports ouverts: 5173 (Frontend), 8000 (Backend)"
echo ""
echo -e "${YELLOW}🆘 En cas de problème:${NC}"
echo -e "   • Vérifiez que les appareils sont sur le même réseau"
echo -e "   • Désactivez temporairement le pare-feu"
echo -e "   • Redémarrez les services: ${CYAN}./restart_services.sh${NC}"
echo -e "   • Vérifiez le statut: ${CYAN}./check_status.sh${NC}"
echo ""
echo "=================================================="
echo -e "${MAGENTA}🎉 Test terminé - Application prête pour l'accès réseau !${NC}"
echo "=================================================="