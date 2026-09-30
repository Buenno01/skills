---
name: checkout-sentry-generate-report
description: >
  Gera o Raio-X do checkout, relatório da Shakers sobre abandono de checkout, na identidade visual Shakers. Propõe um
  padrão de 10 seções (visão geral, frete, estados, pagamento, cupons, produtos, combinações, recuperação, formulário,
  tendência) e monta a página com um kit de gráficos, tabelas e cards combinados conforme o pedido. Usa o JSON da skill
  checkout-sentry-collect-from-browser cruzado com o export de clientes da Shopify e calcula com a skill
  checkout-sentry-data-extract. Acione ao ouvir "raio-x do checkout", "relatório de checkout", "relatório do Checkout
  Sentry", "análise de abandono de checkout", "por que o checkout está abandonando", "relatório de recuperação de
  carrinho", ou quando anexarem um checkouts_*.json com uma base de clientes pedindo análise. Sem as duas entradas, para e pede.
argument-hint: "[checkouts_<loja>_<periodo>_<data>.json] [export de clientes .csv ou pasta] [o que mostrar] [url do artefato para atualizar]"
---

# Raio-X do checkout

Esta skill define **o que** o relatório pode mostrar e **para que** cada parte existe. O cálculo é da skill
`checkout-sentry-data-extract`. A apresentação sai de um kit de componentes (`assets/kit.css` e `assets/kit.js`) que
desenha gráficos, tabelas e cards a partir do JSON de KPIs. O padrão proposto é o relatório completo de
`references/SECOES.md`, já composto em `examples/raio-x-completo.js`. Se o usuário pedir outra coisa (um recorte, outra
ordem, outro formato), atenda o pedido com os mesmos componentes e as mesmas regras.

Arquivos de apoio, leia antes de escrever:
- `references/SECOES.md`: seções sugeridas, os blocos do JSON de cada uma, a visualização sugerida, o objetivo e a receita do título.
- `references/PADROES.md`: identidade visual, cores semânticas, convenções de apresentação e regras de escrita.
- `references/GALERIA.md`: qual componente usar para cada pergunta, e como entregar em chat, planilha ou deck.
- `examples/galeria.html`: todos os componentes renderizados com dados sintéticos (abra no navegador).
- `examples/galeria.js`: o código de cada exemplo da galeria, para copiar o trecho do componente escolhido.
- `examples/raio-x-completo.js`: a composição do padrão completo, com o objeto `NARRATIVA` a preencher.

Valores em dinheiro sempre em `R$`. Estados sempre pela sigla da UF, sem conversão para o nome.

## Passo 0. Entradas (obrigatório, bloqueante)

O relatório só roda com as duas entradas abaixo. Não existe relatório parcial, dado de exemplo ou estimativa.

1. **JSON do Checkout Sentry** gravado pela skill `checkout-sentry-collect-from-browser` (`checkouts_<loja>_<periodo>_<data>.json`).
   Outro formato (JSONL, CSV do Sentry, export manual) é recusado.
2. **Export de clientes da Shopify** em CSV (Clientes > Exportar), um arquivo ou uma pasta de CSVs, com as colunas
   `Customer ID`, `Email`, `Phone`, `Default Address Phone`, `Accepts Email Marketing`, `Accepts SMS Marketing`,
   `Accepts WhatsApp Marketing`, `Total Orders`.

O usuário anexa ou indica o caminho, ou você infere pelo contexto da conversa (por exemplo, o arquivo que a coleta
acabou de baixar). Não procure em pasta fixa e não invente caminho. Rode o gate a partir da raiz do projeto:

```
python3 <esta skill>/scripts/validar.py --checkouts ARQUIVO.json --clientes CSV_OU_PASTA
```

| Saída | O que fazer |
|---|---|
| `FALTA:` (código 2) | **Pare aqui.** Diga ao usuário exatamente qual arquivo falta, usando a mensagem do gate, e peça que anexe ou indique o caminho. Se faltar o JSON, ofereça rodar a skill `checkout-sentry-collect-from-browser` (ela precisa da URL do Checkout Sentry). Não siga até receber. |
| `INVALIDO:` (código 3) | **Pare aqui.** Mostre o motivo e peça o arquivo certo. Não tente converter nem adaptar o arquivo recusado. |
| `DEPENDENCIA:` (código 4) | **Pare aqui.** A skill `checkout-sentry-data-extract` não está instalada ou está numa versão antiga. Informe o usuário. |
| `OK` (código 0) | Siga. Guarde `CHECKOUTS`, `CLIENTES` e `KPIS_SCRIPT`. Diga em uma linha quais arquivos vai usar. |

## Passo 1. Calcular

```
python3 <KPIS_SCRIPT> <CHECKOUTS> --clientes <CLIENTES> --saida <pasta de trabalho>/kpis.json
```

A pasta de trabalho é a pasta temporária da sessão. Se sair `ERRO:`, mostre a mensagem e encerre. Guarde as linhas
`AVISO:`: elas vão para a entrega em qualquer formato.

## Passo 2. Escolher o que mostrar

- **Pedido sem recorte** ("o raio-x", "o relatório de checkout"): use o padrão completo de `references/SECOES.md`.
- **Pedido com recorte** (uma seção, uma pergunta, outra ordem): use só as seções e os componentes que respondem a ele, escolhidos em `references/GALERIA.md`. Cabeçalho com os avisos e rodapé de metodologia continuam.
- **Outro formato** (chat, planilha, deck, um número): siga "Outros formatos" em `references/GALERIA.md`. Sem página, pule para o passo 5.

Na dúvida entre o completo e um recorte, entregue o completo e diga em uma linha que dá para recortar.

## Passo 3. Escrever a narrativa

Leia o `kpis.json`, `references/SECOES.md` e `references/PADROES.md`. Para cada seção que vai aparecer, escreva o
título (a conclusão da seção) e o contexto (uma a três frases). No padrão completo, preencha o objeto `NARRATIVA` numa
cópia de `examples/raio-x-completo.js`, com `titulo`, `subtitulo` e as 10 seções.

- Use só números do `kpis.json`. Não recalcule, não estime, não arredonde para mudar o sentido. Número derivado (uma taxa calculada a partir de duas contagens) é dito como derivado.
- Mostre tudo o que veio nos dados. Não exclua, filtre nem selecione checkouts, produtos, cupons, fretes ou UFs, nem os que pareçam teste ou desenvolvimento: essa poluição faz parte da operação e fica no relatório. Um corte pedido pelo usuário é dito no título do gráfico.
- Não interprete texto livre para criar categorias. Mensagens de erro, nomes de produto, de frete e de cupom aparecem como vieram.
- Título é conclusão, não rótulo. Taxa com `amostra_pequena: true` não sustenta conclusão. Se a seção inteira for amostra pequena ou vazia, o título diz isso.
- Nada de nome, e-mail ou telefone. Sem travessão como recurso de estilo.
- Não digite números na composição: todos vêm de `K` (o `kpis.json`) pelas funções do kit.

## Passo 4. Montar a página

```
python3 <esta skill>/scripts/montar.py --kpis <pasta de trabalho>/kpis.json --pagina <pasta de trabalho>/pagina.js --saida <pasta de trabalho>/raio-x-<loja>-<AAAA-MM-DD>.html
```

`pagina.js` é a composição (a cópia preenchida de `raio-x-completo.js` ou uma nova, com `function pagina(K, Kit)`).
O script junta kit, KPIs e composição num HTML único e recusa a composição com travessão, e-mail, narrativa em branco
ou sem os avisos do export. Corrija e rode de novo. Ajuste de apresentação se faz na composição, nunca no HTML gerado.

## Passo 5. Entregar

- Com a ferramenta Artifact disponível: publique o HTML (título "Raio-X do checkout · <loja>"). Para atualizar um relatório já publicado da mesma loja, passe a `url` dele. Sem `url`, a publicação cria um novo.
- Sem a ferramenta: salve onde o usuário indicar e informe o caminho. O HTML tem dados agregados da loja: não versione em repositório.
- Na resposta, em prosa curta: as duas ou três conclusões principais, os avisos do export e o link ou caminho. Sem repetir o relatório.

## Evoluir o padrão

O padrão tem versão, registrada em `CHANGELOG.md`. Para mudar o padrão:
1. Mude a spec em `references/SECOES.md` ou `references/PADROES.md`.
2. Mude `examples/raio-x-completo.js` e, se precisar de um componente novo, `assets/kit.js` e `assets/kit.css`, com um exemplo em `examples/galeria.js` (e gere de novo o `galeria.html`, como diz o topo do arquivo). Número novo exige campo novo no `kpis.py` da skill `checkout-sentry-data-extract`, com teste.
3. Registre a mudança em `CHANGELOG.md`.

Mudanças que o usuário pedir para um relatório só (um recorte, uma pergunta pontual) não mudam o padrão: atenda na composição daquele relatório.
