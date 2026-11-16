# Prompt: tela da avaliação (Admin e Coordenador): alinhamento e menos repetição (só frontend web)

## Contexto

A tela própria da avaliação (`pages/workspace/TelaAvaliacaoGestao.jsx`, de `PROMPT-agente-avaliacao-tela-propria.md`, ainda sem commit no momento desta análise) já funciona. O usuário viu no app real e pediu:
- melhor alinhamento;
- menos poluição;
- remover os dados repetidos.

**Proposta APROVADA em 2026-11-16:** imagem `avaliacao-tela-limpa.png`, nesta pasta, **com duas mudanças do usuário**:
1. **A lista de questões continua como está hoje:** os cartões "Questão 1 … Questão 10" na coluna do índice. **Não** usar a grade de números 1–10 da imagem (marcador 5).
2. **Os KPIs ficam alinhados com o topo do bloco** (marcador 1), e **a figura da questão fica ao lado do texto**, como na imagem (marcador 6).

Os números amarelos e a legenda são só explicação. As alternativas e a figura da imagem são exemplos.

## O que o agente de arquitetura já verificou (não repetir)

- **Topo de `TelaAvaliacaoGestao.jsx`:**
  - `BotaoVoltar` → `<nav className="modulo-gestao__migalha">` → `<header className="modulo-gestao__cabecalho">`, com o título + a `Insignia` "Somente leitura" + o resumo à esquerda e os 4 `CartaoEstatistica` à direita;
  - depois vem `ul.avaliacao-gestao__ficha` com as pílulas, e depois `p.avaliacao-gestao__descricao`.
- **Por que os KPIs ficam desalinhados:** o caminho fica **fora** do `header`. Os KPIs começam na linha do título, mais abaixo que o caminho, e a borda de cima não bate com nada.
  - A **tela do módulo** (`TelaModuloGestao.jsx`) tem a mesma estrutura e o mesmo efeito.
- **Repetições:**
  - o resumo traz "avaliação 2 de 10", mas o caminho já diz "Avaliação 02" e o pé tem anterior/próxima;
  - o selo "Somente leitura" aparece no título, mas a tela nunca tem botão de edição para esses perfis;
  - com 0 participantes, os 4 KPIs mostram "0 · – · 0% · 0%".
- **Figura:** `components/GabaritoQuestoes.jsx` com `compacto` + `mostrarFicha` mostra o contexto antes do enunciado e `.quiz-anexos` (imagens em `figure.quiz-anexo-imagem`) **depois do enunciado**, ocupando a largura toda, antes das alternativas. A imagem fica enorme e empurra as alternativas para baixo.

## Tarefa (comparar com `avaliacao-tela-limpa.png`)

1. **Topo num bloco só, alinhado em cima** (marcador 1):
   - mover o `<nav className="modulo-gestao__migalha">` para **dentro** da coluna da esquerda do `header` (`modulo-gestao__cabecalho-principal`), acima do título;
   - o `header` alinha as duas colunas no topo (`align-items: flex-start`), de modo que **a borda de cima dos KPIs fica na linha do caminho**;
   - o `BotaoVoltar` continua como primeiro elemento e na margem;
   - **fazer o mesmo na tela do módulo** (`TelaModuloGestao.jsx`), que tem a mesma estrutura, para as duas telas ficarem iguais.
2. **Sai o selo "Somente leitura" do título da avaliação.** O selo do cabeçalho da leitura do módulo continua.
3. **Uma linha de resumo no lugar das pílulas** (marcador 2): "Prova · 10 questões · Nota máxima 10,0 · Sem limite de tempo · 20 tentativas".
   - Inclui as mesmas partes da ficha de hoje: período, se houver, e "Módulo: X", se for ligada a módulo.
   - Separador "·" em `--cor-texto-mudo`.
   - Remover `ul.avaliacao-gestao__ficha` e o CSS das pílulas.
   - **Tirar "avaliação X de Y"** do resumo.
   - A descrição fica logo abaixo, em `--cor-texto-mudo`, ≈ `0.82rem`, com `max-width` ≈ 760px.
4. **KPIs** (marcador 3): os mesmos 4, alinhados à direita e no topo, sem mudança de valores.
5. **Sem participantes** (marcador 4): quando `totalParticipantes` for 0, no lugar dos 4 KPIs aparece uma faixa só, com borda tracejada, ícone de pessoas e o texto **"Nenhum aluno fez esta prova ainda."**, com a mesma largura do bloco de KPIs. Com 1 ou mais participantes, os 4 KPIs aparecem.
6. **Lista de questões:** continua **como está hoje** (cartões "Questão N", na mesma coluna). Só conferir que o topo do índice fica alinhado com o topo do cartão da questão.
7. **Figura ao lado do texto** (marcador 6), só na tela da avaliação, com `GabaritoQuestoes` `compacto` + `mostrarFicha`:
   - quando a questão tiver **anexos de imagem** e a área da questão tiver **≥ ≈ 900px** de largura (container query), a questão vira 2 colunas:
     - à esquerda, contexto + citação, enunciado, alternativas e explicação;
     - à direita, as imagens (≈ 360–400px), `position: sticky` no topo da área da questão, com `max-height` ≈ 420px e `object-fit: contain`;
   - clicar na imagem abre a imagem em tamanho real (nova aba ou o visualizador que o projeto já tiver), com a legenda "Clique para ampliar" embaixo;
   - **abaixo de ≈ 900px**, a imagem fica embaixo do enunciado, como hoje, mas com o mesmo `max-height`;
   - anexos que não são imagem (arquivo) continuam como link, na coluna do texto;
   - contexto e citação mais discretos: `--cor-texto-suave`, ≈ `0.8rem`, borda esquerda fina, **sem itálico**.
   - **Não mudar** a prévia do Professor nem a leitura de quiz da tela do módulo, que não usam `mostrarFicha`.
8. O pé da questão (anterior/próxima, "Questão X de Y") e a troca de avaliação continuam como estão.

**Não alterar:** dados, rotas, permissões, backend e a aba Avaliações do curso.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), **sem modo demo**, como **Admin** e como **Coordenador**, em "Desenvolvimento Web Full Stack" › Avaliações › "Banco ENADE/CQA - Revisao" (tem figura e 0 participantes) e numa avaliação com participantes.

- **1920px:**
  - a borda de cima dos KPIs fica na linha do caminho;
  - na tela do módulo também.
- **Repetições:**
  - sem "Somente leitura" no título da avaliação;
  - resumo numa linha só, sem pílulas e sem "avaliação X de Y".
- **Participantes:**
  - com 0, aparece a faixa "Nenhum aluno fez esta prova ainda.";
  - com participantes, aparecem os 4 KPIs.
- **Lista e figura:**
  - a lista de questões igual à de hoje;
  - a figura à direita do texto, sem empurrar as alternativas, e clicar abre em tamanho real.
- **≈ 1366px com o menu aberto e ≈ 390px:**
  - a figura fica embaixo do enunciado, limitada em altura;
  - os KPIs ou a faixa descem para baixo do título;
  - sem rolagem horizontal.
- **Tema claro:** tudo legível.
- **Testes (vitest):**
  - ausência de "Somente leitura" e de "avaliação X de Y" na tela da avaliação;
  - faixa com 0 participantes;
  - KPIs com 1 ou mais;
  - caminho dentro do `header`, nas duas telas.
- `npm run lint` e `npm test` sem erros novos.
