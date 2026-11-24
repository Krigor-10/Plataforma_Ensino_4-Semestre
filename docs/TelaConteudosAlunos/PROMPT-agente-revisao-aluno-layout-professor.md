# Prompt: "Revisão detalhada" do aluno no mesmo layout do quiz do professor + letras com borda + imagens (backend + frontend web)

## Pedido do usuário (2026-11-24, dois prints)

- **Print 1:** a janela de quiz do **professor** (`JanelaPreviaItem`): lista "Questão 1, 2, 3" à esquerda e uma questão por vez à direita (texto de apoio, enunciado, alternativas, explicação, "Questão anterior / Próxima questão").
- **Print 2:** a **"Revisão detalhada" do aluno** (`RevisaoTentativaAvaliacao`): todas as questões numa rolagem só, e a alternativa escolhida desalinhada (a letra "C" sozinha numa coluna larga, o texto empurrado para a direita e a marca "Sua resposta" embaixo da letra).

**Pedido:**
1. A visualização da revisão do aluno segue **a estrutura do professor**, com as **questões no lado esquerdo**.
2. Organizar melhor a distribuição do **enunciado** e das **alternativas** na tela do aluno.
3. Aplicar **borda nas letras das respostas** (A, B, C…).

**Achados da auditoria de 18/11 que entram aqui** (mesma tela; a decisão já era corrigir):
- **a revisão abre menor** que a janela de execução: 820px contra 1024px;
- **as imagens dos enunciados não aparecem** na revisão. `RevisaoTentativaResponseDto` não traz os anexos das questões, e a tela não os desenha.

## Onde está (verificado pelo agente de arquitetura)

- **Revisão do aluno:** `frontend/src/pages/workspace/RevisaoTentativaAvaliacao.jsx`. Ela abre de `SecoesAluno.jsx` ≈ linhas 1282 e 1294 e vale para **quiz e avaliação formal**.
  - Tem o resumo "Nota final", e por questão: cabeçalho (número e status: "Correta", "Incorreta" ou "Aguardando correção"), contexto, enunciado, "Sua resposta: X" e "Análise das alternativas" (com a justificativa de cada uma e a marca "Sua resposta").
  - CSS: `.revisao-*` e `.modal-caixa--revisao-avaliacao` (`styles/workspace.css`, ≈ `min(820px, 92vw)` no desktop).
- **Layout de referência:** `frontend/src/components/JanelaPreviaItem.jsx`, parte do quiz (`janela-previa-item__quiz*`): lista de questões à esquerda, uma questão por vez, "Mostrar gabarito" e a navegação.
- **DTO:** `DTOs/RevisaoTentativaResponseDto.cs` → `RevisaoQuestaoResponseDto` (Contexto, Enunciado, TipoQuestao, Pontos, PontosObtidos, Correta, AlternativaEscolhidaId, RespostaTexto, Explicacao, ReferenciasBibliograficas, Alternativas com Justificativa, Afirmativas). **Não tem anexos.**
- **Anexos das questões:** entidade `AnexoQuestaoBanco`. A execução do aluno já recebe e desenha `questao.anexos` (`SecoesAluno.jsx` ≈ linha 1176), e `GabaritoQuestoes.jsx` ≈ linha 168 também.

## Tarefa

### Backend

1. Acrescentar **`Anexos`** em `RevisaoQuestaoResponseDto`, com o mesmo formato que a execução do aluno usa (título, tipo, `arquivoUrl` e ordem), e preenchê-lo no serviço que monta a revisão. Use o mesmo `Include` dos anexos que a execução já faz.
   - **Teste:** a revisão de uma tentativa cuja questão tem imagem devolve o anexo.
   - O mobile (`RevisaoQuizModal.jsx`) usa o mesmo endpoint. Ele passa a receber o campo, mas **não** precisa mostrar as imagens neste prompt.

### Frontend web — Revisão detalhada (aluno)

2. **Tamanho:** a revisão passa a abrir **do mesmo tamanho da janela do professor** (`min(1080px, 94vw)` e 90% da altura), no lugar de `min(820px, 92vw)`. Abaixo de 768px, tela cheia.
3. **Estrutura igual à do professor:**
   - **Topo:**
     - título "Revisão detalhada · {nome do quiz ou avaliação}";
     - à direita, o **resumo**: nota final, "N de M corretas" e, se houver, "N aguardando correção". É o resumo de hoje, mais compacto;
     - por último, o ✕.
   - **À esquerda, a lista de questões:** "Questão 1, 2, 3…", com um indicador de estado em cada uma: **✓ verde** (correta), **✗ vermelho** (incorreta), **relógio âmbar** (aguardando correção) ou **— cinza** (sem resposta). A questão atual fica destacada em roxo. Clicar troca de questão.
   - **À direita, uma questão por vez**, nesta ordem e com hierarquia clara:
     1. **Cabeçalho:** "QUESTÃO X DE N · {tipo} · {pontos obtidos}/{pontos} ponto(s)" e, à direita, o status ("Correta", "Incorreta" ou "Aguardando correção");
     2. **Texto de apoio** (`Contexto`), se houver, num bloco com borda à esquerda e fonte menor, como no professor;
     3. **Imagens e anexos** da questão (item 1), com clique para ampliar (reaproveitar o zoom de imagem da `JanelaPreviaItem`);
     4. **Enunciado** em destaque (≈ 1.05rem, peso 600);
     5. **Alternativas** (item 4);
     6. **Resposta discursiva**, quando o tipo for discursivo: "Sua resposta", num bloco com o texto do aluno e, se houver, o comentário ou a nota da correção;
     7. **Explicação** e **Referências** no fim, se houver.
   - **Rodapé:** "← Questão anterior · Questão X de N · Próxima questão →" e "Fechar".
4. **Alternativas organizadas e com letra com borda**, valendo também para o quiz do professor na `JanelaPreviaItem`, para manter a consistência:
   - cada alternativa é uma linha com a **letra num círculo com borda** (≈ 30px, borda de 1.5px), o texto **ao lado da letra** (a letra **não** fica numa coluna larga separada) e, à direita, as marcas;
   - **correta:** borda e fundo verde suaves, círculo verde cheio com a letra branca e a marca "✓ Correta" à direita;
   - **escolhida pelo aluno e errada:** borda e fundo vermelho suaves, círculo vermelho e a marca "Sua resposta" à direita, **na mesma linha**;
   - **escolhida e correta:** o verde da correta e as duas marcas, "✓ Correta" e "Sua resposta", à direita;
   - **justificativa** da alternativa: logo abaixo do texto, em fonte menor e `--cor-texto-suave`, alinhada com o texto, **não** com a letra;
   - **verdadeiro/falso com afirmativas:** o mesmo padrão, com o número da afirmativa no círculo.
5. **Remover a linha "Sua resposta: C"** do topo da questão, porque fica redundante com a marca na alternativa. Para a questão discursiva, a resposta aparece no bloco do item 3.6.
6. **Não mudar** as regras: quando a revisão está liberada, o que se mostra antes da correção e o cálculo da nota.

## Testes

- **Backend:** a revisão traz `Anexos` da questão.
- **vitest (revisão):**
  - lista de questões à esquerda com os estados (✓, ✗, aguardando, sem resposta);
  - clicar na lista troca a questão;
  - "Próxima/Anterior" navegam;
  - o anexo de imagem é desenhado;
  - a alternativa correta tem o círculo verde;
  - a escolhida errada tem o vermelho e a marca "Sua resposta" na mesma linha;
  - a questão discursiva mostra a resposta do aluno;
  - o modal usa a classe de tamanho grande.
- **vitest (professor):** as letras das alternativas na `JanelaPreviaItem` têm o círculo com borda.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173), **sem modo demo**, em 1366px, 1920px e 390px:

- **Aluno:** abrir a "Revisão detalhada" de um quiz e de uma avaliação já feitos.
  - A janela fica do tamanho da do professor, com as questões à esquerda e uma questão por vez à direita.
  - As letras ficam em círculos com borda; a correta em verde; a escolhida errada em vermelho com "Sua resposta" na mesma linha.
  - O texto de apoio, o enunciado e as alternativas ficam com a hierarquia do professor.
  - Numa questão com imagem, a imagem aparece.
- **Professor:** a janela do quiz mostra as letras com borda, no mesmo padrão.
- `dotnet test`, `npm run lint` e `npm test` sem erros novos.
