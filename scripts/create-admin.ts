// En premier : peuple process.env depuis .env avant que lib/db/client.ts ne le lise.
import "./load-env";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { eq } from "drizzle-orm";
import { db, closeDb, isPglite } from "../lib/db/client";
import { users } from "../lib/db/schema";
import { hashPassword } from "../lib/auth/password";
import { createUser } from "../lib/db/queries/users";

async function main() {
  if (isPglite()) {
    // PGlite en fichier n'accepte qu'UN seul processus à la fois : lancer ce script pendant que
    // `npm run dev` tourne corrompt la base (« RuntimeError: Aborted() » à la requête suivante) et
    // le serveur ne voit de toute façon pas le compte créé. On le dit avant d'écrire quoi que ce soit.
    const rlGuard = createInterface({ input: stdin, output: stdout });
    try {
      console.log("Base PGlite locale : arrêtez d'abord le serveur de développement (npm run dev, dev.cmd ou l'aperçu), sinon la base sera corrompue.");
      const answer = (await rlGuard.question("Le serveur est bien arrêté ? [o/N] ")).trim().toLowerCase();
      if (answer !== "o" && answer !== "oui") {
        console.log("Abandon : arrêtez le serveur puis relancez npm run create-admin.");
        return;
      }
    } finally {
      rlGuard.close();
    }
  }
  const [existingAdmin] = await db.select().from(users).where(eq(users.role, "admin")).limit(1);
  if (existingAdmin) {
    console.error(`Un administrateur existe déjà (${existingAdmin.email}). Abandon.`);
    process.exitCode = 1;
    return;
  }

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const email = (await rl.question("E-mail de l'administrateur : ")).trim().toLowerCase();
    if (!email || !email.includes("@")) throw new Error("E-mail invalide");

    const password = await rl.question("Mot de passe (10 caractères minimum) : ");
    if (!password || password.length < 10) throw new Error("Mot de passe trop court (10 caractères minimum)");

    const passwordHash = await hashPassword(password);
    const admin = await createUser({ email, passwordHash, role: "admin", organisationId: null });
    console.log(`Administrateur créé : ${admin.email}`);
  } finally {
    rl.close();
  }
}

main()
  .then(closeDb)
  .catch(async (e) => {
    console.error(e);
    await closeDb();
    process.exit(1);
  });
