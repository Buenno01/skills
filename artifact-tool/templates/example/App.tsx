import * as React from "react";
import { ToolShell, Field } from "@/shells";
import { Slider } from "@/ui/slider";
import { Input } from "@/ui/input";
import { Button } from "@/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs";
import { KpiCard, Chart, DataTable, Callout, type Column } from "@/blocks";
import { fmt } from "@/lib/utils";
import { tool, defaults, presets, compute, sensitivity, coerce, matchPreset, months, type Params, type SensRow } from "./data";

/** useState persisted in localStorage; `coerce` protects against stale or malformed saved data. */
function usePersistedParams(key: string): [Params, (patch: Partial<Params>) => void, () => void] {
  const [p, setP] = React.useState<Params>(() => {
    try { return coerce(JSON.parse(localStorage.getItem(key) ?? "")); } catch { return defaults; }
  });
  React.useEffect(() => { try { localStorage.setItem(key, JSON.stringify(p)); } catch { /* quota or private mode */ } }, [key, p]);
  const update = React.useCallback((patch: Partial<Params>) => setP(prev => ({ ...prev, ...patch })), []);
  const reset = React.useCallback(() => setP(defaults), []);
  return [p, update, reset];
}

/** Numeric input that stores a number but never lets NaN reach state. */
function NumberInput({ value, onChange, step = 1 }: { value: number; onChange: (n: number) => void; step?: number }) {
  return <Input type="number" min={0} step={step} value={value} onChange={e => { const n = Number(e.target.value); if (Number.isFinite(n) && n >= 0) onChange(n); }} />;
}

const sensColumns: Column<SensRow>[] = [
  { key: "uplift", header: "Uplift de conversão", sortable: false },
  { key: "payback", header: "Payback", align: "right", sortable: false },
  { key: "net12", header: "Resultado em 12 m", render: r => fmt.money(r.net12), sortable: false },
  { key: "net24", header: "Resultado em 24 m", render: r => fmt.money(r.net24), sortable: false },
  { key: "roi24", header: "ROI em 24 m", align: "right", render: r => r.roi24 === null ? "n/a" : fmt.pct(r.roi24), sortable: false },
];

export default function App() {
  const [p, update, reset] = usePersistedParams(tool.storageKey);
  const r = React.useMemo(() => compute(p), [p]);
  const sens = React.useMemo(() => sensitivity(p), [p]);
  const active = matchPreset(p) ?? "custom";
  const paybackText = r.payback === null ? `> ${tool.horizon} meses` : months(r.payback);

  return (
    <ToolShell title={tool.title} description={tool.description}
      inputs={<>
        <Field label="Cenário" hint={active === "custom" ? "personalizado" : undefined}>
          <Tabs value={active} onValueChange={id => { const s = presets.find(x => x.id === id); if (s) update(s.patch); }}>
            <TabsList className="w-full">{presets.map(s => <TabsTrigger key={s.id} value={s.id}>{s.label}</TabsTrigger>)}</TabsList>
          </Tabs>
        </Field>

        <div className="text-xs font-medium text-muted-foreground pt-1">Loja hoje</div>
        <Field label="Faturamento mensal" hint={fmt.money(p.revenue)}><NumberInput value={p.revenue} step={1000} onChange={v => update({ revenue: v })} /></Field>
        <Field label="Ticket médio" hint={fmt.money(p.aov)}><NumberInput value={p.aov} step={10} onChange={v => update({ aov: v })} /></Field>
        <Field label="Taxa de conversão" hint={fmt.pct(p.conversion, 2)}><Slider min={0.002} max={0.05} step={0.001} value={[p.conversion]} onValueChange={([v]) => update({ conversion: v })} /></Field>
        <Field label="Margem de contribuição" hint={fmt.pct(p.margin)}><Slider min={0.05} max={0.7} step={0.01} value={[p.margin]} onValueChange={([v]) => update({ margin: v })} /></Field>
        <Field label="Custo da plataforma atual / mês" hint={fmt.money(p.currentCost)}><NumberInput value={p.currentCost} step={100} onChange={v => update({ currentCost: v })} /></Field>

        <div className="text-xs font-medium text-muted-foreground pt-1">Migração</div>
        <Field label="Uplift de conversão esperado" hint={fmt.pct(p.uplift)}><Slider min={0} max={0.5} step={0.01} value={[p.uplift]} onValueChange={([v]) => update({ uplift: v })} /></Field>
        <Field label="Meses até o uplift completo" hint={months(p.ramp)}><Slider min={1} max={12} step={1} value={[p.ramp]} onValueChange={([v]) => update({ ramp: v })} /></Field>
        <Field label="Investimento de migração" hint={fmt.money(p.migration)}><NumberInput value={p.migration} step={5000} onChange={v => update({ migration: v })} /></Field>
        <Field label="Shopify + apps / mês" hint={fmt.money(p.shopifyCost)}><NumberInput value={p.shopifyCost} step={100} onChange={v => update({ shopifyCost: v })} /></Field>

        <Button variant="outline" size="sm" className="w-full" onClick={reset}>Restaurar padrões</Button>
      </>}>

      <div className="grid grid-cols-2 gap-4">
        <KpiCard label="Payback" value={paybackText} note="mês em que o acumulado passa de zero" />
        <KpiCard label={`ROI em ${tool.horizon} meses`} value={r.roi === null ? "n/a" : fmt.pct(r.roi)} note={r.roi === null ? "sem investimento não há ROI" : `sobre ${fmt.money(p.migration)} investidos`} />
        <KpiCard label="Ganho mensal em regime" value={fmt.money(r.monthlyGainSteady)} note="margem incremental + economia de plataforma" />
        <KpiCard label={`Resultado líquido em ${tool.horizon} m`} value={fmt.money(r.netHorizon)} note={`receita incremental ${fmt.money(r.incrementalRevenue)}/mês`} />
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-base font-semibold">Resultado acumulado</h2>
          <span className="text-xs text-muted-foreground">investimento no mês 0; cruza zero no payback</span>
        </div>
        <Chart kind="area" data={r.projection} x="mes" series={[{ key: "acumulado", label: "Acumulado" }]} format={fmt.compact} height={260} />
      </div>

      {r.costSaving < 0 && (
        <Callout kind="warning" title="Custo recorrente maior que o atual">
          A Shopify custa {fmt.money(-r.costSaving)} a mais por mês do que a plataforma atual. O retorno depende inteiramente do uplift de conversão.
        </Callout>
      )}
      {r.payback === null && r.costSaving >= 0 && (
        <Callout kind="info" title="Sem payback no horizonte">
          Com estas premissas o investimento não se paga em {tool.horizon} meses. Teste um uplift maior ou um custo de migração menor na tabela abaixo.
        </Callout>
      )}

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-base font-semibold">Sensibilidade ao uplift de conversão</h2>
          <span className="text-xs text-muted-foreground">demais premissas mantidas</span>
        </div>
        <DataTable rows={sens} columns={sensColumns} />
      </div>

      <p className="text-xs text-muted-foreground max-w-[72ch]">
        Cenário ativo: {active === "custom" ? "personalizado." : presets.find(s => s.id === active)?.note} Tráfego implícito de {fmt.int(Math.round(r.sessions))} visitas/mês. Os valores não incluem impostos nem custos de mídia.
      </p>
    </ToolShell>
  );
}
