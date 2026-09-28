export const tool = {
  title: "Simulador",
  description: "Ajuste as premissas à esquerda; os resultados recalculam na hora.",
  defaults: { price: 120, volume: 800, varCost: 0.35 },
};
export type Params = typeof tool.defaults;
export function compute(p: Params) {
  const revenue = p.price * p.volume;
  const margin = revenue * (1 - p.varCost);
  const projection = Array.from({ length: 12 }, (_, i) => ({ mes: `M${i + 1}`, acumulado: margin * (i + 1) }));
  return { revenue, margin, marginPct: revenue ? margin / revenue : 0, projection };
}
