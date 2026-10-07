import type { ReactNode } from "react";
import { RegenerateCodeAction } from "@/components/actions/regenerate-code";
import { RemoveMemberAction } from "@/components/actions/remove-member";
import { Empty } from "@/components/empty";
import { Kpi } from "@/components/kpi";
import { PageTitle } from "@/components/page-title";
import { Table, type TableColumn } from "@/components/table";
import { PLACES_ESSAI } from "@/lib/db/queries/organisations";

export interface OrganisationMember {
  id: string;
  email: string;
  createdAt: Date;
  lastLoginAt: Date | null;
  // Avancement, seulement pour un étudiant qui l'a accepté (`shareProgress === true`) ; sinon les
  // trois champs suivants valent `null` dès la requête (`listMembers`).
  shareProgress: boolean | null;
  sentCount: number | null;
  lastSentAt: Date | null;
  foundCompanyAt: Date | null;
}

export interface OrganisationViewProps {
  name: string;
  code: string;
  seats: number;
  active: boolean;
  createdAt: Date;
  members: OrganisationMember[];
}

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });
const dateTimeFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });
const dayFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

// Ce que la colonne dit d'un étudiant : rien s'il ne partage pas, sinon un nombre, une date et un
// statut. Jamais une entreprise ni une offre : la requête ne les lit même pas.
function avancement(member: OrganisationMember): string {
  if (member.shareProgress !== true) return "Non partagé";
  if (member.foundCompanyAt) return `Entreprise trouvée le ${dayFormat.format(member.foundCompanyAt)}`;
  const n = member.sentCount ?? 0;
  const envoyees = `${n} envoyée${n > 1 ? "s" : ""}`;
  const derniere = member.lastSentAt ? ` · dernière le ${dayFormat.format(member.lastSentAt)}` : "";
  return `${envoyees}${derniere} · En recherche`;
}

function resume(members: OrganisationMember[]): string {
  const partagent = members.filter((member) => member.shareProgress === true);
  const trouve = partagent.filter((member) => member.foundCompanyAt).length;
  return [
    `${trouve} ${trouve > 1 ? "ont" : "a"} trouvé une entreprise`,
    `${partagent.length} ${partagent.length > 1 ? "partagent leur" : "partage son"} avancement sur ${members.length} inscrit${members.length > 1 ? "s" : ""}`,
  ].join(" · ");
}

type MemberRow = {
  key: string;
  email: string;
  inscrit: string;
  connexion: string;
  avancement: string;
  retirer: ReactNode;
};

const COLUMNS: TableColumn<MemberRow>[] = [
  { key: "email", label: "E-mail" },
  { key: "inscrit", label: "Inscrit le" },
  { key: "connexion", label: "Dernière connexion" },
  { key: "avancement", label: "Avancement" },
  // En-tête nommé plutôt que vide : une colonne d'actions sans intitulé laisse un `<th>` muet, que
  // le lecteur d'écran annonce comme une colonne sans nom.
  { key: "retirer", label: "Action" },
];

/**
 * La partie présentable de `/organisme`. La page (composant serveur) lit la base et lui passe des
 * données déjà résolues : c'est ce qui rend l'écran testable en jsdom sans base ni session.
 */
export function OrganisationView({ name, code, seats, active, createdAt, members }: OrganisationViewProps) {
  const used = members.length;
  const remaining = Math.max(seats - used, 0);

  const rows: MemberRow[] = members.map((member) => ({
    key: member.id,
    email: member.email,
    inscrit: dateFormat.format(member.createdAt),
    connexion: member.lastLoginAt ? dateTimeFormat.format(member.lastLoginAt) : "Jamais",
    avancement: avancement(member),
    retirer: <RemoveMemberAction userId={member.id} email={member.email} />,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Mon organisme"
        subtitle="Le code d'inscription de vos étudiants, vos places et les comptes ouverts. Vous voyez l'avancement de ceux qui l'acceptent, jamais leurs CV ni le contenu de leurs candidatures."
      />

      {active && seats <= PLACES_ESSAI ? (
        <p
          role="status"
          className="rounded-tile border border-line bg-white px-4 py-3 font-body text-[14px] text-grey"
        >
          Vous disposez de {seats} places d&apos;essai. Écrivez-nous pour en ouvrir davantage —
          votre organisme fonctionne dès maintenant.
        </p>
      ) : null}

      {active ? null : (
        // role="status" : l'avertissement décide si les inscriptions passent ou non, il doit être
        // annoncé et pas seulement coloré.
        <p
          role="status"
          className="rounded-tile border border-warn bg-warn-soft px-4 py-3 font-body text-[14px] text-warn"
        >
          Organisme pas encore activé : tant qu&apos;il ne l&apos;est pas, les inscriptions de
          étudiants sont refusées. Écrivez-nous pour l&apos;activer.
        </p>
      )}

      <section className="flex flex-col gap-5 rounded-tile border border-line bg-white px-6 py-5">
        <div>
          <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-grey">
            Code d&apos;organisme · {name}
          </p>
          <p className="tnum mt-2 break-all font-display text-[28px] font-extrabold leading-none tracking-[0.06em] text-ink sm:text-[40px]">
            {code}
          </p>
          <p className="mt-2 font-body text-[14px] text-grey">
            Vos étudiants saisissent ce code à la création de leur compte. Organisme ouvert le{" "}
            {dateFormat.format(createdAt)}.
          </p>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-line pt-5">
          <Kpi value={`${used} / ${seats}`} label="places utilisées" />
          <p className="max-w-md font-body text-[14px] text-grey">
            {remaining > 0
              ? `${remaining} place${remaining > 1 ? "s" : ""} disponible${remaining > 1 ? "s" : ""}. Retirer un étudiant en libère une.`
              : "Plus aucune place disponible : les nouvelles inscriptions sont refusées."}
          </p>
          <RegenerateCodeAction />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-[22px] font-extrabold leading-none text-ink">Étudiants</h2>
        {rows.length ? <p className="font-body text-[14px] text-grey">{resume(members)}</p> : null}
        {rows.length ? (
          <div className="overflow-x-auto rounded-tile border border-line bg-white px-2 py-1">
            <Table columns={COLUMNS} rows={rows} getRowKey={(row) => row.key} />
          </div>
        ) : (
          <Empty text="Aucun étudiant inscrit. Communiquez le code d'organisme à votre promo : chaque compte créé apparaîtra ici." />
        )}
      </section>
    </div>
  );
}
