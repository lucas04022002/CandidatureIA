// En premier : peuple process.env depuis .env avant que lib/db/client.ts ne le lise.
import "./load-env";
import { closeDb } from "../lib/db/client";
import { listOrganisationsWithoutResponsable } from "../lib/db/queries/organisations";
import { purgeInactiveUsers } from "../lib/db/queries/users";
import { RETENTION_MONTHS } from "../lib/legal";

/**
 * Purge des comptes dormants, à lancer périodiquement (cron mensuel) :
 *   npm run purge-inactive
 *
 * Un compte sans connexion depuis RETENTION_MONTHS mois (ou créé il y a plus longtemps que cela
 * sans s'être jamais connecté) voit ses données effacées et son e-mail anonymisé. Le compte
 * administrateur n'est jamais purgé : c'est le compte d'exploitation du service.
 *
 * La purge peut laisser un organisme sans aucun responsable actif : le script le signale en fin
 * d'exécution, mais ne désactive rien — couper l'accès des étudiants reste une décision humaine.
 */
async function main() {
  const before = new Date();
  before.setMonth(before.getMonth() - RETENTION_MONTHS);

  const purged = await purgeInactiveUsers(before);
  const seuil = before.toLocaleDateString("fr-FR", { dateStyle: "medium" });
  console.log(`${purged} compte(s) purgé(s) : aucune connexion depuis le ${seuil}.`);

  const orphelins = await listOrganisationsWithoutResponsable();
  for (const organisation of orphelins) {
    console.warn(`organisation ${organisation.name} sans responsable (code ${organisation.code}) — aucune désactivation automatique.`);
  }
  if (orphelins.length === 0) console.log("Tous les organismes ont au moins un responsable actif.");
}

main()
  .then(closeDb)
  .catch(async (e) => {
    console.error(e);
    await closeDb();
    process.exit(1);
  });
