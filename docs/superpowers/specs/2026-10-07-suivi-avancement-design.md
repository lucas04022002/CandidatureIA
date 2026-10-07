# Suivi d'avancement pour l'organisme — conception

Date : 7 octobre 2026. Décisions de Lucas : accord demandé à l'inscription, « entreprise trouvée » déclarée par l'étudiant, affichage « nombre + dernière envoyée ».

## Pourquoi

L'écran `/organisme` montre au responsable l'e-mail, la date d'inscription et la dernière connexion de chaque étudiant. Il ne lui dit pas ce qu'il paierait pour savoir : **qui cherche vraiment, et qui a trouvé une entreprise**. La fonction lui donne ces deux informations, sans rien révéler du contenu des candidatures, et seulement pour les étudiants qui l'acceptent.

## Ce que voit le responsable

Pour chaque étudiant, une colonne **Avancement** :

| Situation de l'étudiant | Affichage |
|---|---|
| A accepté, n'a pas déclaré d'entreprise | `7 envoyées · dernière le 3 oct. · En recherche` (`0 envoyée` si aucune) |
| A accepté et déclaré une entreprise | `Entreprise trouvée le 5 oct.` |
| A refusé, ou n'a jamais répondu | `Non partagé` |

Au-dessus du tableau, un résumé : `3 ont trouvé une entreprise · 9 partagent leur avancement sur 12 inscrits`.

Il ne voit **jamais** : le nom d'une entreprise, l'intitulé d'une offre, une lettre, un e-mail, un message, une relance, ni le statut d'une candidature précise.

« Envoyée » = une candidature qui a une date d'envoi (`applications.sent_at`, posée quand l'étudiant la marque « Envoyé », `lib/db/queries/applications.ts`). Une candidature passée ensuite à « Refusé » garde sa date d'envoi : elle compte, puisqu'elle a été envoyée.

## Ce que fait l'étudiant

1. **À l'inscription avec un code** (`components/forms/login-form.tsx`, onglet Inscription) : une case, décochée par défaut — « Partager mon avancement avec mon organisme : le nombre de candidatures envoyées et si j'ai trouvé une entreprise. Jamais leur contenu. » Cochée → oui ; laissée vide → non. Dans les deux cas la question est répondue.
2. **Étudiant déjà inscrit, jamais interrogé** : un encart sur `/dashboard` pose la même question avec deux boutons, « Oui, partager » / « Non ». Il disparaît dès la réponse.
3. **Dans `/profil`** : la carte « Ton organisme » affiche l'état et un bouton pour le changer à tout moment. Retirer l'accord masque tout immédiatement côté organisme (rien n'est copié chez lui : tout est calculé à la lecture).
4. **Sur `/dashboard`** : un bouton « J'ai trouvé mon entreprise ». Une fois pressé, il devient « Entreprise trouvée le 5 oct. — Annuler ». Aucun nom d'entreprise n'est demandé.

Un étudiant sans organisme (cas impossible aujourd'hui : l'inscription exige un code) ne voit ni l'encart ni la carte.

## Données

Trois colonnes sur `users` (migration `drizzle/0002_suivi_avancement.sql`, écrite à la main comme `0001`) :

- `share_progress boolean NULL` — `NULL` jamais répondu, `true` accepté, `false` refusé ;
- `share_progress_at timestamptz NULL` — date du dernier choix (preuve de l'accord) ;
- `found_company_at timestamptz NULL` — date de la déclaration, `NULL` sinon.

Le nombre et la date de la dernière candidature envoyée sont **calculés** à la lecture (`count` et `max(sent_at)` sur `applications`), jamais recopiés.

## Où vit la garantie de confidentialité

`listMembers(organisationId)` (`lib/db/queries/organisations.ts`) reste une projection explicite. Elle ajoute, par une sous-requête agrégée filtrée sur `share_progress = true`, deux valeurs seulement : `sentCount` et `lastSentAt`, plus `shareProgress` et `foundCompanyAt` (ce dernier mis à `null` si l'étudiant ne partage pas). Pour un étudiant qui ne partage pas, `sentCount`, `lastSentAt` et `foundCompanyAt` valent `null`. Aucune colonne de `applications` ou de `jobs` autre que `sent_at` n'est lue.

## Routes

- `POST /api/auth/register` : nouveau champ facultatif `shareProgress: boolean` (défaut `false`) → pose `share_progress` et `share_progress_at`.
- `POST /api/account/progress` (étudiant connecté, même origine) : corps `{ shareProgress?: boolean, foundCompany?: boolean }`. `shareProgress` met à jour l'accord et sa date ; `foundCompany: true` pose `found_company_at = now()` s'il est vide, `false` le remet à `NULL`. Refusé (403) pour un responsable ou un admin.
- L'export de données (`exportUserData`) inclut les trois champs.

## Textes à aligner sur le code

- `app/pour-les-organismes/page.tsx` : le bénéfice « Suivez l'utilisation » et le bloc de confidentialité disent ce qui est désormais vu, sur accord, et ce qui ne l'est jamais.
- `app/pour-les-etudiants/page.tsx` : le bloc « Vous gardez toujours le contrôle » mentionne le partage d'avancement, facultatif.
- `lib/legal.ts` (mentions légales) : ce que l'organisme reçoit, sur accord de l'étudiant.
- `components/organisation-view.tsx` : sous-titre de la page.

Chaque phrase sera relue contre la requête qui l'implémente.

## Démo

`scripts/seed-demo.ts` : Camille passe en « partage : oui ». Ses deux candidatures envoyées reçoivent une date d'envoi (elles n'en avaient pas, d'où le « 0 candidature envoyée » du tableau de bord de la démo).

## Tests (écrits d'abord, vus en échec)

1. `listMembers` : un étudiant qui partage → nombre et dernière date justes, `Refusé` compté ; un étudiant qui refuse ou n'a jamais répondu → `null` partout ; le résultat ne contient aucune autre clé que la liste attendue.
2. Retrait de l'accord → la lecture suivante ne renvoie plus rien.
3. `POST /api/account/progress` : accord oui/non avec date ; « trouvé » posé puis annulé ; 403 pour un responsable ; 403 cross-origin.
4. Inscription : case cochée → `true` ; absente → `false`.
5. `OrganisationView` : les trois affichages de la colonne et le résumé.
6. Encart du tableau de bord : affiché si jamais répondu, absent sinon.

## Hors du périmètre

Historique des accords, historique par semaine, nom de l'entreprise trouvée, notifications au responsable.
