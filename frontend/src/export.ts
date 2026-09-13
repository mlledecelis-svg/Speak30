import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Program, Day, MEAL_ORDER, MEAL_LABELS } from "./program-store";

const LOGO_URL = "https://customer-assets-39nsmqrw.emergentagent.net/job_food-plan-app-3/artifacts/0t2wa219_logo-olive.webp";
const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

type Shopping = { sections: { name: string; items: any[] }[]; home: any[] } | null;

export function buildWeekHtml(program: Program, weekIndex: number, shopping: Shopping): string {
  const week = program.weeks[weekIndex];
  const days = week.days
    .map((d) => {
      const meals = MEAL_ORDER.filter((m) => d.meals[m]?.recipe)
        .map((m) => {
          const meal = d.meals[m];
          const comps = meal.components.map((c) => `${esc(c.food_name)} <b>${c.grams} g</b>`).join(" · ");
          return `<div class="meal"><div class="ml">${esc(MEAL_LABELS[m])}</div><div class="mn">${esc(meal.recipe.name)} <span class="mt">⏱ ${meal.recipe.minutes} min · ${esc(meal.recipe.difficulty_label)}</span></div><div class="mc">${comps}</div></div>`;
        })
        .join("");
      return `<section class="day"><h2>${esc(d.day)}</h2>${meals}</section>`;
    })
    .join("");
  const shop = shopping
    ? `<h1 class="pb">🛒 Courses — Semaine ${week.week}</h1>${shopping.home.length ? `<p class="home">🧺 Déjà à la maison : ${shopping.home.map((h) => esc(h.name)).join(", ")}</p>` : ""}<div class="grid">${shopping.sections
        .map((s) => `<div class="ray"><h3>${esc(s.name)}</h3><ul>${s.items.map((i) => `<li>☐ ${esc(i.name)} <b>${i.raw_grams} g${i.has_conversion ? " cru" : ""}</b>${i.units ? ` <i>(≈ ${i.units} ${esc(i.unit_label)}${i.units > 1 ? "s" : ""})</i>` : ""}</li>`).join("")}</ul></div>`)
        .join("")}</div>`
    : "";
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Mon plan alimentaire — Semaine ${week.week}</title>
<style>
body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1F2A1E;background:#FAF7F0;margin:0;padding:24px}
h1{font-weight:300;font-size:26px;margin:0 0 4px;color:#1F2A1E} .sub{color:#7A8378;font-size:12px;margin-bottom:18px;letter-spacing:2px;text-transform:uppercase}
.day{background:#fff;border:1px solid #E6E0D2;border-radius:14px;padding:14px 16px;margin-bottom:12px;page-break-inside:avoid}
h2{font-size:17px;margin:0 0 8px;color:#4E6B4A} .meal{padding:8px 0;border-top:1px solid #F0EBE0} .ml{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#B08D57;font-weight:700}
.mn{font-size:14px;font-weight:600;margin-top:2px} .mt{font-weight:400;color:#7A8378;font-size:12px} .mc{font-size:12px;color:#4A5548;margin-top:3px} .mc b{color:#B08D57}
.pb{page-break-before:always;margin-top:8px} .home{background:#E3EEDF;padding:10px 14px;border-radius:10px;font-size:13px;color:#2F4A2C}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px} .ray{background:#fff;border:1px solid #E6E0D2;border-radius:12px;padding:12px 14px;page-break-inside:avoid}
h3{margin:0 0 6px;font-size:13px;color:#4E6B4A;letter-spacing:1px;text-transform:uppercase} ul{list-style:none;padding:0;margin:0} li{font-size:13px;padding:4px 0;border-top:1px solid #F0EBE0} li b{color:#B08D57} li i{color:#7A8378;font-size:11px}
.brand{display:flex;align-items:center;gap:16px;margin-bottom:14px} .brand img{width:96px;height:auto}
.foot{margin-top:18px;font-size:11px;color:#7A8378;text-align:center}
</style></head><body>
<div class="brand"><img src="${LOGO_URL}" alt="La Diététique — Aurelia Isnardon" /><div><h1>Mon plan alimentaire — Semaine ${week.week}</h1><div class="sub">${esc(program.name)} · menus & recettes · La Diététique, Aurelia Isnardon</div></div></div>
${days}${shop}
<div class="foot">Quantités adaptées au plan alimentaire professionnel · La Diététique — Aurelia Isnardon, depuis 2000</div>
</body></html>`;
}

/** Fiche frigo : design épuré, 2 pages A4 — chaque plat est suivi de sa recette détaillée. */
export function buildFridgeHtml(program: Program, weekIndex: number, photoUrl?: (p?: string | null) => string | null): string {
  const week = program.weeks[weekIndex];
  const short: Record<string, string> = { breakfast: "Petit-déjeuner", lunch: "Déjeuner", snack: "Collation", dinner: "Dîner" };
  const clip = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t);
  const dayCard = (d: Day) => {
    const meals = MEAL_ORDER.filter((m) => d.meals[m]?.recipe).map((m) => {
      const meal = d.meals[m];
      const main = m === "lunch" || m === "dinner";
      const steps = meal.recipe.steps.slice(0, main ? 4 : 2).map((st, i) => `<li><b>${i + 1}</b>${esc(clip(st, main ? 120 : 90))}</li>`).join("");
      const photo = photoUrl?.(meal.photo);
      return `<div class="meal${main ? " main" : ""}">
        <div class="ml">${short[m]} <span>⏱ ${meal.recipe.minutes} min</span></div>
        <div class="mrow">${photo ? `<img class="ph" src="${photo}" alt=""/>` : ""}<div class="mn">${esc(meal.recipe.name.replace(/^Petit-déjeuner (salé|sucré) — /, "").replace(/^Collation — /, ""))}</div></div>
        <div class="mc">${meal.components.map((c) => `${esc(c.food_name)} <b>${c.grams} g</b>`).join(" · ")}</div>
        <ol class="st">${steps}</ol>
      </div>`;
    }).join("");
    return `<section class="day"><h2>${esc(d.day)}</h2>${meals}</section>`;
  };
  const p1 = week.days.slice(0, 4).map(dayCard).join("");
  const p2 = week.days.slice(4).map(dayCard).join("");
  const head = (sub: string) => `<header class="hd"><img src="${LOGO_URL}" alt=""/><div><h1>Semaine ${week.week} · Mon plan alimentaire</h1><div class="sub">${esc(program.name)} · ${sub} · La Diététique, Aurelia Isnardon</div></div></header>`;
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Fiche frigo — Semaine ${week.week}</title><style>
@page{size:A4;margin:9mm} *{box-sizing:border-box} body{font-family:Georgia,"Times New Roman",serif;color:#1F2A1E;margin:0;background:#fff;font-size:8.4px;line-height:1.3}
.hd{display:flex;align-items:center;gap:12px;padding-bottom:6px;border-bottom:1.5px solid #B08D57;margin-bottom:8px} .hd img{width:46px} h1{font-size:16px;font-weight:400;margin:0;letter-spacing:.3px} .sub{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#7A8378;font-size:7.6px;letter-spacing:1.8px;text-transform:uppercase;margin-top:2px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px} .day{break-inside:avoid;border:1px solid #E6E0D2;border-radius:8px;padding:7px 9px 5px;background:#FDFBF6}
h2{font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:10px;margin:0 0 4px;color:#4E6B4A;letter-spacing:2px;text-transform:uppercase;font-weight:600;border-bottom:1px solid #E6E0D2;padding-bottom:3px}
.meal{padding:4px 0 3px;border-top:1px dotted #E6E0D2} .meal:first-of-type{border-top:0} .ml{font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:6.8px;letter-spacing:1.6px;text-transform:uppercase;color:#B08D57;font-weight:700} .ml span{color:#7A8378;font-weight:400;letter-spacing:0;text-transform:none;margin-left:4px}
.mrow{display:flex;align-items:center;gap:6px} .ph{width:22px;height:22px;border-radius:5px;object-fit:cover} .mn{font-size:9.6px;font-weight:600;color:#1F2A1E;margin:1px 0} .main .mn{font-size:10.2px}
.mc{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#4A5548;font-size:7.4px;margin-bottom:2px} .mc b{color:#4E6B4A;font-weight:600}
.st{margin:0;padding:0;list-style:none;color:#3C463A;font-size:7.8px} .st li{display:flex;gap:4px;margin-top:1.5px} .st li b{font-family:-apple-system,Helvetica,Arial,sans-serif;flex:0 0 11px;height:11px;border-radius:50%;background:#E3EEDF;color:#2F4A2C;font-size:6.6px;display:flex;align-items:center;justify-content:center}
.pb{page-break-before:always} .legend{grid-column:1/-1;border:1px solid #E6E0D2;border-radius:8px;padding:7px 9px;background:#F1ECDF;font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:7.4px;color:#4A5548;line-height:1.5}
.legend b{color:#4E6B4A} .ft{margin-top:6px;text-align:center;color:#7A8378;font-size:7px;font-family:-apple-system,Helvetica,Arial,sans-serif;letter-spacing:1px}
</style></head><body>
${head("lundi → jeudi")}<div class="grid">${p1}</div><div class="ft">À COLLER SUR LE FRIGO · PAGE 1/2</div>
<div class="pb"></div>${head("vendredi → dimanche")}<div class="grid">${p2}<div class="legend"><b>Repères cuisine.</b> Assaisonnements libres : eau, sel, poivre, herbes, épices, citron, ail, oignon. Matières grasses uniquement selon la quantité indiquée. Féculents pesés cuits ; protéines pesées crues. Une pesée par semaine, le matin à jeun.<br><b>Astuce.</b> Cuisez les féculents et légumes communs de la semaine en une fois (batch cooking) : ils se réchauffent en 3 minutes.</div></div><div class="ft">MON PLAN ALIMENTAIRE · LA DIÉTÉTIQUE — AURELIA ISNARDON · PAGE 2/2</div>
</body></html>`;
}

export function buildProgramHtml(program: Program, shoppingByWeek: Shopping[]): string {
  return program.weeks.map((_, i) => buildWeekHtml(program, i, shoppingByWeek[i] ?? null)).map((h, i) => (i === 0 ? h : h.replace("<body>", '<body><div style="page-break-before:always"></div>'))).join("");
}

async function printHtml(html: string, title: string) {
  if (Platform.OS === "web") { await Print.printAsync({ html }); return; }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: title, UTI: "com.adobe.pdf" });
  else await Print.printAsync({ uri });
}

export async function exportFridgeSheet(program: Program, weekIndex: number, photoUrl?: (p?: string | null) => string | null) {
  await printHtml(buildFridgeHtml(program, weekIndex, photoUrl), `Fiche frigo — Semaine ${weekIndex + 1}`);
}

export async function exportProgramPdf(program: Program, shoppingByWeek: Shopping[]) {
  await printHtml(buildProgramHtml(program, shoppingByWeek), "Mon plan alimentaire — programme complet");
}

export async function exportWeekPdf(program: Program, weekIndex: number, shopping: Shopping) {
  const html = buildWeekHtml(program, weekIndex, shopping);
  if (Platform.OS === "web") {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: `Mon plan alimentaire — Semaine ${weekIndex + 1}`, UTI: "com.adobe.pdf" });
  } else {
    await Print.printAsync({ uri });
  }
}
