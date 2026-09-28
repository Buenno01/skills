// Desempenho mensal de uma loja Shopify fictícia (decoração para casa).
// Tudo que muda com o período vem daqui; App.tsx só deriva e apresenta.

export type Month = {
  mes: string;        // rótulo curto, ex. "Set/25"
  receita: number;    // R$ líquido de cancelamentos
  pedidos: number;
  sessoes: number;
  meta: number;       // meta de receita do mês
  ads: number;        // investimento em mídia paga
  devolucoes: number; // pedidos devolvidos
};

export type Product = {
  sku: string;
  nome: string;
  preco: number;
  margem: number;     // fração, ex. 0.42
  estoque: number;    // unidades em mãos hoje
  porMes: number[];   // pedidos por mês, mesmo índice de `months`
};

export const periodOptions = [
  { value: "3", label: "Últimos 3 meses" },
  { value: "6", label: "Últimos 6 meses" },
  { value: "12", label: "Últimos 12 meses" },
] as const;

export const store = {
  title: "Lume Casa · Desempenho mensal",
  updatedAt: "atualizado em 28/09/2026",
};

// 24 meses: Set/24 a Ago/26. O ano anterior serve de base de comparação.
export const months: Month[] = [
  { mes: "Set/24", receita: 162300, pedidos: 790, sessoes: 52400, meta: 170000, ads: 20100, devolucoes: 27 },
  { mes: "Out/24", receita: 177900, pedidos: 856, sessoes: 56800, meta: 175000, ads: 22000, devolucoes: 25 },
  { mes: "Nov/24", receita: 268400, pedidos: 1362, sessoes: 91200, meta: 250000, ads: 35600, devolucoes: 51 },
  { mes: "Dez/24", receita: 241600, pedidos: 1198, sessoes: 80900, meta: 235000, ads: 30400, devolucoes: 44 },
  { mes: "Jan/25", receita: 148900, pedidos: 741, sessoes: 50700, meta: 160000, ads: 18200, devolucoes: 38 },
  { mes: "Fev/25", receita: 142200, pedidos: 702, sessoes: 48300, meta: 155000, ads: 17400, devolucoes: 30 },
  { mes: "Mar/25", receita: 176800, pedidos: 851, sessoes: 56200, meta: 175000, ads: 21500, devolucoes: 28 },
  { mes: "Abr/25", receita: 186100, pedidos: 889, sessoes: 58600, meta: 185000, ads: 22300, devolucoes: 31 },
  { mes: "Mai/25", receita: 207400, pedidos: 984, sessoes: 63500, meta: 200000, ads: 24600, devolucoes: 33 },
  { mes: "Jun/25", receita: 196300, pedidos: 936, sessoes: 61100, meta: 200000, ads: 23700, devolucoes: 30 },
  { mes: "Jul/25", receita: 201500, pedidos: 962, sessoes: 62300, meta: 205000, ads: 24100, devolucoes: 32 },
  { mes: "Ago/25", receita: 218200, pedidos: 1028, sessoes: 66000, meta: 210000, ads: 25800, devolucoes: 33 },
  { mes: "Set/25", receita: 198400, pedidos: 940, sessoes: 61200, meta: 210000, ads: 24000, devolucoes: 31 },
  { mes: "Out/25", receita: 214700, pedidos: 1010, sessoes: 66900, meta: 215000, ads: 26500, devolucoes: 29 },
  { mes: "Nov/25", receita: 318900, pedidos: 1580, sessoes: 104300, meta: 300000, ads: 41000, devolucoes: 58 },
  { mes: "Dez/25", receita: 287300, pedidos: 1390, sessoes: 92800, meta: 280000, ads: 35500, devolucoes: 47 },
  { mes: "Jan/26", receita: 176200, pedidos: 862, sessoes: 58100, meta: 190000, ads: 21000, devolucoes: 40 },
  { mes: "Fev/26", receita: 168500, pedidos: 815, sessoes: 55400, meta: 185000, ads: 19800, devolucoes: 33 },
  { mes: "Mar/26", receita: 209800, pedidos: 990, sessoes: 64700, meta: 205000, ads: 25200, devolucoes: 30 },
  { mes: "Abr/26", receita: 221400, pedidos: 1035, sessoes: 67300, meta: 215000, ads: 26100, devolucoes: 35 },
  { mes: "Mai/26", receita: 246900, pedidos: 1150, sessoes: 72900, meta: 230000, ads: 28400, devolucoes: 38 },
  { mes: "Jun/26", receita: 233600, pedidos: 1090, sessoes: 70100, meta: 235000, ads: 27300, devolucoes: 34 },
  { mes: "Jul/26", receita: 239100, pedidos: 1120, sessoes: 71600, meta: 240000, ads: 27800, devolucoes: 36 },
  { mes: "Ago/26", receita: 258700, pedidos: 1195, sessoes: 75800, meta: 245000, ads: 29900, devolucoes: 37 },
];

// Participação de cada canal na receita e nas sessões (frações). Comparar as duas colunas mostra quem converte.
export const channels = [
  { canal: "Orgânico", receita: 0.31, sessoes: 0.36 },
  { canal: "Pago", receita: 0.27, sessoes: 0.24 },
  { canal: "Direto", receita: 0.20, sessoes: 0.16 },
  { canal: "Social", receita: 0.12, sessoes: 0.19 },
  { canal: "E-mail", receita: 0.10, sessoes: 0.05 },
];

// Pedidos por mês por produto: acompanha a sazonalidade de `months` com peso e tendência próprios.
const seasonal = months.map(m => m.pedidos / 1000);
const build = (base: number, drift: number) => seasonal.map((s, i) => Math.round(base * s * (1 + drift * (i / 23))));

export const products: Product[] = [
  { sku: "VAS-028", nome: "Vaso Cerâmica Terra 28 cm", preco: 189, margem: 0.46, estoque: 210, porMes: build(150, 0.20) },
  { sku: "LUM-RAT", nome: "Luminária Pendente Rattan", preco: 349, margem: 0.41, estoque: 48, porMes: build(95, 0.35) },
  { sku: "VEL-KT4", nome: "Kit 4 Velas Aromáticas", preco: 129, margem: 0.58, estoque: 620, porMes: build(180, 0.10) },
  { sku: "MAN-TRI", nome: "Manta Tricô Areia", preco: 259, margem: 0.44, estoque: 95, porMes: build(70, -0.15) },
  { sku: "ESP-060", nome: "Espelho Orgânico 60 cm", preco: 429, margem: 0.39, estoque: 22, porMes: build(60, 0.40) },
  { sku: "JOG-LIN", nome: "Jogo Americano Linho (4 un.)", preco: 89, margem: 0.52, estoque: 340, porMes: build(120, 0.05) },
  { sku: "CES-FIB", nome: "Cesto Fibra Natural", preco: 159, margem: 0.48, estoque: 130, porMes: build(85, 0.12) },
  { sku: "QUA-BOT", nome: "Quadro Botânico A3", preco: 119, margem: 0.55, estoque: 410, porMes: build(75, -0.25) },
  { sku: "DIF-CED", nome: "Difusor Cedro 250 ml", preco: 99, margem: 0.57, estoque: 280, porMes: build(110, 0.18) },
  { sku: "TAP-JUT", nome: "Tapete Juta 1,5 x 2 m", preco: 389, margem: 0.36, estoque: 31, porMes: build(40, 0.22) },
];
