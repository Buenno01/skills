---
name: artifact-prototype
description: "Build clickable HTML product mockups with all UI states."
version: 0.1.0
author: Vinicius Costa (Buenno01), Claude Code
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [artifact, prototype, html]
    related_skills: [artifact-build]
---

# artifact-prototype

Clickable product mockups: a multi-screen flow (checkout, onboarding, settings) where every state (default, hover, loading, empty, error, success) is reachable by clicking, delivered as one offline `.html`. Load `artifact-build` for the CLI and visual system; this skill owns only what is specific to prototype: there is no shell, the artifact composes `@/ui` components directly inside a full-height frame.

## When to Use
- User asks for a mockup, wireframe, clickable prototype, "como ficaria a tela", a flow to validate with stakeholders, or states of a screen (vazio, erro, carregando).
- Mobile-first flows (390px frame) or desktop admin screens (960px frame).
- Don't use for: data-heavy dashboards (`artifact-dashboard`), calculators (`artifact-tool`), static one-pagers, or production UI in a real repo.

## Procedure
1. Read `artifact-build/SKILL.md` and `artifact-build/references/components.md` with `read_file`. Done when you know the `Dialog`, `Popover`, `Select`, `Switch`, `Checkbox` and `Callout` APIs.
2. Model the flow before coding: list screens (3 to 5), the states each screen can show, and the transitions. Write it as two union types (`Screen`, `Status`) at the top of `App.tsx`. Done when every state the user named appears in a union.
3. `terminal`: `node <artifact-build dir>/scripts/artifact.mjs init <name> --format prototype --theme <neutral|shakers>`. Done when two `OK` lines print. To start from the rich example instead of the starter, copy `templates/example/{App.tsx,data.ts}` from this skill over the generated files.
4. Put copy, options, prices and mock records in `data.ts`; put screens, frame and state machine in `App.tsx` (`write_file`, then `patch`). One function component per screen, `App` holds the state and switches on `screen`. Done when `App.tsx` has no literal Portuguese strings except labels of prototype controls.
5. `terminal`: `build <name> --out <abs path>.html`, timeout 300. Fix `FAIL tsc` lines and rebuild. Done when the line starts with `OK` and ends with `console: 0 erro(s)` and no `WARN horizontal overflow`.
6. Walk every state. The build screenshot shows only the initial screen, so either open the file with `mcp__browser_navigate` and click through, or run a short Playwright script from `~/.artifact-kit` that clicks and screenshots each state (see `references/state-walk.md`). Inspect each PNG with `vision_analyze`. Done when every union member has been seen on screen.
7. Build again with the other theme (`init <name>-sk --theme shakers`, copy the same two files) if the user has not fixed a theme. Done when both builds print `OK`.
8. Report: path, list of screens and states, what was verified.

## Composition rules for this format
- Frame first. Mobile: a centered `max-w-[390px] min-h-[780px] rounded-[28px] border-4 border-border overflow-hidden` box on `bg-muted/40`. Desktop: `max-w-[960px] rounded-lg border`. Never let the screen fill 1440px edge to edge; the frame is what tells a reader "this is a mockup".
- One task per screen. A screen holds one primary action (`Button` default variant, full width on mobile) plus at most one secondary (`outline`). Two primary buttons on one screen is a bug.
- Header is 2 lines max: product name + flow name, then a stepper. Screens below the header get `p-5` (mobile) or `p-6` (desktop).
- Type scale: screen title `text-lg font-semibold`; body and labels `text-sm`; helper and error text `text-xs`; totals `text-base font-semibold`. Do not go above `text-lg` inside a mobile frame.
- Hit targets: every interactive element inside the frame is at least 44px tall. Pass `className="h-11"` to `Button`, `Input` and `SelectTrigger` (kit default is 36px). Rows with a `Switch` or `Checkbox` get `min-h-11`.
- States are content, not decoration: error is a `Callout kind="danger"` above the form or `text-xs text-destructive` under the field with `aria-invalid` on the input; loading disables the buttons and swaps the label for `<Loader2 className="animate-spin" />` + verb; empty is icon + title + one sentence + one action, centered, `py-16`; success is a `bg-success/15 text-success` circle with `Check`, title, one sentence, then the receipt.
- Prototype controls (screen picker, state toggles, frame switch) live in one `no-print fixed bottom-4 right-4 z-50` `Popover`. Nothing else floats. They are the only elements allowed under 44px.
- No fake chrome: no drawn status bar, no notch, no browser tabs. The border is enough.
- Do not: put a `Card` inside the frame just to group fields (use `space-y-4`); use icons in every row; show numbers not computed from `data.ts`; add a fifth screen "for completeness".

## Recipes
Screen switcher and status (state machine):
```tsx
type Screen = "cart" | "delivery" | "payment" | "done";
type Status = "idle" | "loading" | "error";
const [screen, setScreen] = React.useState<Screen>("cart");
const [status, setStatus] = React.useState<Status>("idle");
const go = (s: Screen) => { setStatus("idle"); setScreen(s); };
const pay = () => { setStatus("loading"); setTimeout(() => method === "card" ? setStatus("error") : go("done"), 900); };
{screen === "cart" && <CartScreen onNext={() => go("delivery")} />}
```
Mobile frame with desktop toggle:
```tsx
<div className="min-h-screen bg-muted/40 p-6 flex justify-center items-start">
  <div className={cn("bg-background w-full", frame === "mobile"
    ? "max-w-[390px] min-h-[780px] rounded-[28px] border-4 border-border shadow-sm overflow-hidden"
    : "max-w-[960px] rounded-lg border shadow-sm")}>{children}</div>
</div>
```
Confirmation dialog driven by state (no `DialogTrigger`):
```tsx
<Dialog open={removing !== null} onOpenChange={o => !o && setRemoving(null)}>
  <DialogContent>
    <DialogHeader><DialogTitle>Remover item?</DialogTitle><DialogDescription>{removing?.name} sai do carrinho.</DialogDescription></DialogHeader>
    <DialogFooter><DialogClose asChild><Button variant="outline" className="h-11">Manter</Button></DialogClose>
      <Button variant="destructive" className="h-11" onClick={confirm}>Remover</Button></DialogFooter>
  </DialogContent>
</Dialog>
```
Field with inline error (validate on submit, not on every keystroke):
```tsx
<div className="space-y-1.5">
  <Label htmlFor="cep">CEP</Label>
  <Input id="cep" className="h-11" inputMode="numeric" value={cep} onChange={e => setCep(e.target.value)} aria-invalid={touched && !cepOk} />
  {touched && !cepOk && <p className="text-xs text-destructive">{copy.cepError}</p>}
</div>
```
Loading button:
```tsx
<Button className="h-11 flex-1" onClick={pay} disabled={status === "loading"}>
  {status === "loading" ? <><Loader2 className="animate-spin" /> Processando</> : "Pagar"}
</Button>
```
Floating prototype controls (hidden in print, outside the composition):
```tsx
<div className="no-print fixed bottom-4 right-4 z-50">
  <Popover>
    <PopoverTrigger asChild><Button variant="outline" size="sm" className="shadow-md bg-background"><Settings2 /> Protótipo</Button></PopoverTrigger>
    <PopoverContent align="end" className="w-72 space-y-3">
      {ORDER.map((s, i) => <Button key={s} size="sm" variant={s === screen ? "default" : "outline"} className="justify-start" onClick={() => go(s)}>{i + 1}. {labels[i]}</Button>)}
      <Button size="sm" variant="outline" onClick={() => { setMethod("card"); setScreen("payment"); setStatus("error"); }}>Pagamento negado</Button>
    </PopoverContent>
  </Popover>
</div>
```

## Pitfalls
- A flex row with name + qty control + price + trash does not fit 390px: names truncate to "Cesta de...". Stack it: name and price on line 1, controls on line 2.
- `Button size="sm"` in a two-column popover grid clips labels longer than ~14 characters. Use one column (`grid gap-1.5`) for long labels and `className="justify-start"`.
- Stepper labels for all 4 steps do not fit the mobile header. Show only the active label; others stay as numbered circles.
- `SelectTrigger` defaults to `w-fit h-9`; pass `className="w-full h-11"` or it looks like a chip.
- `Checkbox onCheckedChange` yields `boolean | "indeterminate"`; coerce with `v === true`.
- `Popover` and `Select` labels look identical to real content: pick a `text=` selector that is unique when scripting clicks (`button[aria-pressed]:has-text('Pix')`, not `text=Pix`).
- To test another theme: `build <name> --theme neutral` (rewrites the token import in place).
- The build screenshot is the initial screen only. A hash deep-link (`location.hash` read into the initial `useState`) lets you screenshot `file.html#payment` without clicking.

## Verification
- Build line: `OK ... console: 0 erro(s)`, no `WARN horizontal overflow`, for each theme built.
- Screenshot of the initial screen: frame centered with visible border and muted page background; header + stepper on two lines; one filled primary button; no truncated product names; the floating "Protótipo" button alone in the corner.
- One screenshot per state (empty, error, loading, success, dialog open, select open): each one readable, nothing behind the dialog overlay that should be in front, error text under the right field, callout above the form.
- Hit-target check in the page (`vision_analyze` or a `getBoundingClientRect` loop): no element inside the frame under 44px tall except the prototype control.
- Shakers theme: Poppins renders, primary is black, no green fills anywhere, success tint is the only colored surface besides the danger callout.
