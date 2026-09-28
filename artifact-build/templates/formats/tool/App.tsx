import * as React from "react";
import { ToolShell, Field } from "@/shells";
import { Slider } from "@/ui/slider";
import { Input } from "@/ui/input";
import { KpiCard, Chart } from "@/blocks";
import { fmt } from "@/lib/utils";
import { tool, compute } from "./data";

export default function App() {
  const [p, setP] = React.useState(tool.defaults);
  const r = compute(p);
  return (
    <ToolShell title={tool.title} description={tool.description}
      inputs={<>
        <Field label="Preço unitário" hint={fmt.money(p.price)}><Input type="number" value={p.price} onChange={e => setP({ ...p, price: Number(e.target.value) })} /></Field>
        <Field label="Volume mensal" hint={fmt.int(p.volume)}><Slider min={0} max={5000} step={50} value={[p.volume]} onValueChange={([v]) => setP({ ...p, volume: v })} /></Field>
        <Field label="Custo variável (%)" hint={fmt.pct(p.varCost)}><Slider min={0} max={1} step={0.01} value={[p.varCost]} onValueChange={([v]) => setP({ ...p, varCost: v })} /></Field>
      </>}>
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Receita / mês" value={fmt.money(r.revenue)} />
        <KpiCard label="Margem / mês" value={fmt.money(r.margin)} />
        <KpiCard label="Margem %" value={fmt.pct(r.marginPct, 1)} />
      </div>
      <Chart kind="area" data={r.projection} x="mes" series={[{ key: "acumulado", label: "Margem acumulada" }]} format={fmt.compact} />
    </ToolShell>
  );
}
