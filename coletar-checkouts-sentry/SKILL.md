---
name: coletar-checkouts-sentry
description: Coleta os checkouts completos do Checkout Sentry (JSON com carrinho, eventos, cliente e pagamento) rodando o script no Chrome já autenticado do usuário e salva em Análises/CheckoutSentry/.
disable-model-invocation: true
argument-hint: "<URL do Checkout Sentry> [--period 7d|30d] [--limit N] [--pages N]"
---

**Nunca rodamos antes: esta skill ainda não foi testada. Na primeira execução, teste cada etapa (login, coleta pequena com `limit: 3`, movimentação do arquivo) e só depois faça a coleta completa. Se algo falhar, mostre o erro ao usuário e pare, sem improvisar. Depois de validar, corrija esta skill e remova esta linha.**

Roda `scripts/coletarCheckouts.js` na aba autenticada do Checkout Sentry, no Chrome do usuário, e guarda o JSON em `Análises/CheckoutSentry/`. Nunca peça senha nem token: a sessão é a do navegador.

## Parâmetros

| Parâmetro | Efeito | Padrão |
|---|---|---|
| URL (posicional) | Página do Checkout Sentry, formato `/<shop>/checkouts?period=30d`. O usuário informa a cada execução | pedir ao usuário |
| `--period` | Período (`7d`, `30d`...) | o `period` da URL, senão `30d` |
| `--limit N` | Só os N primeiros checkouts | todos |
| `--pages N` | Só as N primeiras páginas (20 por página) | todas |

## Passos

1. **Ferramentas.** Carregue as ferramentas `mcp__claude-in-chrome__*` com uma única chamada de ToolSearch (`tabs_context_mcp`, `tabs_create_mcp`, `navigate`, `javascript_tool`, `computer`). Chame `tabs_context_mcp` antes de tudo. Sem URL, peça ao usuário e encerre.

2. **Abrir a aba.** Crie uma aba nova (não reaproveite outra) e navegue até a URL.

3. **Verificar login.** Na aba, rode pela `javascript_tool`:
   ```js
   const shop = location.pathname.split('/')[1];
   const r = await fetch(`/api/checkouts?shop=${shop}&period=30d&status=all&page=1&pageSize=1`, { credentials: 'include' });
   ({ status: r.status, url: location.href })
   ```
   Não logado = status 401/403, ou a URL já não é a de checkouts (redirecionou para login).
   - **Não logado:** avise o usuário **imediatamente**, no meio da execução: "Não estou logado no Checkout Sentry. Faça o login na aba que abri e me avise quando terminar." Não tente logar sozinho. Espere a resposta do usuário, então volte a este passo. Não siga sem status 200.
   - **Logado:** siga.

4. **Injetar o script.** Leia `scripts/coletarCheckouts.js` e execute o conteúdo pela `javascript_tool` para definir `coletarCheckouts` na página.

5. **Coletar sem trazer dados para a conversa.** Chame a função e devolva só um resumo. O JSON tem email, telefone e endereço: nunca retorne o objeto completo pela ferramenta.
   ```js
   const r = await coletarCheckouts({ /* period, limit, pages do usuário */ });
   ({ total_disponivel: r.total_disponivel, total_coletado: r.total_coletado, erros: r.erros, summary: r.summary })
   ```
   Se estourar o tempo limite da ferramenta, refaça em lotes menores com `pages`/`limit` e avise o usuário. O download do JSON dispara sozinho no navegador.

6. **Guardar o arquivo.** Ache o mais recente `checkouts_*.json` em `~/Downloads` (`ls -t ~/Downloads/checkouts_*.json | head -1`), confirme que é do minuto atual e mova para `Análises/CheckoutSentry/`:
   `mv <arquivo> Análises/CheckoutSentry/`.
   Essa pasta está no `.gitignore`, então os dados pessoais não vão para o repositório.

7. **Responder** com o caminho do arquivo e o resumo do passo 5 (total coletado, erros, `summary`). Se `erros > 0`, diga quantos. Nada mais.
