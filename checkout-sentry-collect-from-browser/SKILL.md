---
name: checkout-sentry-collect-from-browser
description: Coleta os checkouts completos do Checkout Sentry (JSON com carrinho, eventos, cliente e pagamento) numa única chamada de JavaScript no Chrome já autenticado do usuário. O navegador baixa o arquivo, que alimenta as skills checkout-sentry-data-extract e checkout-sentry-generate-report.
disable-model-invocation: true
argument-hint: "<URL do Checkout Sentry> [--period 7d|30d] [--limit N] [--pages N]"
---

Roda `scripts/coletarCheckouts.js` na aba autenticada do Checkout Sentry, no Chrome do usuário. O script lista todos os checkouts do período, busca o detalhe de cada um e dispara o download de um único JSON pelo navegador. Nunca peça senha nem token: a sessão é a do navegador.

## Parâmetros

| Parâmetro | Efeito | Padrão |
|---|---|---|
| URL (posicional) | Página de checkouts do Checkout Sentry, formato `/<shop>/checkouts?period=30d` | pedir ao usuário |
| `--period` | Período (`7d`, `30d`...) | o `period` da URL, senão `30d` |
| `--limit N` | Só os N primeiros checkouts | todos |
| `--pages N` | Só as N primeiras páginas (20 checkouts por página) | todas |

Sem URL, peça ao usuário e encerre. Não deduza a URL de outra loja ou de outra conversa.

## Caminho feliz

São 4 chamadas de ferramenta, nesta ordem. Não acrescente etapas, não teste antes com amostra e não reescreva o script.

1. **Ferramentas.** Carregue numa única chamada de ToolSearch: `mcp__claude-in-chrome__tabs_context_mcp`, `tabs_create_mcp`, `navigate` e `javascript_tool`. Chame `tabs_context_mcp`.

2. **Aba nova.** Crie uma aba com `tabs_create_mcp` (não reaproveite outra) e navegue até a URL com `navigate`.

3. **Coletar, numa única chamada de `javascript_tool`.** Leia `scripts/coletarCheckouts.js` e envie o conteúdo inteiro seguido deste trecho, trocando as opções pelas do usuário (omita as que ele não passou):
   ```js
   window.__coleta ??= coletarCheckouts({ period: '30d', limit: null, pages: null })
     .then(r => ({ ok: true, arquivo: r.arquivo, total_disponivel: r.total_disponivel,
                   total_coletado: r.total_coletado, erros: r.erros }))
     .catch(e => ({ ok: false, erro: e.message }));
   await Promise.race([window.__coleta,
     new Promise(ok => setTimeout(() => ok({ andamento: window.__coletaProgresso }), 25000))]);
   ```
   O retorno é só um resumo. O JSON tem e-mail, telefone e endereço: nunca devolva o objeto completo pela ferramenta.

4. **Responder** ao usuário com o nome do arquivo baixado (`arquivo`), o total coletado de total disponível e, se `erros > 0`, quantos checkouts vieram sem detalhe. Diga que o arquivo está no local de downloads do navegador e que é esse arquivo que ele anexa (ou indica o caminho) em `checkout-sentry-data-extract` ou `checkout-sentry-generate-report`. O arquivo tem dados pessoais: não deve ir para repositório nem ser compartilhado.

## Desvios previstos

Trate só estes casos. Qualquer outro erro: mostre a mensagem ao usuário e pare, sem improvisar.

| Retorno do passo 3 | O que fazer |
|---|---|
| `ok: false` com `erro` começando por `SEM_LOGIN` | Avise na hora: "Não estou logado no Checkout Sentry. Faça o login na aba que abri e me avise quando terminar." Não tente logar. Quando o usuário avisar, rode `delete window.__coleta` e repita o passo 3. |
| `andamento` (a coleta passou de 25 s) | A coleta continua na página. Chame `javascript_tool` de novo só com o `await Promise.race(...)` acima, sem reenviar o script, até vir `ok`. Entre uma chamada e outra, informe o progresso ao usuário (`fase`, `listados` de `total`, `detalhes`). |
| `ok: true` com `erros > 0` | A coleta terminou. Siga para o passo 4 e informe quantos checkouts ficaram sem detalhe. |
| `ok: true` com `arquivo: null` | O download não foi disparado. Mostre ao usuário e pare. |
