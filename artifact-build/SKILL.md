---
name: artifact-build
description: "Build self-contained HTML artifacts: React kit, one command."
version: 0.1.0
author: Vinicius Costa (Buenno01), Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [artifact, html, react, shadcn, tailwind, vite, build, design-system]
    related_skills: [artifact-deck, artifact-doc, artifact-dashboard, artifact-prototype, artifact-tool, artifact-board, artifact-onepager]
---

# artifact-build

Foundation for every `artifact-*` skill. Ships a pre-wired React 19 + Tailwind v4 + shadcn kit (installed once per machine in `~/.artifact-kit`) and one CLI, `scripts/artifact.mjs`, that turns an `App.tsx` + `data.ts` pair into a single self-contained `.html` (fonts, CSS, JS inlined; opens from `file://`, no network). The CLI prints one `OK`/`FAIL` line so the agent never reads build logs.

Never load this skill alone to design something: load the format skill (`artifact-deck`, `artifact-doc`, ...) which tells you which shell and blocks to use. This file owns the toolchain, the visual system and the quality bar.

## When to Use
- Any `artifact-*` skill sends you here for `init`, `build`, `list`, `setup`.
- User wants a self-contained HTML deliverable (deck, report, dashboard, simulator, board, one-pager, clickable mockup).
- Don't use for: production code inside a real repo (use the repo's stack), email HTML, PDFs authored directly (build HTML then print).

## Prerequisites
- `node` 20+ and `pnpm` on PATH. Nothing else. First `setup` downloads deps (~40 s) and Chromium for screenshots (optional, `--no-browser` skips).
- Kit home: `~/.artifact-kit` (override with env `ARTIFACT_KIT_HOME`).

## Quick Reference
All commands: `terminal(command="node <skill_dir>/scripts/artifact.mjs <cmd> ...", timeout=300)`. `<skill_dir>` is this skill's absolute directory (from `skill_view`).

```
setup [--no-browser]                       install or refresh kit in ~/.artifact-kit (idempotent, safe to rerun)
init <name> --format <fmt> [--theme <t>] [--force]   scaffold artifacts/<name>/{App.tsx,data.ts}
build <name> --out <abs path.html> [--theme <t>] [--no-screenshot]  tsc -> vite -> singlefile -> screenshot + console check
check                                      smoke-build the bundled _example
list                                       formats, themes, shells, blocks, ui, existing artifacts
path                                       print kit home
```
Formats: deck, doc, dashboard, prototype, tool, board, onepager. Themes: neutral (default), shakers.

Output contract: first stdout line starts with `OK` or `FAIL`. `FAIL tsc` is followed by at most 30 `artifacts/<name>/App.tsx(line,col): error TS...` lines. `OK <path> <size>KB  screenshot: <png>  console: N erro(s)` on success; decks also list a per-slide PNG folder. `WARN horizontal overflow` means something is wider than the viewport; `WARN vertical overflow` (onepager) means the page clipped content.

## Procedure
1. `setup` once per machine (or whenever `list` says "not installed"). Done when it prints `OK kit`.
2. `init <name> --format <fmt> --theme <t>`. Name is kebab-case. Done when both `OK` paths print. Read `references/components.md` (API of shells/blocks/ui) before editing.
3. Replace `App.tsx` and `data.ts` with `write_file` (fresh scaffolds, no read needed; if the tool refuses as stale, delete the file via `terminal` and write again). Content and numbers live in `data.ts`; layout in `App.tsx`. Never touch `main.tsx`, `index.html`, `vite.config.ts` or anything under `src/`.
4. `build <name> --out <final absolute path>`. If `FAIL`, fix the listed lines and rebuild; do not guess at things the error does not mention.
5. Inspect the screenshot with `vision_analyze` (for decks, open 2 or 3 slide PNGs). Run the checklist below. Fix, rebuild.
6. Report: final path, size, what it contains, what was verified. Nothing else.

## Visual system (what the kit gives you for free)
- Tokens: every color is a CSS variable (`bg-background`, `text-foreground`, `text-muted-foreground`, `border`, `bg-muted`, `bg-primary`, `text-success`, `text-destructive`, `--chart-1..5`). Never hardcode hex or Tailwind palette colors (`bg-blue-500`); it breaks themes.
- Type: the theme sets the family. Use the scale the shell gives (`SlideText.*` for decks, prose defaults in DocShell). `tabular-nums` is on for numbers.
- Shells (`@/shells`): DeckShell+Slide, DocShell+DocSection, DashboardShell+Cell, ToolShell+Field, BoardShell+Column, PageShell. One shell per artifact, at the root of App.
- Blocks (`@/blocks`): KpiCard, DataTable, Chart (line/bar/area), DonutChart, Callout, Timeline, Figure, ImagePlaceholder, Stat/StatRow, Tweaks.
- UI (`@/ui/<name>`): button, badge, card, table, tabs, dialog, tooltip, input, textarea, label, select, switch, slider, checkbox, separator, progress, collapsible, accordion, popover.
- Helpers: `cn()` and `fmt.{int,money,pct,compact}` from `@/lib/utils`. Icons from `lucide-react`.
- Theme `shakers` encodes org rules: Poppins only, white surfaces, black text, green `#3DE982` only as thin rule or small mark (`.accent-rule`, `.accent-mark`), no black content blocks (decks may use `<Slide dark>` for cover/transition/closing only), no green fills.

## Quality checklist (run on the screenshot before reporting)
1. Surface matches intent: dashboard is dense and glanceable, deck is sparse, doc reads top-down. No hero + three equal cards unless it is a landing page.
2. Hierarchy comes from size, weight and spacing, not from boxes, icons or color. Max one accent per view.
3. No filler: no invented metrics, no placeholder testimonials, no decorative icons, no empty cards.
4. Nothing clipped or overflowing (`WARN horizontal overflow` is a fail). Decks: text inside the 1920x1080 canvas with the padding the layout gives.
5. Numbers formatted with `fmt.*`, aligned right in tables, `tabular-nums`.
6. Console: 0 errors.
7. Content language matches the user (pt-BR by default for this user).

## Pitfalls
- `init` refuses to overwrite; `--force` replaces App.tsx and data.ts only. `tsc` is scoped to the artifact being built, so other artifacts never break your build.
- Tailwind classes must be literal strings in TSX. Dynamic class names built at runtime (`"col-span-" + n`) are not generated; use the `Cell span={n}` helper or inline `style`.
- Images: only `data:` URLs or files imported from the artifact folder end up inlined. Remote URLs break the offline promise.
- `recharts` needs a sized parent: `Chart` sets height; do not put it in a zero-height flex child.
- Build takes 5 to 10 s warm, up to 45 s on first run after setup (cold cache). Set `timeout=300`.
- Windows: pass forward-slash absolute paths to `--out`. The kit lives in `%USERPROFILE%\.artifact-kit`.
- The screenshot is 1440x900 (fullPage) for all formats except deck (1920x1080 per slide). Mobile is not checked automatically.

## Verification
- `check` prints `OK ... console: 0 erro(s)`: kit healthy.
- After every build: `OK` line, screenshot inspected, checklist passed, final file opens from `file://`.
