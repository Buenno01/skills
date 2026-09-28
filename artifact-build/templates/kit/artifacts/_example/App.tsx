import { DashboardShell, Cell } from "@/shells";
import { KpiCard, Chart, DataTable, Callout, Timeline, DonutChart } from "@/blocks";
import { Card, CardHeader, CardTitle, CardContent } from "@/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/ui/tabs";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "@/ui/dialog";
import { fmt } from "@/lib/utils";
import { dash } from "./data";

export default function App() {
  return (
    <DashboardShell title="Kit smoke test" subtitle="Exercita shells, blocks e ui" controls={<><Badge variant="success">ok</Badge><Dialog><DialogTrigger asChild><Button size="sm" variant="outline">Sobre</Button></DialogTrigger><DialogContent><DialogTitle>Artifact kit</DialogTitle><DialogDescription>Build de verificação.</DialogDescription></DialogContent></Dialog></>}>
      {dash.kpis.map((k, i) => <Cell key={i} span={3}><KpiCard {...k} /></Cell>)}
      <Cell span={8}><Card><CardHeader><CardTitle>Séries</CardTitle></CardHeader><CardContent>
        <Tabs defaultValue="line"><TabsList><TabsTrigger value="line">Linha</TabsTrigger><TabsTrigger value="bar">Barra</TabsTrigger></TabsList>
          <TabsContent value="line"><Chart kind="line" data={dash.series} x="mes" series={[{ key: "receita" }, { key: "custo" }]} format={fmt.compact} legend /></TabsContent>
          <TabsContent value="bar"><Chart kind="bar" data={dash.series} x="mes" series={[{ key: "receita" }, { key: "custo" }]} format={fmt.compact} stacked /></TabsContent>
        </Tabs></CardContent></Card></Cell>
      <Cell span={4}><Card><CardHeader><CardTitle>Canais</CardTitle></CardHeader><CardContent><DonutChart data={dash.channels} nameKey="canal" valueKey="valor" format={fmt.compact} /></CardContent></Card></Cell>
      <Cell span={7}><DataTable rows={dash.rows} columns={dash.columns} searchable pageSize={8} /></Cell>
      <Cell span={5} className="space-y-4">
        <Callout kind="warning" title="Atenção">Callout de exemplo.</Callout>
        <Timeline items={[{ when: "Jan", title: "Kickoff", status: "done" }, { when: "Fev", title: "Build", status: "current" }, { when: "Mar", title: "Entrega", status: "todo" }]} />
      </Cell>
    </DashboardShell>
  );
}
