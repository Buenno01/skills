export type Product = { id: string; name: string; detail: string; price: number; qty: number };

export const app = {
  name: "Horta da Vila",
  flowTitle: "Checkout",
  steps: ["Carrinho", "Entrega", "Pagamento", "Confirmação"] as const,
};

export const initialCart: Product[] = [
  { id: "p1", name: "Cesta de folhas orgânicas", detail: "Alface, rúcula e agrião · 600 g", price: 24.9, qty: 1 },
  { id: "p2", name: "Tomate italiano", detail: "1 kg", price: 12.5, qty: 2 },
  { id: "p3", name: "Ovos caipiras", detail: "Dúzia", price: 18, qty: 1 },
];

export const fees = { delivery: 7.9, freeAbove: 80 };

export const deliveryWindows = [
  { value: "manha", label: "Manhã, 8h às 12h" },
  { value: "tarde", label: "Tarde, 13h às 18h" },
  { value: "noite", label: "Noite, 18h às 21h" },
];

export const paymentMethods = [
  { value: "pix", label: "Pix", hint: "Aprovação imediata, 3% de desconto" },
  { value: "card", label: "Cartão de crédito", hint: "Até 2x sem juros" },
] as const;

export const copy = {
  emptyCart: { title: "Seu carrinho está vazio", body: "Adicione produtos da feira desta semana para continuar.", action: "Ver produtos da semana" },
  cepError: "Informe um CEP com 8 dígitos.",
  streetError: "Informe a rua e o número.",
  declined: { title: "Pagamento não aprovado", body: "A operadora recusou a transação. Verifique os dados do cartão ou pague com Pix." },
  success: { title: "Pedido confirmado", body: "Você recebe uma mensagem no WhatsApp quando a entrega sair da horta." },
  couponHint: "Cupons são aplicados sobre o subtotal, sem incluir a entrega.",
  validCoupon: "FEIRA10",
};
