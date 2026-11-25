# Prompt: app mobile — barra de XP igual à web (linha na Início + chip nas outras abas)

## Pedido do usuário (2026-11-25, print da Início do celular)

"Falta aplicarmos a barra de XP igual ao web, o que sugere?"

O usuário viu a imagem `docs/redesign-mobile/xp-mobile-opcoes.png` e escolheu a **opção C, as duas**:
- na **Início**, uma **linha fina** "⚡ Nível N ▬▬▬ X/500 XP" dentro da saudação;
- nas **outras abas**, um **chip "⚡ Nv N" com mini barra** na faixa do topo, no lugar do ícone de medalha (hoje só um placeholder). Tocar no chip abre um painel com nível, XP, quanto falta e como ganhar XP.

## Como está na web (verificado; é a referência)

- **Cálculo:** `frontend/src/lib/xp.js`, função `calcularXp(progressos)`:
  - 10 XP por conteúdo concluído, 50 por módulo concluído e 200 por curso concluído;
  - um nível a cada 500 XP; `nivel = floor(total/500) + 1`;
  - quiz, avaliação e nota **não** contam;
  - XP **derivado** do progresso, sem banco nem rota.
  - Usa `normalizeProgressStatus` (1 Não iniciado, 2 Em andamento, 3 Concluído) e tem testes em `xp.test.js`.
- **Visual:** `frontend/src/components/ProgressoXp.jsx`, com as variantes `completa` (Panorama) e `compacta`. Usa o ícone de raio (`TbBolt`) na **cor da marca (roxo)**, "Nível N", "X / 500 XP" e a `BarraProgresso` roxa.
- `DashboardAluno.jsx` ≈ linha 102 mostra o XP **só** quando o aluno tem matrícula aprovada.

## Onde fica no celular (verificado)

- **Dados:** o snapshot do celular tem o **mesmo formato**, `snapshot.progressos = { conteudos, modulos, cursos }` (`mobile/src/lib/dashboard.js`), e já existe `normalizeProgressStatus` em `mobile/src/lib/format.js`.
- **Pasta compartilhada:** `shared/` já é usada pelos dois apps (por exemplo, `shared/catalogoVisibilidade.js`, importado pela web e pelo celular; o Metro do celular já resolve `shared/`, ver `mobile/metro.config.js`).
- **Faixa do topo:** `mobile/src/components/ScreenIndicator.jsx`, com `ICONE_GAMIFICACAO_PLACEHOLDER = "medal-outline"` (≈ linha 34). O comentário já diz que é só trocar essa parte.
  - É renderizada por `components/AlunoHeaderBar.jsx`, que recebe props de `screens/aluno/AlunoWorkspace.jsx`, onde está o snapshot.
- **Saudação da Início:** `mobile/src/screens/HomeScreen.jsx`. A linha "Olá, {nome}! 👋" e "Vamos continuar aprendendo?" ficam ao lado da ilustração do capelo.

## Tarefa

### 1. Cálculo único em `shared/xp.js`

- **Mover** `calcularXp` e as constantes (`XP_POR_CONTEUDO`, `XP_POR_MODULO`, `XP_POR_CURSO`, `XP_POR_NIVEL`) para **`shared/xp.js`**.
- **Normalização do status:** `shared/xp.js` deve ter a sua, local e pequena: aceita o número 3 ou o texto "Concluido"/"Concluído". Assim não depende do `format.js` de nenhum dos dois apps.
- **Retorno:** `{ total, nivel, xpNoNivel, xpPorNivel, percentualNivel }`, mais **`faltamParaProximo`** (`xpPorNivel - xpNoNivel`).
- **Web:** `frontend/src/lib/xp.js` passa a só reexportar de `shared/xp.js`, como `appConfig.js` já faz com `catalogoVisibilidade`. Os testes da web continuam passando sem mudar o resultado.
- **Testes:** mover ou copiar os testes para cobrir `shared/xp.js`. O celular também testa (jest do mobile).

### 2. Início: linha fina dentro da saudação

- **Posição:** abaixo de "Vamos continuar aprendendo?", na mesma coluna do texto (à esquerda do capelo), uma linha de cerca de 18px:
  - `Ionicons "flash"` de 13px em `cores.destaque` e o texto **"Nível N"** (12px, peso 800, `cores.texto`);
  - a **barra** fina (altura 6, raio 6, fundo `rgba(255,255,255,.1)`, preenchimento com degradê roxo `#7b2ff7` → `#a78bfa`), que ocupa o espaço que sobrar;
  - **"X/500 XP"** (10.5px, `textoSuave`).
- **Sem cartão extra:** a Início não cresce além dessa linha.
- **Quando mostrar:** só se o aluno tiver pelo menos uma matrícula com acesso liberado. Mesma regra da web, e a mesma lista que a Home já usa para "Meus cursos".
- **Acessibilidade:** `accessibilityLabel` "Nível N: X de 500 XP". Tocar na linha abre o mesmo painel do item 4.

### 3. Chip na faixa do topo (outras abas)

- **No `ScreenIndicator`**, trocar o ícone de medalha pelo **chip de XP**:
  - pílula com cerca de 22px de altura, fundo `rgba(123,47,247,.15)` e borda `rgba(157,103,255,.45)`;
  - `flash` 12px roxo-claro, **"Nv N"** (10.5px, peso 800, `#d6c8ff`) e a mini barra (42×4) com o mesmo degradê.
- **Props novas do `ScreenIndicator`:** `xp` (o objeto de `calcularXp` ou `null`) e `onAbrirXp`.
  - Sem `xp` (aluno sem matrícula liberada), **não** mostrar nada à direita. A medalha placeholder sai de vez.
  - **Na aba Início, o chip não aparece**, porque a linha da saudação já mostra o XP. O `AlunoHeaderBar` já sabe a aba ativa (`nomeAtivo`): passar `xp={nomeAtivo === ROUTES.INICIO ? null : xp}`.
- **Cálculo:** em `AlunoWorkspace.jsx`, com `useMemo(() => temMatriculaLiberada ? calcularXp(snapshot.progressos) : null, [...])`. Repassar para o `AlunoHeaderBar` e para o `HomeScreen`. **Um cálculo só**, nada duplicado nas telas.
- **Acessibilidade:** o chip é um `button`, com `accessibilityLabel` "Nível N: X de 500 XP. Toque para ver detalhes". Área de toque ≥ 44 via `hitSlop`.

### 4. Painel "Seu nível" (ao tocar no chip ou na linha)

- **Painel inferior** (mesmo padrão de sheet do app), com:
  - **"⚡ Nível N"** (16px, peso 800) e "X / 500 XP" à direita;
  - a **barra** (altura 8) com o mesmo degradê;
  - **"Faltam Y XP para o nível N+1"**;
  - a lista **"Como ganhar XP"**, com três linhas e o valor em roxo-claro à direita: "Conteúdo concluído **+10 XP**", "Módulo concluído **+50 XP**", "Curso concluído **+200 XP**". Ler os valores das constantes de `shared/xp.js`, sem números fixos no componente;
  - uma nota pequena em `textoRotulo`: "Quizzes e avaliações ainda não contam XP."
- Fecha ao tocar fora ou arrastar para baixo.
- **Componente novo:** `mobile/src/components/PainelXp.jsx`. O estado de aberto/fechado fica no `AlunoWorkspace`, para ser compartilhado pelo chip e pela Início.

**Não alterar:**
- a regra do XP, além do item 1 (só move e acrescenta `faltamParaProximo`);
- o visual do XP na web;
- o restante da Início e da faixa do topo (ícone e título da aba);
- o backend.

## Testes

- **`shared/xp.js`:**
  - 0 itens dá nível 1 com 0 XP;
  - 3 conteúdos + 1 módulo dá 80 XP;
  - 500 XP exatos dá nível 2 com 0 no nível;
  - `faltamParaProximo` correto;
  - aceita status 3 e "Concluido".
- **Web:** os testes atuais de `xp.test.js` continuam verdes.
- **`ScreenIndicator`:**
  - com `xp`, renderiza "Nv N" e chama `onAbrirXp` ao tocar;
  - sem `xp`, não renderiza nada à direita;
  - o ícone de medalha não existe mais.
- **`HomeScreen`:** com `xp`, renderiza "Nível N" e "X/500 XP"; sem matrícula liberada, não renderiza.
- **`PainelXp`:** mostra "Faltam Y XP para o nível N+1" e os três valores (+10/+50/+200).

## Critérios de aceite

Verificar no app (Expo; web no iPhone e um Android), logado como Aluno Demo:

- **Início:** abaixo de "Vamos continuar aprendendo?" aparece "⚡ Nível N ▬▬ X/500 XP". O **mesmo nível e XP** aparecem no Panorama da web para o mesmo aluno.
- **Outras abas:** em Cursos, Avaliações, Progresso e Certificados, a faixa do topo mostra o chip "⚡ Nv N" à direita, no lugar da medalha. Na Início, o chip não aparece.
- **Painel:** tocar no chip (ou na linha da Início) abre o painel com o nível, o XP, quanto falta e "Como ganhar XP".
- **Sem matrícula:** um aluno sem matrícula liberada não vê nem a linha nem o chip.
- `npm test` (mobile e web) e o lint sem erros novos.
