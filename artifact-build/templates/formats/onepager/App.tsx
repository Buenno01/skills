import { PageShell } from "@/shells";
import { StatRow, Stat } from "@/blocks";
import { Separator } from "@/ui/separator";
import { page } from "./data";

export default function App() {
  return (
    <PageShell title={page.title}>
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-medium">{page.kicker}</p>
        <h1 className="text-[26pt] font-semibold tracking-tight leading-tight mt-1">{page.title}</h1>
        <p className="text-muted-foreground mt-1">{page.subtitle}</p>
      </header>
      <Separator />
      <section className="grid grid-cols-2 gap-6">
        {page.blocks.map((b, i) => <div key={i}><h2 className="font-semibold mb-1">{b.title}</h2><p className="text-[10.5pt]">{b.text}</p></div>)}
      </section>
      <StatRow className="mt-auto">{page.stats.map((s, i) => <Stat key={i} value={s.value} label={s.label} className="[&>div:first-child]:text-[22pt]" />)}</StatRow>
      <footer className="text-xs text-muted-foreground">{page.footer}</footer>
    </PageShell>
  );
}
