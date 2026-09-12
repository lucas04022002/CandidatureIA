# ApplyBot — front « Bleu Klein » : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer l'interface actuelle (thème sombre, composants `components/ui` + `components/app`) par la direction « Bleu Klein » de la spec, page par page, sans toucher aux routes API ni aux corps envoyés.

**Architecture:** Next.js 16 App Router, Tailwind 4 avec jetons `@theme` dans `app/globals.css`, polices via `next/font/google`. Nouveau dossier `components/` plat (Shell, Stamp, Score, OfferTile…), anciens `components/ui` et `components/app` supprimés à la fin. Les composants clients gardent exactement les appels `fetch` et les corps actuels (les relire avant réécriture).

**Tech Stack:** Next.js 16.3.4, React 19, Tailwind 4, Vitest + jsdom + @testing-library/react (déjà installés), Lighthouse (`npx lighthouse`, mesure locale).

## Global Constraints

- Spec : `docs/superpowers/specs/2026-09-11-applybot-front-design.md` (jetons, composants, écrans, copie). Branche `front-klein` du dépôt `C:\Users\lucas\OneDrive\Desktop\CandidatureIA`, jamais `main`. Commits en français, trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- **Aucune couleur hors jetons** dans `app/` et `components/` : interdits `#[0-9a-f]{3,8}`, `rgb(`, `oklch(`, `hsl(` et les classes Tailwind de couleur brute (`text-red-500`, `bg-blue-*`, `border-gray-*`…) ; seules les classes dérivées des jetons (`bg-klein`, `text-ink`, `border-line`…) et `text-white`/`bg-white` (= jeton `white`) sont admises. Test de grep dans `tests/ui/tokens.test.ts`.
- Vocabulaire interdit dans `app/` et `components/` : `IA`, `intelligence artificielle`, `pronostic`, `garanti`, `AI ` (test de grep, insensible à la casse pour les mots, `\bIA\b` pour le sigle).
- Polices : Syne (titres), Instrument Sans (texte), JetBrains Mono (données), Barlow Condensed (tampon seulement). Chargées une fois dans `app/layout.tsx` avec `next/font/google`, exposées en variables `--font-display`, `--font-body`, `--font-mono`, `--font-stamp`.
- Contraste AA (≥ 4,5:1) pour chaque paire texte/fond utilisée : test `tests/ui/contrast.test.ts` calcule le ratio des paires listées (`ink/paper`, `ink/white`, `grey/paper`, `grey/white`, `white/klein`, `klein-deep/paper`, `klein-deep/white`, `klein/white`).
- Les tests d'intégration existants (`tests/api/**`, `tests/auth/**`, `tests/org/**`, `tests/rgpd/**`) restent verts ; aucun corps de requête `fetch` ne change (comparer avec `git show main:components/app/<fichier>` avant de réécrire).
- Pas de nouvelle dépendance UI. Pas de mode sombre. `prefers-reduced-motion` respecté (`motion-safe:` pour toute animation).
- Copie : tutoiement stagiaire, vouvoiement organisme/admin ; verbes d'action nommant le résultat (voir spec §4).
- À la fin : `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` verts ; `components/ui` et `components/app` n'existent plus ; Lighthouse accessibilité ≥ 95 sur `/`, `/login`, `/jobs` (build de prod + `next start`, `npx lighthouse http://127.0.0.1:3000/ --only-categories=accessibility --quiet --chrome-flags="--headless"` ; si Chrome n'est pas disponible, le dire dans le rapport et lister les vérifications manuelles faites : focus visible, libellés, contrastes).

---

## Carte des fichiers

| Fichier | Rôle |
|---|---|
| `app/globals.css` | jetons `@theme` (couleurs, polices, rayons), base (`body`, focus, `.stamp-mask`) |
| `app/layout.tsx` | polices, `lang="fr"`, `body` sur `paper` |
| `components/shell.tsx` | barre bleue + contenu + pied légal ; liens selon le rôle ; menu mobile |
| `components/page-title.tsx`, `button.tsx`, `field.tsx` (Field, Checkbox, Select), `stamp.tsx`, `score.tsx`, `kpi.tsx`, `table.tsx`, `empty.tsx`, `toast.tsx`, `offer-tile.tsx`, `offer-list.tsx`, `legal-footer.tsx`, `icons.tsx` (déplacé) | composants de la spec §2 |
| `components/forms/login-form.tsx`, `register-organisation-form.tsx`, `onboarding-wizard.tsx`, `cv-upload.tsx`, `profile-form.tsx`, `account-actions.tsx` | formulaires (mêmes `fetch`) |
| `components/actions/*.tsx` | boutons d'action existants réécrits (`apply-offer`, `generate-application`, `generate-followup`, `application-status`, `scrape-jobs`, `rescore-jobs`, `regenerate-code`, `remove-member`, `organisation-seats`, `sign-out`, `copy-text`) |
| `app/page.tsx`, `app/login/page.tsx`, `app/organisme/inscription/page.tsx`, `app/mentions-legales/page.tsx`, `app/cgu/page.tsx`, `app/onboarding/page.tsx`, `app/(app)/**/page.tsx`, `app/(app)/layout.tsx` | écrans de la spec §3 |
| `tests/ui/*.test.tsx` | tests composants (jsdom) + tokens + contraste + vocabulaire |

Vitest : les tests sous `tests/ui/` tournent en `jsdom` (ajouter `// @vitest-environment jsdom` en tête de chaque fichier, ou un `environmentMatchGlobs` dans `vitest.config.mts`).

---

### Task 1 : Jetons, polices, gardes

**Files:**
- Modify: `app/globals.css` (remplacer entièrement), `app/layout.tsx`, `vitest.config.mts`
- Create: `tests/ui/tokens.test.ts`, `tests/ui/contrast.test.ts`, `tests/ui/vocabulary.test.ts`, `tests/ui/setup-dom.ts`

**Interfaces:**
- Produces : classes Tailwind `bg-klein`, `bg-klein-deep`, `bg-klein-soft`, `bg-paper`, `bg-white`, `text-ink`, `text-grey`, `text-klein`, `text-klein-deep`, `border-line`, `text-good|warn|bad`, `bg-good-soft|warn-soft|bad-soft`, `font-display`, `font-body`, `font-mono`, `font-stamp`, `rounded-tile` (14 px), `rounded-stamp` (4 px), `shadow-hero`.

- [ ] **Step 1 : Tests (échec d'abord)**

`tests/ui/tokens.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
const files = globSync(["app/**/*.{ts,tsx,css}", "components/**/*.{ts,tsx}"]).filter((f) => !f.endsWith("globals.css"));
describe("aucune couleur hors jetons", () => {
  it("pas de couleur en dur dans app/ et components/", () => {
    const bad: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      if (/#[0-9a-fA-F]{3,8}\b|\b(rgb|oklch|hsl)a?\(/.test(src)) bad.push(f);
      if (/\b(text|bg|border|ring|from|to)-(red|blue|gray|grey|slate|zinc|neutral|stone|green|emerald|amber|yellow|orange|indigo|violet|purple|pink|rose|sky|cyan|teal|lime)-\d{2,3}\b/.test(src)) bad.push(f);
    }
    expect(bad).toEqual([]);
  });
});
```

(`globSync` existe dans `node:fs` depuis Node 22 ; sinon lister les fichiers avec `readdirSync` récursif.)

`tests/ui/contrast.test.ts` : lit `app/globals.css`, extrait `--color-<nom>: #hex`, calcule la luminance relative (WCAG) et vérifie ≥ 4,5 pour les paires : `["ink","paper"],["ink","white"],["grey","paper"],["grey","white"],["white","klein"],["klein-deep","paper"],["klein-deep","white"],["klein","white"]`.

`tests/ui/vocabulary.test.ts` : grep de `\bIA\b`, `intelligence artificielle`, `pronostic`, `garanti`, `\bAI\b` dans `app/` et `components/` → aucun fichier.

- [ ] **Step 2 : `app/globals.css`**

```css
@import "tailwindcss";
@theme {
  --color-klein: #1F2FD6; --color-klein-deep: #1523A8; --color-klein-soft: #E6E9FF;
  --color-paper: #F6F4EE; --color-white: #FFFFFF; --color-ink: #101226; --color-grey: #6B6D7C; --color-line: #E2E0D8;
  --color-good: #1E7F4F; --color-warn: #B5730A; --color-bad: #B3261E;
  --color-good-soft: #E3F3EA; --color-warn-soft: #FBF1DC; --color-bad-soft: #F9E3E1;
  --font-display: var(--font-syne), system-ui, sans-serif;
  --font-body: var(--font-instrument), system-ui, sans-serif;
  --font-mono: var(--font-jetbrains), ui-monospace, monospace;
  --font-stamp: var(--font-barlow), Impact, sans-serif;
  --radius-tile: 14px; --radius-stamp: 4px;
  --shadow-hero: 0 30px 60px -30px rgb(0 0 40 / 0.5);
}
html { color-scheme: light; }
body { @apply bg-paper text-ink font-body antialiased; font-size: 15px; line-height: 1.55; }
h1, h2, h3 { @apply font-display; text-wrap: balance; }
:focus-visible { outline: 2px solid var(--color-klein); outline-offset: 2px; }
.stamp-mask { mask: radial-gradient(circle at 30% 60%, #000 96%, transparent 100%); }
.tnum { font-variant-numeric: tabular-nums; }
```

(Le `#000` du masque et les hex des jetons sont dans `globals.css`, exclu du test de grep.) Vérifier que `--color-good-soft` etc. ne servent qu'aux fonds d'étiquettes.

- [ ] **Step 3 : `app/layout.tsx`** : `Syne` (700, 800), `Instrument_Sans` (400, 500, 600), `JetBrains_Mono` (400, 500), `Barlow_Condensed` (700) via `next/font/google` avec `variable: "--font-syne"` etc., `subsets: ["latin"]`, `display: "swap"` ; `<html lang="fr">` ; `<body className="min-h-full flex flex-col">`. Supprimer Geist.

- [ ] **Step 4 : Vitest jsdom** — `vitest.config.mts` : `environmentMatchGlobs: [["tests/ui/**", "jsdom"]]` (ou `test.environment` par fichier) ; `tests/ui/setup-dom.ts` importe `@testing-library/jest-dom/vitest`, ajouté aux `setupFiles`.

- [ ] **Step 5 : Lancer** `npm test`, `typecheck`, `lint`, `build` (le build passe avec l'ancienne UI qui référence encore ses variables CSS : ajouter temporairement dans `globals.css` un bloc `/* legacy, supprimé en tâche 5 */` définissant les anciennes variables `--background`, `--foreground`… en jetons Klein, pour que rien ne casse d'ici là ; le test de grep exclut `globals.css`).

- [ ] **Step 6 : Commit** `git commit -am "feat(front): jetons Bleu Klein, polices Syne/Instrument Sans/JetBrains Mono/Barlow Condensed, gardes couleurs/contraste/vocabulaire"`

---

### Task 2 : Composants de base

**Files:**
- Create: `components/button.tsx`, `components/field.tsx`, `components/stamp.tsx`, `components/score.tsx`, `components/kpi.tsx`, `components/table.tsx`, `components/empty.tsx`, `components/toast.tsx`, `components/page-title.tsx`, `components/icons.tsx` (déplacé depuis `components/app/icons.tsx`)
- Test: `tests/ui/stamp.test.tsx`, `tests/ui/button.test.tsx`, `tests/ui/field.test.tsx`, `tests/ui/score.test.tsx`

**Interfaces:**
- `Button({ variant: "primary" | "secondary" | "onBlue" | "quiet", size?: "md" | "sm", pending?: boolean, ...buttonProps })` — pilule ; `pending` désactive et affiche « … » après le libellé.
- `Field({ label, error?, hint?, children | input props })`, `Checkbox({ label, ...})`, `Select({ label, options, ...})`.
- `Stamp({ status: ApplicationStatus | "À relancer" })` → `<span role="status">` avec le texte en majuscules ; mapping rotation/couleur : `Envoyé` −5° klein, `À relancer` +3° klein, `Refusé` −2° bad, `Nouveau`/`À valider`/`Brouillon` 0° grey (bordure grey). Classes : `font-stamp uppercase tracking-[0.14em] border-[2.5px] rounded-stamp px-2.5 py-1.5 inline-block stamp-mask`.
- `Score({ value: number, size: "tile" | "hero" })` → chiffre `font-display font-extrabold text-klein tnum` (30 px / 40 px) + `<small>` « correspondance » en `font-mono text-grey uppercase tracking-[0.06em]`.
- `Kpi({ value, label })`, `Table({ columns, rows })` (en-têtes `font-mono uppercase text-grey`, filets `border-line`), `Empty({ text, action? })`, `Toast` (contexte + `useToast()` ; disparaît à 4 s), `PageTitle({ title, subtitle?, actions? })`.

- [ ] **Step 1 : Tests (échec d'abord)** — `tests/ui/stamp.test.tsx` :

```tsx
// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Stamp } from "@/components/stamp";
describe("Stamp", () => {
  it("Envoyé : texte, bleu, penché", () => {
    render(<Stamp status="Envoyé" />);
    const el = screen.getByRole("status");
    expect(el).toHaveTextContent("Envoyé");
    expect(el.className).toMatch(/text-klein/);
    expect(el.style.transform).toBe("rotate(-5deg)");
  });
  it("Refusé : rouge sémantique", () => { render(<Stamp status="Refusé" />); expect(screen.getByRole("status").className).toMatch(/text-bad/); });
  it("Nouveau : gris, droit", () => { render(<Stamp status="Nouveau" />); const el = screen.getByRole("status"); expect(el.className).toMatch(/text-grey/); expect(el.style.transform).toBe("rotate(0deg)"); });
});
```

`button.test.tsx` : rendu des 4 variantes (classes `bg-klein text-white`, `border-ink`, `bg-white text-klein`, `text-klein-deep`), `pending` → `disabled`. `field.test.tsx` : l'erreur est liée au champ par `aria-describedby`. `score.test.tsx` : affiche « 86 » et « correspondance ».

- [ ] **Step 2 : Implémenter** les composants, sans état global sauf `Toast`.
- [ ] **Step 3 : Lancer** `npm test -- tests/ui`, `typecheck`, `lint`.
- [ ] **Step 4 : Commit** `git commit -am "feat(front): composants de base Bleu Klein (Button, Field, Stamp, Score, Kpi, Table, Empty, Toast, PageTitle)"`

---

### Task 3 : Shell et pages publiques

**Files:**
- Create: `components/shell.tsx`, `components/legal-footer.tsx` (déplacé et restylé), `components/forms/login-form.tsx`, `components/forms/register-organisation-form.tsx`
- Modify: `app/(app)/layout.tsx` (utilise `Shell`), `app/page.tsx`, `app/login/page.tsx`, `app/organisme/inscription/page.tsx`, `app/mentions-legales/page.tsx`, `app/cgu/page.tsx`, `components/legal-page.tsx` → `components/legal-page.tsx` restylé
- Delete: `components/app/sidebar.tsx`, `topbar.tsx`, `nav-links.tsx`, `login-form.tsx`, `register-organisation-form.tsx`, `legal-footer.tsx` (après migration des imports)
- Test: `tests/ui/shell.test.tsx`, `tests/ui/login-form.test.tsx`

**Interfaces:**
- `Shell({ user: SessionUser, children })` : barre `bg-klein text-white` (marque « ApplyBot » `font-display`, liens : stagiaire → Offres, Candidatures, Suivi, Profil ; responsable → Mon organisme, Profil ; admin → Admin, Profil ; à droite e-mail + bouton « Se déconnecter » (`POST /api/auth/logout` puis `router.push("/login")`) ; menu mobile `<details>` sans JS supplémentaire) ; contenu `max-w-6xl mx-auto px-6 py-8` ; `LegalFooter`.
- Formulaires : mêmes corps qu'aujourd'hui (`login-form.tsx` : `{ email, password }` / `{ email, password, orgCode, acceptedTerms }` ; `register-organisation-form.tsx` : `{ organisationName, email, password, acceptedTerms }`), erreurs affichées telles que renvoyées (`error` du JSON), `safeNextPath` conservé.

- [ ] **Step 1 : Tests (échec d'abord)** — `shell.test.tsx` : pour chaque rôle, les liens attendus sont présents et les autres absents. `login-form.test.tsx` : l'onglet inscription montre le champ « Code d'organisme » (majuscules, `maxLength=8`, `font-mono`) et la case CGU ; une erreur API (`fetch` mocké → 400 `{ error: "Code d'organisme inconnu" }`) s'affiche telle quelle.
- [ ] **Step 2 : Accueil `app/page.tsx`** selon spec §3 : section bleue (titre Syne « Chaque stagiaire postule. Chaque jour. », paragraphe, `Button onBlue` « Ouvrir des places pour ma promo » → `/organisme/inscription`, lien « J'ai un code d'organisme » → `/login`), carte blanche `rounded-tile shadow-hero` avec `Score hero` 86 et `Stamp Envoyé` sur l'offre d'exemple « Électricien bâtiment H/F · Spie Batignolles · Vénissieux · CDI · France Travail » ; trois colonnes (Sept sources / Lettre et e-mail prêts / Relance à quatre jours) ; bloc « Pour les organismes » ; `LegalFooter`. Animation d'entrée `motion-safe:animate-[rise_400ms_ease-out]` (keyframes dans `globals.css`), carte décalée de 120 ms.
- [ ] **Step 3 : Login / inscription / inscription organisme / pages légales** selon spec.
- [ ] **Step 4 : Lancer** tout, `build`, `commit -am "feat(front): Shell bleu Klein, accueil, connexion, inscription, pages légales"`.

---

### Task 4 : Écrans du stagiaire

**Files:**
- Create: `components/offer-tile.tsx`, `components/offer-list.tsx`, `components/actions/{apply-offer,generate-application,generate-followup,application-status,scrape-jobs,rescore-jobs,copy-text}.tsx`, `components/forms/{onboarding-wizard,cv-upload,profile-form,account-actions}.tsx`, `components/search-controls.tsx`
- Modify: `app/(app)/jobs/page.tsx`, `app/(app)/applications/page.tsx`, `app/(app)/applications/[id]/page.tsx`, `app/(app)/suivi/page.tsx`, `app/(app)/dashboard/page.tsx`, `app/(app)/profil/page.tsx`, `app/onboarding/page.tsx`
- Delete: les anciens équivalents dans `components/app/` (`jobs-board`, `jobs-table`, `applications-board`, `score-gauge`, `status-badge`, `stat-card`, `empty-state`, `page-header`, `cv-upload-card`, `onboarding-wizard`, `*-button.tsx`, `application-status-actions`, `account-actions`, `copy-text-button`, `scrape-jobs-controls`)
- Test: `tests/ui/offer-tile.test.tsx`, `tests/ui/search-controls.test.tsx`, `tests/ui/application-actions.test.tsx`

**Interfaces:**
- `OfferTile({ job: Job, application?: Application })` : titre, ligne mono `entreprise · lieu · contrat · source`, pied `Score tile` + (`Stamp` si une candidature existe, sinon étiquette `bg-klein-soft text-klein-deep` « Nouveau ») ; lien vers `/applications/[id]` si candidature, sinon bouton « Préparer ma candidature » (= ancien `GenerateApplicationButton`, même `fetch`).
- `SearchControls` = ancien `scrape-jobs-controls` + `scrape-jobs-button` : mêmes champs et même corps ; affiche « Prochaine recherche possible à HH:MM » quand l'API répond 429 (lire `error`).
- Les actions gardent les corps : `applicationId`, `jobId`, `status`, `FormData cv`… (vérifier chaque fichier avec `git show main:components/app/<fichier>`).

- [ ] **Step 1 : Tests (échec d'abord)** — `offer-tile.test.tsx` : avec candidature « Envoyé » → tampon ; sans → étiquette « Nouveau » et bouton « Préparer ma candidature ». `search-controls.test.tsx` : `fetch` mocké 429 `{ error: "Prochaine recherche possible à 09:30" }` → le texte s'affiche. `application-actions.test.tsx` : « Marquer envoyée » envoie `{ applicationId, status: "Envoyé" }` (spy sur `fetch`).
- [ ] **Step 2 : Implémenter** les sept écrans selon spec §3 (Offres, fiche, Candidatures groupées par état avec tampons, Suivi en `Table`, Tableau de bord avec 4 `Kpi` + prochaines actions, Profil avec export/suppression, Onboarding en trois étapes avec barre bleue).
- [ ] **Step 3 : Lancer** `npm test` (tout, y compris `tests/api/**` qui doivent rester verts), `typecheck`, `lint`, `build`.
- [ ] **Step 4 : Commit** `git commit -am "feat(front): écrans du stagiaire en Bleu Klein (offres, candidature, suivi, tableau de bord, profil, onboarding)"`

---

### Task 5 : Organisme, admin, nettoyage, mesure

**Files:**
- Create: `components/actions/{regenerate-code,remove-member,organisation-seats}.tsx` (mêmes `fetch`)
- Modify: `app/(app)/organisme/page.tsx`, `app/(app)/admin/page.tsx`, `app/globals.css` (retirer le bloc legacy), `README.md` (capture ou description de l'interface)
- Delete: `components/ui/`, `components/app/` entiers
- Test: `tests/ui/organisme-page.test.tsx` (rendu avec données factices : code affiché en mono 40 px, places « 12 / 20 », lignes de stagiaires)

- [ ] **Step 1 : Pages** selon spec §3 (organisme : `Kpi` places, code + « Régénérer », `Table` stagiaires avec « Retirer » ; admin : `Table` organisations avec formulaire inline actif/places/e-mail du responsable).
- [ ] **Step 2 : Nettoyage** : `git rm -r components/ui components/app` ; `grep -rn "components/app\|components/ui" app components tests` → 0 ; retirer le bloc legacy de `globals.css` ; le test de grep couleurs passe sans exclusion.
- [ ] **Step 3 : Mesure** : `npm run build && npm run start` puis Lighthouse accessibilité sur `/`, `/login`, `/jobs` (avec un cookie de session pour `/jobs` : créer un compte via l'API en local, ou mesurer `/jobs` en état redirigé et le dire). Consigner les scores dans le rapport ; corriger tout ce qui est sous 95.
- [ ] **Step 4 : Lancer** tout ; `commit -am "feat(front): pages organisme et admin, suppression de l'ancienne interface, mesure Lighthouse"`.

---

## Auto-revue

- Spec §1 → T1 ; §2 → T2 (+ OfferTile/OfferList en T4, Shell en T3) ; §3 public → T3, stagiaire → T4, responsable/admin → T5 ; §4 copie → chaque tâche ; §5 qualité → T1 (gardes), T5 (Lighthouse, nettoyage) ; §6 hors périmètre respecté.
- Noms constants : `Stamp`, `Score`, `Button` (variants `primary|secondary|onBlue|quiet`), `Field`, `Shell`, `OfferTile`, `OfferList`, `SearchControls`, `Kpi`, `Table`, `Empty`, `Toast`, `PageTitle`, jetons `klein|klein-deep|klein-soft|paper|white|ink|grey|line|good|warn|bad`.
- Risque connu : les tests `tests/api/**` mockent `next/headers` et importent des routes, pas des composants ; la réécriture des composants ne les touche pas, mais un changement de corps `fetch` casserait l'app sans casser ces tests → d'où la consigne de relecture `git show main:…` et les tests `application-actions`/`search-controls` qui espionnent `fetch`.
