#!/usr/bin/env node
// artifact.mjs: single entry point for the artifact kit.
//   setup                       install/refresh the kit in $ARTIFACT_KIT_HOME (default ~/.artifact-kit)
//   init <name> --format F [--theme T] [--force]
//   build <name> --out <file.html> [--theme T] [--no-screenshot]
//   check                       smoke-build the bundled _example
//   list                        formats, themes, shells, blocks, ui components
//   path                        print kit home
// Output contract: first line starts with OK or FAIL. Keep stdout short: the agent reads it.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, cpSync, rmSync, statSync, copyFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(here, "..");
const TEMPLATE = join(SKILL, "templates", "kit");
const HOME = process.env.ARTIFACT_KIT_HOME || join(homedir(), ".artifact-kit");
const FORMATS = ["deck", "doc", "dashboard", "prototype", "tool", "board", "onepager"];
const isWin = process.platform === "win32";

const args = process.argv.slice(2);
const cmd = args[0];
const flag = (n) => { const i = args.indexOf("--" + n); return i > -1 ? args[i + 1] : undefined; };
const has = (n) => args.includes("--" + n);
const fail = (msg, extra = "") => { console.log("FAIL " + msg + (extra ? "\n" + extra : "")); process.exit(1); };
const run = (bin, a, opts = {}) => {
  const r = spawnSync(bin, a, { cwd: HOME, encoding: "utf8", windowsHide: true, shell: bin === "pnpm" && isWin, ...opts, env: { ...process.env, CI: "true", ...(opts.env || {}) } });
  if (r.error) return { status: 1, stdout: "", stderr: String(r.error.message) };
  return { status: r.status ?? 1, stdout: r.stdout || "", stderr: r.stderr || "" };
};
// run a node-based bin from node_modules directly (no pnpm/shell hop, no DEP0190 warning)
const nodeBin = (rel, a, opts = {}) => run(process.execPath, [join(HOME, "node_modules", rel), ...a], opts);

function themes() { return readdirSync(join(HOME, "src", "tokens")).filter(f => f.endsWith(".css")).map(f => f.replace(".css", "")); }
function kitVersion(dir) { try { return JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).version; } catch { return null; } }

function setup() {
  const node = process.versions.node.split(".")[0];
  if (Number(node) < 20) fail(`node ${process.versions.node} too old, need 20+`);
  const pnpm = run("pnpm", ["--version"], { cwd: process.cwd() });
  if (pnpm.status !== 0) fail("pnpm not found. Install: npm i -g pnpm (or corepack enable)");
  mkdirSync(HOME, { recursive: true });
  // sync kit sources (never touches artifacts/ or node_modules/)
  for (const entry of readdirSync(TEMPLATE)) {
    if (["artifacts", "node_modules", "dist", ".playwright"].includes(entry)) continue;
    const src = join(TEMPLATE, entry), dst = join(HOME, entry);
    if (statSync(src).isDirectory()) { rmSync(dst, { recursive: true, force: true }); cpSync(src, dst, { recursive: true }); }
    else copyFileSync(src, dst);
  }
  mkdirSync(join(HOME, "artifacts"), { recursive: true });
  cpSync(join(TEMPLATE, "artifacts", "_example"), join(HOME, "artifacts", "_example"), { recursive: true });
  const stamp = join(HOME, "node_modules", ".artifact-kit-lock");
  const lock = readFileSync(join(HOME, "pnpm-lock.yaml"), "utf8");
  const fresh = existsSync(stamp) && readFileSync(stamp, "utf8") === lock;
  if (!fresh) {
    const r = run("pnpm", ["install", "--frozen-lockfile", "--prefer-offline", "--reporter=silent"]);
    if (r.status !== 0) {
      const r2 = run("pnpm", ["install", "--prefer-offline", "--reporter=silent"]);
      if (r2.status !== 0) fail("pnpm install", (r2.stderr || r2.stdout || "").slice(-1500));
    }
    writeFileSync(stamp, lock);
  }
  if (!has("no-browser")) {
    const pw = nodeBin("playwright/cli.js", ["install", "chromium"], { env: { PLAYWRIGHT_BROWSERS_PATH: join(HOME, ".playwright") } });
    if (pw.status !== 0) console.log("WARN playwright chromium not installed; builds will skip screenshots");
  }
  console.log(`OK kit ${kitVersion(HOME)} at ${HOME}${fresh ? " (deps cached)" : ""}`);
}

function init() {
  const name = args[1]; const format = flag("format"); const theme = flag("theme") || "neutral";
  if (!name || !/^[a-z0-9][a-z0-9-]*$/.test(name)) fail("init needs a kebab-case name");
  if (!FORMATS.includes(format)) fail(`--format must be one of ${FORMATS.join("|")}`);
  if (!existsSync(join(HOME, "node_modules"))) fail("kit not installed; run: setup");
  if (!themes().includes(theme)) fail(`theme ${theme} not found; available: ${themes().join(", ")}`);
  const dir = join(HOME, "artifacts", name);
  if (existsSync(dir) && !has("force")) fail(`artifacts/${name} exists (use --force to overwrite App.tsx/data.ts)`);
  mkdirSync(dir, { recursive: true });
  const tpl = join(SKILL, "templates", "formats", format);
  for (const f of ["App.tsx", "data.ts"]) copyFileSync(join(tpl, f), join(dir, f));
  writeFileSync(join(dir, "index.html"), `<!doctype html>\n<html lang="pt-BR"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${name}</title></head><body><div id="root"></div><script type="module" src="./main.tsx"></script></body></html>\n`);
  writeFileSync(join(dir, "main.tsx"), `import { StrictMode } from "react";\nimport { createRoot } from "react-dom/client";\nimport "@/tokens/${theme}.css";\nimport App from "./App";\ncreateRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);\n`);
  writeFileSync(join(dir, "artifact.json"), JSON.stringify({ name, format, theme, created: new Date().toISOString() }, null, 2));
  console.log(`OK ${join(dir, "App.tsx")}\nOK ${join(dir, "data.ts")}\nreplace both with write_file (they are fresh scaffolds: no need to read first; if write_file refuses, delete the file with terminal and write again), then: build ${name} --out <file.html>`);
}

function tscErrors(name) {
  // per-build tsconfig so a broken sibling artifact never fails this one
  const cfg = join(HOME, "dist", `tsconfig.${name}.json`);
  mkdirSync(dirname(cfg), { recursive: true });
  writeFileSync(cfg, JSON.stringify({ extends: "../tsconfig.json", include: ["../src", `../artifacts/${name}`] }));
  const r = nodeBin("typescript/bin/tsc", ["--noEmit", "-p", cfg]);
  if (r.status === 0) return null;
  const lines = (r.stdout || "").split(/\r?\n/).filter(l => l.includes("error TS"));
  const mine = lines.filter(l => l.includes(`artifacts/${name}/`) || l.includes(`artifacts\\${name}\\`));
  const pick = (mine.length ? mine : lines).slice(0, 30).map(l => l.replace(/^.*artifacts[\\/]/, "artifacts/"));
  return pick.length ? pick.join("\n") : (r.stdout || r.stderr).slice(-1500);
}

async function build() {
  const name = args[1]; const out = flag("out");
  if (!name || !out) fail("build <name> --out <file.html>");
  const dir = join(HOME, "artifacts", name);
  if (!existsSync(join(dir, "App.tsx"))) fail(`artifacts/${name} not found; run init first`);
  const theme = flag("theme");
  if (theme) {
    if (!themes().includes(theme)) fail(`theme ${theme} not found; available: ${themes().join(", ")}`);
    const mainP = join(dir, "main.tsx");
    writeFileSync(mainP, readFileSync(mainP, "utf8").replace(/@\/tokens\/[a-z0-9-]+\.css/, `@/tokens/${theme}.css`));
    const metaP = join(dir, "artifact.json"); const meta = JSON.parse(readFileSync(metaP, "utf8")); meta.theme = theme; writeFileSync(metaP, JSON.stringify(meta, null, 2));
  }
  const ts = tscErrors(name);
  if (ts) fail("tsc", ts);
  const b = nodeBin("vite/bin/vite.js", ["build", "--config", "vite.config.ts"], { env: { ARTIFACT: name } });
  if (b.status !== 0) fail("vite", (b.stderr || b.stdout || "").split(/\r?\n/).filter(l => l.trim()).slice(-25).join("\n"));
  const built = join(HOME, "dist", name, "index.html");
  if (!existsSync(built)) fail("vite produced no index.html");
  const outAbs = resolve(out);
  mkdirSync(dirname(outAbs), { recursive: true });
  copyFileSync(built, outAbs);
  const kb = Math.round(statSync(outAbs).size / 1024);
  let extra = "";
  if (!has("no-screenshot")) {
    const shot = await screenshot(outAbs, name);
    extra = shot ? `  ${shot}` : "  (no screenshot: playwright unavailable)";
  }
  console.log(`OK ${outAbs} ${kb}KB${extra}`);
}

async function screenshot(file, name) {
  let pw;
  try { pw = await import(pathToFileURL(join(HOME, "node_modules", "playwright", "index.mjs")).href); } catch (e) { if (has("debug")) console.log("playwright import failed:", e.message); return null; }
  process.env.PLAYWRIGHT_BROWSERS_PATH = join(HOME, ".playwright");
  const meta = JSON.parse(readFileSync(join(HOME, "artifacts", name, "artifact.json"), "utf8"));
  const viewport = meta.format === "deck" ? { width: 1920, height: 1080 } : { width: 1440, height: 900 };
  let browser;
  try { browser = await pw.chromium.launch(); } catch { return null; }
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e.message).split("\n")[0]));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text().split("\n")[0]); });
  await page.goto(pathToFileURL(file).href);
  await page.waitForTimeout(600);
  const shotDir = join(HOME, "screenshots"); mkdirSync(shotDir, { recursive: true });
  const shot = join(shotDir, name + ".png");
  await page.screenshot({ path: shot, fullPage: meta.format !== "deck" });
  let deckNote = "";
  if (meta.format === "deck") {
    const total = await page.evaluate(() => document.querySelectorAll("[data-slide]").length);
    const contact = join(shotDir, name + "-slides");
    rmSync(contact, { recursive: true, force: true }); mkdirSync(contact, { recursive: true });
    for (let n = 0; n < total; n++) {
      await page.evaluate((k) => { location.hash = "#" + k; }, n);
      await page.waitForTimeout(80);
      await page.screenshot({ path: join(contact, String(n + 1).padStart(2, "0") + ".png") });
    }
    deckNote = `  slides: ${total} in ${contact}`;
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  const clipped = await page.evaluate(() => { const el = document.querySelector("article.page"); return el ? el.scrollHeight - el.clientHeight : 0; });
  await browser.close();
  const parts = [`screenshot: ${shot}` + deckNote, `console: ${errors.length} erro(s)`];
  if (overflow) parts.push("WARN horizontal overflow");
  if (clipped > 2) parts.push(`WARN vertical overflow: page content clipped by ${clipped}px`);
  if (errors.length) parts.push("\n" + errors.slice(0, 5).map(e => "  " + e).join("\n"));
  return parts.join("  ");
}

async function check() {
  if (!existsSync(join(HOME, "node_modules"))) fail("kit not installed; run: setup");
  process.argv = [process.argv[0], process.argv[1], "build", "_example", "--out", join(HOME, "dist", "_example-check.html")];
  args.length = 0; args.push(...process.argv.slice(2));
  await build();
}

function list() {
  const names = (d) => existsSync(d) ? readdirSync(d).filter(f => f.match(/\.(tsx|ts)$/) && !f.startsWith("index")).map(f => f.replace(/\.tsx?$/, "")) : [];
  console.log("OK kit " + (kitVersion(HOME) || "not installed") + " at " + HOME);
  console.log("formats: " + FORMATS.join(", "));
  console.log("themes: " + (existsSync(HOME) ? themes().join(", ") : "-"));
  console.log("shells: " + names(join(HOME, "src", "shells")).join(", "));
  console.log("blocks: " + names(join(HOME, "src", "blocks")).join(", "));
  console.log("ui: " + names(join(HOME, "src", "ui")).join(", "));
  const arts = existsSync(join(HOME, "artifacts")) ? readdirSync(join(HOME, "artifacts")) : [];
  console.log("artifacts: " + (arts.join(", ") || "-"));
}

const table = { setup, init, build, check, list, path: () => console.log(HOME) };
if (!table[cmd]) { console.log("usage: artifact.mjs <setup|init|build|check|list|path> ...\n" + readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 8).join("\n")); process.exit(2); }
await table[cmd]();
