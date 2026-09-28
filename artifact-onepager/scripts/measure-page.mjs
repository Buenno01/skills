// Measure vertical fit of a built PageShell artifact. The artifact-build CLI only warns on horizontal overflow;
// this reports the page height budget, what each top-level child uses, and whether content is clipped.
// Usage: node <skill_dir>/scripts/measure-page.mjs <abs path to built .html>
// Requires the kit (~/.artifact-kit) to be installed with a browser (artifact-build `setup`).
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const kitHome = process.env.ARTIFACT_KIT_HOME || path.join(os.homedir(), ".artifact-kit");
if (!existsSync(path.join(kitHome, "node_modules", "playwright"))) {
  console.log("FAIL kit not installed at " + kitHome + " (run artifact-build setup)");
  process.exit(1);
}
const require = createRequire(path.join(kitHome, "package.json"));
const { chromium } = require("playwright");

const file = process.argv[2];
if (!file) { console.log("FAIL usage: measure-page.mjs <built.html>"); process.exit(1); }
const url = "file:///" + path.resolve(file).replace(/\\/g, "/");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url);
await page.waitForTimeout(400);
const r = await page.evaluate(() => {
  const a = document.querySelector("article.page");
  if (!a) return null;
  const cs = getComputedStyle(a);
  const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  const kids = [...a.children].map((k) => ({
    tag: k.tagName.toLowerCase() + (k.className && typeof k.className === "string" ? "." + k.className.split(" ")[0] : ""),
    px: Math.round(k.getBoundingClientRect().height),
  }));
  return { budget: Math.round(a.clientHeight - pad), used: Math.round(a.scrollHeight - pad), gap: cs.gap, kids, clipped: a.scrollHeight > a.clientHeight + 1 };
});
await browser.close();
if (!r) { console.log("FAIL no <article class=\"page\"> found (is this a PageShell artifact?)"); process.exit(1); }
const status = r.clipped ? "FAIL clipped" : "OK fits";
console.log(`${status}  budget ${r.budget}px  used ${r.used}px  spare ${r.budget - r.used}px  (flex gap ${r.gap})`);
for (const k of r.kids) console.log(`  ${String(k.px).padStart(4)}px  ${k.tag}`);
process.exit(r.clipped ? 1 : 0);
