import type { Column } from "@/blocks";

export type FunnelRow = { etapa: string; sessoes: number; taxa: number; variacao: number };
export type DeviceRow = { dispositivo: string; sessoes: number; conversao: number; ticket: number };

export const doc = {
  title: "Análise de conversão do checkout",
  subtitle: "Diagnóstico da queda de conversão entre julho e setembro de 2026 e plano de correção para o quarto trimestre.",
  client: "Verde Casa (e-commerce de itens para casa)",
  author: "Time de Growth, Shakers",
  date: "28 de setembro de 2026",
  version: "v1.2, para decisão",

  summary: [
    "A taxa de conversão da loja caiu de 2,4% em junho para 1,7% em setembro. A queda concentra-se em uma etapa: a passagem do carrinho para o pagamento, que perdeu 9 pontos percentuais no período. Tráfego, ticket médio e taxa de adição ao carrinho permaneceram estáveis.",
    "A causa principal é a mudança no cálculo de frete feita em 12 de julho, que passou a exibir o valor apenas na etapa de pagamento. Em mobile, onde estão 68% das sessões, o impacto foi maior porque o campo de CEP ficou abaixo da dobra.",
  ],
  ask: "Aprovar a reintrodução do cálculo de frete no carrinho e a simplificação do checkout mobile até 24 de outubro, com custo estimado de três sprints do time de front-end.",

  context: [
    "A Verde Casa opera com tráfego majoritariamente pago (Meta e Google, 61% das sessões) e uma base de recompra de 22%. Entre março e junho a conversão oscilou entre 2,3% e 2,5%, sem alterações relevantes no funil.",
    "Em julho a plataforma migrou para a versão nova do checkout, que unificou as etapas de endereço e pagamento. Junto com a migração, o cálculo de frete deixou de aparecer no carrinho e passou a depender do CEP informado na etapa final.",
  ],

  funnel: {
    columns: [
      { key: "etapa", header: "Etapa" },
      { key: "sessoes", header: "Sessões (set.)" },
      { key: "taxa", header: "Passagem" },
      { key: "variacao", header: "Δ vs. jun." },
    ] as Column<FunnelRow>[],
    rows: [
      { etapa: "Página de produto", sessoes: 184320, taxa: 0.112, variacao: 0.003 },
      { etapa: "Carrinho", sessoes: 20644, taxa: 0.41, variacao: -0.09 },
      { etapa: "Pagamento", sessoes: 8464, taxa: 0.37, variacao: -0.01 },
      { etapa: "Pedido concluído", sessoes: 3132, taxa: 1, variacao: 0 },
    ] as FunnelRow[],
    caption: "Fonte: GA4, propriedade Verde Casa, 1 a 27 de setembro de 2026. Passagem é a fração de sessões que avança para a etapa seguinte. Variação em pontos percentuais.",
  },

  trend: {
    data: [
      { mes: "mar", conversao: 2.3, carrinhoPagamento: 49 },
      { mes: "abr", conversao: 2.4, carrinhoPagamento: 50 },
      { mes: "mai", conversao: 2.5, carrinhoPagamento: 51 },
      { mes: "jun", conversao: 2.4, carrinhoPagamento: 50 },
      { mes: "jul", conversao: 2.1, carrinhoPagamento: 46 },
      { mes: "ago", conversao: 1.8, carrinhoPagamento: 42 },
      { mes: "set", conversao: 1.7, carrinhoPagamento: 41 },
    ],
    caption: "Figura 1. Passagem do carrinho para o pagamento (%), março a setembro de 2026. A queda começa em julho, mês da migração do checkout.",
  },

  devices: {
    columns: [
      { key: "dispositivo", header: "Dispositivo" },
      { key: "sessoes", header: "Sessões" },
      { key: "conversao", header: "Conversão" },
      { key: "ticket", header: "Ticket médio" },
    ] as Column<DeviceRow>[],
    rows: [
      { dispositivo: "Mobile", sessoes: 125338, conversao: 0.013, ticket: 212 },
      { dispositivo: "Desktop", sessoes: 51610, conversao: 0.026, ticket: 287 },
      { dispositivo: "Tablet", sessoes: 7372, conversao: 0.019, ticket: 254 },
    ] as DeviceRow[],
  },

  findings: [
    {
      title: "Frete invisível até a etapa final",
      body: "Desde 12 de julho o valor do frete só aparece após o preenchimento do CEP na etapa de pagamento. Nas gravações de sessão analisadas (amostra de 120), 43 usuários abandonaram o fluxo em até 10 segundos após ver o valor do frete pela primeira vez.",
    },
    {
      title: "Campo de CEP abaixo da dobra em mobile",
      body: "Em telas de até 390px de largura, o campo de CEP fica fora da área visível ao carregar a etapa de pagamento. O botão de continuar, porém, fica visível e desabilitado, o que gera cliques repetidos sem resposta.",
    },
    {
      title: "Sem sinal de queda na aquisição",
      body: "Custo por clique, CTR e taxa de adição ao carrinho ficaram dentro da variação histórica. A queda não é explicada por mudança na qualidade do tráfego.",
    },
  ],

  plan: [
    { when: "6 a 10 out.", title: "Frete no carrinho", description: "Reintroduzir o cálculo de frete por CEP no carrinho, com o valor visível antes de iniciar o checkout.", status: "current" as const },
    { when: "13 a 17 out.", title: "Checkout mobile", description: "Reordenar os campos para que o CEP fique acima da dobra e remover o estado desabilitado do botão.", status: "todo" as const },
    { when: "20 a 24 out.", title: "Medição", description: "Comparar a passagem carrinho para pagamento contra a semana anterior e contra junho.", status: "todo" as const },
  ],

  risks: [
    "A reintrodução do frete no carrinho pode reduzir a taxa de início de checkout em 2 a 3 pontos, já que parte dos usuários desiste ao ver o valor mais cedo. O efeito líquido ainda é positivo porque a desistência ocorre com menos passos investidos.",
    "O período de Black Friday começa em novembro. Se a correção atrasar além de 24 de outubro, a medição ficará contaminada pelo aumento de tráfego promocional.",
  ],

  method: [
    { q: "Como as sessões foram contadas?", a: "Sessões do GA4 com os eventos view_item, add_to_cart, begin_checkout e purchase, sem deduplicação por usuário. Sessões de teste internas foram excluídas por filtro de IP." },
    { q: "Qual o tamanho da amostra de gravações?", a: "120 gravações do Hotjar entre 1 e 15 de setembro, selecionadas entre sessões que chegaram ao carrinho em mobile. Duas pessoas classificaram cada gravação de forma independente." },
    { q: "Por que junho é a base de comparação?", a: "É o último mês completo antes da migração do checkout e está dentro da faixa histórica de conversão (2,3% a 2,5%)." },
  ],

  appendix: {
    columns: [
      { key: "etapa", header: "Etapa" },
      { key: "sessoes", header: "Sessões (jun.)" },
      { key: "taxa", header: "Passagem" },
      { key: "variacao", header: "Δ vs. mai." },
    ] as Column<FunnelRow>[],
    rows: [
      { etapa: "Página de produto", sessoes: 179844, taxa: 0.109, variacao: 0.001 },
      { etapa: "Carrinho", sessoes: 19603, taxa: 0.5, variacao: -0.01 },
      { etapa: "Pagamento", sessoes: 9802, taxa: 0.38, variacao: 0 },
      { etapa: "Pedido concluído", sessoes: 3725, taxa: 1, variacao: 0 },
    ] as FunnelRow[],
  },
};
