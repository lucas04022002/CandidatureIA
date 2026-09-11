import { closeDb } from "../lib/db/client";
import { purgeInactiveUsers } from "../lib/db/queries/users";
import { RETENTION_MONTHS } from "../lib/legal";

/**
 * Purge des comptes dormants, à lancer périodiquement (cron mensuel) :
 *   npm run purge-inactive
 *
 * Un compte sans connexion depuis RETENTION_MONTHS mois (ou créé il y a plus longtemps que cela
 * sans s'être jamais connecté) voit ses données effacées et son e-mail anonymisé. Le compte
 * administrateur n'est jamais purgé : c'est le compte d'exploitation du service.
 */
async function main() {
  const before = new Date();
  before.setMonth(before.getMonth() - RETENTION_MONTHS);

  const purged = await purgeInactiveUsers(before);
  const seuil = before.toLocaleDateString("fr-FR", { dateStyle: "medium" });
  console.log(`${purged} compte(s) purgé(s) : aucune connexion depuis le ${seuil}.`);
}

main()
  .then(closeDb)
  .catch(async (e) => {
    console.error(e);
    await closeDb();
    process.exit(1);
  });
