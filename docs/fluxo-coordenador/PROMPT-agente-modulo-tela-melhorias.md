# Prompt: melhorias na tela do módulo do Admin e do Coordenador (relevo, hierarquia, leitura em todo o lado direito, responsividade; só frontend web)

## Contexto

Projeto CodeRyse Academy, frontend web (`frontend/`, React + Vite).

A tela própria do módulo (`pages/workspace/TelaModuloGestao.jsx`, commit `2324570`, com a correção da rota em `docs/bugs/PROMPT-agente-rota-modulo-volta-sozinha.md`) já funciona: lista de conteúdos e quizzes e leitura num painel ao lado.

**O usuário viu no app real e pediu:**
- lista em **estilo em relevo**, para Admin e Coordenador;
- melhor **responsividade**, **espaçamentos** e **hierarquia**;
- a **leitura ocupando todo o lado direito da tela**.

**Proposta APROVADA em 2026-11-15:** imagem `modulo-tela-melhorias.png`, nesta pasta. Os números amarelos e a legenda são só explicação.

**O que o usuário viu de errado nos prints:**
- os 3 KPIs ficam 2 em cima e 1 sozinho embaixo;
- os itens são linhas lisas com separador, sem o relevo dos cartões de módulo;
- com o item aberto, o painel ocupa só metade da largura (`flex: 1` nas duas colunas) e fica preso em `max-height: 70vh`. Ao rolar a página, os KPIs e o topo somem e o painel fica "flutuando";
- "1 aluno concluiram" (plural errado);
- quiz mostra "Média -", porque quiz não tem nota: é de fixação e não entra na média.

## O que o agente de arquitetura já verificou (não repetir)

- `TelaModuloGestao.jsx`:
  - KPIs com `CartaoEstatistica` dentro de `atividades-curso__kpis-compactos` (≈ linhas 192–210), a mesma classe dos KPIs 2×2 do topo do curso (`PainelCursoGestao.jsx` ≈ linha 414);
  - itens em `atividades-curso__lista` / `atividades-curso__linha--acionavel`;
  - `metricaMaterial` (≈ linha 148) monta "aluno(s) concluiram";
  - `metricaQuiz` (≈ linha 156) monta "· Média ${formatGrade(mediaNota)}";
  - `itemAbertoId` começa `null`.
- `styles/workspace.css`:
  - `.modulo-gestao__*` (≈ linhas 8800–8905);
  - em ≥ 900px, lista e painel com `flex: 1`, `max-height: 70vh` e `overflow-y: auto`.
- **Relevo existente, para reaproveitar e não criar outro:**
  - tokens `--cor-card-modulo`, `--borda-card-modulo`, `--relevo-card-topo` e `--relevo-card-base` em `styles/base.css` (≈ linhas 30–31 e 159–160, tema claro incluso);
  - aplicados em `.conteudos-modulo--cartao` (`workspace.css` ≈ linhas 5985–6040), que é o cartão de módulo da Tela 1.

## Tarefa (comparar com `modulo-tela-melhorias.png`)

1. **Topo** (marcadores 1 e 2):
   - caminho "← Cursos › Curso › Módulo";
   - à esquerda, `NumeroModulo` + título maior + linha de resumo: **"3 conteúdos · 4 quizzes · módulo 1 de 4"**;
   - à direita, na **mesma linha**, os 3 KPIs (Progresso, Conclusão, Desempenho médio) **lado a lado**, no estilo dos KPIs do topo do curso;
   - em tela menor, o bloco de KPIs desce para baixo do título, ainda em 3 colunas compactas.
2. **Itens em relevo** (3):
   - cada conteúdo e quiz vira um **cartão** com os tokens de relevo acima: fundo `--cor-card-modulo`, borda `--borda-card-modulo`, `--relevo-card-topo` + `--relevo-card-base`, raio `--raio-md`, espaço entre os cartões;
   - o item aberto fica com **contorno roxo** (`--cor-marca-clara`) e `aria-current`;
   - hover e foco visíveis, iguais aos dos cartões de módulo;
   - títulos das seções com contador em pílula: "CONTEÚDOS 3", "QUIZZES 4".
3. **Métrica embaixo do título** (4), dentro do cartão: tipo na 1ª linha ("Texto", "Quiz · 3 questões") e métrica na 2ª.
   - **Material:** "1 aluno concluiu · 25%" no singular, "2 alunos concluíram · 50%" no plural.
   - **Quiz:** só os participantes ("1 participante", "2 participantes"; com zero, "Nenhum participante ainda"). **Remover a "Média"** da linha do quiz.
   - O KPI "Desempenho médio" do módulo continua como está.
4. **Trocar de módulo** (5): "← Módulo anterior / Próximo módulo: <nome> →" no **pé da coluna da lista**, desativado nas pontas.
5. **Leitura ocupando todo o lado direito** (6, 7, 8):
   - **Layout em ≥ 1024px:** grade com a lista à esquerda (≈ 380–420px fixos) e a leitura em **todo o resto** da largura;
     - as duas colunas têm a **altura da área visível** (do topo da área de conteúdo até o pé da tela, algo como `calc(100vh - <topo>)`) e **rolagem própria**;
     - a página em si não rola junto, e o topo com os KPIs continua visível;
     - tirar o `max-height: 70vh` e o `flex: 1` iguais.
   - **Ao entrar no módulo, o 1º item já abre** (no desktop). O lado direito nunca fica vazio, e a mensagem "Escolha um conteúdo…" só aparece se o módulo não tiver itens. Trocar de módulo abre o 1º item do novo módulo.
   - **Cabeçalho da leitura:** trilha "Módulo 01 · Nome › Quiz", título, meta ("Quiz · 3 questões · 1 participante") e o selo "Somente leitura" à direita. No desktop, o botão × sai, porque a leitura é fixa.
   - **Corpo:** questões do quiz em **2 colunas quando a leitura tiver ≥ ≈ 900px de largura**, e 1 coluna abaixo disso; a correta em verde com "Correta" (`GabaritoQuestoes`). O material continua com tipo, descrição e "Abrir arquivo"/"Abrir link".
   - **Rodapé fixo da leitura:** "← Item anterior: <título>", "Item 5 de 7" no meio e "Próximo item: <título> →". Fica sempre visível ao rolar as questões, e os botões são desativados nas pontas.
6. **Responsividade** (9):
   - **1024px ou mais:** como acima.
   - **De 768 a 1023px:** lista mais estreita (≈ 320px) e leitura no resto. Questões em 1 coluna.
   - **Abaixo de 768px:**
     - só a lista, em cartões, com os KPIs em 3 colunas compactas ("Média" no lugar de "Desempenho médio", se não couber);
     - tocar num item abre a leitura em **tela cheia**, com "← Voltar ao módulo" no topo e o rodapé anterior/próximo fixo;
     - **não** abrir o 1º item sozinho nessa largura;
     - nada de rolagem horizontal na página.
   - Esc fecha a leitura só na tela cheia do celular.
7. **Espaçamentos:** usar os tokens `--espaco-*`, com o mesmo respiro entre o topo, as seções e os cartões. As seções têm distância clara entre si, maior que a distância entre os cartões.

**Não alterar:**
- dados, rotas, permissões e backend;
- a lista de módulos da Tela 1, a aba Avaliações do curso e a tela do Professor;
- os cartões de módulo (`.conteudos-modulo--cartao`): reaproveitar os tokens, sem mudar essa classe.

Nenhum botão de editar, excluir ou publicar conteúdo ou quiz é adicionado, para Admin e Coordenador.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), **sem modo demo**, como **Admin** e como **Coordenador** (num curso que coordena), comparando com `modulo-tela-melhorias.png`.

**Em 1366px e em 1920px de largura:**
- KPIs numa linha, à direita do título, e o resumo "N conteúdos · N quizzes · módulo X de Y".
- Itens em cartões com relevo igual ao dos cartões de módulo, e o item aberto com contorno roxo.
- "1 aluno concluiu" no singular. Quiz sem "Média".
- Ao entrar no módulo, o 1º item já aparece à direita, e a leitura ocupa do fim da lista até a borda direita e até o pé da tela.
- Rolar as questões não tira o topo nem o rodapé da leitura da tela.
- Questões em 2 colunas na largura grande.
- Item anterior/próximo com o nome e "Item X de Y". Módulo anterior/próximo no pé da lista.

**Em ≈ 900px:** lista estreita, leitura no resto e questões em 1 coluna.

**Em ≈ 390px:**
- só a lista, com os KPIs em 3 colunas e sem rolagem horizontal;
- tocar num item abre a leitura em tela cheia com "← Voltar ao módulo";
- voltar mostra a lista de novo.

**Tema claro:** o relevo e o contorno do item aberto continuam visíveis.

**Testes (vitest):**
- texto da métrica no singular e no plural;
- quiz sem "Média";
- 1º item aberto ao entrar (desktop) e ao trocar de módulo;
- "Item X de Y";
- ausência de ações de edição.
- `npm run lint` e `npm test` sem erros novos.
