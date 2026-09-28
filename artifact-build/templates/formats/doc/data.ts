export const doc = {
  title: "Título do documento",
  subtitle: "Subtítulo que contextualiza em uma frase.",
  author: "Autor",
  date: "2026-01-01",
  summary: "Resumo executivo em três a cinco linhas: situação, problema, proposta, impacto.",
  ask: "O que precisa ser decidido ao final da leitura.",
  sections: [
    { id: "contexto", title: "Contexto", paragraphs: ["Parágrafo um.", "Parágrafo dois."] },
    { id: "proposta", title: "Proposta", paragraphs: ["Parágrafo um."] },
  ],
  table: {
    columns: [{ key: "item", header: "Item" }, { key: "valor", header: "Valor" }] as { key: "item" | "valor"; header: string }[],
    rows: [{ item: "A", valor: 10 }, { item: "B", valor: 20 }],
  },
};
