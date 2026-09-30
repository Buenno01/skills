# Changelog do padrão Raio-X do checkout

Registro de mudanças a partir da entrada em produção.

## 2.0.0

- O template fixo virou um kit de componentes (`assets/kit.css`, `assets/kit.js`) com galeria (`examples/galeria.html`) e guia de escolha (`references/GALERIA.md`).
- O relatório completo de 10 seções passou a ser o padrão sugerido (`examples/raio-x-completo.js`), não obrigatório.
- `montar.py` agora empacota uma composição qualquer e confere travessão, e-mail, narrativa em branco e avisos.
- Entradas obrigatórias no gate, sem busca em pasta. Valores sempre em R$. UF sempre pela sigla.
- Skills renomeadas: a coleta é `checkout-sentry-collect-from-browser` e o cálculo é `checkout-sentry-data-extract`.
