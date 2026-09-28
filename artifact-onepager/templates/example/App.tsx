import { PageShell } from "@/shells";
import { StatRow, Stat, Callout } from "@/blocks";
import { Separator } from "@/ui/separator";
import { page } from "./data";

/* One-page project proposal. Layout only; every string lives in data.ts.
   Height budget: header (3 lines) + 5 sections + footer must fit 297mm minus 36mm padding. */

function SectionTitle({ children }: { children: string }) {
  return <h2 className="text-[9pt] uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-1">{children}</h2>;
}

export default function App() {
  return (
    <PageShell title={page.title} size="A4" className="gap-4 leading-snug">
      {/* Header: kicker, title, subtitle, meta row */}
      <header>
        <p className="text-[8pt] uppercase tracking-[0.18em] text-muted-foreground font-medium">{page.kicker}</p>
        <h1 className="text-[20pt] font-semibold tracking-tight leading-tight mt-1">{page.title}</h1>
        <p className="text-[10pt] text-muted-foreground mt-1">{page.subtitle}</p>
        <dl className="mt-3 pt-2 accent-rule grid grid-cols-3 gap-4 text-[9.5pt]">
          {page.meta.map((m) => (
            <div key={m.label}>
              <dt className="text-muted-foreground">{m.label}</dt>
              <dd className="font-medium">{m.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      {/* Two columns: context and proposal */}
      <section className="grid grid-cols-2 gap-8">
        <div>
          <SectionTitle>Contexto</SectionTitle>
          <p className="text-[10.5pt]">{page.context}</p>
        </div>
        <div>
          <SectionTitle>Proposta</SectionTitle>
          <p className="text-[10.5pt]">{page.proposal}</p>
        </div>
      </section>

      {/* Three numbers the reader must remember */}
      <StatRow className="py-1">
        {page.stats.map((s) => (
          <Stat key={s.label} value={s.value} label={s.label} className="flex-1 [&>div:first-child]:text-[20pt] [&>div:last-child]:text-[9pt]" />
        ))}
      </StatRow>

      <Separator />

      {/* Two columns: scope list and phases */}
      <section className="grid grid-cols-2 gap-8">
        <div>
          <SectionTitle>Escopo</SectionTitle>
          <ul className="text-[10.5pt] list-disc pl-4 space-y-0.5 marker:text-muted-foreground">
            {page.scope.map((s) => <li key={s}>{s}</li>)}
          </ul>
          <p className="text-[9.5pt] text-muted-foreground mt-2">Fora do escopo: {page.outOfScope}</p>
        </div>
        <div>
          <SectionTitle>Fases</SectionTitle>
          <ol className="text-[10.5pt] space-y-1">
            {page.phases.map((p) => (
              <li key={p.when} className="grid grid-cols-[80px_1fr] gap-2">
                <span className="text-muted-foreground tabular-nums text-[9.5pt]">{p.when}</span>
                <span>{p.title}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Separator />

      {/* Risks as a compact 2-col table, no DataTable (sorting and search do not belong on paper) */}
      <section>
        <SectionTitle>Riscos e mitigação</SectionTitle>
        <div className="text-[10pt]">
          {page.risks.map((r) => (
            <div key={r.risk} className="grid grid-cols-[1fr_2fr] gap-4 py-1 border-b last:border-b-0">
              <span className="font-medium">{r.risk}</span>
              <span className="text-muted-foreground">{r.mitigation}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Closing call to action, pinned to the bottom with mt-auto */}
      <Callout kind="info" title="Próximos passos" className="mt-auto">
        <p>{page.nextSteps}</p>
      </Callout>

      <footer className="text-[8pt] text-muted-foreground flex justify-between">
        <span>{page.footer}</span>
        <span>1 / 1</span>
      </footer>
    </PageShell>
  );
}
