---
name: artifact-dashboard
description: "Build dense KPI dashboards: grid, charts, tables, filters."
version: 0.1.0
author: Vinicius Costa (Buenno01), Claude Code
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [artifact, dashboard, html]
    related_skills: [artifact-build]
---

# artifact-dashboard

Dashboard is the Monitor surface: a dense, glanceable single page where the reader checks a handful of numbers, sees the trend, and drills into one table. Load `artifact-build` for the CLI and visual system; this skill owns only what is specific to dashboard (grid composition, controls that filter data, chart choice, what not to show).

## When to Use
- User asks for a painel, dashboard, monitor, KPI view, "como está a loja/campanha/time este mês", a report that will be re-opened, not read once.
- Data has a time dimension and 3 to 6 metrics that someone acts on.
- Don't use for: narrative analysis with conclusions (artifact-doc), a presentation (artifact-deck), a single printed summary (artifact-onepager), a calculator with inputs (artifact-tool).

## Procedure
1. `read_file` `artifact-build/SKILL.md` and `artifact-build/references/components.md`. Done when you know DashboardShell/Cell, KpiCard, Chart, DonutChart, DataTable, Select, Switch, Tabs props.
2. Decide the four numbers. For each KPI write the decision it drives ("Conversão caiu: revisar checkout"). If you cannot, drop it. Done when you have 3 to 5 KPIs, each with a comparison base (período anterior, meta, ano anterior).
3. `terminal`: `node <artifact-build>/scripts/artifact.mjs init <name> --format dashboard --theme <neutral|shakers>`. Done when two `OK` paths print.
4. Write `data.ts` first with `write_file`: raw monthly rows (one object per period, all metrics as numbers), dimension tables (canais, produtos), and the options for every control. No pre-formatted strings, no pre-aggregated KPIs. Done when every number the UI shows can be derived from these arrays.
5. Write `App.tsx`: state for controls, `React.useMemo` for every derived array (window slice, aggregates, table rows), then the grid. Copy from `templates/example/` in this skill and cut what you do not need. Done when the file compiles in your head: every `.map` has a key, columns typed as `Column<Row>[]`.
6. `terminal`: `build <name> --out <abs>.html`, timeout 300. On `FAIL tsc`, fix only the listed lines with `patch`. Done when the line starts with `OK` and ends with `console: 0 erro(s)` and there is no `WARN horizontal overflow`.
7. `vision_analyze` the screenshot and run the Verification section below. Fix, rebuild. If the dashboard has controls, open the HTML with the browser tool and change the Select once to confirm KPIs and subtitle change.
8. Copy final `App.tsx`/`data.ts` only if the user wants sources. Report path, size, what changed, what was verified.

## Composition rules for this format
- One screen at 1440x900: KPI row, one chart row, one table. If you need more, use Tabs inside a Cell, never a second KPI row.
- Grid: 4 KPIs as `Cell span={3}`; charts as 8+4 (trend gets the 8); table `span={12}`. 3 KPIs: `span={4}`. 5 KPIs: do not; merge or drop one.
- Header owns the controls (`controls` prop of DashboardShell): a Select for the period on the far right, a Switch for a comparison toggle to its left. Max two controls; more than that is a tool, not a dashboard.
- Subtitle states the window the data covers and when it was updated, derived from the filtered data, not typed by hand.
- Typography is the shell's: title `text-xl`, KpiCard value `text-3xl`, CardTitle 16px, everything else 14px or 12px. Do not add larger text; hierarchy comes from the KPI row being first.
- Every control must change the data. A Select that only changes a label is filler.
- Charts: `line` for a series over time (add `meta` or `anoAnterior` as a second line for context), `bar` for categories (max 8 bars, sorted by value unless order is natural), `area` only for stacked composition over time, `DonutChart` only for a whole split into 5 or fewer parts. Never two chart kinds for the same data.
- Tables carry the drill-down: 6 to 8 columns, formatted with `fmt.*`, numbers auto right-aligned, one signal column (Badge or `text-destructive`) that points at what to act on. Use `caption` to define the calculated columns.
- Do not: put an icon on each KpiCard, use `bg-primary` or green fills on cards, add a "Resumo" text block, show ratios without the base they compare to, show more than one accent color per view, use a donut for time.

## Recipes
All were built and verified in `templates/example/`.

Period Select in the header that actually filters (window slice):
```tsx
const [period, setPeriod] = React.useState("12");
const n = Number(period);
const view = React.useMemo(() => {
  const end = months.length;
  return { cur: months.slice(end - n, end), prev: months.slice(end - 2 * n, end - n) };
}, [n]);
<DashboardShell title={store.title} subtitle={`${view.cur[0].mes} a ${view.cur.at(-1)!.mes}`}
  controls={<Select value={period} onValueChange={setPeriod}>
    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
    <SelectContent>{periodOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
  </Select>} >
```

KPI row derived from the window, with delta vs. previous window:
```tsx
const delta = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 1000) / 10 : 0);
const kpis = React.useMemo(() => { const a = agg(view.cur), b = agg(view.prev); return [
  { label: "Receita", value: fmt.money(a.receita), delta: delta(a.receita, b.receita), note: "vs. período anterior" },
  { label: "Conversão", value: fmt.pct(a.conv, 1), delta: Math.round((a.conv - b.conv) * 1000) / 10, deltaLabel: " p.p." },
]; }, [view]);
{kpis.map(k => <Cell key={k.label} span={3}><KpiCard {...k} /></Cell>)}
```

8+4 split: trend line with meta, and a Switch that adds a third series:
```tsx
<Cell span={8}><Card><CardHeader><CardTitle>Receita vs. meta</CardTitle></CardHeader><CardContent>
  <Chart kind="line" data={series} x="mes" format={fmt.compact} legend
    series={[{ key: "receita", label: "Receita" }, { key: "meta", label: "Meta" }, ...(yoy ? [{ key: "anoAnterior", label: "Ano anterior" }] : [])]} />
</CardContent></Card></Cell>
<Cell span={4}><Card><CardHeader><CardTitle>Canais</CardTitle></CardHeader><CardContent>
  <Chart kind="bar" data={channels} x="canal" format={v => fmt.pct(v)} legend series={[{ key: "receita", label: "Receita" }, { key: "sessoes", label: "Sessões" }]} />
</CardContent></Card></Cell>
```
Switch in `controls`: `<Switch id="yoy" checked={yoy} onCheckedChange={setYoy} /><Label htmlFor="yoy">Ano anterior</Label>`.

Full-width table with Tabs to switch views and a signal column:
```tsx
const cols: Column<ProductRow>[] = [
  { key: "sku", header: "SKU", width: "96px" }, { key: "nome", header: "Produto" },
  { key: "receita", header: "Receita", render: r => fmt.money(r.receita) },
  { key: "cobertura", header: "Estoque (meses)", render: r => <span className="inline-flex items-center gap-2">{r.cobertura.toFixed(1)}{r.cobertura < 1 && <Badge variant="destructive">repor</Badge>}</span> },
];
<Cell span={12}><Tabs defaultValue="produtos"><TabsList><TabsTrigger value="produtos">Produtos</TabsTrigger><TabsTrigger value="meses">Mês a mês</TabsTrigger></TabsList>
  <TabsContent value="produtos"><DataTable rows={productRows} columns={cols} searchable caption="Estoque em meses no ritmo atual." /></TabsContent>
  <TabsContent value="meses"><DataTable rows={monthRows} columns={monthCols} /></TabsContent>
</Tabs></Cell>
```

## Pitfalls
- The last x-axis label on a line chart is clipped when labels are long ("Ago/26" lost its 6). Shorten labels to 3 letters in the derived series and keep the full label only at year boundaries; padding the chart does not help because recharts computes its own width.
- Bar category labels longer than ~10 chars in a `span={4}` chart are dropped by recharts (only 4 of 5 appeared). Shorten the label in data.
- `delta` rounding: `atingimento` of 0.996 renders as "100%" but a `< 1` test still colors it red. Compare against the displayed precision (`< 0.995`).
- `fmt.pct` expects a fraction (0.31 renders "31%"); passing 31 gives "3.100%". Keep shares as fractions in `data.ts`.
- `Select` has no built-in width; set `className="w-[180px]"` on `SelectTrigger` or it resizes when the value changes.
- `write_file` on the scaffolded `App.tsx`/`data.ts` may be refused as stale after `init`; `read_file` both files once first, or delete them with `rm` and write fresh.

## Verification
Inspect the fullPage screenshot with `vision_analyze` and pass all of these:
- Header: title, one-line subtitle with the window, controls flush right, nothing wrapped.
- KPI row: 4 equal cards, values in `tabular-nums`, deltas colored, no card without a comparison.
- Chart row: every x label present including the last one, y axis formatted (`260 mil`, `36%`), legend visible, no empty band above the lines.
- Table: numbers right-aligned, formatted with thousands separators, at most one colored signal column, caption present, no horizontal scroll.
- Build line: `OK ... console: 0 erro(s)`, no `WARN horizontal overflow`.
- Interaction: changing the period Select changes the subtitle and every KPI; each Tab shows a different table.
