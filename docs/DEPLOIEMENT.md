# Guide de déploiement sur Vultr (pas à pas)

Objectif : avoir l'application en ligne sur une VM Vultr, puis la mettre à jour avec une seule commande.
Faites-le **à la main** : c'est la partie que vous voulez apprendre, et elle est courte.

## A. Une seule fois

1. **Compte Vultr** avec un email jamais utilisé chez Vultr. Appliquez le code cadeau du hackathon (reçu au kickoff).
2. **Clé SSH** (sur votre Mac, dans le Terminal) :
   `ssh-keygen -t ed25519 -C "hackathon"` (Entrée à chaque question), puis `cat ~/.ssh/id_ed25519.pub` et copiez le texte affiché.
3. Console Vultr -> **Products -> Compute -> Deploy**. Choix : *Cloud Compute* (usage général), une région au choix, image **Ubuntu 24.04 LTS**, plan **2 vCPU / 4 Go**, activer les sauvegardes automatiques si proposé. Dans *SSH Keys* : ajoutez la clé copiée. Lancez. Notez l'**adresse IP**.
   (Vérifiez dans la console si une image « Docker » prête à l'emploi existe : elle vous ferait sauter l'étape 5.)
4. Connexion : `ssh root@ADRESSE_IP`
5. Installer Docker : `curl -fsSL https://get.docker.com | sh`
6. Pare-feu : `ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable`
7. Récupérer le code (le dépôt GitHub est public) :
   `git clone https://github.com/VOTRE_COMPTE/VOTRE_DEPOT.git app && cd app`
8. Configuration : `cp .env.example .env` puis `nano .env` et remplissez au minimum :
   - `DB_PASSWORD` : un long mot de passe aléatoire (`openssl rand -hex 24` en génère un)
   - `SESSION_SECRET` : `openssl rand -hex 32`
   - `DOMAIN` : laissez `:80` pour tester par l'adresse IP ; mettez votre nom de domaine pour avoir le HTTPS (voir D)
   - `APP_URL` : `http://ADRESSE_IP` (ou `https://votre-domaine`)
   - la clé Vultr Inference et le modèle (voir `/v1/models`)
   Quitter nano : `Ctrl+O`, `Entrée`, `Ctrl+X`.
9. Lancer : `docker compose up -d --build` (5 à 10 minutes la première fois).
10. Charger les données de démo : `docker compose exec web npm run seed`
11. Ouvrir `http://ADRESSE_IP` dans le navigateur.

## B. À chaque mise à jour
Sur le Mac : `git push`. Sur le serveur : `cd app && ./deploy.sh`

## C. Quand ça ne marche pas
- État des services : `docker compose ps`
- Logs : `docker compose logs -f web` (ou `worker`, `db`, `caddy`)
- Redémarrer : `docker compose restart web worker`
- Page blanche après une mise à jour : lisez d'abord les logs de `web` (une migration de base échouée s'y affiche).
- Ne jamais lancer `docker compose down -v` : le `-v` **efface la base de données**.

## D. Nom de domaine et HTTPS
Chez le registrar, créez un enregistrement **A** `app.votre-domaine.com -> ADRESSE_IP`. Dans `.env` : `DOMAIN=app.votre-domaine.com` et `APP_URL=https://app.votre-domaine.com`. Puis `docker compose up -d`. Caddy obtient le certificat tout seul (les ports 80 et 443 doivent être ouverts).

## E. Sauvegarde avant la démo finale
`docker compose exec db pg_dump -U app app > backup-$(date +%F).sql`
