import { DeckShell, Slide, SlideText as T } from "@/shells";
import { StatRow, Stat, Chart, DataTable, type Column } from "@/blocks";
import { fmt } from "@/lib/utils";
import { deck } from "./data";

type PhaseRow = (typeof deck.timeline.rows)[number];
type InvestRow = (typeof deck.investment.rows)[number];

// DataTable is sized for 1440px dashboards. On the 1920x1080 canvas, scale the
// type and row height through className (Tailwind arbitrary variants).
const deckTable =
  "[&_table]:text-[26px] [&_th]:text-[22px] [&_th]:h-16 [&_th]:px-6 [&_td]:px-6 [&_td]:py-5 [&_td]:whitespace-normal [&_svg]:size-5";

const phaseColumns: Column<PhaseRow>[] = [
  { key: "fase", header: "Fase", sortable: false, width: "34%" },
  { key: "semanas", header: "Semanas", sortable: false, width: "14%" },
  { key: "entrega", header: "Entrega", sortable: false },
];

const investColumns: Column<InvestRow>[] = [
  { key: "item", header: "Item", sortable: false, width: "38%" },
  { key: "valor", header: "Valor", sortable: false, width: "18%", render: r => (r.valor ? fmt.money(r.valor, "BRL") : "Sem custo Shakers") },
  { key: "condicao", header: "Condição", sortable: false },
];

export default function App() {
  return (
    <DeckShell title={deck.title}>
      {/* 1. Cover: dark allowed here (shakers theme) */}
      <Slide layout="title" dark>
        <T.Kicker>{deck.kicker}</T.Kicker>
        <T.Title>{deck.title}</T.Title>
        <T.Sub>{deck.subtitle}</T.Sub>
        <T.Note className="mt-10">{deck.meta}</T.Note>
      </Slide>

      {/* 2. Content with bullets: one idea, max 4 bullets */}
      <Slide>
        <T.Heading>{deck.context.heading}</T.Heading>
        <T.Body className="max-w-[1400px]">
          <ul>{deck.context.points.map((p, i) => <li key={i}>{p}</li>)}</ul>
        </T.Body>
      </Slide>

      {/* 3. Stat row: max 3 numbers, note with the source */}
      <Slide>
        <T.Heading>{deck.diagnosis.heading}</T.Heading>
        <StatRow size="deck" className="mt-auto">
          {deck.diagnosis.stats.map((s, i) => <Stat key={i} size="deck" value={s.value} label={s.label} />)}
        </StatRow>
        <T.Note className="mb-4">{deck.diagnosis.note}</T.Note>
      </Slide>

      {/* 4. Section divider: kicker + heading, dark */}
      <Slide layout="title" dark>
        <T.Kicker>Parte 2</T.Kicker>
        <T.Title>A proposta</T.Title>
      </Slide>

      {/* 5. Three-column content: intro line + 3 short items */}
      <Slide>
        <T.Heading>{deck.approach.heading}</T.Heading>
        <T.Sub className="max-w-[1400px]">{deck.approach.intro}</T.Sub>
        <div className="mt-16 grid grid-cols-3 gap-16">
          {deck.approach.items.map((it, i) => (
            <div key={i} className="accent-rule pt-6">
              <div className="text-[32px] font-semibold leading-tight">{it.title}</div>
              <p className="mt-3 text-[24px] leading-normal text-muted-foreground">{it.text}</p>
            </div>
          ))}
        </div>
      </Slide>

      {/* 6. Split: text left, chart right. zoom scales recharts' 12px ticks to 24px */}
      <Slide layout="split">
        <div className="flex flex-col gap-8">
          <T.Heading>{deck.funnel.heading}</T.Heading>
          <T.Body>
            <p>O checkout em uma etapa recupera parte do abandono sem mudar tráfego nem catálogo.</p>
            <p>Pedidos mensais passam de {fmt.int(2100)} para {fmt.int(2900)} no cenário conservador.</p>
          </T.Body>
          <T.Note>{deck.funnel.caption}</T.Note>
        </div>
        <div style={{ zoom: 2 }}>
          <Chart kind="bar" data={deck.funnel.data} x="etapa" height={400}
            series={[{ key: "atual", label: "Atual" }, { key: "projetado", label: "Projetado" }]}
            format={n => fmt.compact(n)} legend />
        </div>
      </Slide>

      {/* 7. Table slide: 5 rows max, larger type via className */}
      <Slide>
        <T.Heading>{deck.timeline.heading}</T.Heading>
        <DataTable rows={deck.timeline.rows} columns={phaseColumns} className={deckTable} />
        <T.Note>Total: 12 semanas de projeto e 6 meses de operação assistida.</T.Note>
      </Slide>

      {/* 8. Table slide with money */}
      <Slide>
        <T.Heading>{deck.investment.heading}</T.Heading>
        <DataTable rows={deck.investment.rows} columns={investColumns} className={deckTable} />
        <T.Note>{deck.investment.note}</T.Note>
      </Slide>

      {/* 9. Statement */}
      <Slide layout="statement">
        <T.Statement>{deck.closing}</T.Statement>
      </Slide>

      {/* 10. Closing: dark, contact only */}
      <Slide layout="title" dark>
        <T.Kicker>Próximo passo</T.Kicker>
        <T.Title>Alinhar escopo em uma reunião de 45 minutos.</T.Title>
        <T.Sub>{deck.contact}</T.Sub>
      </Slide>
    </DeckShell>
  );
}
