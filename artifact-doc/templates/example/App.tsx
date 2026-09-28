import { DocShell, DocSection } from "@/shells";
import { Callout, Chart, DataTable, Figure, Timeline } from "@/blocks";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/ui/accordion";
import { fmt } from "@/lib/utils";
import { doc, type FunnelRow, type DeviceRow } from "./data";

// Column renderers live in App.tsx (layout), raw numbers live in data.ts (content).
const pctCell = (key: keyof FunnelRow) => (r: FunnelRow) => fmt.pct(r[key] as number, 1);
const deltaCell = (r: FunnelRow) => {
  const v = r.variacao;
  if (v === 0) return <span className="text-muted-foreground">0 p.p.</span>;
  const s = (v > 0 ? "+" : "-") + fmt.pct(Math.abs(v), 1).replace("%", " p.p.");
  return <span className={v < 0 ? "text-destructive" : "text-success"}>{s}</span>;
};
const funnelColumns = doc.funnel.columns.map(c =>
  c.key === "sessoes" ? { ...c, render: (r: FunnelRow) => fmt.int(r.sessoes) }
  : c.key === "taxa" ? { ...c, render: pctCell("taxa") }
  : c.key === "variacao" ? { ...c, render: deltaCell }
  : c
);
const appendixColumns = doc.appendix.columns.map(c =>
  c.key === "sessoes" ? { ...c, render: (r: FunnelRow) => fmt.int(r.sessoes) }
  : c.key === "taxa" ? { ...c, render: pctCell("taxa") }
  : c.key === "variacao" ? { ...c, render: deltaCell }
  : c
);
const deviceColumns = doc.devices.columns.map(c =>
  c.key === "sessoes" ? { ...c, render: (r: DeviceRow) => fmt.int(r.sessoes) }
  : c.key === "conversao" ? { ...c, render: (r: DeviceRow) => fmt.pct(r.conversao, 1) }
  : c.key === "ticket" ? { ...c, render: (r: DeviceRow) => fmt.money(r.ticket) }
  : c
);

export default function App() {
  return (
    <DocShell
      title={doc.title}
      subtitle={doc.subtitle}
      meta={<><span>{doc.client}</span><span>{doc.author}</span><span>{doc.date}</span><span>{doc.version}</span></>}
    >
      {/* 1. Executive summary always first: the reader may stop here. */}
      <DocSection id="resumo" title="Resumo executivo">
        {doc.summary.map((p, i) => <p key={i}>{p}</p>)}
        <Callout kind="warning" title="Decisão pedida">{doc.ask}</Callout>
      </DocSection>

      <DocSection id="contexto" title="Contexto">
        {doc.context.map((p, i) => <p key={i}>{p}</p>)}
      </DocSection>

      {/* 2. Evidence: table inside prose, one paragraph before, one after. */}
      <DocSection id="funil" title="Onde a conversão cai">
        <p>O funil de setembro mostra que a perda está concentrada em uma única etapa. A passagem da página de produto para o carrinho e a passagem do pagamento para o pedido concluído estão dentro da variação histórica.</p>
        <DataTable rows={doc.funnel.rows} columns={funnelColumns} caption={doc.funnel.caption} />
        <p>A passagem do carrinho para o pagamento caiu de 50% para 41%. Aplicada ao volume de setembro, essa diferença representa cerca de 1.850 sessões que deixaram de chegar ao pagamento no mês.</p>
      </DocSection>

      {/* Level 3 sections are siblings placed right after their parent (not nested): the TOC registers sections in mount order, and nested children would mount before the parent. */}
      <DocSection id="funil-tendencia" title="Tendência mensal" level={3}>
        <p>A queda não foi gradual. Ela começa no mês da migração do checkout e se aprofunda nos dois meses seguintes.</p>
        <Figure caption={doc.trend.caption}>
          <Chart kind="line" data={doc.trend.data} x="mes" series={[{ key: "carrinhoPagamento", label: "Carrinho para pagamento" }]} height={220} format={v => v + "%"} />
        </Figure>
      </DocSection>

      <DocSection id="funil-dispositivo" title="Por dispositivo" level={3}>
        <p>Mobile concentra dois terços das sessões e converte à metade do desktop. Antes de julho a diferença entre os dois era de 0,6 ponto; hoje é de 1,3.</p>
        <DataTable rows={doc.devices.rows} columns={deviceColumns} />
      </DocSection>

      <DocSection id="causas" title="Causas identificadas">
        <ol>
          {doc.findings.map(f => <li key={f.title}><strong>{f.title}.</strong> {f.body}</li>)}
        </ol>
        <Callout kind="info" title="O que não explica a queda">Sazonalidade (julho a setembro de 2025 teve conversão estável), mudanças de preço (nenhuma no período) e indisponibilidade de estoque (abaixo de 2% do catálogo).</Callout>
      </DocSection>

      <DocSection id="plano" title="Plano de correção">
        <p>Três entregas sequenciais, cada uma medida antes da seguinte. A primeira é a de maior impacto esperado e menor esforço.</p>
        {/* DocShell prose rules style every <ol>/<li>; the wrapper resets them so the Timeline keeps its dots and spacing. */}
        <div className="my-4 [&>ol]:list-none [&>ol]:pl-0 [&>ol]:my-0 [&>ol>li]:my-0 [&>ol>li:not(:last-child)]:mb-6">
          <Timeline items={doc.plan} />
        </div>
      </DocSection>

      <DocSection id="riscos" title="Riscos e limitações">
        <ul>
          {doc.risks.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
        <Callout kind="danger" title="Prazo limite">Sem a correção publicada até 24 de outubro, a medição perde validade e a decisão sobre o checkout ficará para janeiro.</Callout>
      </DocSection>

      {/* 3. Appendix: reference material folded away so the main reading flow stays short. */}
      <DocSection id="apendice" title="Apêndice">
        <p>Material de referência. Não é necessário para a decisão.</p>
        <Accordion type="single" collapsible className="border rounded-lg px-4">
          <AccordionItem value="metodo">
            <AccordionTrigger>Método e fontes</AccordionTrigger>
            <AccordionContent>
              {doc.method.map(m => (
                <p key={m.q}><strong>{m.q}</strong> {m.a}</p>
              ))}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="funil-junho">
            <AccordionTrigger>Funil de junho (base de comparação)</AccordionTrigger>
            <AccordionContent>
              <DataTable rows={doc.appendix.rows} columns={appendixColumns} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </DocSection>
    </DocShell>
  );
}
