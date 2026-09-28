// All business logic lives here as pure functions. App.tsx only wires inputs to compute().

export const tool = {
  title: "Simulador de ROI: migração para Shopify",
  description:
    "Estime o retorno de migrar uma loja de e-commerce para a Shopify. Ajuste as premissas à esquerda ou escolha um cenário; os resultados recalculam na hora e ficam salvos neste navegador.",
  storageKey: "roi-shopify-v1",
  horizon: 24,
};

export type Params = {
  revenue: number;      // faturamento mensal atual (BRL)
  conversion: number;   // taxa de conversão atual (0..1)
  uplift: number;       // ganho relativo de conversão após migração (0..1)
  aov: number;          // ticket médio (BRL)
  margin: number;       // margem de contribuição (0..1)
  currentCost: number;  // custo mensal da plataforma atual (BRL)
  shopifyCost: number;  // custo mensal Shopify + apps (BRL)
  migration: number;    // investimento único de migração (BRL)
  ramp: number;         // meses até o uplift completo
};

export const defaults: Params = {
  revenue: 180000,
  conversion: 0.014,
  uplift: 0.18,
  aov: 240,
  margin: 0.32,
  currentCost: 4200,
  shopifyCost: 3100,
  migration: 95000,
  ramp: 3,
};

export type Preset = { id: string; label: string; note: string; patch: Partial<Params> };
export const presets: Preset[] = [
  { id: "conservador", label: "Conservador", note: "Uplift de 8% em 6 meses; migração com retrabalho.", patch: { uplift: 0.08, ramp: 6, migration: 120000 } },
  { id: "base", label: "Base", note: "Média observada em migrações de lojas de porte semelhante.", patch: { uplift: 0.18, ramp: 3, migration: 95000 } },
  { id: "agressivo", label: "Agressivo", note: "Checkout otimizado e apps de recuperação de carrinho desde o mês 1.", patch: { uplift: 0.3, ramp: 2, migration: 85000 } },
];

/** Returns which preset matches the current params, or null when the user customized them. */
export function matchPreset(p: Params): string | null {
  const hit = presets.find(s => Object.entries(s.patch).every(([k, v]) => p[k as keyof Params] === v));
  return hit ? hit.id : null;
}

const safe = (n: number) => (Number.isFinite(n) ? n : 0);
const div = (a: number, b: number) => (b === 0 || !Number.isFinite(a / b) ? 0 : a / b);

export type Month = { mes: string; ganho: number; acumulado: number };

export function compute(p: Params, horizon = tool.horizon) {
  const sessions = div(p.revenue, p.aov * p.conversion);        // visitas/mês implícitas
  const fullGain = p.revenue * p.uplift * p.margin;              // margem incremental/mês em regime
  const costSaving = p.currentCost - p.shopifyCost;              // pode ser negativo
  const monthlyGainSteady = fullGain + costSaving;

  let acumulado = -p.migration;
  let payback: number | null = null;
  const projection: Month[] = [];
  for (let m = 1; m <= horizon; m++) {
    const rampFactor = p.ramp <= 0 ? 1 : Math.min(1, m / p.ramp);
    const ganho = fullGain * rampFactor + costSaving;
    acumulado += ganho;
    if (payback === null && acumulado >= 0) payback = m;
    projection.push({ mes: `M${m}`, ganho: safe(ganho), acumulado: safe(acumulado) });
  }
  const totalGain = acumulado + p.migration;
  const roi: number | null = p.migration > 0 ? safe(div(totalGain - p.migration, p.migration)) : null; // null = not defined without investment
  return {
    sessions: safe(sessions),
    monthlyGainSteady: safe(monthlyGainSteady),
    incrementalRevenue: safe(p.revenue * p.uplift),
    costSaving: safe(costSaving),
    payback,
    roi,
    netHorizon: safe(acumulado),
    projection,
  };
}

/** Sensitivity: payback and net result for a range of uplift values, everything else held. */
export type SensRow = { uplift: string; payback: string; net12: number; net24: number; roi24: number | null };
export const months = (n: number) => `${n} ${n === 1 ? "mês" : "meses"}`;
export function sensitivity(p: Params): SensRow[] {
  const steps = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3];
  return steps.map(u => {
    const r = compute({ ...p, uplift: u }, 24);
    return {
      uplift: `${Math.round(u * 100)}%`,
      payback: r.payback === null ? "> 24 meses" : months(r.payback),
      net12: r.projection[11].acumulado,
      net24: r.netHorizon,
      roi24: r.roi,
    };
  });
}

/** Sanitizes anything read from an input or from localStorage. */
export function coerce(raw: unknown): Params {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = { ...defaults };
  for (const k of Object.keys(defaults) as (keyof Params)[]) {
    const v = Number(src[k]);
    if (Number.isFinite(v) && v >= 0) out[k] = v;
  }
  return out;
}
