/** Équivalences « Vous pouvez remplacer par : » — calcul à partir de la bibliothèque (portions par famille et par aliment). */
export type LibEq = { id: string; label: string; cat: string; portion: number; foods: { id: string; name: string; portion: number }[] };
export type Equivalent = { eq: string; label: string; grams: number; isRef: boolean; foods: string[] };

const roundG = (g: number) => (g >= 20 ? Math.round(g / 5) * 5 : Math.round(g));

export function lineEquivalents(equivalences: Record<string, LibEq>, ref: string, grams: number, options: string[]): Equivalent[] {
  const refPortion = equivalences[ref]?.portion ?? 100;
  const out: Equivalent[] = [];
  for (const eid of options) {
    const eq = equivalences[eid];
    if (!eq) continue;
    const groups = new Map<number, { id: string; name: string }[]>();
    for (const f of eq.foods) {
      const arr = groups.get(f.portion) ?? [];
      arr.push(f);
      groups.set(f.portion, arr);
    }
    let main: { id: string; name: string }[] = [];
    groups.forEach((fids) => { if (fids.length > main.length) main = fids; });
    groups.forEach((fids, portion) => {
      const isMain = fids === main;
      out.push({
        eq: eid,
        label: isMain ? eq.label : fids.map((f) => f.name).join(" / "),
        grams: roundG(grams * portion / refPortion),
        isRef: eid === ref && isMain,
        foods: fids.length > 1 && fids.length <= 12 ? fids.map((f) => f.name) : [],
      });
    });
  }
  return out;
}

export const DIETITIAN_EMAIL = "aurelia.isnardon@gmail.com";
