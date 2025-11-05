#!/bin/bash

# Script simple de test de connexion
# Usage: ./simple_login_test.sh

IP="192.168.1.70"
BACKEND_URL="http://$IP:8000"

echo "🧪 Test de connexion simple sur $BACKEND_URL"
echo "============================================="

# Test avec superadmin (mot de passe probablement 'admin' ou 'password')
test_passwords=("admin" "password" "superadmin" "AdminPass123" "admin123")

for password in "${test_passwords[@]}"; do
    echo ""
    echo "🔑 Test avec superadmin / $password..."
    
    response=$(curl -s -X POST "$BACKEND_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"superadmin\", \"password\": \"$password\"}")
    
    if echo "$response" | grep -q "access_token"; then
        echo "✅ Connexion réussie avec: superadmin / $password"
        token=$(echo "$response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
        echo "Token: ${token:0:30}..."
        
        # Test d'accès au profil
        echo ""
        echo "🔍 Test d'accès au profil utilisateur..."
        profile_response=$(curl -s "$BACKEND_URL/auth/me" \
            -H "Authorization: Bearer $token")
        
        if echo "$profile_response" | grep -q "username"; then
            echo "✅ Accès au profil réussi"
            echo "Profil: $profile_response"
        else
            echo "❌ Accès au profil échoué"
        fi
        
        break
    else
        echo "❌ Échec avec $password"
        echo "Réponse: $response"
    fi
done

echo ""
echo "============================================="