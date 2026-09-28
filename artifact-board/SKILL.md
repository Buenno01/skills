---
name: artifact-board
description: "Boards as HTML: kanban, roadmap, comparison matrix."
version: 0.1.0
author: Vinicius Costa (Buenno01), Claude Code
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [artifact, board, html]
    related_skills: [artifact-build]
---

# artifact-board

Board artifacts are wide, scannable surfaces where position carries meaning: kanban columns (status), roadmap timelines (time), comparison matrices (option x criterion), swimlanes (team x time). Load `artifact-build` for the CLI and visual system; this skill owns only what is specific to board.

## When to Use
- User asks for a kanban, backlog board, sprint board, status board.
- Quarter or half-year roadmap, Gantt-like timeline with lanes and milestones.
- Comparison matrix: plans, vendors, options against features or criteria.
- Swimlanes: workstreams by team over time.
- Don't use for: KPI dashboards with charts (`artifact-dashboard`), narrative documents (`artifact-doc`), a single roadmap slide inside a presentation (`artifact-deck`), anything with drag-and-drop persistence (this is a static snapshot).

## Procedure
1. Read `artifact-build/SKILL.md` and `artifact-build/references/components.md` with `read_file`. Done when you know the `BoardShell`, `Column`, `Badge`, `Card`, `Table` props.
2. Decide the board type(s). One artifact may stack several sections (timeline, then kanban, then matrix) but each section is one board type. Done when you can name the axis of every section (status, time, or criterion).
3. Scaffold: `terminal(command="node <artifact-build dir>/scripts/artifact.mjs init <name> --format board --theme <neutral|shakers>", timeout=300)`. To check the other theme later: `build <name> --theme <t>`. Done when both `OK` lines print.
4. Write `data.ts` first with `write_file`: lanes, items with `start`/`end` indexes, cards with status, matrix rows. Real names, real dates, no lorem ipsum. Done when every string the user will read lives in `data.ts`.
5. Write `App.tsx` from `templates/example/App.tsx` in this skill (copy it, delete the sections you do not need). Done when it imports only from `@/shells`, `@/blocks`, `@/ui/*`, `@/lib/utils`, `lucide-react`, `./data`.
6. Build: `node <artifact-build dir>/scripts/artifact.mjs build <name> --out <abs>.html`. Done when the first line is `OK`, `console: 0 erro(s)`, no `WARN horizontal overflow`.
7. Inspect the screenshot with `vision_analyze` and run Verification below. Fix with `patch`, rebuild. Done when every check passes.
8. If the user will print, run the print check in Verification. Done when the PDF is landscape and each section fits its page.

## Composition rules for this format
- One `BoardShell` at the root. Pass status legend through the `legend` prop; it renders top-right in the header. Legend swatches must reuse the exact classes of the bars/cards they describe.
- Sections: `<h2 class="text-base font-semibold">` with an optional muted hint next to it, then the board. Separate sections with `space-y-10`. Nothing else between them (no dividers, no cards around sections).
- Type scale: h1 comes from the shell (`text-xl`). Section title `text-base font-semibold`. Column/lane titles `text-sm font-medium`. Card titles `text-sm font-medium`. Metadata and axis labels `text-xs text-muted-foreground`. Do not go bigger; boards are read at arm's length, not projected.
- Density: kanban cards are compact (`py-2.5`, one title line, one metadata line, optional one-line note). Timeline bars 28px tall in 40px rows. Matrix rows are default `TableRow` height. Max 5 or 6 kanban columns, 4 to 6 lanes, 3 to 5 matrix columns per screen.
- Status encoding: use shape and weight before color. Example that works in both themes: solid 2px outline = active, dashed outline = planned, muted fill = done, `border-destructive` = risk. Never a solid `bg-primary` bar (it becomes a black block in the shakers theme).
- Horizontal scroll is expected and fine for kanban and timelines on screen: `BoardShell` `main` is `overflow-x-auto`. Set `min-w-[...]` on the grid so bars keep readable width; do not shrink columns below 130px.
- What not to do: no charts inside boards, no KPI cards on top, no avatars or icons per card beyond one status glyph, no color per squad (use an outline `Badge`), no per-cell tooltips as the only place information lives (print loses them).

## Recipes
All snippets are taken from `templates/example/App.tsx`, built and verified in both themes.

Kanban with compact cards:
```tsx
<div className="flex gap-4">
  {kanban.columns.map(c => { const cards = kanban.cards.filter(k => k.status === c.id); return (
    <Column key={c.id} title={c.title} count={cards.length}>
      {cards.map(k => (
        <Card key={k.id} className="py-2.5 gap-0 shadow-none print:break-inside-avoid"><CardContent className="px-3 space-y-1.5">
          <div className="text-sm font-medium leading-snug">{k.title}</div>
          <div className="flex items-center justify-between text-xs text-muted-foreground"><Badge variant="outline">{k.squad}</Badge><span className="tabular-nums">{k.due} · {k.points} pts</span></div>
        </CardContent></Card>))}
    </Column>); })}
</div>
```

Quarter roadmap as one CSS grid (half-month columns, bars via inline `gridColumn`):
```tsx
const cols = board.months.length * 2;
<div className="overflow-x-auto print:overflow-visible">
  <div className="relative grid min-w-[1040px] print:min-w-0 gap-y-1"
       style={{ gridTemplateColumns: `200px repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `auto auto repeat(${bodyRows}, 40px)` }}>
    {board.months.map((m, i) => <div key={m} className="text-sm font-medium px-2 py-1" style={{ gridColumn: `${i * 2 + 2} / span 2`, gridRow: 1 }}>{m}</div>)}
    {/* lane label spans its packed rows; bar: start/end are 1-based half-month indexes */}
    <div className="border-t px-2 py-1" style={{ gridColumn: 1, gridRow: `${laneRow} / span ${rowCount}` }}>{lane.title}</div>
    <div className={cn("z-10 self-center mx-1 h-7 rounded-md px-2 flex items-center text-xs font-medium truncate", barClass[it.status])}
         style={{ gridColumn: `${it.start + 1} / ${it.end + 2}`, gridRow: laneRow + it.row }}>{it.title}</div>
  </div>
</div>
```
Overlapping items inside a lane need row packing: see `packRows()` in the example (greedy, first row whose last `end` < `start`).

Milestone as a dashed vertical line through all lanes:
```tsx
<div className="flex items-center gap-1 text-xs text-muted-foreground px-2" style={{ gridColumn: ms.at + 1, gridRow: 2 }}><Flag className="size-3" /> {ms.label}</div>
<div className="border-l-2 border-dashed border-foreground/40 pointer-events-none" style={{ gridColumn: ms.at + 1, gridRow: `3 / ${totalRows + 1}` }} />
```

Comparison matrix with check marks and one highlighted column:
```tsx
function Mark({ v }: { v: boolean | string }) {
  if (v === true) return <Check className="size-4 text-success mx-auto" aria-label="Sim" />;
  if (v === false) return <X className="size-4 text-muted-foreground/60 mx-auto" aria-label="Não" />;
  return <span className="text-sm">{v}</span>;
}
const hl = (id: string) => (plans.find(p => p.id === id)?.recommended ? "bg-muted/60" : "");
<TableHead className={cn("text-center", hl(p.id))}><div className="flex flex-col items-center gap-1 py-1">
  <span className="font-semibold text-foreground">{p.name}</span><span className="text-xs font-normal text-muted-foreground">{p.price}</span>
  {p.recommended && <Badge>Recomendado</Badge>}
</div></TableHead>
<TableCell className={cn("text-center", hl(p.id))}><Mark v={r[p.id]} /></TableCell>
```

Legend that matches the bars, plus landscape print:
```tsx
const legend = <>{statuses.map(s => <span key={s} className="flex items-center gap-1.5 whitespace-nowrap"><span className={cn("inline-block h-3 w-6 rounded-sm", barClass[s])} />{statusLabel[s]}</span>)}</>;
<BoardShell title=... legend={legend}>
  <style>{`@page { size: A4 landscape; margin: 12mm; }`}</style>
  <section className="space-y-3 print:break-inside-avoid-page">...</section>
```

## Pitfalls
- `bg-primary` bars read fine in neutral but become solid black blocks in shakers (org rule violation). Encode status with outline weight and dashes; keep fills to `bg-muted`.
- `Badge` variants for the legend do not match custom bar styles; render swatches with the same `barClass` instead.
- Long bar titles on 1-column spans truncate (`truncate` is required or the bar overflows its cell). Shorten the title in `data.ts` or widen the grid `min-w`.
- Print: `overflow-x-auto` clips the timeline to the page width and the right months disappear. Add `print:overflow-visible print:min-w-0` and use `minmax(0, 1fr)` columns so the grid compresses. `Column` already collapses to `flex-1` in print.
- Header legend wraps to two lines at print width; add `whitespace-nowrap` per legend item.
- Changing `artifact.json` by hand does nothing; use `build <name> --theme <t>`.
- Row packing: if two items in a lane overlap in time and you place both on the same grid row, the later one hides the earlier one silently. Use `packRows`.

## Verification
- Build line: `OK ... console: 0 erro(s)`, no `WARN horizontal overflow` (the outer grid wrapper handles scroll; the page itself must not scroll horizontally).
- Screenshot with `vision_analyze`: bars start and end on the vertical grid lines, milestone dashed line crosses every lane, no bar text truncated except where intended, lane labels align with their first row, kanban counts match visible cards, matrix check marks centered, exactly one highlighted column, legend swatches identical to bar styles.
- Both themes: rebuild the same `App.tsx` under a shakers `init` and confirm no black content blocks and no green fills.
- Print (when requested): with Playwright from the kit dir, `page.emulateMedia({media:"print"})` then `page.pdf({preferCSSPageSize:true})`; pages must be 842x595 pt (A4 landscape), timeline fully visible on page 1, each section starting on its own page, no card split across pages.
