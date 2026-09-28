import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * DocShell: reading layout with sticky table of contents (from <DocSection id title>), header, optional meta line.
 * Max reading width 72ch, generous line-height, print-friendly (TOC hidden, sections keep together).
 */
type Section = { id: string; title: string; level: 2 | 3 };
const Ctx = React.createContext<{ register: (s: Section) => void }>({ register: () => {} });

export function DocShell({ title, subtitle, meta, children, className }: { title: string; subtitle?: string; meta?: React.ReactNode; children: React.ReactNode; className?: string }) {
  const [sections, setSections] = React.useState<Section[]>([]);
  const [active, setActive] = React.useState<string>("");
  const register = React.useCallback((s: Section) => setSections(p => p.some(x => x.id === s.id) ? p : [...p, s]), []);
  React.useEffect(() => { document.title = title; }, [title]);
  React.useEffect(() => {
    const els = sections.map(s => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(es => { es.forEach(e => e.isIntersecting && setActive(e.target.id)); }, { rootMargin: "0px 0px -70% 0px" });
    els.forEach(e => io.observe(e)); return () => io.disconnect();
  }, [sections]);
  return (
    <Ctx.Provider value={{ register }}>
      <div className={cn("min-h-screen bg-background", className)}>
        <header className="border-b">
          <div className="mx-auto max-w-6xl px-6 py-10">
            <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-2 text-lg text-muted-foreground max-w-[72ch]">{subtitle}</p>}
            {meta && <div className="mt-4 text-sm text-muted-foreground flex flex-wrap gap-x-6 gap-y-1">{meta}</div>}
          </div>
        </header>
        <div className="mx-auto max-w-6xl px-6 py-10 grid gap-12 lg:grid-cols-[220px_1fr]">
          <nav className="no-print hidden lg:block">
            <div className="sticky top-8 text-sm space-y-1">
              {sections.map(s => (
                <a key={s.id} href={"#" + s.id} className={cn("block py-1 transition-colors hover:text-foreground", s.level === 3 && "pl-3 text-[13px]", active === s.id ? "text-foreground font-medium" : "text-muted-foreground")}>{s.title}</a>
              ))}
            </div>
          </nav>
          <main className="doc-body min-w-0 max-w-[72ch] space-y-12 text-[15px] leading-7 [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_strong]:font-semibold [&_table]:my-4">{children}</main>
        </div>
      </div>
    </Ctx.Provider>
  );
}

export function DocSection({ id, title, level = 2, children, className }: { id: string; title: string; level?: 2 | 3; children: React.ReactNode; className?: string }) {
  const { register } = React.useContext(Ctx);
  React.useEffect(() => register({ id, title, level }), [id, title, level, register]);
  const H = level === 2 ? "h2" : "h3";
  return (
    <section id={id} className={cn("scroll-mt-8 print:break-inside-avoid", className)}>
      <H className={cn("font-semibold tracking-tight mb-3", level === 2 ? "text-2xl" : "text-lg")}>{title}</H>
      {children}
    </section>
  );
}
