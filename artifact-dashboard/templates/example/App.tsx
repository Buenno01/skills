import * as React from "react";
import { DashboardShell, Cell } from "@/shells";
import { KpiCard, Chart, DataTable, type Column } from "@/blocks";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/ui/select";
import { Switch } from "@/ui/switch";
import { Label } from "@/ui/label";
import { Badge } from "@/ui/badge";
import { fmt } from "@/lib/utils";
import { store, months, channels, products, periodOptions, type Month } from "./data";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const delta = (cur: number, prev: number) => (prev ? Math.round(((cur - prev) / prev) * 1000) / 10 : 0);
const pct1 = (n: number) => fmt.pct(n, 1);

type MonthRow = Month & { ticket: number; conversao: number; roas: number; atingimento: number };
type ProductRow = { sku: string; nome: string; pedidos: number; receita: number; margem: number; cobertura: number };

export default function App() {
  const [period, setPeriod] = React.useState<string>("12");
  const [yoy, setYoy] = React.useState(false);
  const n = Number(period);

  // Janela atual, janela imediatamente anterior (mesmo tamanho) e mesma janela um ano antes.
  const view = React.useMemo(() => {
    const end = months.length;
    const cur = months.slice(end - n, end);
    const prev = months.slice(end - 2 * n, end - n);
    const lastYear = months.slice(end - n - 12, end - 12);
    return { cur, prev, lastYear, start: end - n };
  }, [n]);

  const kpis = React.useMemo(() => {
    const agg = (ms: Month[]) => {
      const receita = sum(ms.map(m => m.receita));
      const pedidos = sum(ms.map(m => m.pedidos));
      const sessoes = sum(ms.map(m => m.sessoes));
      return { receita, pedidos, ticket: receita / pedidos, conversao: pedidos / sessoes };
    };
    const a = agg(view.cur), b = agg(view.prev);
    return [
      { label: "Receita", value: fmt.money(a.receita), delta: delta(a.receita, b.receita), note: "vs. período anterior" },
      { label: "Pedidos", value: fmt.int(a.pedidos), delta: delta(a.pedidos, b.pedidos) },
      { label: "Ticket médio", value: fmt.money(a.ticket), delta: delta(a.ticket, b.ticket) },
      { label: "Conversão", value: pct1(a.conversao), delta: Math.round((a.conversao - b.conversao) * 1000) / 10, deltaLabel: " p.p." },
    ];
  }, [view]);

  // Rótulo curto no eixo: "Set", "Out"... e "Jan/26" na virada de ano. Rótulos longos no último ponto são cortados pelo SVG.
  const series = React.useMemo(() => view.cur.map((m, i) => ({
    mes: m.mes.startsWith("Jan") ? m.mes : m.mes.slice(0, 3), receita: m.receita, meta: m.meta, anoAnterior: view.lastYear[i]?.receita,
  })), [view]);

  const monthRows = React.useMemo<MonthRow[]>(() => view.cur.map(m => ({
    ...m, ticket: m.receita / m.pedidos, conversao: m.pedidos / m.sessoes, roas: m.receita / m.ads, atingimento: m.receita / m.meta,
  })), [view]);

  const productRows = React.useMemo<ProductRow[]>(() => products.map(p => {
    const pedidos = sum(p.porMes.slice(view.start));
    const ritmo = pedidos / n; // pedidos por mês no período
    return { sku: p.sku, nome: p.nome, pedidos, receita: pedidos * p.preco, margem: p.margem, cobertura: ritmo ? p.estoque / ritmo : 0 };
  }).sort((a, b) => b.receita - a.receita), [view, n]);

  const monthColumns: Column<MonthRow>[] = [
    { key: "mes", header: "Mês", sortable: false },
    { key: "receita", header: "Receita", render: r => fmt.money(r.receita) },
    { key: "atingimento", header: "Meta", render: r => <span className={r.atingimento < 0.995 ? "text-destructive" : undefined}>{fmt.pct(r.atingimento)}</span> },
    { key: "pedidos", header: "Pedidos", render: r => fmt.int(r.pedidos) },
    { key: "ticket", header: "Ticket", render: r => fmt.money(r.ticket) },
    { key: "conversao", header: "Conversão", render: r => pct1(r.conversao) },
    { key: "roas", header: "ROAS", render: r => `${r.roas.toFixed(1)}x` },
    { key: "devolucoes", header: "Devoluções", render: r => fmt.int(r.devolucoes) },
  ];

  const productColumns: Column<ProductRow>[] = [
    { key: "sku", header: "SKU", width: "96px" },
    { key: "nome", header: "Produto" },
    { key: "pedidos", header: "Pedidos", render: r => fmt.int(r.pedidos) },
    { key: "receita", header: "Receita", render: r => fmt.money(r.receita) },
    { key: "margem", header: "Margem", render: r => fmt.pct(r.margem) },
    { key: "cobertura", header: "Estoque (meses)", render: r => (
      <span className="inline-flex items-center justify-end gap-2">
        {r.cobertura.toFixed(1)}
        {r.cobertura < 1 && <Badge variant="destructive">repor</Badge>}
      </span>
    ) },
  ];

  const first = view.cur[0].mes, last = view.cur[view.cur.length - 1].mes;

  return (
    <DashboardShell
      title={store.title}
      subtitle={`${first} a ${last} · ${store.updatedAt}`}
      controls={
        <>
          <div className="flex items-center gap-2 mr-2">
            <Switch id="yoy" checked={yoy} onCheckedChange={setYoy} />
            <Label htmlFor="yoy" className="text-sm">Ano anterior</Label>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>{periodOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </>
      }
    >
      {kpis.map(k => <Cell key={k.label} span={3}><KpiCard {...k} /></Cell>)}

      <Cell span={8}>
        <Card>
          <CardHeader>
            <CardTitle>Receita vs. meta</CardTitle>
            <CardDescription>Receita líquida mensal contra a meta{yoy ? " e o mesmo mês do ano anterior" : ""}</CardDescription>
          </CardHeader>
          <CardContent>
            <Chart kind="line" data={series} x="mes" format={fmt.compact} legend
              series={[
                { key: "receita", label: "Receita" },
                { key: "meta", label: "Meta" },
                ...(yoy ? [{ key: "anoAnterior", label: "Ano anterior" }] : []),
              ]} />
          </CardContent>
        </Card>
      </Cell>

      <Cell span={4}>
        <Card>
          <CardHeader>
            <CardTitle>Canais</CardTitle>
            <CardDescription>Parcela da receita vs. parcela das sessões</CardDescription>
          </CardHeader>
          <CardContent>
            <Chart kind="bar" data={channels} x="canal" format={v => fmt.pct(v)} legend
              series={[{ key: "receita", label: "Receita" }, { key: "sessoes", label: "Sessões" }]} />
          </CardContent>
        </Card>
      </Cell>

      <Cell span={12}>
        <Tabs defaultValue="produtos">
          <TabsList>
            <TabsTrigger value="produtos">Produtos</TabsTrigger>
            <TabsTrigger value="meses">Mês a mês</TabsTrigger>
          </TabsList>
          <TabsContent value="produtos">
            <DataTable rows={productRows} columns={productColumns} searchable caption={`Pedidos e receita no período; estoque em meses no ritmo atual (${fmt.int(n)} meses).`} />
          </TabsContent>
          <TabsContent value="meses">
            <DataTable rows={monthRows} columns={monthColumns} caption="Meta em % de atingimento; ROAS = receita / mídia paga." />
          </TabsContent>
        </Tabs>
      </Cell>
    </DashboardShell>
  );
}
