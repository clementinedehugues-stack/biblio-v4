# 🤖 AI_PROMPTS_GUIDE.md
### 🔧 Guide de Prompts Intelligents pour la Collaboration Multi-IA dans VS Code

Ce guide permet à tous tes agents IA (GPT-5 Codex, Grok, Claude, Gemini, etc.) de travailler ensemble **de manière structurée, rapide et sans se marcher dessus.**

---

## 🧭 1. Règles générales
Avant toute tâche, chaque agent doit :
1. **Lire le fichier `project_context.md`** pour comprendre les objectifs du projet.
2. **Respecter son rôle défini** dans `ai_collab_guide.md`.
3. **Travailler uniquement sur son périmètre** (backend, doc, test, frontend…).
4. **Commenter son code proprement** avec des docstrings et explications claires.
5. **Ne jamais modifier les fichiers contextuels (`project_context.md`, `ai_collab_guide.md`, `AI_PROMPTS_GUIDE.md`)**.

---

## ⚙️ 2. Prompts types par agent

### 🧱 GPT-5 Codex (Ingénieur principal – backend)
**Rôle :** Développe le backend, la base de données, les routes, la logique métier.  
**Prompt type :**
> Réfère-toi à `project_context.md` et `ai_collab_guide.md`.  
> Tu es l’ingénieur backend du projet.  
> Implémente [fonctionnalité précise : ex. “authentification JWT”, “upload PDF”, “filtrage par langue”].  
> Utilise Python (FastAPI + SQLAlchemy).  
> Garde un code clair, modulaire, avec docstrings et vérification des erreurs.  
> Ne touche pas au frontend.

### ⚡ Grok Code Fast 1 (Prototypeur)
**Rôle :** Créer des bases de code rapidement pour gagner du temps.  
**Prompt type :**
> Réfère-toi à `project_context.md`.  
> Génère un squelette de code fonctionnel pour [module].  
> Pas besoin d’implémenter les détails, juste la structure des fichiers, classes, et endpoints.

### 📘 Claude Sonnet 3.7 (Analyste senior & documentariste)
**Rôle :** Analyser, clarifier et documenter le code produit.  
**Prompt type :**
> Lis le code généré par Grok/Codex.  
> Corrige les incohérences, améliore les noms de fonctions et optimise la structure.  
> Rédige une documentation claire (`README`, docstrings, commentaires).  
> Ne modifie pas la logique métier sauf si nécessaire pour la cohérence.

### 🔍 Claude Haiku 4.5 (Testeur & QA)
**Rôle :** Rédiger des tests et faire la validation technique.  
**Prompt type :**
> Lis le module [nom du fichier].  
> Crée les tests unitaires nécessaires en pytest.  
> Vérifie la conformité avec `project_context.md`.  
> Fais un rapport concis des éventuelles erreurs ou faiblesses logiques.

### 🎨 Gemini Pro (Designer & traducteur)
**Rôle :** Gérer le design de l’interface et les textes multilingues (FR/EN).  
**Prompt type :**
> Réfère-toi à `project_context.md`.  
> Tu es responsable de la partie UI et traduction.  
> Crée ou améliore les composants React (ou HTML/Tailwind) pour [page ou module].  
> Propose le texte d’interface bilingue FR/EN.  
> Ajoute le bouton de changement de langue et respecte la charte minimaliste.

### ⚡ Gemini Flash (Optimiseur Frontend)
**Rôle :** Finaliser et optimiser les interfaces.  
**Prompt type :**
> Lis le composant créé par Gemini Pro.  
> Optimise le code pour la performance, la lisibilité et la compatibilité mobile.

### 🧠 GPT-5 (Architecte & Superviseur)
**Rôle :** Coordonner, valider, fusionner et maintenir la cohérence globale.  
**Prompt type :**
> Lis les livrables des autres agents.  
> Vérifie la cohérence du code, la conformité au cahier des charges, et la qualité.  
> Fusionne les parties validées et nettoie les doublons.
