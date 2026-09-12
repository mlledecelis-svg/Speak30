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
