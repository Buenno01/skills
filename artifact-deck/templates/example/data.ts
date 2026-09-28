// Content and numbers for the deck. Layout lives in App.tsx.
export const deck = {
  kicker: "Proposta comercial",
  title: "Migração e evolução da loja Casa Verde",
  subtitle: "Shopify Plus, checkout customizado e operação assistida por 6 meses.",
  meta: "Shakers para Casa Verde Decoração · setembro de 2026",

  context: {
    heading: "Onde a loja está hoje",
    points: [
      "Plataforma atual limita promoções por segmento e frete por região.",
      "Checkout em três etapas com abandono acima da média do setor.",
      "Integração com o ERP feita por planilha, atualizada uma vez ao dia.",
      "Time interno de duas pessoas cuida de catálogo, pedidos e suporte.",
    ],
  },

  diagnosis: {
    heading: "Diagnóstico em números",
    stats: [
      { value: "2,1%", label: "taxa de conversão atual" },
      { value: "74%", label: "abandono no checkout" },
      { value: "1x/dia", label: "sincronização de estoque" },
    ],
    note: "Base: Google Analytics e relatórios da plataforma atual, últimos 90 dias.",
  },

  approach: {
    heading: "O que propomos",
    intro: "Uma migração em fases, sem parar a operação, com o checkout como prioridade.",
    items: [
      { title: "Migrar para Shopify Plus", text: "Catálogo, clientes e histórico de pedidos com redirecionamentos preservados." },
      { title: "Checkout em uma etapa", text: "Checkout Extensibility com frete por CEP, PIX nativo e upsell contextual." },
      { title: "ERP em tempo real", text: "Estoque e pedidos sincronizados por webhook, sem planilha intermediária." },
    ],
  },

  funnel: {
    heading: "Projeção do funil após o checkout novo",
    caption: "Sessões por etapa em um mês típico (base 100 mil sessões). Cenário conservador.",
    data: [
      { etapa: "Sessões", atual: 100000, projetado: 100000 },
      { etapa: "Produto", atual: 42000, projetado: 42000 },
      { etapa: "Carrinho", atual: 8100, projetado: 8100 },
      { etapa: "Checkout", atual: 5300, projetado: 6200 },
      { etapa: "Pedido", atual: 2100, projetado: 2900 },
    ],
  },

  timeline: {
    heading: "Fases e prazos",
    rows: [
      { fase: "1. Descoberta e arquitetura", semanas: 2, entrega: "Mapa de dados, plano de redirecionamentos, backlog priorizado" },
      { fase: "2. Tema e catálogo", semanas: 4, entrega: "Tema Online Store 2.0, migração de produtos e clientes" },
      { fase: "3. Checkout e pagamentos", semanas: 3, entrega: "Checkout Extensibility, PIX, frete por CEP" },
      { fase: "4. Integração ERP", semanas: 3, entrega: "Webhooks de pedido e estoque, conciliação" },
      { fase: "5. Go-live e operação assistida", semanas: 24, entrega: "Virada de DNS, monitoramento, evoluções mensais" },
    ],
  },

  investment: {
    heading: "Investimento",
    rows: [
      { item: "Projeto de migração (fases 1 a 4)", valor: 148000, condicao: "3 parcelas, por fase entregue" },
      { item: "Operação assistida (6 meses)", valor: 54000, condicao: "R$ 9.000 por mês" },
      { item: "Licença Shopify Plus", valor: 0, condicao: "Contratada direto com a Shopify, a partir de US$ 2.300/mês" },
    ],
    note: "Valores em reais, sem impostos. Validade da proposta: 30 dias.",
  },

  closing: "Uma loja que vende mais sem exigir mais do time que a opera.",
  contact: "Shakers · comercial@shakers.com.br",
};
