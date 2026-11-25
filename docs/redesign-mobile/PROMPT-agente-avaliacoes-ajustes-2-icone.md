# Prompt: app mobile — Avaliações, ajustes 2: ícone por tipo e correção da linha "Nota - · abaixo de 7,0"

## Pedido do usuário (2026-11-24, print da aba Avaliações já com os ajustes 1 aplicados)

**"Melhorar o ícone":** hoje o ícone do cartão é pequeno (32px), apagado e quase igual para prova e exercício.

O usuário viu a imagem `docs/redesign-mobile/avaliacoes-icone-opcoes.png` e escolheu a **opção A, cor e ícone por tipo**.

O agente de arquitetura também achou no mesmo print um **bug na linha da nota**: o cartão "Banco ENADE/CQA - Revisão" (Em andamento) mostra **"Nota - · abaixo de 7,0"** em vermelho.

## Onde está (verificado)

- `mobile/src/screens/aluno/AvaliacoesScreen.jsx`:
  - **ícone:** ≈ linha 260, `iconeTipo = TIPO_EXERCICIO ? "create-outline" : "reader-outline"`, Ionicons de 18px em `cores.destaque` dentro de um quadrado claro;
  - **nota:** ≈ linhas 229–240 e 282–286. Usa `mostrarNota = tentativasRealizadas > 0 && ultimaNota != null`.
- **Tipos:** `TIPO_QUIZ = 1` (fora da tela) e `TIPO_EXERCICIO = 3`; o resto é Prova.
- **Família de ícones:** `@expo/vector-icons` já inclui `MaterialCommunityIcons`, que tem `clipboard-check-outline` e `clipboard-edit-outline` (traço fino, como a referência `E:\Mobile\padronizacao icones.png`).
- **Causa do bug:**
  - no backend, `UltimaNota = ultimaTentativa?.NotaBruta` (`Services/AvaliacaoService.cs` ≈ linha 1747) vem da **última** tentativa, mesmo **em andamento**, quando ainda não tem nota (0);
  - `formatGrade(0)` (`lib/format.js` ≈ linha 46) devolve "-".
  - O DTO já traz `ultimoStatusTentativa`: EmAndamento = 1, Enviada = 2, Corrigida = 3, Expirada = 4.

## Tarefa

### 1. Ícone por tipo (opção A)

- **Quadrado:** 40×40, raio 12, fundo em degradê diagonal (`expo-linear-gradient`, já instalado) e borda de 1px na cor do tipo:
  - **Prova:** roxo. Degradê `rgba(123,47,247,.38)` → `rgba(123,47,247,.12)`, borda `rgba(157,103,255,.45)`, ícone `#d6c8ff`. Ícone `MaterialCommunityIcons` **`clipboard-check-outline`**, 22px.
  - **Exercício:** azul. Degradê `rgba(59,130,246,.36)` → `rgba(59,130,246,.10)`, borda `rgba(96,165,250,.45)`, ícone `#bfdbfe`. Ícone **`clipboard-edit-outline`**, 22px.
  - **Bloqueada:** o mesmo ícone do tipo, em cinza (fundo `rgba(255,255,255,.06)`, borda `rgba(255,255,255,.12)`, ícone `cores.textoRotulo`). **Sem** bolinha de selo, que é a opção C, não escolhida.
- **Rótulo do tipo** acima do título: "PROVA" (roxo-claro `#a78bfa`) ou "EXERCÍCIO" (azul `#93c5fd`), 9.5–10px, peso 700, maiúsculo, `letterSpacing` 0.6.
- Centralizar as cores num mapa `VISUAL_TIPO_AVALIACAO` (em `lib/` ou no topo da tela), para reaproveitar depois na Home e no Progresso.
- O ícone fica alinhado ao topo do bloco de texto, e o título continua com até 2 linhas.
- O **selo de situação** à direita não muda: o ícone diz **o que é**, o selo diz **a situação**.

### 2. Correção da linha da nota

- Mostrar a linha de nota **só** quando `ultimoStatusTentativa` for **Corrigida (3)** ou **Expirada (4)** e houver `ultimaNota != null`.
  - Aí vale a regra dos ajustes 1: verde "✓ Nota X,X · aprovado" ≥ 7, ou vermelho "Nota X,X · abaixo de 7,0".
- **Enviada (2):** linha neutra/âmbar "Nota: aguardando correção", sem vermelho.
- **Em andamento (1):** **não** mostrar a linha de nota.
- **Nota zero corrigida** aparece como "0,0", nunca "-". Usar um formatador local (`toFixed(1)` com vírgula) em vez de `formatGrade`, que trata 0 como vazio. **Não** mudar `formatGrade`, porque outras telas dependem dele.

**Não alterar:**
- o selo de situação;
- as regras de disponibilidade e tentativas;
- os chips e as abas;
- o backend.

## Testes (jest)

- **Ícone:** Prova renderiza `clipboard-check-outline` com o rótulo "PROVA"; Exercício renderiza `clipboard-edit-outline` com "EXERCÍCIO"; bloqueada usa a cor cinza.
- **Nota:**
  - `ultimoStatusTentativa` 1 não renderiza a linha;
  - 2 renderiza "aguardando correção";
  - 3 com nota 0 renderiza "Nota 0,0 · abaixo de 7,0";
  - 3 com nota 8 renderiza "aprovado" em verde.

## Critérios de aceite

Verificar no app (Expo) logado como Aluno Demo:

- **Ícones:** os cartões de prova têm o quadrado roxo com a prancheta ✓ e "PROVA" acima do título; os exercícios, o quadrado azul com a prancheta e o lápis.
- **Em andamento:** "Banco ENADE/CQA - Revisão" não mostra mais "Nota - · abaixo de 7,0".
- **Nota:** "Apostila - Inteligência Artificial" (corrigida) continua com "Nota 2,0 · abaixo de 7,0" em vermelho.
- `npm test` (mobile) sem falhas novas.
