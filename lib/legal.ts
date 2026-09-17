/**
 * Informations légales d'ApplyBot, centralisées pour les pages /mentions-legales et /cgu.
 *
 * Ces champs restaient à TO_FILL, et les pages affichaient donc « À COMPLÉTER » à seize
 * endroits, en public. Ils sont désormais renseignés avec ce que l'éditeur publie déjà sur son
 * portfolio — rien n'est inventé ici, et surtout pas un numéro d'immatriculation.
 *
 * Deux champs n'ont pas de valeur parce qu'ils n'ont pas d'objet, et le disent :
 *
 * - `editorSiren` : il n'y a pas d'immatriculation. Le service ne vend rien, ne facture rien et
 *   n'encaisse rien ; son éditeur agit comme personne physique. La page bascule d'elle-même sur
 *   la forme professionnelle le jour où un numéro est renseigné ici (voir `isRegistered`).
 * - `mediator` : le médiateur de la consommation n'est obligatoire qu'à partir du moment où un
 *   contrat est conclu avec un consommateur. Aucun ne l'est.
 *
 * L'hébergeur était annoncé comme Hetzner. Il ne l'est pas : applybot.lucasguilhot.fr répond
 * sur 51.254.216.32, un bloc OVH (FR-OVH-20150522). Une mention légale fausse est pire qu'une
 * mention absente.
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

/** Valeur d'un champ sans objet, par opposition à un champ non rempli. */
export const NOT_APPLICABLE = "Sans objet";

export const LEGAL: LegalInfo = {
  editorName: "Lucas Guilhot",
  editorStatus: "Personne physique — service non professionnel, sans activité commerciale",
  editorAddress: "Haute-Garonne (31), France",
  editorSiren: NOT_APPLICABLE,
  editorEmail: "lucasguilhot7@gmail.com",
  publicationDirector: "Lucas Guilhot",
  mediator: NOT_APPLICABLE,
  hostName: "OVH SAS",
  hostAddress: "2 rue Kellermann, 59100 Roubaix, France",
  hostPhone: "1007",
  lastUpdate: "17 septembre 2026",
};

/**
 * L'éditeur est-il immatriculé ?
 *
 * Les pages écrivent une phrase différente selon la réponse : mentionner un
 * siège social et un SIREN pour une personne physique qui n'en a pas serait
 * faux, et l'inverse le deviendrait le jour de l'immatriculation.
 */
export function isRegistered(legal: LegalInfo = LEGAL): boolean {
  return legal.editorSiren !== NOT_APPLICABLE && legal.editorSiren !== TO_FILL;
}

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
