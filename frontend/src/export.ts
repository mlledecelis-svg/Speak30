import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Program, MEAL_ORDER, MEAL_LABELS } from "./program-store";

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

/** Fiche frigo : 2 pages max — page 1 menus de la semaine, page 2 exécution condensée des recettes. */
export function buildFridgeHtml(program: Program, weekIndex: number): string {
  const week = program.weeks[weekIndex];
  const short: Record<string, string> = { breakfast: "Matin", lunch: "Midi", snack: "Goûter", dinner: "Soir" };
  const rows = MEAL_ORDER.map((m) => `<tr><th>${short[m]}</th>${week.days.map((d) => { const meal = d.meals[m]; if (!meal) return "<td>—</td>"; return `<td><b>${esc(meal.recipe.name.replace(/^Petit-déjeuner (salé|sucré) — /, ""))}</b><br>${meal.components.map((c) => `${esc(c.food_name)} ${c.grams}g`).join(" · ")}</td>`; }).join("")}</tr>`).join("");
  const recipes: string[] = [];
  week.days.forEach((d) => ["lunch", "dinner"].forEach((m) => {
    const meal = d.meals[m];
    if (!meal) return;
    const steps = meal.recipe.steps.slice(0, 4).map((st, i) => `<span class="n">${i + 1}</span>${esc(st.length > 130 ? st.slice(0, 127) + "…" : st)}`).join(" ");
    recipes.push(`<div class="rc"><div class="rt">${esc(d.day.slice(0, 3))} ${short[m]} · ${esc(meal.recipe.name)} <i>${meal.recipe.minutes} min</i></div><div class="rs">${steps}</div></div>`);
  }));
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Fiche frigo — Semaine ${week.week}</title><style>
@page{size:A4;margin:8mm} body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1F2A1E;margin:0;font-size:8.6px;line-height:1.25}
.hd{display:flex;align-items:center;gap:10px;margin-bottom:6px} .hd img{width:42px} h1{font-size:15px;font-weight:400;margin:0} .sub{color:#7A8378;font-size:8px;letter-spacing:1.5px;text-transform:uppercase}
table{width:100%;border-collapse:collapse;table-layout:fixed} th,td{border:1px solid #E6E0D2;padding:4px 5px;vertical-align:top;font-size:8.3px} thead th{background:#4E6B4A;color:#fff;font-size:9px;letter-spacing:1px} tbody th{width:38px;background:#F1ECDF;color:#4E6B4A;text-transform:uppercase;font-size:8px} td b{color:#1F2A1E;display:block;margin-bottom:2px;font-size:8.6px} td{color:#4A5548}
.pb{page-break-before:always} h2{font-size:12px;font-weight:400;margin:0 0 6px;color:#4E6B4A} .grid{column-count:2;column-gap:10px} .rc{break-inside:avoid;border:1px solid #E6E0D2;border-radius:6px;padding:5px 6px;margin-bottom:6px} .rt{font-weight:600;font-size:8.8px;margin-bottom:3px} .rt i{color:#B08D57;font-weight:400} .rs{color:#4A5548} .n{display:inline-block;background:#E3EEDF;color:#2F4A2C;border-radius:8px;padding:0 4px;font-weight:700;margin:0 3px 0 2px;font-size:7.5px}
.ft{margin-top:6px;color:#7A8378;font-size:7.5px;text-align:center}
</style></head><body>
<div class="hd"><img src="${LOGO_URL}" alt=""/><div><h1>Fiche frigo — Semaine ${week.week}</h1><div class="sub">${esc(program.name)} · portions personnelles · La Diététique, Aurelia Isnardon</div></div></div>
<table><thead><tr><th></th>${week.days.map((d) => `<th>${esc(d.day)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
<div class="ft">Assaisonnements libres : eau, sel, poivre, herbes, épices, citron. Matières grasses uniquement selon la quantité indiquée.</div>
<div class="pb"></div><h2>Exécution des recettes — déjeuners & dîners</h2><div class="grid">${recipes.join("")}</div>
<div class="ft">À coller sur le frigo · cuisinez en suivant les étapes numérotées · Mon plan alimentaire</div>
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

export async function exportFridgeSheet(program: Program, weekIndex: number) {
  await printHtml(buildFridgeHtml(program, weekIndex), `Fiche frigo — Semaine ${weekIndex + 1}`);
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
