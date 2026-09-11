# ApplyBot — refonte du front « Bleu Klein » (spec, 11/09/2026)

## Décisions prises avec Lucas

- Direction validée : **F « Bleu Klein »** (artefact « ApplyBot, en couleur »), avec **le tampon d'état de la direction A** (Barlow Condensed, penché, en bleu Klein).
- Une seule couleur forte, posée en grand (barre, accueil, tuiles de score), jamais dispersée. Le reste : blanc cassé, blanc, encre, gris. Pas de photo sur l'accueil : la carte blanche qui flotte sur le bleu, avec son tampon, est l'image.
- Le parcours et les routes API ne changent pas (spec `2026-09-11-applybot-refonte-design.md`). Le front est réécrit page par page sur la mécanique existante (sessions, `lib/db`, routes `app/api/*`).
- Vocabulaire : jamais « IA », « intelligence artificielle », « pronostic », « garanti ». On dit « score de correspondance », « préparer ma candidature », « relancer ».

## 1. Jetons de design (`app/globals.css`, Tailwind 4 `@theme`)

| Jeton | Valeur | Usage |
|---|---|---|
| `--color-klein` | `#1F2FD6` | barre, accueil, score, tampon, liens d'action |
| `--color-klein-deep` | `#1523A8` | états pressés, texte bleu sur blanc cassé (contraste AA) |
| `--color-klein-soft` | `#E6E9FF` | fond des étiquettes bleues |
| `--color-paper` | `#F6F4EE` | fond de l'application |
| `--color-white` | `#FFFFFF` | cartes, tuiles, formulaires |
| `--color-ink` | `#101226` | texte principal |
| `--color-grey` | `#6B6D7C` | texte secondaire (AA sur paper et white) |
| `--color-line` | `#E2E0D8` | filets |
| `--color-good` / `--color-warn` / `--color-bad` | `#1E7F4F` / `#B5730A` / `#B3261E` | sémantique des états, jamais décoratif |

Règle : **aucune couleur hors jetons** dans `app/`, `components/` (test de grep, comme RushPlay), et test de contraste des paires texte/fond (AA 4,5:1).

Typographie (Google Fonts via `next/font/google`, `display: swap`) : **Syne** (titres, 700/800, interlettrage −0,02 à −0,04 em), **Instrument Sans** (texte, 400/500/600), **JetBrains Mono** (métadonnées d'offre, horodatages, codes d'organisme), **Barlow Condensed** (tampon uniquement). Échelle : 13 / 15 / 17 / 22 / 28 / 40 / 64 px, interligne 1,55 pour le texte, 0,95 pour les titres. `tabular-nums` partout où des chiffres s'alignent.

Rayons : tuiles et cartes 14 px, boutons pilule (999 px), étiquettes 999 px, tampon 4 px. Ombre : une seule (`0 30px 60px -30px rgb(0 0 40 / .5)`), réservée à la carte de l'accueil. Pas d'ombre dans l'application.

Mouvement : une seule séquence d'entrée sur l'accueil (le titre puis la carte, 400 ms, décalés de 120 ms) ; dans l'application, seulement les transitions d'état (150 ms). `prefers-reduced-motion` respecté partout.

## 2. Composants (dossier `components/`, remplace `components/ui` et `components/app`)

| Composant | Rôle |
|---|---|
| `Shell` | barre bleue en haut (marque, liens selon le rôle, e-mail + déconnexion), contenu sur `paper`, pied légal. Remplace `sidebar` + `topbar`. Mobile : barre repliée en menu. |
| `PageTitle` | titre Syne + sous-titre gris + zone d'actions à droite |
| `Stamp` | tampon d'état : `Envoyé`, `À relancer`, `Refusé`, `Brouillon`, `Nouveau`. Barlow Condensed 700, majuscules, interlettrage 0,14 em, bordure 2,5 px, rotation −5° (`Envoyé`), +3° (`À relancer`), −2° (`Refusé`, en `bad`), 0° pour les états neutres (`Nouveau`, `Brouillon`, en gris). Masque « encre irrégulière » léger. |
| `Score` | le chiffre de correspondance en Syne 800 bleu, avec `small` « correspondance » en mono ; variante `tile` (30 px) et `hero` (40 px) |
| `OfferTile` | tuile blanche 14 px : titre, ligne mono (entreprise · lieu · contrat · source), pied avec `Score` + `Stamp` ou étiquette bleue |
| `OfferList` | grille de `OfferTile` (3 colonnes desktop, 1 mobile), en-tête « N offres · métier · lieu · relevé de HH:MM » |
| `Button` | pilule : `primary` (bleu, texte blanc), `secondary` (bordure encre), `onBlue` (blanche sur bleu), `quiet` (lien bleu foncé) |
| `Field`, `Checkbox`, `Select` | champs de formulaire, libellés au-dessus, erreurs en `bad` sous le champ |
| `Empty` | état vide : une phrase, une action (« Aucune offre pour l'instant. Lance une recherche. ») |
| `Kpi` | chiffre Syne + libellé, pour le tableau de bord et la page organisme |
| `Table` | tableau simple (organisme, admin, suivi) : en-têtes mono majuscules, filets `line` |
| `Toast` | confirmation d'action, même verbe que le bouton (« Candidature marquée envoyée ») |

## 3. Écrans

Public :
- **Accueil `/`** : barre bleue ; accueil bleu pleine largeur, titre Syne « Chaque stagiaire postule. Chaque jour. », paragraphe (sources, lettre, relance, suivi par promo), bouton blanc « Ouvrir des places pour ma promo », lien « J'ai un code d'organisme » ; à droite la carte blanche flottante (offre réelle d'exemple, score 86, tampon Envoyé). Sous l'accueil, trois colonnes texte : « Sept sources », « Lettre et e-mail prêts », « Relance à quatre jours » ; puis « Pour les organismes » (places par promo, code, le responsable ne voit jamais les CV) ; pied légal.
- **Connexion `/login`** et **inscription** (même page, deux onglets) : carte blanche centrée sur `paper`, champ code d'organisme en mono majuscules, case CGU. **Inscription organisme `/organisme/inscription`** : même gabarit.
- `/mentions-legales`, `/cgu` : colonne de lecture 65 ch, titres Syne.

Stagiaire (dans `Shell`) :
- **Offres `/jobs`** : `PageTitle` « Offres pour toi » + contrôles (métier, lieu, rayon, bouton « Chercher des offres » avec le quota affiché : « prochaine recherche possible à HH:MM ») ; `OfferList`.
- **Fiche d'offre / candidature `/applications/[id]`** : en-tête blanc (titre, ligne mono, `Score` hero, `Stamp`), trois blocs de texte à copier (Lettre, E-mail, Message LinkedIn) avec bouton « Copier », colonne d'actions : « Postuler sur le site de l'offre » (bleu, ouvre l'URL), « Marquer envoyée », « Préparer la relance », « Supprimer ».
- **Candidatures `/applications`** : tuiles regroupées par état, tampon sur chaque tuile.
- **Suivi `/suivi`** : `Table` chronologique (date, offre, état, prochaine action).
- **Tableau de bord `/dashboard`** : quatre `Kpi` (offres du jour, candidatures envoyées, réponses attendues, relances à faire) et les trois prochaines actions.
- **Profil `/profil`** : CV importé (nom, poste cible, mots-clés, compétences), modèle de lettre, export JSON, suppression de compte (confirmation par saisie de l'e-mail).
- **Onboarding `/onboarding`** : trois étapes (importer le CV, vérifier le profil, choisir le métier et le lieu), barre de progression bleue.

Responsable : **`/organisme`** : `Kpi` places utilisées / places, code en Syne 40 px mono avec « Régénérer », `Table` des stagiaires (e-mail, inscrit le, dernière connexion, « Retirer »). Admin : **`/admin`** : `Table` des organisations avec formulaire inline (actif, places, e-mail du responsable).

Mobile : tout en une colonne, barre repliable, tuiles pleine largeur, tampons conservés.

## 4. Copie

Tutoiement pour le stagiaire, vouvoiement pour l'organisme et l'admin. Verbes d'action nommant le résultat : « Chercher des offres », « Préparer ma candidature », « Marquer envoyée », « Relancer », « Copier la lettre ». Erreurs : ce qui s'est passé et quoi faire (« Code d'organisme inconnu. Vérifie les 8 caractères avec ton formateur. »). États vides : une invitation.

## 5. Qualité

- Tests Vitest (`environment: jsdom` pour les composants) : `Stamp` (état → texte, couleur, rotation), `OfferTile`, `Shell` (liens selon le rôle), formulaires (erreurs affichées telles que renvoyées par l'API), contraste des jetons, grep « couleur hors jetons » et vocabulaire interdit.
- Lighthouse accessibilité ≥ 95 sur `/`, `/login`, `/jobs` (build de production, mesure locale).
- Aucune dépendance UI ajoutée (pas de shadcn, pas de bibliothèque d'icônes ; icônes SVG inline existantes).
- Les routes API et les tests d'intégration existants restent verts ; les composants clients envoient les mêmes corps qu'aujourd'hui.

## 6. Hors périmètre

Photos, illustrations, mode sombre (le bleu Klein est une identité claire, une seule thématique), paiement, e-mails.
