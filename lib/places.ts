/**
 * Le nombre de places ouvertes à la création d'un organisme.
 *
 * Isolé ici, et non dans les requêtes : les pages publiques affichent ce
 * nombre, et importer `lib/db/queries/organisations` depuis une page tirerait
 * le client de base de données avec lui. Une seule constante, deux lecteurs.
 *
 * Il compte parce qu'il est FIXE : le responsable ne choisit pas son nombre de
 * places à l'inscription, il en demande davantage ensuite. Une page qui
 * promettrait un choix se ferait démentir au premier écran.
 */
export const PLACES_ESSAI = 3;
