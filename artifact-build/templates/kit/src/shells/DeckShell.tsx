import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * DeckShell: fixed 1920x1080 canvas scaled to fit the viewport. Keyboard (arrows, space, Home/End),
 * click zones, slide counter, hash + localStorage persistence, print (one slide per page, landscape).
 * Children: an array of <Slide> elements. Dark slides: <Slide dark> (theme decides how dark looks).
 */
type DeckProps = { children: React.ReactNode; title?: string; storageKey?: string; className?: string };

export function DeckShell({ children, title, storageKey = "deck", className }: DeckProps) {
  const slides = React.Children.toArray(children).filter(Boolean);
  const total = slides.length;
  const [i, setI] = React.useState(() => {
    const h = Number(location.hash.replace("#", "")) || 0;
    const s = Number(localStorage.getItem(storageKey + ":slide")) || 0;
    return Math.min(Math.max(h || s, 0), Math.max(total - 1, 0));
  });
  const [scale, setScale] = React.useState(1);
  const go = React.useCallback((n: number) => setI(Math.min(Math.max(n, 0), total - 1)), [total]);

  React.useEffect(() => {
    const fit = () => setScale(Math.min(innerWidth / 1920, innerHeight / 1080));
    fit(); addEventListener("resize", fit); return () => removeEventListener("resize", fit);
  }, []);
  React.useEffect(() => {
    history.replaceState(null, "", "#" + i);
    localStorage.setItem(storageKey + ":slide", String(i));
  }, [i, storageKey]);
  React.useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", " ", "PageDown"].includes(e.key)) { e.preventDefault(); go(i + 1); }
      else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) { e.preventDefault(); go(i - 1); }
      else if (e.key === "Home") go(0); else if (e.key === "End") go(total - 1);
    };
    addEventListener("keydown", k); return () => removeEventListener("keydown", k);
  }, [i, go, total]);
  React.useEffect(() => { if (title) document.title = title; }, [title]);
  React.useEffect(() => {
    const onHash = () => { const h = Number(location.hash.replace("#", "")); if (!Number.isNaN(h) && h !== i) go(h); };
    addEventListener("hashchange", onHash); return () => removeEventListener("hashchange", onHash);
  }, [i, go]);

  return (
    <div className={cn("deck fixed inset-0 overflow-hidden bg-neutral-900 print:static print:overflow-visible print:bg-white", className)}>
      <div className="slide-viewport absolute left-1/2 top-1/2 print:static print:transform-none" style={{ width: 1920, height: 1080, transform: `translate(-50%,-50%) scale(${scale})` }}>
        {slides.map((s, n) => (
          <div key={n} data-slide={n} className={cn("absolute inset-0 print:static print:break-after-page", n === i ? "block" : "hidden print:block")}>{s}</div>
        ))}
      </div>
      <div className="no-print fixed bottom-4 right-5 flex items-center gap-3 text-xs text-white/60 select-none">
        <button onClick={() => go(i - 1)} className="hover:text-white cursor-pointer" aria-label="Anterior">&larr;</button>
        <span className="tabular-nums">{i + 1} / {total}</span>
        <button onClick={() => go(i + 1)} className="hover:text-white cursor-pointer" aria-label="Próximo">&rarr;</button>
      </div>
      <div className="no-print fixed inset-y-0 left-0 w-1/5 cursor-w-resize" onClick={() => go(i - 1)} />
      <div className="no-print fixed inset-y-0 right-0 w-1/5 cursor-e-resize" onClick={() => go(i + 1)} />
      <style>{`@page { size: 1920px 1080px; margin: 0; } @media print { .slide-viewport { width: 1920px; height: auto; } [data-slide] { width: 1920px; height: 1080px; } }`}</style>
    </div>
  );
}

type SlideProps = React.ComponentProps<"section"> & { dark?: boolean; layout?: "title" | "content" | "split" | "full" | "statement" };
/** One slide. Padding and type scale are preset; override via className. Layouts: title (cover), content (h + body), split (two columns), statement (one big sentence), full (no padding). */
export function Slide({ dark, layout = "content", className, children, ...props }: SlideProps) {
  return (
    <section className={cn(
      "size-full bg-background text-foreground flex flex-col",
      dark && "slide-dark",
      layout === "title" && "justify-end p-[120px] gap-6",
      layout === "content" && "p-[96px] gap-10",
      layout === "split" && "p-[96px] grid grid-cols-2 gap-16 items-center",
      layout === "statement" && "justify-center items-center text-center p-[160px]",
      layout === "full" && "p-0",
      className)} {...props}>
      {children}
    </section>
  );
}
/** Preset type for slides. Use these instead of raw text-* so every deck shares a scale. */
export const SlideText = {
  Title: (p: React.ComponentProps<"h1">) => <h1 {...p} className={cn("text-[88px] leading-[0.98] font-semibold tracking-tight", p.className)} />,
  Heading: (p: React.ComponentProps<"h2">) => <h2 {...p} className={cn("text-[56px] leading-[1.05] font-semibold tracking-tight", p.className)} />,
  Sub: (p: React.ComponentProps<"p">) => <p {...p} className={cn("text-[32px] leading-snug text-muted-foreground", p.className)} />,
  Body: (p: React.ComponentProps<"div">) => <div {...p} className={cn("text-[28px] leading-normal space-y-4 [&_li]:list-disc [&_li]:ml-8", p.className)} />,
  Statement: (p: React.ComponentProps<"p">) => <p {...p} className={cn("text-[64px] leading-[1.1] font-medium tracking-tight max-w-[1400px]", p.className)} />,
  Kicker: (p: React.ComponentProps<"p">) => <p {...p} className={cn("text-[22px] uppercase tracking-[0.18em] text-muted-foreground font-medium", p.className)} />,
  Note: (p: React.ComponentProps<"p">) => <p {...p} className={cn("text-[20px] text-muted-foreground", p.className)} />,
};
