---
name: artifact-doc
description: "Build interactive HTML reports and proposals with a TOC."
version: 0.1.0
author: Vinicius Costa (Buenno01), Claude Code
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [artifact, doc, html]
    related_skills: [artifact-build]
---

# artifact-doc

Documents meant to be read top-down: analyses, proposals, post-mortems, status reports, with a sticky table of contents, a 72ch reading column and prose typography, delivered as one self-contained HTML. Load `artifact-build` for the CLI and visual system; this skill owns only what is specific to `doc`.

## When to Use
- User asks for a report, analysis, proposal, post-mortem, memo, RFC, decision document, or "a document I can send".
- Content is mostly prose with a few tables, one or two charts and a clear ask at the end.
- Don't use for: slides (`artifact-deck`), glanceable metrics (`artifact-dashboard`), a single printed page (`artifact-onepager`), anything with inputs the reader changes (`artifact-tool`).

## Procedure
1. Load `artifact-build` with `skill_view` and `read_file` its `references/components.md`. Done when you know the props of `DocShell`, `DocSection`, `Callout`, `DataTable`, `Chart`, `Figure`, `Timeline`, `Accordion`.
2. Outline before coding: write the section list (6 to 8 for an analysis) with one sentence per section stating what the reader learns. Done when the first section is the executive summary and the last is the appendix or the ask.
3. `terminal`: `node <artifact-build dir>/scripts/artifact.mjs init <name> --format doc --theme <neutral|shakers>`. Done when both `OK` paths print. Use `templates/example/` of this skill as a richer starting point than the stock template (copy its two files over the scaffold with `write_file`).
4. `write_file` `data.ts`: title, subtitle, meta, every paragraph, every row, chart series. Type table columns as `Column<Row>[]` (import `type Column` from `@/blocks`). Done when `App.tsx` has no literal content strings besides section titles.
5. `write_file` `App.tsx`: one `DocShell`, one `DocSection` per outline entry, blocks placed inside prose. Done when every `DocSection` has a unique kebab-case `id`.
6. `terminal`: `build <name> --out <abs path>.html`, timeout 300. Done when the first line is `OK`, `console: 0 erro(s)`, no `WARN horizontal overflow`.
7. `vision_analyze` the screenshot (full, then crop the table/chart and the end of the document). Run Verification below; fix with `patch`, rebuild. Done when every check passes.
8. Report path, size, section list, what was verified.

## Composition rules for this format
- Order: executive summary (2 paragraphs max, states the finding and the number) followed by the decision callout; then context; then evidence sections; then causes or options; then plan; then risks; then appendix. The reader must be able to stop after the summary.
- One `Callout` with the ask, placed at the end of the summary, `kind="warning"` when a decision has a deadline, `kind="info"` when it is informational. At most 4 callouts per document, never two in a row.
- Callout kinds: `info` for scope notes and "what this does not cover"; `warning` for a decision or deadline; `danger` for a risk that invalidates the work; `success` only to close a post-mortem action as done.
- Level 2 = a reading unit of 2 to 6 paragraphs; level 3 = one idea with one block (a table or a figure) inside a level 2 topic. Never a level 3 with a single paragraph; fold it into the parent. Place level 3 sections as siblings right after their parent; the shell tightens the gap automatically.
- Sandwich every block: one paragraph before says what to look at, one paragraph after says what it means. A table or chart is never the first or last child of a section.
- Tables: 3 to 6 columns, 3 to 12 rows inline; more than 12 rows goes to the appendix with `pageSize`. Format with `fmt.*` in `render`, keep raw numbers in `data.ts`. Add `caption` with the source.
- Charts: `Figure` wrapping `Chart`, `height` 200 to 240 inside the 72ch column, one series per chart unless comparing two lines, `caption` starting with "Figura N." and stating the takeaway.
- Typography: use the shell defaults (15px/28px body, 24px h2, 18px h3). Do not add `text-*` sizes to paragraphs. Emphasis with `<strong>` only, at most once per paragraph.
- Column: `DocShell` caps `main` at 72ch. Do not widen it; if a table needs more width, drop a column or move it to the appendix.
- Appendix: `Accordion type="single" collapsible` with one `AccordionItem` per reference block (method, raw data, glossary). Collapsed content is not printed, so nothing decision-critical goes there.
- Print: the TOC is `no-print` and sections avoid page breaks. Test nothing else; the user prints from the browser.
- Do not: put `KpiCard` or `StatRow` grids at the top (that is a dashboard), use `Card` to box paragraphs, use badges as decoration, put more than one chart per section, use headings as paragraphs.

## Recipes
Summary with the ask (first section):
```tsx
<DocSection id="resumo" title="Resumo executivo">
  {doc.summary.map((p, i) => <p key={i}>{p}</p>)}
  <Callout kind="warning" title="Decisão pedida">{doc.ask}</Callout>
</DocSection>
```
Table inside prose with formatted columns (renderers in App.tsx, raw numbers in data.ts):
```tsx
const funnelColumns = doc.funnel.columns.map(c =>
  c.key === "sessoes" ? { ...c, render: (r: FunnelRow) => fmt.int(r.sessoes) }
  : c.key === "taxa" ? { ...c, render: (r: FunnelRow) => fmt.pct(r.taxa, 1) }
  : c);
<p>O funil de setembro mostra que a perda está concentrada em uma única etapa.</p>
<DataTable rows={doc.funnel.rows} columns={funnelColumns} caption={doc.funnel.caption} />
<p>A passagem do carrinho para o pagamento caiu de 50% para 41%.</p>
```
Signed delta cell with token colors:
```tsx
render: (r: FunnelRow) => r.variacao === 0 ? <span className="text-muted-foreground">0 p.p.</span>
  : <span className={r.variacao < 0 ? "text-destructive" : "text-success"}>{(r.variacao > 0 ? "+" : "-") + fmt.pct(Math.abs(r.variacao), 1).replace("%", " p.p.")}</span>
```
Level 3 figure with a chart (sibling of its level 2 parent):
```tsx
<DocSection id="funil-tendencia" title="Tendência mensal" level={3} className="-mt-6">
  <p>A queda não foi gradual. Ela começa no mês da migração do checkout.</p>
  <Figure caption={doc.trend.caption}>
    <Chart kind="line" data={doc.trend.data} x="mes" series={[{ key: "carrinhoPagamento", label: "Carrinho para pagamento" }]} height={220} format={v => v + "%"} />
  </Figure>
</DocSection>
```
Timeline inside DocShell (wrapper resets the prose list rules):
```tsx
<div className="my-4 [&>ol]:list-none [&>ol]:pl-0 [&>ol]:my-0 [&>ol>li]:my-0 [&>ol>li:not(:last-child)]:mb-6">
  <Timeline items={doc.plan} />
</div>
```
Appendix folded in an accordion:
```tsx
<Accordion type="single" collapsible className="border rounded-lg px-4">
  <AccordionItem value="metodo">
    <AccordionTrigger>Método e fontes</AccordionTrigger>
    <AccordionContent>{doc.method.map(m => <p key={m.q}><strong>{m.q}</strong> {m.a}</p>)}</AccordionContent>
  </AccordionItem>
</Accordion>
```

## Pitfalls
- `DocShell` prose rules (`[&_ol]:list-decimal`, `[&_li]:my-1`) apply to any `<ol>` inside `main`, including `Timeline`: you get "1. 2. 3." next to the dots and the item spacing collapses. Use the wrapper recipe above; `[&_li]:my-0` alone kills the spacing.
- `fmt.pct` expects a fraction (0.41, not 41). Chart series stay in display units (41) because the axis formatter only appends a suffix.
- `write_file` on the scaffolded files may be refused as stale; delete them with `terminal` (`rm`) and write fresh.
- `DataTable` sorts strings lexically; keep numeric columns numeric in `data.ts` and format only in `render`.

## Verification
- Screenshot is 1440 wide, full page. TOC on the left lists sections in document order with level 3 indented; the reading column ends around x=1150, never touching the right edge.
- First screen shows: title, subtitle, meta line, "Resumo executivo" heading, two paragraphs, one callout. Nothing else above the fold.
- Every table: header labels readable, numbers right-aligned, caption under the rows, no wrapped headers. Delta cells green for positive, red for negative.
- Chart: line not flat against the top or bottom, Y ticks formatted, caption starts with "Figura".
- Timeline: dots on the rule, no list numbers, visible gap between items.
- Accordion: closed items with chevrons, inside a thin border, at the end of the document.
- Build line: `OK ... console: 0 erro(s)` and no `WARN`. Both themes render the same layout; `shakers` shows Poppins and pure white.
