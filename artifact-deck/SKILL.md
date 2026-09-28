---
name: artifact-deck
description: "Build 16:9 HTML slide decks with keyboard nav and PDF print."
version: 0.1.0
author: Vinicius Costa (Buenno01), Claude Code
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [artifact, deck, html]
    related_skills: [artifact-build]
---

# artifact-deck

Slide decks as a single HTML file: fixed 1920x1080 canvas scaled to the window, arrow/space navigation, one slide per page when printed to PDF. Load `artifact-build` for the CLI and visual system; this skill owns only what is specific to deck.

## When to Use
- User asks for a presentation, deck, slides, pitch, proposal to present, keynote, "algo para apresentar na reunião".
- Content is meant to be spoken over: few words per screen, one idea at a time.
- Don't use for: documents people read alone (use `artifact-doc`), dense data views (`artifact-dashboard`), a single printed sheet (`artifact-onepager`), PPTX editable by the user (use the `powerpoint` skill).

## Procedure
1. `skill_view(name="artifact-build")` and `read_file` on `artifact-build/references/components.md`. Done when you know the `Slide` layouts and the `SlideText` scale.
2. Outline first, in chat or in your head: one line per slide, 8 to 14 slides for a proposal. Each line is the single idea of that slide. Done when every line fits in one sentence.
3. `terminal`: `node <artifact-build dir>/scripts/artifact.mjs init <name> --format deck --theme shakers` (`neutral` when the deck is not for Shakers). Done when two `OK` paths print.
4. `write_file` `data.ts` with all text and numbers (pt-BR, real content, no placeholders), then `App.tsx` mapping the outline to slide archetypes below. Start from `templates/example/` in this skill when the deck is a proposal. Done when every slide reads from `data.ts` and `App.tsx` has no literal numbers except layout.
5. `terminal`: `node <artifact-build dir>/scripts/artifact.mjs build <name> --out <abs path>.html` with `timeout=300`. Done when the first line is `OK ... console: 0 erro(s)` and there is no `WARN horizontal overflow`.
6. `vision_analyze` at least the cover, one content slide, and every slide with a chart or table, from the `slides:` folder printed by the build. Run the Verification section. Done when nothing is clipped and no slide has more than one idea.
7. Report the HTML path and paste the print-to-PDF instructions from the Recipes section when the user needs a PDF.

## Composition rules for this format
- One idea per slide. The heading states the idea as a sentence or a noun phrase; the body proves it. If you need "and also", make another slide.
- Word budget: heading up to 8 words, body up to 40 words, bullets max 4 with max 12 words each, statement slide max 14 words, stat slide max 3 numbers. Cover: kicker + title (max 7 words) + one-line sub.
- Type scale: use only `SlideText`: `T.Kicker` 22px caps, `T.Title` 88px (cover only), `T.Heading` 56px (every content slide), `T.Sub` 32px muted, `T.Body` 28px, `T.Statement` 64px, `T.Note` 20px for sources and footnotes. Custom text inside a slide must be 24px or larger (`text-[24px]`); nothing under 20px on a 1920 canvas.
- Archetypes and their `Slide` layout: cover (`title` + `dark`), section divider (`title` + `dark`, kicker "Parte N" + title), bullets (`content`), split text+figure (`split`), stat row (`content` + `StatRow size="deck"` pushed down with `mt-auto`), table (`content` + `DataTable` with the deck class), statement (`statement`), closing (`title` + `dark`, next step + contact).
- Dark slides: only cover, section dividers and closing (`shakers` renders pure black, `neutral` a dark warm gray). Never a dark content slide. Max one divider per 4 or 5 slides.
- Hierarchy from size and whitespace. No cards, no boxed bullets, no icons as decoration, no colored fills. Green appears only as `.accent-rule` (thin top line) or `.accent-mark`, at most one accent per slide.
- Figures on a slide: one chart or one table, never both. Tables max 5 rows and 3 or 4 columns; more than that belongs in a doc, link to it.
- Rhythm: content slides keep the 96px padding the layout gives; do not add outer margins. Push a single block to the bottom with `mt-auto` instead of stacking spacers.
- Numbers through `fmt.*`; percentages and money already formatted in `data.ts` when they are labels (`"2,1%"`), computed when they are data.

## Recipes
All verified in `templates/example/App.tsx` (10 slides, both themes).

Cover and closing (dark, shakers only):
```tsx
<Slide layout="title" dark>
  <T.Kicker>Proposta comercial</T.Kicker>
  <T.Title>Migração e evolução da loja Casa Verde</T.Title>
  <T.Sub>Shopify Plus, checkout customizado e operação assistida por 6 meses.</T.Sub>
  <T.Note className="mt-10">Shakers para Casa Verde · setembro de 2026</T.Note>
</Slide>
```

Stat row with source note:
```tsx
<Slide>
  <T.Heading>Diagnóstico em números</T.Heading>
  <StatRow size="deck" className="mt-auto">
    {stats.map((s, i) => <Stat key={i} size="deck" value={s.value} label={s.label} />)}
  </StatRow>
  <T.Note className="mb-4">Base: Google Analytics, últimos 90 dias.</T.Note>
</Slide>
```

Three columns with green rule (the only accent on the slide):
```tsx
<div className="mt-16 grid grid-cols-3 gap-16">
  {items.map((it, i) => (
    <div key={i} className="accent-rule pt-6">
      <div className="text-[32px] font-semibold leading-tight">{it.title}</div>
      <p className="mt-3 text-[24px] leading-normal text-muted-foreground">{it.text}</p>
    </div>
  ))}
</div>
```

Split text + Chart. `Chart` ticks are 12px; `zoom: 2` doubles everything (ticks, legend, bars) and keeps recharts' layout math intact. `height={400}` becomes 800px on canvas:
```tsx
<Slide layout="split">
  <div className="flex flex-col gap-8">
    <T.Heading>Projeção do funil</T.Heading>
    <T.Body><p>Pedidos passam de {fmt.int(2100)} para {fmt.int(2900)}.</p></T.Body>
    <T.Note>Cenário conservador, base 100 mil sessões.</T.Note>
  </div>
  <div style={{ zoom: 2 }}>
    <Chart kind="bar" data={funnel} x="etapa" height={400} legend format={n => fmt.compact(n)}
      series={[{ key: "atual", label: "Atual" }, { key: "projetado", label: "Projetado" }]} />
  </div>
</Slide>
```

DataTable at deck size. Scale through arbitrary variants on `className`; disable sorting so headers do not show the arrow icon:
```tsx
const deckTable = "[&_table]:text-[26px] [&_th]:text-[22px] [&_th]:h-16 [&_th]:px-6 [&_td]:px-6 [&_td]:py-5 [&_td]:whitespace-normal";
const columns: Column<Row>[] = [
  { key: "item", header: "Item", sortable: false, width: "38%" },
  { key: "valor", header: "Valor", sortable: false, width: "18%", render: r => fmt.money(r.valor, "BRL") },
  { key: "condicao", header: "Condição", sortable: false },
];
<Slide>
  <T.Heading>Investimento</T.Heading>
  <DataTable rows={rows} columns={columns} className={deckTable} />
  <T.Note>Valores sem impostos. Validade: 30 dias.</T.Note>
</Slide>
```

Print to PDF (tell the user): open the HTML in Chrome, Ctrl+P, Destination "Save as PDF", Layout "Landscape", Margins "None", enable "Background graphics", disable "Headers and footers", Save. The deck sets `@page` to 1920x1080 so every slide lands on its own page.

## Pitfalls
- `mt-auto` on a note after a `DataTable` leaves a hollow middle on the slide. Let the note sit right under the table; use `mt-auto` only for `StatRow`.
- `mt-auto` on a 3-column grid under a heading + sub pushes the columns to the floor with a gap you cannot justify. Use a fixed `mt-16`.
- `render` in a DataTable column that returns text (for example "Sem custo") keeps right alignment because the raw value is a number. Acceptable for a single cell; do not mix text and numbers in a column otherwise.
- `.accent-rule` and `.accent-mark` use the theme primary (green in `shakers`, ink in `neutral`). Check both with `build <name> --theme neutral`.
- A `T.Title` longer than 7 words wraps to three lines at 88px and collides with the sub on `layout="title"`. Shorten or use `T.Heading` on the cover.
- `write_file` refuses to overwrite the scaffolded `App.tsx`/`data.ts` unless you `read_file` them first. Read both right after `init`.

## Verification
- Build line: `OK ... slides: N ... console: 0 erro(s)`, no `WARN horizontal overflow`, N equals the outline length.
- Open `<screenshots>/<name>-slides/01.png`, one bullet slide, every chart or table slide, and the last slide with `vision_analyze`.
- Pass criteria per slide: heading fully visible with the 96px margin; no text touching the edge; body under the word budget; only one figure; chart ticks and table text readable at half size (the vision downscale to 960x540 is a good proxy for a projector at the back of a room); dark background only on cover, dividers and closing.
- Deck level: same heading size on every content slide, same kicker style on every divider, green appears on at most one element per slide, no slide is a wall of text.
