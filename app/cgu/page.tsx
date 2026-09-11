import { LegalPage, type LegalSection } from "@/components/app/legal-page";
import { JOB_SOURCES, LEGAL, RETENTION_MONTHS } from "@/lib/legal";

export const metadata = { title: "Conditions d'utilisation", robots: { index: false } };

const sections: LegalSection[] = [
  {
    title: "Objet du service",
    blocks: [
      `ApplyBot est un outil d'aide à la candidature destiné aux organismes de formation et à leurs stagiaires. Il collecte des offres d'emploi auprès de sources publiques (${JOB_SOURCES.join(", ")}), les classe selon le profil issu du CV importé, et prépare des textes de candidature (lettre, e-mail, message LinkedIn, relance) que l'utilisateur relit et envoie lui-même.`,
      "ApplyBot n'envoie aucune candidature à la place de l'utilisateur, ne publie aucune offre et ne garantit ni entretien ni embauche.",
    ],
  },
  {
    title: "Contrat avec l'organisme de formation",
    blocks: [
      { subtitle: "Ouverture du compte organisme" },
      "Un organisme de formation crée son espace depuis la page d'inscription dédiée. Un code d'organisme à huit caractères lui est attribué : c'est ce code que ses stagiaires utilisent pour créer leur compte.",
      { subtitle: "Activation et places" },
      "L'espace est créé inactif et sans place. L'éditeur l'active et fixe le nombre de places après échange avec l'organisme. Tant que l'espace est inactif, aucune inscription de stagiaire n'est possible. Lorsque toutes les places sont occupées, une nouvelle inscription est refusée jusqu'à ce qu'une place soit libérée ou que le nombre de places soit relevé.",
      "Le responsable de l'organisme administre ses places : il peut régénérer le code d'inscription à tout moment (l'ancien code cesse alors immédiatement de fonctionner) et retirer un stagiaire, ce qui supprime le compte de ce stagiaire et libère sa place.",
      { subtitle: "Durée, résiliation et fin de contrat" },
      "Le contrat est conclu pour la durée convenue entre l'organisme et l'éditeur, et se poursuit tant que l'espace reste actif. Chaque partie peut y mettre fin à tout moment : l'organisme en le demandant à l'éditeur, l'éditeur en désactivant l'espace en cas de manquement grave aux présentes conditions, après en avoir informé l'organisme.",
      "À la fin du contrat, l'espace est désactivé : aucune nouvelle inscription n'est possible et les comptes des stagiaires sont supprimés selon les modalités convenues avec l'organisme, ou purgés automatiquement selon la durée de conservation indiquée plus bas.",
      { subtitle: "Sous-traitance (RGPD, article 28)" },
      "Pour les données des stagiaires, l'organisme de formation est responsable de traitement et l'éditeur d'ApplyBot agit comme sous-traitant. À ce titre, l'éditeur s'engage à :",
      {
        list: [
          "ne traiter les données que sur instruction de l'organisme et pour les seules finalités du service décrit ci-dessus ;",
          "n'employer aucune donnée de stagiaire à d'autres fins, notamment commerciales, et ne la transmettre à aucun tiers ;",
          "garantir la confidentialité des données et n'en donner l'accès qu'aux personnes qui en ont besoin pour exploiter le service ;",
          "mettre en œuvre des mesures techniques adaptées : mots de passe hachés, cloisonnement des données par compte, hébergement dans l'Union européenne ;",
          "aider l'organisme à répondre aux demandes d'exercice des droits de ses stagiaires et à notifier toute violation de données dans les meilleurs délais ;",
          "n'engager aucun sous-traitant ultérieur pour le traitement de ces données sans en informer l'organisme ;",
          "supprimer ou restituer les données à la fin du contrat, sans en conserver de copie.",
        ],
      },
      "Le responsable de l'organisme ne voit de ses stagiaires que leur adresse e-mail, leur date d'inscription et leur date de dernière connexion. Le CV, les offres et les candidatures d'un stagiaire ne sont accessibles qu'à ce stagiaire.",
    ],
  },
  {
    title: "Notice destinée au stagiaire",
    blocks: [
      { subtitle: "Compte personnel" },
      "Le compte est strictement personnel et incessible. Le stagiaire est responsable de la confidentialité de son mot de passe et de toute activité effectuée depuis son compte.",
      { subtitle: "Âge" },
      "L'utilisation du service est réservée aux personnes majeures ; un stagiaire mineur ne peut créer un compte qu'avec l'accord de son organisme de formation et de son représentant légal.",
      { subtitle: "Usage attendu" },
      "Le stagiaire s'engage à utiliser le service pour ses propres candidatures, à fournir des informations exactes, à relire chaque texte généré avant de l'envoyer et à n'importer que des documents dont il dispose légitimement.",
      { subtitle: "Interdictions" },
      {
        list: [
          "extraire ou copier automatiquement les données du service (scraping), quel qu'en soit le moyen ;",
          "revendre, redistribuer ou communiquer à des tiers les offres et les données du service ;",
          "partager ses identifiants, ou utiliser le compte d'une autre personne ;",
          "importer des contenus illicites ou le CV d'un tiers sans son accord.",
        ],
      },
      { subtitle: "Suppression du compte" },
      `Le stagiaire peut à tout moment exporter ses données ou supprimer son compte depuis la page « Profil ». La suppression efface immédiatement le profil, le CV importé, les offres et les candidatures ; elle est définitive et libère la place occupée dans l'organisme. Le responsable de l'organisme peut également retirer un stagiaire, avec le même effet. Un compte sans connexion depuis ${RETENTION_MONTHS} mois est purgé automatiquement.`,
    ],
  },
  {
    title: "Disponibilité et évolutions",
    blocks: [
      "L'éditeur met en œuvre les moyens raisonnables pour assurer un accès continu au service, sans garantie de disponibilité permanente. Le service peut être interrompu ponctuellement pour maintenance, mise à jour ou en cas de panne, sans que cela ouvre droit à indemnité.",
      "Les sources d'offres sont susceptibles d'évoluer : une source peut être ajoutée, remplacée ou retirée si elle cesse d'être disponible.",
    ],
  },
  {
    title: "Responsabilité",
    blocks: [
      "Les offres affichées proviennent de tiers : l'éditeur ne garantit ni leur exactitude, ni leur disponibilité, ni le sérieux de leurs auteurs. Les textes de candidature sont des propositions à relire et à corriger : l'utilisateur reste seul auteur de ce qu'il envoie.",
      "L'éditeur ne garantit aucun résultat en matière de recherche d'emploi ou d'alternance.",
    ],
  },
  {
    title: "Données personnelles",
    blocks: [
      "Le traitement des données personnelles est décrit dans les mentions légales, section « Données personnelles » : données traitées, rôles, durée de conservation, droits et contact.",
    ],
  },
  {
    title: "Modification des conditions",
    blocks: [
      "L'éditeur peut modifier les présentes conditions, notamment pour tenir compte de l'évolution du service ou de la réglementation. La date de dernière mise à jour figurant en tête de page fait foi ; toute modification substantielle est portée à la connaissance des organismes et des utilisateurs.",
    ],
  },
  {
    title: "Droit applicable et litiges",
    blocks: [
      "Les présentes conditions sont soumises au droit français.",
      `Conformément aux articles L616-1 et suivants du code de la consommation, en cas de litige non résolu directement avec l'éditeur, l'utilisateur consommateur peut recourir gratuitement au service de médiation de la consommation suivant : ${LEGAL.mediator}.`,
      "À défaut de résolution amiable, les tribunaux français compétents seront saisis.",
    ],
  },
];

export default function Cgu() {
  return (
    <LegalPage
      eyebrow="Conditions générales"
      title="Conditions d'utilisation"
      lastUpdate={LEGAL.lastUpdate}
      intro="Les présentes conditions générales d'utilisation régissent l'accès au service ApplyBot. Elles se composent d'un contrat conclu avec l'organisme de formation qui ouvre l'accès, et d'une notice qui s'applique à chaque stagiaire disposant d'un compte. L'identité de l'éditeur figure dans les mentions légales."
      sections={sections}
      otherPage={{ href: "/mentions-legales", label: "Mentions légales" }}
    />
  );
}
