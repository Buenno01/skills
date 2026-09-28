import { DashboardShell, Cell } from "@/shells";
import { KpiCard, Chart, DataTable } from "@/blocks";
import { Card, CardHeader, CardTitle, CardContent } from "@/ui/card";
import { fmt } from "@/lib/utils";
import { dash } from "./data";

export default function App() {
  return (
    <DashboardShell title={dash.title} subtitle={dash.period}>
      {dash.kpis.map((k, i) => <Cell key={i} span={3}><KpiCard {...k} /></Cell>)}
      <Cell span={8}>
        <Card><CardHeader><CardTitle>Evolução mensal</CardTitle></CardHeader>
          <CardContent><Chart kind="line" data={dash.series} x="mes" series={[{ key: "receita", label: "Receita" }, { key: "custo", label: "Custo" }]} format={fmt.compact} legend /></CardContent></Card>
      </Cell>
      <Cell span={4}>
        <Card><CardHeader><CardTitle>Por canal</CardTitle></CardHeader>
          <CardContent><Chart kind="bar" data={dash.channels} x="canal" series={[{ key: "valor" }]} format={fmt.compact} /></CardContent></Card>
      </Cell>
      <Cell span={12}>
        <Card><CardHeader><CardTitle>Detalhe</CardTitle></CardHeader>
          <CardContent><DataTable rows={dash.rows} columns={dash.columns} searchable pageSize={10} /></CardContent></Card>
      </Cell>
    </DashboardShell>
  );
}
