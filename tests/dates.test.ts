import { describe, expect, it } from "vitest";
import { formatParisDate, formatParisTime, parisDay } from "@/lib/dates";

// Ces cas sont choisis pour être FAUX si on retire `timeZone: "Europe/Paris"` et qu'on laisse le
// fuseau du serveur décider : en production le conteneur tourne en UTC, et c'est exactement là que
// /dashboard et /applications/[id] se trompaient. Les instants sont donnés en UTC (« Z »), donc le
// résultat attendu ne dépend pas de la machine qui exécute le test.
describe("dates parisiennes", () => {
  it("l'été (CEST, +02:00) : 22:30 UTC est déjà le lendemain à Paris", () => {
    const instant = new Date("2026-09-11T22:30:00Z");
    expect(parisDay(instant)).toBe("2026-09-12");
    expect(formatParisTime(instant)).toBe("00:30");
  });

  it("l'hiver (CET, +01:00) : 23:30 UTC est déjà le lendemain à Paris", () => {
    const instant = new Date("2026-01-11T23:30:00Z");
    expect(parisDay(instant)).toBe("2026-01-12");
    expect(formatParisTime(instant)).toBe("00:30");
  });

  it("l'hiver, une demi-heure plus tôt, on est encore la veille", () => {
    expect(parisDay(new Date("2026-01-11T22:30:00Z"))).toBe("2026-01-11");
  });

  it("deux instants du même jour parisien se comparent égaux", () => {
    // 23:10 UTC le 11 et 05:00 UTC le 12 : deux jours UTC différents, un seul jour à Paris.
    const soir = new Date("2026-09-11T23:10:00Z");
    const matin = new Date("2026-09-12T05:00:00Z");
    expect(parisDay(soir)).toBe(parisDay(matin));
  });

  it("formatParisDate : « 12 septembre » par défaut, « 12/09 » en forme courte", () => {
    const instant = new Date("2026-09-11T22:30:00Z");
    expect(formatParisDate(instant)).toBe("12 septembre");
    expect(formatParisDate(instant, { day: "2-digit", month: "2-digit" })).toBe("12/09");
  });

  it("une date absente ou invalide ne produit aucun libellé", () => {
    for (const value of [null, undefined, new Date("pas une date")]) {
      expect(parisDay(value)).toBeNull();
      expect(formatParisTime(value)).toBeNull();
      expect(formatParisDate(value)).toBeNull();
    }
  });
});
