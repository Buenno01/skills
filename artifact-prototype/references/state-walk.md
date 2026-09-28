# Walking every state of a prototype with Playwright

The `build` screenshot shows only the initial screen. To verify the other states, run a short script from `~/.artifact-kit` (Playwright is installed there). Adapt selectors to your artifact; keep them unique (`#id`, `button[aria-pressed]:has-text('Pix')`), because `text=` matches the first occurrence, including labels inside the prototype popover.

Write it with `write_file` to `~/.artifact-kit/state-walk.mjs`, run with `terminal(command="cd ~/.artifact-kit && node state-walk.mjs", timeout=180)`, then open each PNG with `vision_analyze`.

```js
import { chromium } from "playwright";
import fs from "node:fs";
const html = "file:///C:/Users/<user>/AppData/Local/hermes/cache/scratch/<name>.html";
const out = "C:/Users/<user>/AppData/Local/hermes/cache/scratch/shots/";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", e => errors.push(String(e)));
page.on("console", m => m.type() === "error" && errors.push(m.text()));
const shot = n => page.screenshot({ path: out + n + ".png" });

await page.goto(html); await page.waitForTimeout(300);
await page.hover("li:nth-child(2)"); await shot("01-hover");
await page.click("text=Continuar para entrega"); await page.click("text=Ir para pagamento"); await shot("02-form-errors");
await page.fill("#cep", "01311000"); await page.fill("#street", "Rua das Palmeiras, 120");
await page.click("[role=combobox]"); await shot("03-select-open"); await page.click("text=Tarde, 13h às 18h");
await page.click("text=Ir para pagamento"); await page.click("text=Cartão de crédito");
await page.click("button:has-text('Pagar')"); await page.waitForTimeout(150); await shot("04-loading");
await page.waitForTimeout(1000); await shot("05-error");
await page.click("button[aria-pressed]:has-text('Pix')"); await page.click("button:has-text('Pagar')"); await page.waitForTimeout(1200); await shot("06-done");
await page.click("text=Protótipo"); await shot("07-picker"); await page.click("text=Carrinho vazio"); await page.keyboard.press("Escape"); await shot("08-empty");

const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const small = await page.evaluate(() => [...document.querySelectorAll("button,input,[role=combobox],[role=switch],[role=checkbox]")]
  .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 44; })
  .map(e => (e.textContent || e.id).trim().slice(0, 20) + " " + Math.round(e.getBoundingClientRect().height)));
console.log("overflow:", overflow, "errors:", errors, "small targets:", small);
await browser.close();
```

Pass criteria: `overflow: false`, `errors: []`, `small targets` lists only prototype controls (the floating trigger, popover buttons). Radix `Switch` and `Checkbox` report their own small box; they pass when their row has `min-h-11` and the `Label` is clickable via `htmlFor`.

Hash deep-link: if `App` reads `location.hash` into the initial `screen` state, `page.goto(html + "#payment")` opens a screen directly, which is faster than clicking through and lets the CLI screenshot be re-run on another screen.
