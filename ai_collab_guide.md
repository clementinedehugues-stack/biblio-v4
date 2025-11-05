# 🤖 AI Collaboration Guide – VS Code

## 🔁 Ordre de collaboration
1. **Grok Code Fast 1** → Prototype du module ou squelette du code.
2. **GPT-5 Codex** → Implémente le backend complet et logique métier.
3. **Claude Sonnet 3.7** → Relit, optimise et documente.
4. **Claude Haiku 4.5** → Teste et signale les erreurs.
5. **Gemini Pro** → Traduit, rédige le texte UI, améliore la cohérence linguistique.
6. **Gemini Flash** → Fait l’optimisation finale du frontend (performance).
7. **GPT-5 (Architecte)** → Valide et fusionne dans Git.

## ⚙️ Commande type dans chaque agent
Avant chaque tâche, donne le prompt :
> "Réfère-toi à `project_context.md` et `ai_collab_guide.md`.  
> Travaille sur la partie [backend/frontend/test/doc] selon ton rôle.  
> Ne modifie que ton espace de responsabilité."

## 💬 Exemple concret :

- **Tu veux créer le module d’authentification :**  
  1️⃣ Grok → “Génère un squelette FastAPI pour auth avec JWT.”  
  2️⃣ Codex → “Complète le module d’auth selon project_context.md.”  
  3️⃣ Sonnet → “Analyse et documente le module auth.”  
  4️⃣ Haiku → “Crée les tests unitaires du module auth.”  
  5️⃣ Gemini Pro → “Prépare le formulaire de connexion React (FR/EN).”  
  6️⃣ Gemini Flash → “Optimise le rendu et gère la validation instantanée du formulaire.”  
  7️⃣ GPT-5 → “Vérifie la cohérence et intègre le tout.”
