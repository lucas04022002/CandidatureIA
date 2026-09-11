/**
 * Informations légales d'ApplyBot, centralisées pour les pages /mentions-legales et /cgu.
 *
 * L'hébergeur et la date de mise à jour sont connus et renseignés ci-dessous. Les champs liés à
 * l'éditeur (identité, adresse, SIREN, contact) valent volontairement TO_FILL (« À COMPLÉTER »)
 * tant que l'éditeur ne les a pas remplis lui-même : ne jamais inventer ici un nom, une adresse,
 * un numéro d'immatriculation ou un médiateur.
 *
 * Garde-fou de mise en ligne : voir tests/legal.test.ts. Ce test n'échoue sur un champ resté à
 * TO_FILL que si la variable d'environnement CI_STRICT_LEGAL vaut "1" — la CI reste donc verte
 * tant que ces champs sont vides. Pour activer le contrôle au lancement commercial : exporter
 * CI_STRICT_LEGAL=1 avant `npm test` (ou l'ajouter au bloc `env:` du job de CI), une fois tous les
 * champs ci-dessous renseignés.
 */

export const TO_FILL = "À COMPLÉTER";

export interface LegalInfo {
  /** Dénomination ou nom et prénom de l'éditeur du service. */
  editorName: string;
  /** Statut juridique de l'éditeur, ex. « Entrepreneur individuel (EI) », « SAS ». */
  editorStatus: string;
  /** Adresse du siège de l'activité (adresse postale). */
  editorAddress: string;
  /** Numéro SIREN de l'éditeur. */
  editorSiren: string;
  /** Adresse e-mail de contact, utilisée aussi pour l'exercice des droits RGPD. */
  editorEmail: string;
  /** Directeur de la publication (généralement l'éditeur lui-même). */
  publicationDirector: string;
  /** Médiateur de la consommation, obligatoire dès qu'un contrat est conclu avec un consommateur. */
  mediator: string;
  /** Raison sociale de l'hébergeur. */
  hostName: string;
  /** Adresse postale de l'hébergeur. */
  hostAddress: string;
  /** Numéro de téléphone de l'hébergeur. */
  hostPhone: string;
  /** Date de dernière mise à jour des pages légales, au format long français. */
  lastUpdate: string;
}

export const LEGAL: LegalInfo = {
  editorName: TO_FILL,
  editorStatus: TO_FILL,
  editorAddress: TO_FILL,
  editorSiren: TO_FILL,
  editorEmail: TO_FILL,
  publicationDirector: TO_FILL,
  mediator: TO_FILL,
  hostName: "Hetzner Online GmbH",
  hostAddress: "Industriestr. 25, 91710 Gunzenhausen, Allemagne",
  hostPhone: "+49 9831 505-0",
  lastUpdate: "11 septembre 2026",
};

/** Cookie unique déposé par le service (voir SESSION_COOKIE dans lib/auth/session.ts). */
export const SESSION_COOKIE_NAME = "ab_session";

/** Conservation : un compte sans connexion depuis 12 mois est purgé (scripts/purge-inactive.ts). */
export const RETENTION_MONTHS = 12;

/** Données traitées par le service, énumérées telles quelles dans les mentions légales. */
export const PROCESSED_DATA = [
  "l'adresse e-mail, utilisée pour la création du compte et la connexion ;",
  "le mot de passe, jamais stocké en clair : seule une empreinte (hachage) est conservée ;",
  "le texte extrait du CV importé par l'utilisateur, et le profil qui en est déduit (métier visé, compétences, localisation, coordonnées présentes dans le CV) ;",
  "les offres d'emploi collectées pour l'utilisateur et le score attribué à chacune ;",
  "les candidatures préparées (lettre, e-mail, message LinkedIn, relance) et leur statut ;",
  "des horodatages techniques : création du compte, dernière connexion, imports de CV, recherches lancées.",
];

/** Sources d'offres interrogées par le service, citées dans les mentions légales. */
export const JOB_SOURCES = [
  "France Travail",
  "Adzuna",
  "Jooble",
  "La Bonne Alternance",
  "Greenhouse",
  "Lever",
  "SmartRecruiters",
];
