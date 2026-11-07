# Réglages de l'IA locale (Ollama + Terax) — à faire une fois

1. **Mettre Ollama à jour** (Qwen 3.8 demande une version récente, v0.32.12 ou plus), puis :
   `ollama pull qwen3.8:27b-mlx`
2. **Fenêtre de contexte : étape cruciale.** Si Ollama garde un contexte trop petit, l'agent « oublie » le début de la conversation et semble stupide. Avec 48 Go de RAM, fixez 32768 (vous pouvez tester 65536) :
   - lancer Ollama avec : `OLLAMA_CONTEXT_LENGTH=32768 ollama serve`
   - ou créer un modèle dédié : un fichier `Modelfile` contenant `FROM qwen3.8:27b-mlx` et `PARAMETER num_ctx 32768`, puis `ollama create qwen38-code -f Modelfile`
3. Dans Terax : ajoutez le fournisseur Ollama (adresse `http://localhost:11434`), choisissez ce modèle, ouvrez le dossier du projet. Terax lit `TERAX.md` à la racine.
4. **Test de validation (30 min)** : donnez la même petite tâche à `qwen3.6` et `qwen3.8`, par exemple « crée une fonction qui calcule un score de risque à partir d'une liste de règles, avec un test ». Gardez celui qui demande le moins de corrections.

## Méthode de travail avec l'agent
- Une tâche à la fois : « Lis TERAX.md et docs/tasks/02-engine-core.md, propose un plan court, puis implémente. »
- Après chaque tâche : `npm test` et `npm run build` doivent passer, puis commit. Si ça casse, demandez la correction **avant** de continuer.
- Si l'agent tourne en rond (3 essais sans progrès) : arrêtez, copiez l'erreur exacte et le fichier concerné, et demandez-moi ici.
- Ne le laissez jamais modifier `prisma/schema.prisma` sans que vous l'ayez demandé dans la tâche.
