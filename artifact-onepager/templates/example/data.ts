// Content only. Keep every text short: the page has a hard height budget (about 40 lines of 11pt after header and footer).
export const page = {
  kicker: "Proposta de projeto",
  title: "Autoatendimento no app para os chamados mais frequentes do SAC",
  subtitle: "Preparado para Mercearia Vila Nova, rede de 14 lojas. Versão 1, 28 set 2026.",
  meta: [
    { label: "Cliente", value: "Mercearia Vila Nova" },
    { label: "Responsável", value: "Vinicius Costa, Shakers" },
    { label: "Validade", value: "30 dias" },
  ],
  context:
    "Hoje 62% dos chamados do SAC são pedidos de segunda via de boleto, status de entrega e troca de endereço. Cada um consome cerca de 4 minutos de atendente e a espera passa de 6 minutos nos horários de pico. O app já autentica o cliente, mas não expõe essas funções.",
  proposal:
    "Construir três fluxos de autoatendimento no app (boleto, rastreio, endereço), integrados ao ERP atual via API, e apontar o menu inicial do SAC para eles. O time de atendimento passa a tratar apenas exceções.",
  scope: [
    "Levantamento dos três fluxos com o time de SAC.",
    "Integração com o ERP: boletos, pedidos e cadastro.",
    "Telas no app, com teste de uso em 2 lojas piloto.",
    "Treinamento do SAC e manual de exceções.",
  ],
  outOfScope: "Chatbot, notificações push e alteração de pedidos já faturados ficam para uma segunda fase.",
  stats: [
    { value: "8 sem", label: "prazo total, do kickoff à publicação" },
    { value: "R$ 96 mil", label: "investimento fechado, em 3 parcelas" },
    { value: "-40%", label: "meta de volume do SAC em 90 dias" },
  ],
  phases: [
    { when: "Sem 1 a 2", title: "Descoberta e desenho dos fluxos" },
    { when: "Sem 3 a 6", title: "Integração e telas" },
    { when: "Sem 7", title: "Piloto em 2 lojas" },
    { when: "Sem 8", title: "Publicação e treinamento" },
  ],
  risks: [
    { risk: "ERP sem endpoint de boletos", mitigation: "Confirmar com o fornecedor na semana 1; fallback via exportação diária." },
    { risk: "Adesão baixa ao autoatendimento", mitigation: "Banner no app e roteiro do SAC direcionando para o fluxo." },
  ],
  nextSteps: "Aprovação desta proposta até 10 out; kickoff em 14 out com o time de SAC e o responsável pelo ERP.",
  footer: "Shakers · Proposta comercial · Confidencial · vinicius@shakers.com.br",
};
