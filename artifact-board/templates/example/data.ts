// Content only. Layout lives in App.tsx.

export type Status = "done" | "doing" | "todo" | "risk";

export const board = {
  title: "Roadmap de Produto: Q4 2026",
  subtitle: "Plataforma de gestão de freelancers. Revisão de 28 set 2026, squads Marketplace, Pagamentos, Dados e Plataforma.",
  months: ["Outubro", "Novembro", "Dezembro"],
  // Timeline grid: 3 months, each split in 2 halves = 6 columns. start/end are 1-based half-month indexes (inclusive).
  lanes: [
    {
      id: "marketplace",
      title: "Marketplace",
      owner: "Squad Marketplace",
      items: [
        { id: "m1", title: "Busca por habilidades v2", start: 1, end: 2, status: "doing" as Status },
        { id: "m2", title: "Perfil público do freelancer", start: 3, end: 4, status: "todo" as Status },
        { id: "m3", title: "Recomendação por histórico", start: 5, end: 6, status: "todo" as Status },
      ],
    },
    {
      id: "pagamentos",
      title: "Pagamentos",
      owner: "Squad Pagamentos",
      items: [
        { id: "p1", title: "Split de pagamento por projeto", start: 1, end: 3, status: "doing" as Status },
        { id: "p2", title: "Nota fiscal automática (NFS-e)", start: 3, end: 5, status: "risk" as Status },
        { id: "p3", title: "Pix agendado", start: 6, end: 6, status: "todo" as Status },
      ],
    },
    {
      id: "dados",
      title: "Dados e relatórios",
      owner: "Squad Dados",
      items: [
        { id: "d1", title: "Painel do cliente", start: 1, end: 1, status: "done" as Status },
        { id: "d2", title: "Exportação para ERP (CSV/API)", start: 2, end: 4, status: "doing" as Status },
        { id: "d3", title: "Alertas de orçamento", start: 5, end: 6, status: "todo" as Status },
      ],
    },
    {
      id: "plataforma",
      title: "Plataforma",
      owner: "Infra e Segurança",
      items: [
        { id: "i1", title: "Migração para Postgres 17", start: 1, end: 2, status: "done" as Status },
        { id: "i2", title: "SSO para clientes enterprise", start: 3, end: 6, status: "doing" as Status },
      ],
    },
  ],
  milestones: [
    { at: 2, label: "Release 4.2" },
    { at: 5, label: "Fechamento fiscal" },
  ],
};

export const statusLabel: Record<Status, string> = {
  done: "Concluído",
  doing: "Em andamento",
  todo: "Planejado",
  risk: "Em risco",
};

// Kanban view of the same quarter, grouped by status.
export const kanban = {
  columns: [
    { id: "todo" as Status, title: "Planejado" },
    { id: "doing" as Status, title: "Em andamento" },
    { id: "risk" as Status, title: "Em risco" },
    { id: "done" as Status, title: "Concluído" },
  ],
  cards: [
    { id: 1, status: "doing" as Status, title: "Busca por habilidades v2", squad: "Marketplace", due: "31 out", points: 8 },
    { id: 2, status: "doing" as Status, title: "Split de pagamento por projeto", squad: "Pagamentos", due: "15 nov", points: 13 },
    { id: 3, status: "risk" as Status, title: "Nota fiscal automática (NFS-e)", squad: "Pagamentos", due: "15 dez", points: 13, note: "Depende da homologação da prefeitura de SP" },
    { id: 4, status: "doing" as Status, title: "Exportação para ERP", squad: "Dados", due: "30 nov", points: 5 },
    { id: 5, status: "doing" as Status, title: "SSO para clientes enterprise", squad: "Plataforma", due: "20 dez", points: 8 },
    { id: 6, status: "todo" as Status, title: "Perfil público do freelancer", squad: "Marketplace", due: "30 nov", points: 5 },
    { id: 7, status: "todo" as Status, title: "Recomendação por histórico", squad: "Marketplace", due: "20 dez", points: 8 },
    { id: 8, status: "todo" as Status, title: "Alertas de orçamento", squad: "Dados", due: "15 dez", points: 3 },
    { id: 9, status: "todo" as Status, title: "Pix agendado", squad: "Pagamentos", due: "20 dez", points: 3 },
    { id: 10, status: "done" as Status, title: "Painel do cliente: horas e custos", squad: "Dados", due: "15 out", points: 5 },
    { id: 11, status: "done" as Status, title: "Migração para Postgres 17", squad: "Plataforma", due: "31 out", points: 8 },
  ],
};

// Comparison matrix: which plan gets which capability after Q4. "recommended" marks the highlighted column.
export type MatrixRow = { feature: string; starter: boolean | string; business: boolean | string; enterprise: boolean | string };
export const matrix = {
  title: "Capacidades por plano após o Q4",
  note: "Recomendação comercial: posicionar o plano Business como padrão para contas com mais de 20 freelancers ativos.",
  plans: [
    { id: "starter" as const, name: "Starter", price: "Grátis" },
    { id: "business" as const, name: "Business", price: "R$ 490/mês", recommended: true },
    { id: "enterprise" as const, name: "Enterprise", price: "Sob consulta" },
  ],
  rows: [
    { feature: "Busca por habilidades v2", starter: true, business: true, enterprise: true },
    { feature: "Split de pagamento por projeto", starter: false, business: true, enterprise: true },
    { feature: "Nota fiscal automática (NFS-e)", starter: false, business: true, enterprise: true },
    { feature: "Exportação para ERP", starter: false, business: "CSV", enterprise: "CSV e API" },
    { feature: "Alertas de orçamento", starter: false, business: true, enterprise: true },
    { feature: "SSO (SAML/OIDC)", starter: false, business: false, enterprise: true },
    { feature: "Recomendação por histórico", starter: false, business: true, enterprise: true },
  ] as MatrixRow[],
};
