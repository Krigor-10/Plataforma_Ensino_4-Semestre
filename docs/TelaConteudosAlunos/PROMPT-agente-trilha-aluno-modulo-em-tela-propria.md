# Prompt: trilha do aluno no mesmo fluxo do professor — curso › módulos em cartões › tela do módulo (frontend web + 1 campo no backend)

> **Pré-requisito (decidido em 23/11):** aplicar **antes** `docs/TelaConteudosProfessor/PROMPT-agente-tela-modulo-hierarquia-curso-kpis.md`. Ele cria a variante **média** do `CartaoCursoModulo` e o cabeçalho **discreto** do módulo no `PainelItensModulo`. Este prompt deve **usar esses dois como estão**, sem criar outra versão. Onde o texto abaixo diz "linha compacta" para o curso na tela do módulo, entenda **a variante média** do pré-requisito.

## Contexto e decisões do usuário (2026-11-23)

O commit `06a077d` ("Trilha do aluno: estilo lista+janela") já deu ao aluno duas coisas:
- o **cartão do curso** (`CartaoCursoModulo`);
- a **janela grande** (`JanelaPreviaItem`) ao abrir um conteúdo.

Os módulos continuam em **acordeão numa página só**. O usuário pediu que a tela de conteúdos do aluno fique **igual à do professor** e aprovou a imagem `docs/TelaConteudosAlunos/aluno-modulos-igual-professor.png`.

**Decisões (uma por vez):**
1. **O mesmo fluxo do professor:** tela do **curso**, com os **módulos em cartões**, e clique abre a **tela do módulo**, com os itens nas **mesmas linhas** do professor, mas com o ponto de vista do aluno.
2. **Botão "▶ Continuar: {próximo item}"** no cartão do curso, que abre direto o próximo item liberado e não concluído.
3. **Selo "🏆 Certificado emitido"** no cartão do curso quando o certificado já foi **emitido de fato** (`CertificadoEmitidoEm`), no lugar de "Concluído".

**Vale o que foi decidido para o professor em 19/11:** na tela do módulo **não** há coluna de módulos, seletor nem "Módulo anterior/Próximo". **Só "← Voltar"**, e o curso aparece numa **linha compacta** (`PROMPT-agente-tela-modulo-correcoes-1.md`, itens 7 e 8, aplicados em `f1fad9a`).

**Não mudar** (decisões antigas e o que o `06a077d` manteve):
- o **aviso de avaliação liberada** (`AvisoAvaliacaoLiberada`) e o texto dele;
- o **bloqueio por ordem** de módulos e itens (o seguinte só libera quando o anterior termina);
- **marcar como concluído ao abrir** o conteúdo;
- o **fluxo do quiz**: "Iniciar quiz" e "Ver revisão" continuam abrindo a execução e a revisão de hoje, fora da janela grande;
- as regras de progresso;
- o app mobile, que fica fora deste prompt.

**Este prompt substitui** `docs/TelaConteudosAlunos/PROMPT-agente-padronizar-conteudos-aluno.md` (06/11), que não deve ser aplicado.

## Onde está (verificado pelo agente de arquitetura)

- **Tela do aluno:** `frontend/src/pages/workspace/SecoesAluno.jsx`, `SlideConteudosCurso` (≈ linha 1924).
  - Acordeão de módulos (`modulosAbertos`) e lógica de desbloqueio (≈ linha 1978).
  - `CartaoCursoModulo` (≈ linha 1989).
  - `AvisoAvaliacaoLiberada` (≈ linha 1992).
  - `JanelaPreviaItem` (≈ linha 2282).
- **Componentes do professor para reaproveitar:**
  - `components/CartaoCursoModulo.jsx`, com a variante compacta da tela do módulo, de `f1fad9a`;
  - `components/PainelItensModulo.jsx` (as linhas dos itens);
  - `components/JanelaPreviaItem.jsx`.
  - Os cartões de módulo da tela do curso do professor e do coordenador servem de referência visual para os cartões do aluno.
- **Rota:** `WorkspaceScreen.jsx` ≈ linha 150 já aceita `/app/conteudos/:id/modulos/:moduloId` para a seção `conteudos`. O aluno usa a mesma seção, então **não precisa de rota nova**. Conferir só que o aluno não é redirecionado para fora dela.
- **Certificado:** `MatriculaResponseDto` **não** tem `CertificadoEmitidoEm`, mas a entidade `Matricula` tem.

## Tarefa

### Backend (mínimo)

1. Acrescentar **`CertificadoEmitidoEm`** (data ou null) em `DTOs/MatriculaResponseDto.cs` e preenchê-lo onde o DTO é montado. O troféu de Meus Cursos (achado da auditoria de 18/11) também vai usar esse campo depois. Teste do mapeamento.

### Frontend web — tela do curso (`/app/conteudos/:cursoId`)

2. **Cartão do curso** (`CartaoCursoModulo`, versão grande):
   - progresso do aluno;
   - **selo:**
     - **"🏆 Certificado emitido"** (dourado, clicável, leva à tela de Certificados) quando `certificadoEmitidoEm` está preenchido;
     - senão **"Concluído"** com 100%;
     - senão **"Curso em andamento"**.
   - Botão **"▶ Continuar: {título do próximo item}"**, que abre a tela do módulo desse item **com a janela já aberta nele**.
     - O próximo item é o primeiro liberado e não concluído, na ordem da trilha. Pode ser um quiz: nesse caso abre a tela do módulo com a linha do quiz em destaque, sem abrir a janela.
     - O botão **some** quando tudo está concluído.
3. **Aviso de avaliação liberada:** igual a hoje, logo abaixo do cartão.
4. **"Módulos do curso" em cartões** (grade de 2 colunas a partir de 1024px; 1 coluna abaixo), no lugar do acordeão. Cada cartão tem:
   - número (quadrado), título e "N de M concluídos", e uma mini barra;
   - **✓ verde** quando o módulo está 100%;
   - o módulo **em andamento** (o primeiro não concluído e liberado) fica destacado em roxo;
   - módulos **bloqueados** (a mesma regra de hoje) com cadeado no lugar do número, opacidade reduzida e "Conclua o módulo NN para liberar". **Não são clicáveis** (`aria-disabled`, tooltip com a mesma frase);
   - fundos sólidos e "relevo duplo", os mesmos tokens das telas do professor;
   - todos os cartões com a **mesma altura** e o título com no máximo 2 linhas;
   - clicar abre `/app/conteudos/:cursoId/modulos/:moduloId`.

### Frontend web — tela do módulo (`/app/conteudos/:cursoId/modulos/:moduloId`)

5. **Topo:** "← Voltar" (volta para a tela do curso), o caminho "Meus cursos › {curso} › {módulo}" e o **curso numa linha compacta** (a mesma variante do professor: ícone pequeno, nome, barra fina, % e o selo do item 2).
6. **Painel do módulo:** ícone redondo, título, "N conteúdos · N quizzes" e, à direita, uma mini barra com "N de M concluídos".
7. **Itens nas mesmas linhas do professor** (`PainelItensModulo` com um modo `aluno`, **sem** ⋮ e **sem** "Selecionar"):
   - ícone por tipo, título, descrição e selo do tipo à direita, como no professor;
   - **linha de dados com o status do aluno**, com ícone e texto lado a lado: "✓ Concluído" (verde), "● Em andamento" (azul, se houver esse estado), "▶ Não iniciado" (neutro) ou "🔒 Bloqueado · {motivo}" (neutro);
   - **material:** clicar na linha abre a `JanelaPreviaItem`, que já existe, e marca como concluído **ao abrir**, como hoje. À direita, "Abrir ›";
   - **quiz:** à direita, o botão da ação de hoje: "Iniciar quiz", "Continuar" ou "Ver revisão". O botão chama **os mesmos handlers** de hoje (`onIniciarQuiz`, `onAbrirRevisao`). Clicar no resto da linha faz o mesmo que o botão;
   - **bloqueado:** a linha fica com opacidade reduzida, ícone de cadeado e não clicável;
   - a ordem e o quiz do conteúdo ficam logo abaixo do conteúdo dele, como no professor.
8. **Na janela grande** (aluno): "Anterior / Próximo" percorre **só os materiais liberados** do módulo, sem pular para um item bloqueado. O "Próximo" pode levar a um quiz: nesse caso fecha a janela e destaca a linha do quiz. Sem ⋮, sem "Mostrar gabarito" e sem "Somente leitura".
9. **Sem coluna de módulos, sem seletor e sem "Módulo anterior/Próximo"** na tela do módulo, como no professor.

### Responsivo e limpeza

10. **Abaixo de 768px:** os cartões de módulo ficam em 1 coluna; as linhas, compactas; a janela, em tela cheia. Sem rolagem lateral.
11. Remover o acordeão do aluno (`modulosAbertos` e o CSS que deixar de ser usado), **sem** remover a lógica de desbloqueio. Ela passa a alimentar os cartões e as linhas.

### Testes (vitest)

- **Tela do curso:**
  - módulos em cartões, com estados concluído (✓), em andamento (roxo) e bloqueado (cadeado, não clicável);
  - selo "Certificado emitido" só com `certificadoEmitidoEm`;
  - o botão "Continuar" aponta para o próximo item certo e some com 100%;
  - o aviso de avaliação continua aparecendo.
- **Tela do módulo:**
  - linhas com o status do aluno;
  - material abre a janela e marca concluído;
  - quiz chama `onIniciarQuiz` / `onAbrirRevisao`;
  - item bloqueado não abre;
  - "← Voltar" leva ao curso;
  - não há coluna, seletor nem anterior/próximo de módulo.
- Adaptar os testes de `SecoesAluno.test.jsx` que dependem do acordeão, **sem perder cobertura** do desbloqueio e do quiz.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), **sem modo demo**, logado como aluno, em 1366px, 1920px e 390px, comparando com `aluno-modulos-igual-professor.png`:

- **Tela do curso**, em Conteúdos › Desenvolvimento Web Full Stack:
  - cartão com o progresso;
  - selo "🏆 Certificado emitido" se o aluno tem certificado (ex.: Aluno Demo, matrícula 1, emitido em 28/08); senão "Concluído" ou "Em andamento";
  - "Continuar" quando há item pendente;
  - o aviso de avaliação igual a hoje;
  - módulos em cartões com ✓ e cadeado.
- **Tela do módulo** (clicar num módulo liberado):
  - "← Voltar", o curso em linha compacta e os itens nas linhas do professor com o status do aluno;
  - o material abre a janela e fica "✓ Concluído";
  - o quiz abre a execução de hoje;
  - um item bloqueado não abre.
- **Professor e coordenador:** as telas continuam iguais.
- `dotnet test`, `npm run lint` e `npm test` sem erros novos.
