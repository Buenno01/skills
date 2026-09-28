# Kit API reference

Import paths: `@/shells`, `@/blocks`, `@/ui/<file>`, `@/lib/utils`, `lucide-react`, `recharts` (only through `Chart` unless you need something custom).

## Shells (one per artifact, wraps everything)

DeckShell: `<DeckShell title storageKey?>` children are `<Slide>`s. 1920x1080 canvas auto-scaled, arrows/space/Home/End, click zones, counter, hash persistence, print one slide per page.
Slide: `<Slide layout="title|content|split|statement|full" dark? className?>`. `title`: bottom-left cover. `content`: heading + body, padding 96px. `split`: 2-col grid. `statement`: centered single sentence. `full`: no padding (for full-bleed figures).
SlideText: `T.Kicker` (22px caps), `T.Title` (88px), `T.Heading` (56px), `T.Sub` (32px muted), `T.Body` (28px, lists styled), `T.Statement` (64px), `T.Note` (20px muted). Import as `SlideText as T`.

DocShell: `<DocShell title subtitle? meta?>` children are `<DocSection id title level?>`. Sticky TOC auto-built from sections, active section highlighting, 72ch reading column, prose defaults (p, ul, ol, strong, table).
DocSection: `<DocSection id="kebab" title level={2|3}>`. Level 3 nests in TOC.

DashboardShell: `<DashboardShell title subtitle? controls?>` children are `<Cell span={1..12}>`. 12-col grid, max 1400px.
Cell: `<Cell span={n} className?>`.

ToolShell: `<ToolShell title description? inputs={<>...</>}>` outputs as children. Inputs are sticky left (340px).
Field: `<Field label hint?>` wraps one input.

BoardShell: `<BoardShell title subtitle? legend?>` horizontal-scroll canvas. Column: `<Column title count?>` 300px kanban column.

PageShell: `<PageShell title size="A4|Letter">` single printed page, 18mm padding, content clipped. Keep it short.

## Blocks

KpiCard: `{ label, value: ReactNode, delta?: number, deltaLabel?: string ("%"), note?: string }`. Delta colored by sign.
DataTable<T>: `{ rows: T[], columns: Column<T>[], searchable?, pageSize?, caption? }`. Column: `{ key, header, align?, render?(row), sortable? (default true), width? }`. Numbers right-align automatically.
Chart: `{ kind: "line"|"bar"|"area", data, x: string, series: {key, label?, color?}[], height? (260), format?(n), legend?, stacked? }`. Colors follow `--chart-1..5`.
DonutChart: `{ data, nameKey, valueKey, height? (240), format? }`.
Callout: `{ kind: "info"|"warning"|"success"|"danger", title? }` children are content.
Timeline: `{ items: { when, title, description?, status?: "done"|"current"|"todo" }[] }`.
Figure: `{ caption? }` framed content. ImagePlaceholder: `{ label?, ratio? ("16/9") }`.
Stat / StatRow: `{ value, label, size?: "default"|"deck" }`. StatRow also takes `size`. Max 3 or 4 per view.
Tweaks: floating dark-mode toggle. Only when the user asks for tweakability.

## UI (shadcn, `@/ui/<file>`)

button: `Button variant="default|destructive|outline|secondary|ghost|link" size="default|sm|lg|icon" asChild?`
badge: `Badge variant="default|secondary|destructive|success|warning|outline"`
card: `Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter`
table: `Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption` (prefer DataTable)
tabs: `Tabs defaultValue, TabsList, TabsTrigger value, TabsContent value`
dialog: `Dialog, DialogTrigger asChild, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose`
tooltip: `Tooltip, TooltipTrigger asChild, TooltipContent`
input, textarea, label, select (`Select, SelectTrigger, SelectValue, SelectContent, SelectItem value`), switch (`checked onCheckedChange`), slider (`value=[n] onValueChange=([n])=>` min max step), checkbox, separator, progress (`value 0..100`), collapsible, accordion (`type="single" collapsible`), popover.

## Helpers
`cn(...classes)` merge Tailwind classes. `fmt.int(n)`, `fmt.money(n, "BRL")`, `fmt.pct(0.12, digits)`, `fmt.compact(n)` all pt-BR by default.
Theme classes: `.accent-rule` (2px green top border), `.accent-mark` (green text), `.slide-dark` (applied by `<Slide dark>`), `.no-print` (hidden when printing).

## Gotchas (each cost a rebuild once)
- `SelectTrigger` is `w-fit`: in forms pass `className="w-full"` (or `w-[180px]` in headers).
- `Checkbox onCheckedChange` gives `boolean | "indeterminate"`: compare `v === true`.
- `DataTable` right-aligns only real numbers; string cells like `"9 meses"` need `align: "right"`.
- `fmt.pct(x)` defaults to 0 digits (1.4% prints `1%`): pass `fmt.pct(x, 1)` for small rates.
- `Button size="touch"` (44px) for mobile prototypes; `Stat size="deck"|"page"` for decks and one-pagers.
- Chart at 1920x1080 (deck): wrap in a div with `style={{ zoom: 2 }}` and halve `height`, or the 12px ticks are unreadable.
- Theme is baked into `main.tsx` at `init`; to switch, `build <name> --theme <t>`.

## Rules that cause build failures
- Import only from the paths above; `@/ui/Button` (capitalized) does not exist, files are lowercase.
- `columns` for DataTable must be typed: `as Column<Row>[]` or declare `const columns: Column<Row>[] = [...]`.
- Every `.map` needs a `key`.
- `React` must be imported as `import * as React from "react"` when you use hooks.
