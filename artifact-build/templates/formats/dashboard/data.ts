import type { Column } from "@/blocks";
export const dash = {
  title: "Painel",
  period: "Jan a Jun 2026",
  kpis: [
    { label: "Receita", value: "R$ 1,2M", delta: 8.4, note: "vs. período anterior" },
    { label: "Clientes", value: "312", delta: 3.1 },
    { label: "Ticket médio", value: "R$ 3.846", delta: -1.2 },
    { label: "Churn", value: "2,1%", delta: -0.4, note: "menor é melhor" },
  ],
  series: [
    { mes: "Jan", receita: 180000, custo: 120000 }, { mes: "Fev", receita: 195000, custo: 125000 },
    { mes: "Mar", receita: 210000, custo: 130000 }, { mes: "Abr", receita: 205000, custo: 128000 },
    { mes: "Mai", receita: 220000, custo: 135000 }, { mes: "Jun", receita: 240000, custo: 140000 },
  ],
  channels: [{ canal: "Direto", valor: 520000 }, { canal: "Parceiros", valor: 410000 }, { canal: "Orgânico", valor: 270000 }],
  columns: [{ key: "cliente", header: "Cliente" }, { key: "plano", header: "Plano" }, { key: "mrr", header: "MRR" }] as Column<{ cliente: string; plano: string; mrr: number }>[],
  rows: Array.from({ length: 24 }, (_, i) => ({ cliente: `Cliente ${i + 1}`, plano: ["Basic", "Pro", "Enterprise"][i % 3], mrr: 1500 + i * 230 })),
};
