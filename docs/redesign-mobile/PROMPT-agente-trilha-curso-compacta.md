# Prompt: app mobile — trilha do curso (aba Cursos) mais compacta, avaliação em 1 linha e conteúdos com cara de clicável (só visual)

## Pedido do usuário (2026-11-24, três prints da trilha "Desenvolvimento Web Full Stack")

**Os três prints mostram três casos:**

| Print | O que acontece hoje | Itens que resolvem |
|---|---|---|
| 1. Tela aberta | O cabeçalho fixo e o cartão verde ocupam metade da tela; aparece só 1 módulo e meio. | 1, 2 e 4 |
| 2. Rolando a lista | O cabeçalho continua parado no topo e o cartão verde passa **por baixo dele, cortado** (só o botão "Ir para a avaliação" aparece). Parece um erro de sobreposição. | 1: o cabeçalho rola junto, então nada fica cortado |
| 3. Módulo aberto | Sobra uma **faixa verde cortada** colada no topo. Os conteúdos têm ícones cinza e a pílula grande "Concluído", e não parecem clicáveis. | 1, 4 e 5 |

**Problemas apontados:**
- O cartão verde "🎉 Etapa concluída! … Ir para a avaliação" ocupa uma área grande, empurra os módulos para baixo e atrapalha abrir os módulos.
- Os ícones de texto, PDF, imagem e quiz **abrem o conteúdo**, mas não parecem clicáveis.
- **Objetivo:** cartões mais compactos, módulos fáceis de expandir e interação evidente, **sem mudar a identidade visual**.

O usuário **aprovou** a imagem `docs/redesign-mobile/conteudos-trilha-proposta.png`.

## Onde está (verificado pelo agente de arquitetura)

`mobile/src/screens/aluno/ConteudosScreen.jsx` (≈ 1000 linhas), na parte com curso selecionado (≈ linhas 435–590):

- **Cabeçalho fixo:** "Voltar" (≈ linha 437) e `cabecalhoCurso` com `CapaCurso` 48px, título, "Progresso na trilha", barra e % (≈ linhas 446–456) ficam **fora** do `ScrollView`. São ≈ 150px fixos.
- **Aviso:** `AvisoAvaliacaoLiberada` (≈ linha 662), com cerca de 190px.
- **Continuar:** o cartão "Continue de onde parou" (≈ linhas 466–486).
- **Cabeçalho do módulo** (≈ linhas 505–565):
  - selo "✓ Concluído/Em andamento" numa linha própria;
  - título;
  - o rótulo "Progresso da trilha" com % e barra;
  - o chevron.
- **`LinhaConteudo`** (≈ linha 705):
  - ícone `ICONE_TIPO_CONTEUDO` em `textoSuave` (cinza) e meta "Texto/Imagem…";
  - à direita, a pílula grande "✓ Concluído", o botão "Concluir" ou o cadeado;
  - **quiz:** ícone `clipboard-outline` cinza, botão "Responder" e pílula "Concluído".
- **Tipos:** 1 Texto, 2 PDF, 3 Vídeo, 4 Link, 5 Imagem. PDF, Vídeo e Imagem abrem no visualizador integrado (`TIPOS_COM_VISUALIZADOR_INTEGRADO`).
- **Toque nas linhas:**
  - conteúdo com arquivo ou link e não bloqueado: `abrirConteudo`;
  - quiz disponível ou concluído: `onAbrirQuiz`, que abre a revisão quando corrigido.
  - **Essa lógica não muda.**

## Tarefa

### 1. Cabeçalho do curso compacto, rolando junto

- Mover o cabeçalho **para dentro do `ScrollView`**, como o primeiro item. Nada fixo além do cabeçalho global e do breadcrumb.
- **Um cartão só**, com cerca de 60px de altura, raio 14, fundo `cores.fundoCartao` e borda roxa sutil:
  - **à esquerda, o botão "‹"** (30×30, raio 9, fundo `rgba(123,47,247,.15)`, ícone `chevron-back` roxo-claro):
    - faz o que o "Voltar" de hoje faz;
    - `accessibilityLabel` "Voltar para a seleção de cursos";
    - área de toque ≥ 44 com `hitSlop`.
  - **no meio:**
    - o rótulo "CURSO" (10px, `textoRotulo`, maiúsculo);
    - o **título em 1 linha** com reticências;
    - embaixo, "N de M módulos · N de M itens".
    - Os números vêm de `cursoAtivo.modulos` (concluídos / total) e dos itens já contados (conteúdos + quizzes).
  - **à direita**, o **anel de progresso** (`ProgressoCircular`, cerca de 40px) com a %. Verde em 100%, roxo nos outros casos.
- **Sai:** o "Voltar" solto, a capa de 48px (a capa do curso 1 é um PNG preto de 1×1, que é dado), "Progresso na trilha" e a barra do cabeçalho.

### 2. Avaliação liberada em 1 linha

- `AvisoAvaliacaoLiberada` vira um cartão de **uma linha** com cerca de 52px:
  - fundo `rgba(34,197,94,.10)`, borda `rgba(34,197,94,.35)`, raio 12;
  - à esquerda, um quadrado de 30px verde translúcido com `trophy` verde;
  - **"Avaliação liberada"** em negrito (12–13px) e, embaixo, o **título da avaliação** em 1 linha com reticências;
  - à direita, a pílula verde cheia **"Iniciar ›"**, com a mesma navegação de hoje (`ROUTES.AVALIACOES`, `{ cursoId }`).
- O cartão inteiro é tocável. `accessibilityLabel` "Ir para a avaliação {título}".
- **Sai** o texto longo "Você concluiu todas as etapas…" e o "🎉 Etapa concluída!".
- A animação de entrada atual pode continuar, se houver.

### 3. "Continue de onde parou" no mesmo formato compacto

- O cartão de hoje vira uma linha igual à do item 2, **em roxo**:
  - ícone `play-circle-outline`;
  - "Continue de onde parou" e, embaixo, o título do conteúdo;
  - à direita, a pílula roxa "Abrir ›", que faz o que o "Abrir" de hoje faz.
- **Se houver avaliação liberada**, mostrar só a avaliação: com 100% dos conteúdos não há "próximo conteúdo". Se as duas existirem, a avaliação vem primeiro.
- Depois dos cartões, o rótulo de seção **"MÓDULOS"** (10.5px, `textoRotulo`, maiúsculo).

### 4. Módulo em uma linha

O cabeçalho do módulo vira uma linha com cerca de 56px:

- **Quadrado do número**, 30×30, raio 9:
  - "01", "02"… em roxo-claro com borda roxa;
  - **✓ verde** (fundo `sucessoFundo`, borda verde) quando o módulo está concluído;
  - **cadeado** cinza quando está bloqueado.
- **Título** (até 2 linhas) e embaixo:
  - "N de M concluídos", contando conteúdos + quizzes, coerente com a %;
  - ou "Conclua o módulo anterior" quando bloqueado.
- **Mini barra** (≈ 54×5) à direita: verde em 100%, roxa nos outros casos. Não aparece se o módulo estiver bloqueado.
- **Chevron** para baixo/cima. Não aparece se o módulo estiver bloqueado.
- **Sai:** o selo "✓ Concluído/Em andamento" em linha própria e o rótulo "Progresso da trilha" com a %. Manter a % no `accessibilityLabel`, como hoje.
- **Área de toque:** a linha inteira expande ou recolhe, como hoje.
- Módulo aberto: os itens ficam **dentro do mesmo cartão**, abaixo, separados por linhas finas, como hoje.

### 5. Conteúdos com cara de clicável

**Ícone por tipo**, quadrado de 34px, raio 10, degradê (`expo-linear-gradient`) e borda:
- **Material** (texto, PDF, vídeo, link, imagem): **verde**. Degradê `rgba(34,197,94,.30)` → `rgba(34,197,94,.08)`, borda `rgba(74,222,128,.4)`, ícone `#86efac`, com os ícones de hoje (`ICONE_TIPO_CONTEUDO`).
- **Quiz:** **roxo**. Degradê `rgba(123,47,247,.38)` → `rgba(123,47,247,.12)`, borda `rgba(157,103,255,.45)`, ícone `#d6c8ff`.
- **Bloqueado:** cinza, como hoje.
- Seguir o mesmo mapa de cores da web (`corIconePorTipo`) e de `VISUAL_TIPO_AVALIACAO`, se já existir.

**Concluído:**
- um **✓ pequeno** (círculo verde de 15px com borda da cor do cartão) no canto inferior direito do ícone;
- **sai** a pílula grande "✓ Concluído" da direita;
- a animação de pulso de `useAnimacaoConclusao` passa para esse ✓.

**Ação à direita, em roxo-claro (`#a78bfa`, peso 700) com seta ›**, sempre que a linha é tocável:

| Situação | Ação |
|---|---|
| Texto, PDF, Link | "Abrir ›" |
| Imagem | "Ver ›" |
| Vídeo | "Assistir ›" |
| Conteúdo já concluído | "Rever ›" (cinza, `textoSuave`) |
| Quiz concluído com revisão | "Ver revisão ›" |
| Quiz concluído sem revisão | só o ✓ no ícone, sem ação |

**Continua como hoje:**
- quiz disponível com o **botão "Responder"**, agora em pílula roxa cheia, para destacar o que está pendente;
- conteúdo sem visualizador integrado e ainda não concluído com o botão **"Concluir"**;
- bloqueado com o cadeado.

**Meta embaixo do título:**
- material: o tipo, como hoje ("Texto", "PDF", "Imagem", "Vídeo", "Link"), mais "· lido" quando concluído;
- quiz: "Quiz · N questões · sem nota", como hoje.

**Feedback de toque:** `activeOpacity` cerca de 0.7 nas linhas tocáveis e um leve fundo `rgba(123,47,247,.08)` ao pressionar (`Pressable` com `pressed`), para deixar claro que a linha responde.

O quiz vinculado continua recuado (`linha.recuado`).

**Não alterar:**
- `abrirConteudo`, `marcarConcluido`, `abrirQuizOuRevisao` e o `VisualizadorConteudo`;
- `QuizModal` e `RevisaoQuizModal`;
- as regras de bloqueio, de progresso e de qual avaliação está liberada;
- a lista de cursos (sem curso selecionado);
- os dados e endpoints.

## Testes (jest)

- **Cabeçalho:**
  - o "Voltar" solto não existe mais;
  - o botão "‹" (pelo `accessibilityLabel`) volta para a lista;
  - o cabeçalho mostra "N de M módulos" e está dentro do `ScrollView`.
- **Avaliação liberada:** renderiza "Avaliação liberada", o título e "Iniciar"; tocar navega para `ROUTES.AVALIACOES` com `cursoId`; o texto "Etapa concluída" não aparece mais.
- **Módulo:** o concluído mostra ✓ no quadrado e não mostra o texto "Progresso da trilha"; o bloqueado mostra "Conclua o módulo anterior" e não tem chevron.
- **Linha de conteúdo:**
  - PDF pendente mostra "Abrir";
  - imagem mostra "Ver";
  - vídeo mostra "Assistir";
  - concluído mostra "Rever" e o ✓ no ícone, sem a pílula "Concluído";
  - quiz disponível mostra "Responder";
  - os toques chamam as mesmas funções de hoje.

## Critérios de aceite

Verificar no app (Expo) logado como Aluno Demo, em "Desenvolvimento Web Full Stack":

- **Topo compacto:** a tela começa com o cartão do curso (‹, título, "2 de 2 módulos", anel 100% verde), e ele **rola junto** com a lista.
- **Avaliação liberada:** "Banco ENADE/CQA - Revisão" aparece numa linha verde com "Iniciar ›"; logo abaixo aparecem os módulos, em vez de 1 módulo e meio como hoje.
- **Módulos:** cada módulo ocupa uma linha (✓ verde, título, "5 de 5 concluídos", mini barra, seta) e abre com um toque.
- **Módulo aberto:** os conteúdos têm ícone verde (material) ou roxo (quiz), o ✓ no canto quando concluídos e "Rever ›" / "Abrir ›" / "Ver ›" à direita. O quiz pendente mostra "Responder".
- **Barra flutuante:** o último módulo aberto aparece inteiro acima da barra.
- `npm test` (mobile) e o lint sem erros novos.
