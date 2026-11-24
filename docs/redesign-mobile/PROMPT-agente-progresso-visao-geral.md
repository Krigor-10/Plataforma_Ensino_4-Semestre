# Prompt: app mobile — Progresso com visão geral direta e detalhe do curso com "Voltar" (só visual e navegação local)

## Pedido do usuário (2026-11-24, três prints)

**Hoje a aba Progresso tem dois passos**, como Avaliações tinha:
1. "Selecione um curso": a lista de todos os cursos.
2. A tela do curso tem "Curso ativo · Trocar", que volta à lista, e mostra:
   - um **círculo grande de 140px** com "Progresso Geral";
   - os cartões "– / 10 Desempenho" e "0 de 0 Concluídos";
   - o cartão "Certificado do Curso" com a frase fixa "**liberado automaticamente com progresso 100% e média final ≥ 7,00**" e a lista "Progresso 0% de 100% · Pendente / Média – ≥ 7,0 · Pendente";
   - a lista de módulos.

O usuário pediu sugestões e **aprovou** a imagem `docs/redesign-mobile/progresso-proposta.png`.

## Onde está (verificado pelo agente de arquitetura)

- **Tela:** `mobile/src/screens/aluno/ProgressoScreen.jsx` (≈ 360 linhas).
  - Estado `cursoSelecionadoId` (≈ linha 35); `SeletorCurso` (≈ linha 98); `CartaoCursoAtivo` com "Trocar" (≈ linha 126).
  - `ProgressoCircular` de 140px (≈ linha 130); "Desempenho" (≈ linha 141).
  - Cartão de certificado com a frase fixa (≈ linhas 161–163) e a lista de módulos (≈ linha 179).
  - A tela já lê `GET /Certificados/status` (≈ linha 19) e **não recalcula** a regra.
- **Status do certificado:** `StatusCertificadoMatriculaDto` já tem `Situacao` (Emitido, AguardandoPagamento, EmAndamento, AguardandoCorrecao, NotaAbaixoDoMinimo, AguardandoEncerramento, Disponivel), `CertificadoEmitidoEm` e `PendenciasCertificado`, desde `4de3b14`.
- **Componentes:** `ProgressoCircular.jsx` (aceita `size`/`espessura`) e `BotaoVoltar.jsx` existem. Os dados de progresso vêm do snapshot (`progressos`, `matriculas`, `cursos`, `modulos`, `avaliacoes`). **Não precisa de endpoint novo.**
- **Barra de navegação flutuante:** o último cartão não pode ficar escondido.

## Tarefa

### 1. Visão geral (abre direto, sem "Selecione um curso")

- **Resumo no topo**, num cartão com degradê roxo suave e 4 números lado a lado separados por linhas finas:
  - **cursos em andamento**;
  - **concluídos** (100%);
  - **certificados** (`situacao === "Emitido"`);
  - **média geral**: a média das notas finais dos cursos que têm avaliação formal, ou "—" se não houver.
- **"Seus cursos":** um cartão por curso **com acesso**. Ficam fora os que só têm pagamento pendente ou cancelado (`situacao === "AguardandoPagamento"` ou sem acesso). Cada cartão tem:
  - **anel de progresso pequeno** (`ProgressoCircular`, ≈ 52px), com a % dentro. Verde quando 100%, roxo nos outros casos;
  - título (até 2 linhas) e embaixo "N de M módulos · nota X,X". A nota só aparece quando existe;
  - **selo de situação** à direita, com a mesma regra e as mesmas cores da tela de Certificados: "🏆 Certificado" (Emitido), "Aguardando correção", "Nota abaixo de 7,0", "Aguardando encerramento", "Em andamento" e "Não iniciado" (0%). Mais a seta ›;
  - tocar abre o detalhe do curso.
- **Ordem:** em andamento primeiro (do maior para o menor progresso), depois não iniciados, depois concluídos e com certificado.
- **Vazio:** "Você ainda não começou nenhum curso." com o botão "Ver catálogo".
- **Remover** `SeletorCurso` e `CartaoCursoAtivo` desta tela, se ficarem sem uso em outro lugar.

### 2. Detalhe do curso

- **"← Voltar"** (`BotaoVoltar`) no topo, que volta para a visão geral. **Sai o "Trocar".**
- **Cabeçalho do curso no estilo do "cabeçalho com métricas"**, como na web, num cartão com degradê roxo suave:
  - **anel de progresso** (≈ 70px) com a %;
  - rótulo "CURSO", o título e o **selo de situação**;
  - abaixo, **3 números**: "N/M módulos", "N/M conteúdos" e "nota final" ("—" sem avaliação formal).
- **Cartão "Certificado"** com a situação **real** do servidor, no lugar da frase fixa e da lista "Pendente":
  - **Emitido:** "🏆 Certificado emitido em DD/MM/AAAA" e o botão "Ver certificado", que abre a aba Certificados em "Conquistados";
  - **Outras situações:** "Falta: {primeira pendência}", usando `PendenciasCertificado` (por exemplo "Há avaliações (prova/exercício) pendentes de correção…" ou "O curso ainda não foi concluído.");
  - **Não** mostrar mais a frase "progresso 100% e média ≥ 7,00", que não vale para todo curso.
- **Módulos em linhas:** número num quadrado (verde, com ✓, quando concluído), título, "N de M concluídos" e a mini barra à direita. Tocar abre o módulo na aba Cursos, se essa navegação já existir. Senão, fica só informativo.
- **Remover** o círculo de 140px e os cartões "Desempenho" e "Concluídos" de hoje.

**Não alterar:**
- os cálculos de progresso e nota;
- a regra do certificado (só ler `situacao` e `PendenciasCertificado`);
- os dados e endpoints;
- as outras abas.

## Testes (jest)

- **Abertura:** a tela abre na visão geral, sem passo de seleção.
- **Resumo:** os 4 números calculados do snapshot e do status.
- **Cursos:** os sem acesso ou com pagamento pendente não aparecem; ordem certa; selo certo por `situacao`.
- **Navegação:** tocar no curso abre o detalhe, e "Voltar" retorna.
- **Detalhe:**
  - cabeçalho com anel, título, selo e os 3 números;
  - o cartão de certificado mostra "emitido em" quando Emitido, ou "Falta: …" com a 1ª pendência;
  - não existe mais a frase fixa "100% e média ≥ 7,00".

## Critérios de aceite

Verificar no app (Expo), num Android e num iPhone, logado como Aluno Demo:

- **Visão geral:** tocar em "Progresso" mostra **direto** o resumo e a lista "Seus cursos", com o anel, "N de M módulos" e o selo. "Introdução à Inteligência Artificial" aparece com "🏆 Certificado".
- **Detalhe:** tocar em "Desenvolvimento Web Full Stack" abre o detalhe com "← Voltar", o cabeçalho com anel e métricas, o cartão de certificado coerente com a situação e os módulos com mini barra.
- **Sem sobras:** não aparece mais o círculo gigante, "– / 10" nem a frase fixa do certificado.
- **Barra flutuante:** o último cartão aparece inteiro acima da barra.
- `npm test` (mobile) e o lint sem erros novos.
