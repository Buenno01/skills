---
name: artifact-onepager
description: "Build a single printed A4/Letter page: brief or proposal."
version: 0.1.0
author: Vinicius Costa (Buenno01), Claude Code
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [artifact, onepager, html]
    related_skills: [artifact-build]
---

# artifact-onepager

One printed page (A4 or Letter) built with `PageShell`: executive summary, proposal summary, project brief, decision memo. Load `artifact-build` for the CLI and visual system; this skill owns only what is specific to onepager: the hard height budget, print typography in pt, and how to detect clipping.

## When to Use
- The reader will print it or read it as one PDF page: proposal summary, one-page brief, executive summary, memo for approval.
- Content fits in roughly 350 words plus 3 numbers. If it does not, the user needs `artifact-doc`.
- Don't use for: multi-page reports (`artifact-doc`), anything interactive or scrollable (`artifact-dashboard`, `artifact-tool`), slides (`artifact-deck`).

## Procedure
1. `terminal`: `node <artifact-build dir>/scripts/artifact.mjs init <name> --format onepager --theme shakers` (or `neutral`). Done when two `OK` paths print. Use `read_file` on `artifact-build/references/components.md` before editing.
2. Write `data.ts` first, with `write_file`. Budget the text before layout: an A4 page holds about 40 lines of 10.5pt text after header and footer (see Composition rules). Cut content until it fits on paper, not in the browser. Done when every string is final and no field says "descrição curta".
3. Write `App.tsx` from `templates/example/App.tsx` in this skill (copy with `read_file`, adapt sections). Keep `PageShell` at the root, `flex-col` children only. Done when the file imports only kit paths.
4. `build <name> --out <abs path>.html` with `timeout=300`. Done when the first line is `OK` with `console: 0 erro(s)`.
5. Check vertical fit: `terminal`: `node <this skill dir>/scripts/measure-page.mjs <built.html>`. It prints `OK fits` or `FAIL clipped` with the px budget and the height of each top-level child. The artifact-build CLI only warns on horizontal overflow, so this step is mandatory. Done when it prints `OK fits` with spare >= 0.
6. `vision_analyze` the screenshot. Run Verification below. If clipped: shorten text in `data.ts`, reduce `gap`, or drop a section; rebuild. Never shrink body text below 9.5pt to make it fit.
7. Report the HTML path, the page size, and tell the user how to print (Print instructions below).

## Composition rules for this format
- Height budget (measured): A4 gives 987px usable (261mm) after the shell's 18mm padding; Letter gives 918px (243mm). At 10.5pt with `leading-snug` a text line is about 19px, so A4 fits about 50 single-column lines total including headings and gaps; two-column sections halve the cost per line. The shell clips silently (`overflow-hidden`), nothing scrolls, nothing wraps to page 2.
- Structure, top to bottom: header (kicker, title, one-line subtitle, optional meta row) / 2 to 4 content sections / one `StatRow` with exactly 3 numbers / one closing element (next steps or call to action) / one-line footer. The closing element gets `mt-auto` so the page bottom is always filled and the footer sits on the baseline.
- Typography in pt, since it prints: title 20 to 22pt semibold, section titles 9pt uppercase muted with `tracking-[0.14em]`, body 10.5pt, secondary notes 9.5pt muted, footer 8pt. Stat values 20pt, not the block default `text-4xl`. Pass `className="gap-4 leading-snug"` to `PageShell` (default is `gap-5 leading-relaxed`, which costs about 15% of the page).
- Two columns (`grid grid-cols-2 gap-8`) for pairs of parallel content: context / proposal, scope / phases. Balance the columns: if one is 3 lines longer than the other, move text or the page wastes a band of white.
- One `Separator` between groups of sections, never between every section; two per page is the ceiling.
- Hierarchy from size and spacing only. One accent per page: in `shakers` theme, one `accent-rule` (green 2px top border) under the header. No cards, no icons, no colored fills, no `DataTable` (sorting and search do not exist on paper; use a small grid with `border-b` rows).
- Letter vs A4: Brazil prints A4 (default). Use `size="Letter"` only when the reader is in the US. Letter is 69px shorter; content that fits A4 with less than 70px spare will clip on Letter. Choose the size before writing content, not after.
- Do not: put charts on a one-pager unless the chart is the point (then 1 chart, 200px max), use more than 3 stats, add a table of contents, use `text-4xl` or `text-xs` (unitless sizes drift when printed), rely on `mt-auto` to hide overflow (it does not; overflow is clipped from the bottom).

## Recipes
Header with meta row and the single green accent:
```tsx
<header>
  <p className="text-[8pt] uppercase tracking-[0.18em] text-muted-foreground font-medium">{page.kicker}</p>
  <h1 className="text-[20pt] font-semibold tracking-tight leading-tight mt-1">{page.title}</h1>
  <p className="text-[10pt] text-muted-foreground mt-1">{page.subtitle}</p>
  <dl className="mt-3 pt-2 accent-rule grid grid-cols-3 gap-4 text-[9.5pt]">
    {page.meta.map((m) => <div key={m.label}><dt className="text-muted-foreground">{m.label}</dt><dd className="font-medium">{m.value}</dd></div>)}
  </dl>
</header>
```
Two-column section with a reusable section title:
```tsx
const SectionTitle = ({ children }: { children: string }) =>
  <h2 className="text-[9pt] uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-1">{children}</h2>;
<section className="grid grid-cols-2 gap-8">
  <div><SectionTitle>Contexto</SectionTitle><p className="text-[10.5pt]">{page.context}</p></div>
  <div><SectionTitle>Proposta</SectionTitle><p className="text-[10.5pt]">{page.proposal}</p></div>
</section>
```
StatRow with 3 numbers sized for paper (block default is too large):
```tsx
<StatRow className="py-1">
  {page.stats.map((s) => <Stat key={s.label} value={s.value} label={s.label} className="flex-1 [&>div:first-child]:text-[20pt] [&>div:last-child]:text-[9pt]" />)}
</StatRow>
```
Compact two-column list for phases or risks (instead of Timeline or DataTable):
```tsx
<ol className="text-[10.5pt] space-y-1">
  {page.phases.map((p) => <li key={p.when} className="grid grid-cols-[80px_1fr] gap-2"><span className="text-muted-foreground tabular-nums text-[9.5pt]">{p.when}</span><span>{p.title}</span></li>)}
</ol>
```
Closing call to action pinned to the bottom, then footer:
```tsx
<Callout kind="info" title="Próximos passos" className="mt-auto"><p>{page.nextSteps}</p></Callout>
<footer className="text-[8pt] text-muted-foreground flex justify-between"><span>{page.footer}</span><span>1 / 1</span></footer>
```

## Pitfalls
- Clipping is silent: `build` prints `OK` and `console: 0 erro(s)` even when the footer and the last section are cut off. The only signals are `measure-page.mjs` and the screenshot: the last visible element touches the page edge with no bottom margin, and the footer is missing. In the example, the same content that fills A4 (spare 0px) loses the footer and the bottom of the Callout on Letter (spare -62px).
- Long words in a narrow column (`grid-cols-[80px_1fr]`, stat labels) wrap to a second line and push everything below. Keep stat labels under 40 characters and phase labels under 10.
- `Stat` default `text-4xl` plus `StatRow` `[&>*]:px-6` steals 30px; always override the value size via the `[&>div:first-child]` selector (there is no size prop for print).
- `build` prints `WARN vertical overflow: page content clipped by Npx` when the page does not fit; treat it as a fail and cut content.
- `accent-rule` uses the theme primary: green in `shakers`, ink in `neutral`.
- `write_file` refuses to overwrite `App.tsx`/`data.ts` created by `init` unless the file was read in full first; `read_file` both files right after `init`, or delete them via `terminal` and write fresh.

## Verification
- Build line: `OK ... console: 0 erro(s)`, no `WARN`.
- `measure-page.mjs`: `OK fits`, spare >= 0 for the chosen size. If the user may print on the other size, run with both and keep spare >= 70px on A4.
- Screenshot via `vision_analyze`: the page is a white rectangle with equal margins top and bottom; the footer line is the last thing visible; no element touches the page edge; no band of white taller than 40px between sections (if there is, the content is too short or one column is unbalanced); exactly 3 stats, one accent, all text readable at 10.5pt.
- Print: open the HTML in Chrome, Ctrl+P, Destination "Save as PDF", Paper size matching `size` (A4 default), Margins "None", check "Background graphics", Scale 100%. The result is exactly one page; if Chrome shows 2 pages, the size does not match the shell.
