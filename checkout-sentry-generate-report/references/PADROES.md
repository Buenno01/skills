# Raio-X do checkout: padrões

## Identidade visual

A página segue a skill `identidade-visual-shakers`: Poppins (300, 400, 600, 700), fundo branco dominante, texto em
preto, cabeçalho em gradiente Mint claro, barra verde sob o título, cards com raio 14 px e borda `#ECECEC`,
espaçamento em múltiplos de 8. Não há fundo preto em nenhum bloco. Tudo isso já está em `assets/kit.css`.

## Cores semânticas de dado

Gráfico de relatório precisa comunicar estado. Por isso as barras não usam preto nem cinza, e a paleta inclui
vermelho e amarelo como cores semânticas, mesmo onde a marca não prevê esse uso.

| Papel | Token CSS | Classe de barra | Barra | Texto | Fundo | Uso |
|---|---|---|---|---|---|---|
| Concluiu, positivo | `--concluiu` | `c` | `#22C76A` | `#117A41` | `#E6FAEF` | Checkouts concluídos, recuperáveis com opt-in, canal ativo |
| Crítico | `--critico` | `a` | `#E5484D` | `#C92A2A` | `#FDECEC` | Abandonou, maior queda do funil, fora da base |
| Atenção | `--atencao` | `w` | `#F4B619` | `#8A6100` | `#FEF6DC` | Amostra pequena, avisos de coleta, na base sem opt-in, canal sem coleta de opt-in |
| Dado neutro | `--dado` | `d` | `#2461E8` | `#2461E8` | `#E3EBFD` | Contagens sem juízo (funil, média geral), parte "concluiu ou anônimo" |
| Outros | `--outros` | `o` | `#8B5CF6` | | `#EFE8FE` | Anônimo ou em andamento |

Verde é sempre concluiu, vermelho é sempre abandonou. Não inverta nem reaproveite essas cores para outra coisa.

## Convenções de apresentação

- Barras empilhadas para comparar categorias (concluiu × abandonou). A largura da barra é o volume relativo ao maior grupo, e o número à direita é a taxa de abandono.
- Barras simples para contagens. Quando importa quantos daqueles abandonaram, o trecho vermelho mostra essa parte.
- Médias (ticket, frete) em barras lado a lado, nunca empilhadas.
- Amostra pequena (menos de 5 checkouts com desfecho): barra e taxa esmaecidas e pílula amarela "amostra pequena".
- Todo gráfico mostra todas as linhas. Com mais de 25, a lista ganha rolagem interna, nunca corte silencioso. A tabela recolhível traz os números completos.
- Textos que vêm dos dados (produto, frete, cupom, mensagem de erro, método) aparecem como vieram, sem reescrita nem categoria criada por texto.
- Estados sempre pela sigla da UF, como veio no dado, sem conversão para o nome. Sem UF informada vira "Sem UF", fora do ranking.
- Valores em dinheiro sempre em `R$`. Acima de mil, sem centavos.
- Tooltip com os detalhes ao passar o mouse.

## Escrita da narrativa

Vale a skill `escrita-padrao-shakers`. Pontos que o `montar.py` confere ou que mais aparecem neste relatório:

- **Título é conclusão.** Frase com verbo que diz o que o dado mostra, até 100 caracteres. "O pagamento concentra a maior perda", não "Pagamentos".
- **Contexto explica o porquê e o que fazer.** Uma a três frases, até 420 caracteres. Cite no máximo dois números, e só números que a seção mostra.
- **Sem travessão** como recurso de estilo (o `montar.py` recusa os caracteres U+2014 e U+2013). Use vírgula, dois pontos ou ponto.
- **Sem dado pessoal.** Nada de nome, e-mail ou telefone (o `montar.py` recusa padrão de e-mail).
- **Honestidade.** Taxa com amostra pequena não vira conclusão. Frete e ticket se misturam: diga isso quando comparar frete grátis e pago. Período curto ou coleta parcial aparecem no cabeçalho e, quando mudam a leitura, no contexto.
- **Seção sem dado** (nenhum erro de cupom, nenhum alerta de formulário): o título diz que não houve ocorrência no período. Isso também é resultado.
- **Nada fixo sobre uma loja.** A narrativa pode citar um produto, frete, cupom ou UF que aparece nos dados do relatório. As skills nunca trazem nome de loja, marca, produto, cupom, cliente, país ou estado como regra ou exemplo.

### Exemplos de título-conclusão

- "O pagamento é onde a loja mais perde gente e dinheiro"
- "Frete grátis e pago têm taxas próximas, com tickets bem diferentes"
- "A UF de maior volume concentra os abandonos, sem destoar na taxa"
- "A maioria dos carrinhos leva um produto só"
- "Metade de quem abandonou pode ser contatada por e-mail"
- "Não houve erro de cupom no período"
