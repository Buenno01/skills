---
name: artifact-tool
description: "Build calculators and simulators as offline HTML."
version: 0.1.0
author: Vinicius Costa (Buenno01), Claude Code
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [artifact, tool, html]
    related_skills: [artifact-build]
---

# artifact-tool

Format for calculators and simulators: inputs on the left, computed outputs on the right, every change recomputes instantly (ROI, pricing, break-even, capacity, budget). Load `artifact-build` for the CLI and visual system; this skill owns only what is specific to `tool`.

## When to Use
- User asks for a simulator, calculator, "what if" model, ROI/payback/pricing estimator, or a sheet-like model that a client should play with.
- The model has 3 to 12 numeric inputs and a handful of derived outputs (KPIs, a projection curve, a sensitivity table).
- Don't use for: static reports with fixed numbers (`artifact-doc`), monitoring views without inputs (`artifact-dashboard`), multi-screen mockups (`artifact-prototype`), spreadsheets the user must edit cell by cell (`xlsx`).

## Procedure
1. Pin the model on paper before coding: list inputs (name, unit, sensible min/max/default), outputs, and the formulas. Done when every output can be written as `f(inputs)` with no UI concept in it.
2. `terminal`: `node <artifact-build dir>/scripts/artifact.mjs init <name> --format tool --theme <neutral|shakers>`. Done when both `OK` paths print. Then `read_file` `artifact-build/references/components.md` and, for a richer starting point, `templates/example/App.tsx` + `data.ts` in this skill.
3. Write `data.ts` first with `write_file`: `tool` metadata, `Params` type, `defaults`, `presets`, pure `compute(params)`, `sensitivity(params)`, and `coerce(raw)`. No React imports in this file. Done when every function is pure and guarded (see Composition rules).
4. Write `App.tsx`: one `ToolShell`, inputs in `inputs={<>...</>}`, outputs as children in the order KPIs, chart, callouts, table, footnote. State is one `Params` object; each input calls `update({ key: value })`. Done when App.tsx contains no arithmetic beyond formatting.
5. `terminal`: `build <name> --out <abs path>.html` (timeout 300). If `FAIL tsc`, fix only the listed lines with `patch`. Done when the first line is `OK ... console: 0 erro(s)` and no `WARN horizontal overflow`.
6. `vision_analyze` the screenshot against Verification below. Fix and rebuild until it passes.
7. Functional check in the browser (`browser_navigate` on the `file://` path): click each preset, type an extreme value (0, huge), reload. Done when no `NaN`, no `Infinity`, no console error, and inputs survive the reload.

## Composition rules for this format
- One `ToolShell` per artifact. Left panel = inputs only (plus preset switch and a reset button). Right = outputs only. Never put a computed number in the left panel except the `Field` hint.
- Input order: preset switch first, then groups in the order the user thinks (current state, then the change being simulated). Separate groups with a tiny muted label (`text-xs font-medium text-muted-foreground`), not with cards or separators.
- 5 to 12 inputs. More than 12 means the model belongs in a spreadsheet, or some inputs should become presets.
- Slider when the value has a natural bounded range and the user explores it (rates, percentages, months, counts up to a few hundred). `Input type="number"` when the value is a monetary amount, unbounded, or copied from a document (revenue, cost, investment). Never a slider for money above a few thousand: the step becomes meaningless.
- Every `Field` gets `hint` with the formatted current value (`fmt.money`, `fmt.pct`, `fmt.int`). Sliders are unreadable without it; number inputs show the raw digits so the hint shows the formatted version.
- Outputs, top to bottom: 2 to 4 `KpiCard` in a `grid-cols-2` grid (four in one row wraps values like "10 meses" at 1440px), one projection `Chart`, conditional `Callout`s, one `DataTable` sensitivity table, one muted footnote with assumptions. Nothing else.
- One accent per view. The chart is the accent; KPIs are plain cards. No icons on KPIs.
- Type scale: shell `h1` for the title, `text-base font-semibold` for section headings, `text-xs text-muted-foreground` for section notes and footnotes, KpiCard's own 3xl value. Do not introduce other sizes.
- Chart: single series for cumulative results. Do not mix a monthly series with a cumulative series on one axis; the smaller one becomes a flat line.
- Sensitivity table: vary one input across 5 to 7 steps, hold the rest. Columns: the varied input, then 3 to 4 outputs. `sortable: false` on every column (sorting a sensitivity grid destroys its meaning). `align: "right"` on string columns that hold numbers (`"9 meses"`, `"n/a"`) because auto-align only fires for `number` types.
- Content in pt-BR; code identifiers in English.

## Recipes
Persisted params with sanitizing (App.tsx):
```tsx
function usePersistedParams(key: string): [Params, (patch: Partial<Params>) => void, () => void] {
  const [p, setP] = React.useState<Params>(() => {
    try { return coerce(JSON.parse(localStorage.getItem(key) ?? "")); } catch { return defaults; }
  });
  React.useEffect(() => { try { localStorage.setItem(key, JSON.stringify(p)); } catch { /* quota / private mode */ } }, [key, p]);
  const update = React.useCallback((patch: Partial<Params>) => setP(prev => ({ ...prev, ...patch })), []);
  return [p, update, React.useCallback(() => setP(defaults), [])];
}
```
Guards in data.ts (never let NaN reach the UI):
```ts
const safe = (n: number) => (Number.isFinite(n) ? n : 0);
const div = (a: number, b: number) => (b === 0 || !Number.isFinite(a / b) ? 0 : a / b);
const roi: number | null = p.migration > 0 ? safe(div(gain - p.migration, p.migration)) : null; // null = "n/a", not 0%
export function coerce(raw: unknown): Params { /* copy defaults, overwrite only finite, >= 0 numbers */ }
```
Preset switch that shows "personalizado" when the user drifts from every preset:
```tsx
const active = matchPreset(p) ?? "custom";   // matchPreset compares each preset.patch to p
<Field label="Cenário" hint={active === "custom" ? "personalizado" : undefined}>
  <Tabs value={active} onValueChange={id => { const s = presets.find(x => x.id === id); if (s) update(s.patch); }}>
    <TabsList className="w-full">{presets.map(s => <TabsTrigger key={s.id} value={s.id}>{s.label}</TabsTrigger>)}</TabsList>
  </Tabs>
</Field>
```
Slider vs number input with formatted hint:
```tsx
<Field label="Taxa de conversão" hint={fmt.pct(p.conversion, 2)}>
  <Slider min={0.002} max={0.05} step={0.001} value={[p.conversion]} onValueChange={([v]) => update({ conversion: v })} />
</Field>
<Field label="Faturamento mensal" hint={fmt.money(p.revenue)}>
  <Input type="number" min={0} step={1000} value={p.revenue} onChange={e => { const n = Number(e.target.value); if (Number.isFinite(n) && n >= 0) update({ revenue: n }); }} />
</Field>
```
Sensitivity table:
```tsx
const cols: Column<SensRow>[] = [
  { key: "uplift", header: "Uplift de conversão", sortable: false },
  { key: "payback", header: "Payback", align: "right", sortable: false },
  { key: "net24", header: "Resultado em 24 m", render: r => fmt.money(r.net24), sortable: false },
  { key: "roi24", header: "ROI em 24 m", align: "right", render: r => r.roi24 === null ? "n/a" : fmt.pct(r.roi24), sortable: false },
];
<DataTable rows={sensitivity(p)} columns={cols} />
```
Conditional callout driven by the model, not by the UI:
```tsx
{r.costSaving < 0 && <Callout kind="warning" title="Custo recorrente maior que o atual">A Shopify custa {fmt.money(-r.costSaving)} a mais por mês.</Callout>}
```

## Pitfalls
- `write_file` refuses to overwrite `init`'s scaffold unless you `read_file` it first in the same task. Read it, then write.
- Four `KpiCard` in one row at 1440px wraps values such as "10 meses" onto two lines. Use `grid-cols-2`.
- `fmt.pct(0.014)` prints `1%`; pass `digits` (`fmt.pct(x, 2)`) for rates below 10%.
- Radix `Tabs` with a `value` that matches no trigger renders no active tab. This is the desired "custom" state, but you must show it somewhere (the `Field` hint) or the user thinks the tabs broke.
- `Number(e.target.value)` is `0` for an empty field and `NaN` for `"-"`; filter with `Number.isFinite` before `update`, and never store the string.
- Setting a `Tabs` preset via `update(s.patch)` keeps unrelated inputs; `matchPreset` must compare only the keys in `patch`, or the preset never lights up again after the user edits revenue.
- Percentages in the sensitivity table: the varied input formatted as a string (`"15%"`) keeps the column left-aligned and unsortable, which is what you want.

## Verification
- Build line: `OK <path> <size>KB  screenshot: <png>  console: 0 erro(s)`. Any `WARN` is a fail.
- Screenshot (`vision_analyze`): left panel and right column top-aligned; every Field shows label left and formatted hint right; KPI values on one line each; chart axis labels readable with `fmt.compact`; table numbers right-aligned; footnote present; no black or green fills in the shakers theme (green appears at most as a thin rule).
- Browser: click every preset (values and KPIs change, tab highlights), type `0` into the investment input (ROI shows `n/a`, no `NaN`), reload (inputs persist, "personalizado" hint shows when drifted), reset button restores defaults.
- Data check: with default inputs, recompute one KPI by hand from `compute` and confirm it matches the screen.
