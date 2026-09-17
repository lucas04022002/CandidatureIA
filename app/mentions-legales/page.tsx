import { LegalPage, type LegalSection } from "@/components/legal-page";
import {
  JOB_SOURCES,
  LEGAL,
  PROCESSED_DATA,
  RETENTION_MONTHS,
  SESSION_COOKIE_NAME,
  isRegistered,
} from "@/lib/legal";

export const metadata = { title: "Mentions légales", robots: { index: false } };

const sections: LegalSection[] = [
  {
    title: "Éditeur du service",
    blocks: [
      // La phrase suit le statut : citer un siège social et un SIREN pour une
      // personne physique qui n'en a pas serait faux, et l'omettre le
      // deviendrait le jour de l'immatriculation.
      isRegistered()
        ? `Le service ApplyBot est édité par ${LEGAL.editorName}, ${LEGAL.editorStatus}, dont le siège de l'activité est situé ${LEGAL.editorAddress}, immatriculé sous le numéro SIREN ${LEGAL.editorSiren}.`
        : `Le service ApplyBot est édité par ${LEGAL.editorName}, ${LEGAL.editorStatus}, établi en ${LEGAL.editorAddress}. Le service étant gratuit et sans activité commerciale, son éditeur n'est pas immatriculé.`,
      `Adresse e-mail de contact : ${LEGAL.editorEmail}.`,
    ],
  },
  {
    title: "Directeur de la publication",
    blocks: [`Le directeur de la publication est ${LEGAL.publicationDirector}, en sa qualité d'éditeur du service.`],
  },
  {
    title: "Hébergeur",
    blocks: [
      `Le service est hébergé par ${LEGAL.hostName}, ${LEGAL.hostAddress}, téléphone : ${LEGAL.hostPhone}. Les serveurs se situent dans l'Union européenne.`,
    ],
  },
  {
    title: "Propriété intellectuelle et sources des offres",
    blocks: [
      "Le nom ApplyBot, la structure du service, ses textes et son code sont la propriété exclusive de l'éditeur. Toute reproduction ou réutilisation, totale ou partielle, sans autorisation préalable est interdite.",
      `Les offres d'emploi affichées ne sont pas produites par ApplyBot : elles sont collectées auprès des sources suivantes, qui en restent propriétaires — ${JOB_SOURCES.join(", ")}. Elles peuvent avoir été modifiées ou retirées depuis leur dernier relevé ; seule la publication d'origine fait foi.`,
      "Le CV importé et les documents de candidature générés appartiennent à l'utilisateur. L'éditeur ne les réutilise pour aucune autre finalité.",
    ],
  },
  {
    title: "Données personnelles",
    blocks: [
      "Le traitement des données personnelles des utilisateurs est soumis au règlement général sur la protection des données (RGPD).",
      { subtitle: "Données traitées" },
      { list: PROCESSED_DATA },
      { subtitle: "Rôles" },
      "Lorsqu'un étudiant utilise ApplyBot dans le cadre d'une formation, l'organisme de formation qui lui ouvre l'accès est responsable de traitement, et l'éditeur d'ApplyBot agit comme sous-traitant au sens de l'article 28 du RGPD. Le responsable de l'organisme voit uniquement la liste de ses étudiants : adresse e-mail, date d'inscription et date de dernière connexion. Il n'a jamais accès à leur CV, à leurs offres ni à leurs candidatures.",
      { subtitle: "Finalité et base légale" },
      "Les données sont traitées pour créer le compte, importer un CV, rechercher et classer des offres, préparer des candidatures et en assurer le suivi. Le traitement repose sur l'exécution du contrat conclu lors de la création du compte, et sur l'intérêt légitime de l'éditeur pour la sécurité et le suivi technique du service.",
      { subtitle: "Destinataires" },
      "Aucune donnée personnelle n'est vendue, louée ni transmise à un tiers. Les données ne sortent pas de l'infrastructure de l'éditeur et de son hébergeur. Les sources d'offres citées plus haut sont interrogées avec des critères de recherche (métier, lieu, mots-clés) ; ni le CV, ni le profil, ni l'identité de l'utilisateur ne leur sont transmis.",
      { subtitle: "Durée de conservation" },
      `Les données sont conservées tant que le compte est actif, puis effacées ${RETENTION_MONTHS} mois après la dernière connexion : passé ce délai, le compte est purgé automatiquement (profil, CV importé, offres, candidatures) et son adresse e-mail est anonymisée.`,
      { subtitle: "Droits de l'utilisateur" },
      `Chaque utilisateur dispose d'un droit d'accès, de rectification, d'effacement, de limitation et de portabilité de ses données. Deux de ces droits s'exercent directement depuis la page « Profil » du service : « Exporter mes données » télécharge l'intégralité du compte au format JSON, « Supprimer mon compte » efface immédiatement le profil, les offres et les candidatures. Pour les autres demandes, écrire à ${LEGAL.editorEmail}.`,
      "En cas de désaccord persistant, l'utilisateur peut introduire une réclamation auprès de la Commission nationale de l'informatique et des libertés (CNIL, www.cnil.fr).",
    ],
  },
  {
    title: "Cookies",
    blocks: [
      `Le service dépose un seul cookie, nommé ${SESSION_COOKIE_NAME}, strictement nécessaire au maintien de la connexion au compte. Il ne sert à aucune autre fin et ne requiert pas de consentement préalable. ApplyBot ne dépose aucun traceur publicitaire et ne recourt à aucune mesure d'audience tierce.`,
    ],
  },
  {
    title: "Limitation de responsabilité",
    blocks: [
      "ApplyBot est un outil d'aide à la candidature : il collecte des offres, les classe et prépare des textes que l'utilisateur relit avant de les envoyer lui-même. Le service n'envoie aucune candidature à sa place, ne garantit aucun entretien ni aucune embauche, et ne saurait être tenu responsable du contenu des offres publiées par des tiers ni des décisions prises par l'utilisateur.",
      "L'éditeur met en œuvre les moyens raisonnables pour assurer un accès continu au service, sans garantie de disponibilité permanente.",
    ],
  },
  {
    title: "Contact",
    blocks: [
      `Pour toute question relative au service, à un compte ou aux présentes mentions légales : ${LEGAL.editorEmail}.`,
    ],
  },
];

export default function MentionsLegales() {
  return (
    <LegalPage
      eyebrow="Informations légales"
      title="Mentions légales"
      lastUpdate={LEGAL.lastUpdate}
      sections={sections}
      otherPage={{ href: "/cgu", label: "Conditions d'utilisation" }}
    />
  );
}
