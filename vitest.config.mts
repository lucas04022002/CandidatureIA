import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig({
  plugins: [react()],
  test: {
    // Par défaut node (API, DB, scoring…) ; les tests UI (tests/ui/**) passent en jsdom via
    // le commentaire `@vitest-environment jsdom` en tête de chaque fichier concerné —
    // `environmentMatchGlobs` a disparu de Vitest 4.
    environment: "node",
    setupFiles: ["tests/setup.ts", "tests/ui/setup-dom.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    testTimeout: 15000,
    // Fichiers de test exécutés les uns après les autres. Chaque fichier qui touche la base appelle
    // `resetDatabase()` (drop/recrée le schéma public) : sur un Postgres partagé — ce que fait la CI —
    // les exécuter en parallèle est réellement incorrect, un fichier droppant le schéma pendant qu'un
    // autre est en plein test. Sous PGlite chaque processus a sa propre base en mémoire, mais faire
    // tourner une douzaine d'instances WASM en même temps sature la machine et fait expirer les hooks
    // (`beforeAll`) à 10 s. La CI passait déjà `--no-file-parallelism` à la main : le mettre ici aligne
    // `npm test` sur ce que la CI exécute vraiment.
    fileParallelism: false,
  },
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
});
