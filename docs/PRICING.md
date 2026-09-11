# ApplyBot — Plans d'abonnement & quotas (proposition)

> Document de travail — rien n'est encore implémenté côté code.
> Objectif : 2 plans payants + essai gratuit, avec quotas mesurables.

## 🎯 Starter — 7,90 €/mois

Pour une recherche d'emploi classique (quelques candidatures par jour).

| Quota | Limite |
|---|---|
| Générations IA (lettre + email + LinkedIn) | **100 / mois** |
| Offres suivies dans le pipeline | 100 |
| Scoring | Heuristique + 50 scorings IA/mois |
| Relances générées | 30 / mois |
| Profils CV | 1 |

Coût OpenAI estimé : ~0,30 €/utilisateur/mois → **marge brute ~95 %**.

## 🚀 Pro — 14,90 €/mois

Pour la recherche intensive (reconversion, alternance, fin d'études).

| Quota | Limite |
|---|---|
| Générations IA | **400 / mois** (fair use) |
| Offres suivies | Illimité |
| Scoring | IA systématique sur toutes les offres |
| Relances | Illimitées |
| Profils CV | 3 (ex. un par type de poste visé) |

Coût OpenAI estimé : ~1,50 €/utilisateur/mois max → **marge brute ~90 %**.

## Essai gratuit (acquisition)

- **5 générations IA offertes, sans carte bancaire** (coût : ~0,01 €/inscrit).
- C'est l'argument de conversion principal : l'utilisateur voit la qualité
  de la lettre avant de payer.

## Principes de pricing

- Le différenciateur principal entre les plans est le **volume de générations IA**
  (100 vs 400) : valeur perçue la plus forte, et facile à compter côté code.
- Une génération complète coûte ~0,0025 $ d'OpenAI (gpt-4.1-mini,
  ~1 500 tokens in / ~1 200 tokens out). L'IA n'est jamais le poste de coût limitant.

## Coûts fixes de référence (à jour 2026-06)

| Poste | Coût |
|---|---|
| Supabase Pro | ~25 $/mois |
| Vercel Pro (tier gratuit = usage commercial interdit) | ~20 $/mois |
| Nom de domaine | ~10 €/an |
| Stripe | ~1,5 % + 0,25 € par transaction (Europe) |

Point mort : **~5 abonnés Starter**. À 100 abonnés à 9,90 € de panier moyen :
~990 €/mois de revenus pour ~70 €/mois de coûts.

## Implémentation prévue

1. Table `subscriptions` : `user_id`, `plan` (`starter` | `pro`), statut Stripe,
   période en cours.
2. Table `usage_counters` : `user_id`, mois (`YYYY-MM`), compteur par type
   d'action (`generation`, `followup`, `ai_scoring`).
3. Check de quota au début de `/api/generate-application` et
   `/api/generate-followup` : si quota atteint → HTTP 402 avec message
   « Passe au plan Pro ».
4. Stripe Checkout (2 produits récurrents) + webhook pour activer/désactiver
   le plan.
5. Le système de quotas (compteurs + vérifications) est indépendant de Stripe :
   il peut être implémenté en premier, Stripe se branche dessus ensuite.

## ⚠️ Points de vigilance avant commercialisation

- **La Bonne Alternance** : API réservée aux usages **non lucratifs** →
  à retirer ou négocier un accord avant de faire payer.
- **France Travail** : relire les conditions d'usage de l'accès partenaire.
- **Adzuna / Jooble** : tiers gratuits avec quotas → mutualiser le scraping
  (un cron unique pour tous les utilisateurs au lieu d'un scrape par user).
- **Rate limiting** par utilisateur sur les routes coûteuses, même pour les abonnés.
- **RGPD** : l'app stocke des CV (données personnelles) → mentions légales,
  politique de confidentialité, droit à l'effacement.
