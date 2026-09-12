import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// `test.globals` n'est pas activé dans vitest.config.mts (chaque fichier importe explicitement
// `describe`/`it`/`expect`) : le nettoyage automatique de @testing-library/react (qui ne s'enregistre
// que si `afterEach` existe déjà en global) ne se déclenche jamais. Sans ce hook, plusieurs `render()`
// dans un même fichier de test (cas normal : un `it` par variante d'un composant) accumulent leurs
// nœuds dans le même `document`, et `getByRole`/`getByText` échouent avec « multiple elements found ».
afterEach(() => {
  cleanup();
});
