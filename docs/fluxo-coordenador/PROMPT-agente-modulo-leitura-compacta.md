# Prompt: tela do módulo (Admin e Coordenador): títulos mais claros, leitura enxuta e questões compactas (só frontend web)

## Contexto

O usuário viu a tela do módulo (`pages/workspace/TelaModuloGestao.jsx`) no app real e pediu:
- melhor hierarquia dos títulos e menos poluição;
- aproveitar melhor o espaço: hoje cada questão do quiz ocupa espaço demais.

**Proposta APROVADA em 2026-11-15:** imagem `modulo-leitura-compacta.png`, nesta pasta. Os números amarelos e a legenda são só explicação.

## O que o agente de arquitetura já verificou (não repetir)

- **Títulos de seção:** `.modulo-gestao__secao-titulo` e `.modulo-gestao__secao-contagem` (`styles/workspace.css` ≈ linhas 8951–8975) usam `0.78rem`, maiúsculas e `--cor-texto-mudo`, e ficam apagados.
- **Cabeçalho da leitura:** `components/LeituraItemConteudo.jsx` mostra a trilha "Módulo 01 › {módulo} › Quiz" (`.leitura-item__trilha`), repetida, porque o módulo já está no título da página. Esse componente só é usado pela `TelaModuloGestao`.
- **Questões:** `components/GabaritoQuestoes.jsx` é usado também pela prévia do Professor (`components/PreviaTrilhaAluno.jsx` ≈ linha 89).
  - **A letra fica sozinha numa linha** porque `.revisao-alternativas__cabecalho` (≈ linha 8675) é `flex` + `flex-wrap`, com `<strong>A</strong>` e o texto como nó solto. O texto longo quebra inteiro para a linha de baixo. O mesmo vale para as afirmativas.
  - O rótulo "Alternativas" (`.revisao-questao__rotulo`) ocupa uma linha.
  - `.revisao-questao` usa `padding: var(--espaco-lg)` e o enunciado tem `line-height: 1.6`.
- **2 colunas:** `@container (min-width: 900px)` em `.modulo-gestao__painel .revisao-avaliacao--gabarito` (≈ linha 9287). Numa tela de 1920px com o menu aberto, a leitura tem ≈ 830px, então fica em 1 coluna.

## Tarefa (comparar com `modulo-leitura-compacta.png`)

1. **Títulos de seção** (marcador 1):
   - "Conteúdos" e "Quizzes" em `--cor-texto-forte`, ≈ `0.9rem`, peso 800, sem maiúsculas forçadas;
   - contador em pílula roxa (fundo `rgba` da marca, texto `--cor-marca-clara`);
   - uma linha fina (`--cor-borda`) do contador até a borda da coluna;
   - mais espaço antes de "Quizzes" (≈ `--espaco-lg`) do que entre os cartões.
2. **Cabeçalho da leitura** (marcador 2): remover a trilha `.leitura-item__trilha` do `LeituraItemConteudo`. Ficam o título, o `meta` numa linha e o selo "Somente leitura" à direita, centralizado na vertical. Remover as props `moduloIndice`/`moduloTitulo` se ficarem sem uso.
3. **Correção geral da letra**, que vale também para a prévia do Professor: em `GabaritoQuestoes`, envolver a letra e o texto em elementos próprios (`<span className="revisao-alternativas__letra">` e `<span className="revisao-alternativas__texto">`), usando uma grade `auto 1fr auto` (letra | texto | "Correta"). A letra nunca fica sozinha numa linha. Fazer o mesmo nas afirmativas, com o número.
4. **Variante compacta** (marcadores 3, 4 e 5): prop `compacto` no `GabaritoQuestoes`, que adiciona a classe `revisao-avaliacao--compacta`. Ela é usada **só** pelo `LeituraItemConteudo`; a prévia do Professor continua como está, só com a correção do item 3.
   - Cabeçalho da questão: "QUESTÃO N" à esquerda e a pílula verde **"Resposta: C"** à direita, com a letra da alternativa correta. Sem pílula se não houver exatamente uma alternativa correta.
   - Sem o rótulo "Alternativas". O rótulo das afirmativas também fica menor ou sai.
   - Letra num círculo de ≈ 22px. Na correta, o círculo fica verde cheio, com "✓ Correta" à direita.
   - Fonte das alternativas ≈ `0.8rem`, `padding` ≈ `6px 9px`, gap ≈ `5px`. Enunciado ≈ `0.86rem`, `line-height` ≈ 1.45. Padding do cartão da questão ≈ `12px 14px`.
   - Explicação: uma linha com borda esquerda roxa e o prefixo **"Explicação:"** em negrito, sem o rótulo em cima.
5. **2 colunas mais cedo** (marcador 3): mudar o container query do painel de 900px para **≈ 760px**. Abaixo disso, 1 coluna no formato compacto.
6. O rodapé da leitura (marcador 6), a lista, os KPIs e a navegação não mudam.

**Não alterar:**
- dados, rotas, permissões e backend;
- o visual da prévia do Professor e da tentativa do aluno, além da correção da letra.

**Ligação com o prompt pendente `PROMPT-agente-avaliacao-tela-propria.md`:** a tela da avaliação deve usar o `GabaritoQuestoes` com `compacto`. Se ela for aplicada depois desta, já usar a variante.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), **sem modo demo**, como **Admin** e como **Coordenador**, no módulo "Fundamentos da Web Moderna", quiz "ANALISE_DESENVOLV_SIST_TOMO_01".

- **Títulos e cabeçalho:**
  - "Conteúdos" e "Quizzes" destacados, com contador e linha;
  - a leitura sem a trilha "Módulo 01 › …".
- **Questões:**
  - a letra fica na mesma linha do texto, inclusive com texto longo;
  - "Resposta: X" no topo da questão;
  - sem o rótulo "Alternativas";
  - em 1920px, as questões ficam em 2 colunas.
- **Prévia do Professor:** a letra na mesma linha e o resto igual.
- **Tema claro:** a pílula verde e o círculo da correta continuam legíveis.
- **Telas menores:** ≈ 900px e ≈ 390px, com 1 coluna compacta e sem rolagem horizontal.
- **Testes (vitest):**
  - "Resposta: X";
  - letra e texto em elementos próprios;
  - ausência do rótulo "Alternativas" na variante compacta;
  - ausência da trilha.
- `npm run lint` e `npm test` sem erros novos.
