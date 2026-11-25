# Prompt: app mobile — tela Início no estilo da referência (só visual e navegação local)

## Pedido do usuário (2026-11-24)

O usuário enviou a referência `docs/redesign-mobile/inicio-referencia.png`, cópia de `E:\Mobile\Inicio.png`, e **aprovou** segui-la com os ajustes abaixo.

Esta tela faz parte da análise pendente de "mais vida e estilo" no mobile (`docs/redesign-mobile/PENDENTE-segunda-23-11-auditoria-ux-ui-mobile.md`).

**Ajustes aprovados em relação à referência:**
- **Sai** a seção "Acesso rápido": os 4 atalhos repetem a barra de navegação.
- A **lista de avaliações disponíveis vira um banner compacto** "Avaliações pendentes".
- O **capelo** (ao lado da saudação) e o **foguete** (banner do catálogo) entram como **imagens fixas do app**.
- Nos cartões de "Meus cursos", **"Em andamento" fica roxo com ▶**. O verde com ✓ fica só para **Concluído**. Na referência, "Em andamento" está verde com ✓, o que confunde com concluído.
- A barra de navegação **não muda**: continua a versão B aplicada (quadrado roxo sem rótulo). Na referência o rótulo aparece dentro do quadrado, mas isso **não** faz parte deste prompt.

## Onde está (verificado pelo agente de arquitetura)

- **Tela:** `mobile/src/screens/HomeScreen.jsx` (≈ 390 linhas).
  - Saudação `obterSaudacao()` + nome + 👋 (≈ linha 140) e o subtítulo "Bora continuar sua trilha?".
  - Cartão "continuar" com título, módulo, `ProgressoCircular` 56px, conteúdo e botão "Continuar aula" (≈ linhas 145–182).
  - `ATALHOS` / "Acesso rápido" (≈ linhas 24–29 e 186–196).
  - "Avaliações disponíveis" em lista de cartões (≈ linhas 198–239), filtradas por `obterDisponibilidadeAvaliacao().podeRealizar`, sem quiz.
  - "Meus cursos": carrossel com `CapaCurso` de 40px, título, barra e rótulo (≈ linhas 242–266).
- **Dados que já existem:**
  - `proximoCurso` / `tituloCursoProximo` / `numeroModulo` / `proximoConteudo` / `progressosPorCurso` / `cursoPorId` / `avaliacoesDisponiveis`.
  - Capas em `lib/courseCovers.js` (`resolverImagemCurso`): usam a capa enviada ou uma das 10 imagens de `assets/courses/` pelo título; senão, o `CapaCurso` mostra um ícone.
  - **Não precisa de endpoint novo.**
- **Navegação:** `onAbrirAba(ROUTES.X, params)`; o catálogo é `ROUTES.CATALOGO`.
- **Recursos:** `expo-linear-gradient` instalado; a barra flutuante usa `alturaBarraAbas` no `paddingBottom`, que deve continuar.

## Tarefa

### 1. Saudação com ilustração

- **Linha:** à esquerda, "Olá, {primeiro nome}! 👋" (fonte grande, peso 800) e embaixo "Vamos continuar aprendendo?" (`textoSuave`). À direita, a **ilustração do capelo** com cerca de 96×80.
  - Trocar "Bom dia/Boa tarde" por "Olá", como na referência. `obterSaudacao` pode sair se ficar sem uso.
- **Imagem:** `mobile/assets/ilustracoes/capelo.png`, PNG com fundo transparente, roxo, no estilo da referência.
  - **Se a imagem não existir no repositório:** criar o lugar com um **SVG simples** (`react-native-svg`, se já estiver instalado; senão um `Ionicons` "school" de 56px roxo sobre um brilho circular) e registrar no relatório que a arte final precisa ser fornecida.
  - **Não** baixar imagens da internet.
- `accessibilityElementsHidden` / `importantForAccessibility="no"` na ilustração.

### 2. Cartão "Continue estudando"

- **Cartão:** borda roxa 1px (`rgba(123,47,247,.55)`), fundo em degradê suave (`#231a3d` → `cores.fundoCartao`) e raio 18.
- **Linha de cima:**
  - à esquerda, a **capa do curso** com cerca de 96×84 e raio 12 (`CapaCurso` ganha as props `largura`/`altura` ou um `style`, mantendo o `size` atual para os outros usos);
  - à direita:
    - a pílula **"CONTINUE ESTUDANDO"** (fundo `rgba(123,47,247,.22)`, texto `#c4b5fd`, 10px, peso 800);
    - o **título** do curso (2 linhas);
    - "Módulo N · título do módulo";
    - a **barra** fina com "N% concluído" ao lado.
- **Botão "▶ Continuar aula":** largo, roxo cheio, raio 12, altura cerca de 48. A animação de escala e `useReducedMotion` continuam.
- **Sai** o `ProgressoCircular` deste cartão (a barra o substitui) e a linha do conteúdo com ▶ pequeno.

### 3. Banner "Avaliações pendentes" (no lugar da lista)

- **Mostrar só se** `avaliacoesDisponiveis.length > 0`. Contar **todas** as disponíveis, sem o `slice` de `MAX_AVALIACOES_DISPONIVEIS`.
- **Cartão de uma linha:**
  - à esquerda, um quadrado de 48px com `MaterialCommunityIcons` `clipboard-check-outline`, no mesmo visual roxo da opção A dos ícones de Avaliações (`PROMPT-agente-avaliacoes-ajustes-2-icone.md`; reaproveitar `VISUAL_TIPO_AVALIACAO` se já existir);
  - "Avaliações pendentes" em negrito;
  - embaixo, "Você tem N avaliação disponível" / "N avaliações disponíveis";
  - à direita, o botão contorno **"Ver ›"**, que abre a aba Avaliações (`onAbrirAba(ROUTES.AVALIACOES)`).
- O cartão inteiro também é tocável e leva ao mesmo destino.
- **Remover** a lista de cartões de avaliações e as funções auxiliares que ficarem sem uso (`obterRotuloTempoLimite`, `obterRotuloTentativa`, se não forem usadas em outro lugar).

### 4. Remover "Acesso rápido"

- Remover `ATALHOS`, `AtalhoBotao` e os estilos `atalho*`, se ficarem sem uso.

### 5. "Meus cursos" com capas grandes

- **Cabeçalho:** "Meus cursos" à esquerda e **"Ver todos ›"** (roxo) à direita, que abre a aba Cursos (`onAbrirAba(ROUTES.CONTEUDOS)`).
- **Carrossel horizontal:** cartões de cerca de 150px de largura, raio 14, borda sutil.
  - **Capa** em cima, ocupando a largura, com cerca de 84px de altura.
  - **Pílula com a %** sobre a capa, no canto inferior direito (fundo `rgba(0,0,0,.65)`, texto branco, 11px, peso 800).
  - **Barra** fina logo abaixo da capa (roxa; verde quando 100%).
  - **Título** do curso (2 linhas).
  - **Situação com ícone:**
    - 0% → `time-outline` cinza "Não iniciado";
    - entre 0 e 100 → `play-circle` roxo "Em andamento";
    - 100% → `checkmark-circle` verde "Concluído".
- **Toque:** abre a trilha do curso, como hoje.
- **Ordem:** a de hoje.

### 6. Banner "Explorar catálogo" (novo, no fim)

- **Cartão:** degradê roxo (`#3b1f78` → `#24164a`), borda `rgba(157,103,255,.4)` e raio 18.
- **Conteúdo:**
  - à esquerda, a **ilustração do foguete**, cerca de 64px: `assets/ilustracoes/foguete.png`, com a mesma regra de reserva do capelo (Ionicons "rocket-outline" de 40px);
  - no meio, "Explorar catálogo" em negrito e "Descubra novos cursos para turbinar seus conhecimentos." (2 linhas);
  - à direita, o botão contorno **"Ver cursos ›"**, que abre `ROUTES.CATALOGO`.
- **Aparece sempre**, inclusive no estado vazio (sem matrícula), onde substitui a mensagem "Abra o menu e toque em Catálogo…": saudação + banner do catálogo.

**Não alterar:**
- os cálculos de progresso e o "próximo conteúdo";
- a regra de disponibilidade das avaliações (o quiz continua fora);
- a navegação para as abas;
- a barra de navegação e o cabeçalho global;
- outras telas, exceto `CapaCurso` (props novas e compatíveis).

## Testes (jest)

- **"Acesso rápido"** não renderiza mais.
- **Banner de avaliações:**
  - aparece só com N > 0;
  - mostra o total correto (sem o limite de 3) e o singular/plural certo;
  - tocar abre `ROUTES.AVALIACOES`.
- **Cartão "Continue estudando":** mostra a pílula, a capa, "Módulo N · …" e "N% concluído"; o botão abre a trilha do curso.
- **"Meus cursos":** a situação usa o ícone e a cor certos para 0%, 35% e 100%; "Ver todos" abre `ROUTES.CONTEUDOS`.
- **Banner do catálogo:** aparece com e sem matrícula e abre `ROUTES.CATALOGO`.

## Critérios de aceite

Verificar no app (Expo), num Android e num iPhone, logado como Aluno Demo, comparando com `inicio-referencia.png`:

- **Topo:** a saudação "Olá, Aluno! 👋" com a ilustração do capelo à direita (ou o lugar reservado, registrado no relatório).
- **"Continue estudando":** com a capa do curso, a barra e "N% concluído", e o botão largo "Continuar aula".
- **Banner "Avaliações pendentes":** no lugar da lista; não existe mais "Acesso rápido".
- **"Meus cursos":** capas grandes, a pílula de % sobre a capa e "Em andamento" roxo com ▶ (o verde ✓ só em Concluído).
- **Fim da tela:** o banner "Explorar catálogo" aparece inteiro acima da barra flutuante.
- `npm test` (mobile) e o lint sem erros novos.
