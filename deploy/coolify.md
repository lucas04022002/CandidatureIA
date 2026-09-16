# Déploiement ApplyBot — Hetzner + Coolify

Procédure pour mettre ApplyBot en production sur un VPS, sans coller la
moindre clé dans le chat : chaque secret est saisi par Lucas directement dans
l'interface Coolify.

1. **VPS** : un VPS avec Coolify déjà installé (voir `.superpowers/` ou le VPS
   utilisé pour les autres projets Lucas — pas besoin d'en recréer un par
   service, Coolify héberge plusieurs applications sur la même machine).

2. **Base de données** : créer une ressource Postgres 16 dans Coolify et noter
   l'URL de connexion (`DATABASE_URL`) qu'elle fournit.

3. **Application Docker** : créer une application Coolify de type Docker
   pointant sur le dépôt GitHub `lucas04022002/CandidatureIA`, branche `main`
   (fusionner `refonte-b2b` dans `main` avant ce déploiement — ne jamais
   pointer Coolify sur une branche de travail). Contexte de build = racine du
   dépôt, `Dockerfile` à la racine (unique Dockerfile du projet).

4. **Variables d'environnement** (saisies par Lucas dans Coolify, jamais dans
   le chat) :
   - `DATABASE_URL` : l'URL Postgres fournie à l'étape 2 (`postgres://...`,
     pas `pglite://` — ce pilote n'est que pour le dev local).
   - `JWT_SECRET` : 32 caractères aléatoires minimum, généré une fois et fixé
     (le faire tourner déconnecte tous les utilisateurs).
   - `TRUSTED_PROXY_HOPS=1` : Coolify place un reverse proxy (Traefik) devant
     l'appli — nécessaire pour que la limite anti-flood par IP
     (`lib/rate-limit.ts`) lise la bonne adresse dans `x-forwarded-for`
     plutôt que celle du proxy.
   - `NODE_ENV=production`.
   - Clés des sources d'offres, une par une selon celles réellement utilisées
     (une source sans clé est simplement désactivée, pas d'erreur) :
     `FRANCE_TRAVAIL_CLIENT_ID`, `FRANCE_TRAVAIL_CLIENT_SECRET`,
     `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `ADZUNA_COUNTRY`, `JOOBLE_API_KEY`,
     `LBA_API_KEY`, `GREENHOUSE_BOARD_TOKENS`, `LEVER_COMPANY_TOKENS`,
     `SMARTRECRUITERS_COMPANY_TOKENS`.
   - `SOURCE_LBA` : `on` tant que le service est gratuit à utiliser (La Bonne
     Alternance interdit l'usage lucratif dans sa documentation officielle) —
     voir l'étape « avant ouverture au public » ci-dessous.

5. **Premier déploiement** : au démarrage du conteneur, la migration Drizzle
   (`scripts/migrate.ts`) s'exécute avant `node server.js` (voir le `CMD` du
   `Dockerfile`) — le schéma Postgres est créé automatiquement, aucune étape
   manuelle n'est nécessaire pour ça.

6. **Créer l'administrateur** : depuis le terminal Coolify du service, lancer
   `node dist/scripts/create-admin.cjs` (invite interactive : e-mail + mot de passe, 10
   caractères minimum). Le script refuse de créer un second administrateur si
   un compte `role = admin` existe déjà.

7. **Cron** : coller le contenu de `deploy/crontab.txt` dans les
   « Scheduled Tasks » de Coolify, sur le service ApplyBot — purge RGPD
   hebdomadaire des comptes dormants (`scripts/purge-inactive.ts`).

8. **Domaine et HTTPS** : à configurer dans Coolify une fois le nom de
   domaine choisi (certificat Let's Encrypt automatique).

9. **Avant d'ouvrir au public** :
   - remplir l'identité de l'éditeur dans `lib/legal.ts` (mentions légales et
     CGU — les champs `TO_FILL` sont volontairement vides tant que personne
     ne les a renseignés) ;
   - activer la vérification stricte `CI_STRICT_LEGAL=1` dans la CI
     (`.github/workflows/ci.yml`, bloc `env:` du job `checks`) une fois ces
     champs remplis — `tests/legal.test.ts` échoue alors si un champ est
     resté à `TO_FILL` ;
   - passer `SOURCE_LBA=off` dès la première facture émise à un organisme :
     La Bonne Alternance réserve son API aux usages non lucratifs dans sa
     documentation officielle, et ApplyBot cesse d'être gratuit à cette
     date ;
   - révoquer et régénérer toutes les clés des sources d'offres qui ont fuité
     dans l'historique Git de ce dépôt (voir Task 8, qui purge cet
     historique) avant de les ressaisir dans Coolify — une clé qui a été
     commitée une fois doit être considérée compromise même après suppression
     du fichier, tant que l'historique n'a pas été réécrit.

## Exploitation — organisme sans responsable

Un organisme peut se retrouver **sans aucun responsable actif** : le responsable
supprime son compte (droit à l'effacement), ou la purge RGPD mensuelle emporte
son compte dormant alors que l'organisme était déjà vide de étudiants. Plus
personne ne peut alors régénérer le code d'inscription, ajuster le nombre de
places ni retirer un membre — l'organisme est vivant mais inadministrable.

**Détection.** Le cron hebdomadaire (`node dist/scripts/purge-inactive.cjs`, voir
`deploy/crontab.txt`) termine son exécution en listant ces organismes :

```
organisation AFPA Untel sans responsable (code 7KQ2M4XZ) — aucune désactivation automatique.
```

Rien n'est désactivé automatiquement : couper l'accès des étudiants d'un
organisme est une décision commerciale, pas une conséquence d'un script de
maintenance. Le même signalement est visible dans `/admin`, colonne
« Responsable » à « Aucun ».

**Garde-fou en amont.** Depuis la revue de sécurité, la purge ne supprime plus un
responsable dormant tant que son organisme compte au moins un étudiant non
supprimé (`purgeInactiveUsers`, `lib/db/queries/users.ts`). Un responsable se
connecte rarement — c'est la nature du rôle, pas un signe d'abandon. Le cas
restant est donc l'organisme réellement vidé, ou le responsable qui a demandé
l'effacement de son compte.

**Réparation.** Depuis `/admin`, connecté avec le compte administrateur :

1. Créer d'abord le compte du nouveau responsable s'il n'existe pas. Il s'inscrit
   lui-même via `/organisme/inscription` — ce parcours crée un **nouvel**
   organisme, qu'on laissera inactif et vide ; seul son compte utilisateur
   (rôle `responsable`) nous intéresse.
2. Sur la ligne de l'organisme orphelin, le champ **« Responsable »** apparaît
   (il n'est affiché que dans ce cas). Y saisir l'e-mail du responsable, puis
   « Enregistrer ».
3. Vérifier que la colonne « Responsable » affiche bien l'e-mail, et que le
   responsable voit l'organisme dans `/organisme` après reconnexion.

En ligne de commande, la même opération passe par `POST /api/admin/organisation`
avec une session administrateur :

```json
{ "id": "<uuid de l'organisme>", "active": true, "seats": 20, "responsableEmail": "resp@organisme.fr" }
```

Réponses possibles : `404` si aucun compte actif ne porte cet e-mail, `400` si le
compte existe mais n'a pas le rôle `responsable`. La route **ne promeut jamais**
un étudiant en responsable : ce rôle donne vue sur les membres de l'organisme,
ça se décide explicitement et ça ne se fait pas en effet de bord d'une mise à
jour de places. Pour un étudiant qu'on veut promouvoir, changer son rôle en base
puis le rattacher.

## Ce que fait Claude et ce que fait Lucas

- Lucas : accès au VPS Coolify, achat/gestion du domaine, saisie des secrets
  dans Coolify (`DATABASE_URL`, `JWT_SECRET`, clés des sources), fusion de
  `refonte-b2b` dans `main`, remplissage de `lib/legal.ts`, décision du
  moment où `SOURCE_LBA` passe à `off`.
- Claude : rédaction du `Dockerfile`, de la CI et de ce guide ; création de la
  ressource Coolify (Postgres, application), configuration des crons et du
  domaine si accès SSH/Coolify fourni ; vérification post-déploiement
  (migration appliquée, `/login` accessible, en-têtes de sécurité présents).
