# Prompt: trilha do módulo em ordem estrita + quiz vinculado recuado com seta (backend + web + celular)

## Pedido do usuário (2026-11-25, print da tela do Módulo 2, aluna "Maria")

"Eu abri o primeiro conteúdo e ele liberou o vídeo simultaneamente. Por quê?"

Na tela aparecem, nesta ordem:
1. **Conteúdo 1** (PDF), concluído;
2. **Quiz**, bloqueado;
3. **Conteúdo 2** (Vídeo), **liberado**.

O aluno não entende por que o item de baixo abriu antes do quiz do meio.

**Decisões do usuário (aprovou a imagem `docs/TelaConteudosAlunos/quiz-vinculado-recuo-ordem.png`):**
- **ordem estrita da tela:** o aluno segue a lista de cima para baixo, e a ordem que aparece é a ordem em que os itens liberam;
- **quiz vinculado a um conteúdo** aparece **recuado, com conector/seta "↳"**, e o texto "Quiz sobre {conteúdo}".

## Causa (verificada pelo agente de arquitetura)

São duas regras que não combinam:

- **Tela (web):** `frontend/src/pages/workspace/TelaModuloGestaoAluno.jsx` → `montarItensOrdenadosAluno` (≈ linhas 18–31):
  - `bloqueado = indice > 0 && !conteudos[indice-1].concluido`. **O conteúdo seguinte libera quando o conteúdo anterior é concluído**, sem olhar o quiz vinculado ao anterior;
  - o quiz vinculado **herda** o bloqueio do conteúdo-pai;
  - o quiz solto vai no fim com `bloqueado: false`;
  - depois, ≈ linha 216: `quizBloqueado = entrada.bloqueado || (!quizConcluido && !disponibilidadeQuiz.podeRealizar)`, e a disponibilidade vem do servidor.
- **Servidor:** `Services/AvaliacaoService.cs` → `AvaliacaoLiberadaPorProgresso` (≈ linha 1097):
  - **todo quiz com `ModuloId`** (vinculado ou não) só libera com `liberacao.ModulosComConteudoCompleto.Contains(moduloId)`, ou seja, **100% dos conteúdos do módulo**;
  - `LiberacaoAvaliacoesInfo(HashSet<int> ModulosComConteudoCompleto, bool CursoCompleto)` (`DTOs/LiberacaoAvaliacoesInfo.cs`) vem de `ProgressoAlunoService.ObterLiberacaoAvaliacoesAsync`;
  - o vínculo do quiz a um conteúdo é `Avaliacao.ConteudoDidaticoId`.
- **Celular:** `mobile/src/screens/aluno/ConteudosScreen.jsx` → `montarLinhasModulo` (≈ linhas 57–72) já marca o quiz vinculado com `recuado: true`, mas sem seta. O bloqueio segue a mesma lógica da web.
- **Lista visual:** `frontend/src/components/PainelItensModulo.jsx` (≈ linha 120 em diante) renderiza todas as linhas no mesmo nível. Ela é usada pelas telas do aluno (`TelaModuloGestaoAluno`), professor (`TelaModuloGestaoProfessor`, que já sabe o `conteudoVinculado`, ≈ linha 76) e coordenador/Admin (`TelaModuloGestao`).

## Regra nova

| Item | Libera quando |
|---|---|
| **1º conteúdo do módulo** | o módulo está liberado (regra de módulos, sem mudança) |
| **Quiz vinculado ao conteúdo X** | **o conteúdo X é concluído** |
| **Conteúdo seguinte a X** | X concluído **e** **todos os quizzes vinculados a X enviados** (concluídos) |
| **Quiz solto do módulo** (sem vínculo) | **todos os conteúdos do módulo** concluídos (como hoje). Fica no fim, sem recuo. |
| **Prova/exercício final do curso** | 100% do curso (sem mudança) |

- "Enviado" = a mesma condição que hoje a tela usa para quiz concluído (`quizConcluido`). O quiz não tem nota, então só precisa ser enviado.

## Tarefa

### 1. Backend: quiz vinculado libera com o conteúdo-pai

- `LiberacaoAvaliacoesInfo` ganha **`HashSet<int> ConteudosConcluidos`** (ids dos conteúdos concluídos pela matrícula), preenchido em `ProgressoAlunoService.ObterLiberacaoAvaliacoesAsync`. Esse dado já é lido ali para calcular `ModulosComConteudoCompleto`.
- **`AvaliacaoLiberadaPorProgresso`:**
  - `Quiz` **com `ConteudoDidaticoId`** → `liberacao.ConteudosConcluidos.Contains(ConteudoDidaticoId)`;
  - `Quiz` com `ModuloId` e **sem** `ConteudoDidaticoId` → como hoje (`ModulosComConteudoCompleto`);
  - prova/exercício sem módulo → como hoje (`CursoCompleto`).
- **Onde mais a regra é usada:** conferir todos os lugares que chamam `AvaliacaoLiberadaPorProgresso` ou `ObterLiberacaoAvaliacoesAsync` (lista de avaliações do aluno, validação ao **iniciar/enviar tentativa**, chatbot, se usar) e garantir que o quiz vinculado **pode ser iniciado** assim que o conteúdo-pai é concluído.
- **Sem migração.**

### 2. Web: bloqueio na ordem da lista

- **`montarItensOrdenadosAluno`:**
  - **conteúdo `i`** fica bloqueado se o conteúdo `i-1` não estiver concluído **ou** se algum quiz vinculado ao conteúdo `i-1` não estiver concluído. Com o módulo bloqueado, tudo fica bloqueado, como hoje;
  - **quiz vinculado** fica bloqueado se o seu conteúdo-pai **não** estiver concluído. **Não** herda o bloqueio do "anterior ao pai". Também respeita `obterDisponibilidadeAvaliacao` (vinda do servidor, agora alinhada);
  - **quiz solto:** como hoje.
- **Motivo do bloqueio na linha do conteúdo:**
  - se faltar o quiz → **"Responda o quiz acima para liberar"**;
  - se faltar o conteúdo anterior → o texto atual.
- **Próximo passo:** destacar o primeiro item liberado e ainda não concluído, como a tela já faz com o "destaque" (aro). Com isso, o quiz vinculado aparece destacado logo depois do conteúdo concluído.

### 3. Web: quiz vinculado recuado com seta (`PainelItensModulo`, nos 3 perfis)

- As linhas de quiz **vinculado** recebem uma marca, por exemplo `vinculadoA: { id, titulo }`, montada pelas três telas. O professor já tem `conteudoVinculado`; aluno e coordenador passam a montar igual.
- **Visual da linha vinculada:**
  - recuo à esquerda de cerca de **34px**;
  - **conector** em "L" (borda esquerda + inferior arredondada, 2px, `rgba(157,103,255,.55)`) saindo da altura do ícone do conteúdo de cima;
  - ícone um pouco menor (≈ 34px, contra 42–48px), mantendo a cor roxa de quiz;
  - na linha de dados, **"↳ Quiz sobre {título do conteúdo} · N questões"**, mais o status, como hoje.
- **Quiz solto:** sem recuo e sem conector.
- **Acessibilidade:** `aria-label` da linha: "Quiz sobre {conteúdo}: {título do quiz}". O conector é decorativo (`aria-hidden`).

### 4. Celular (`ConteudosScreen.jsx`)

- **Mesma regra de bloqueio** do item 2, com o mesmo texto de motivo.
- **Linha `recuado`:** acrescentar o conector em "L" (uma `View` com borda esquerda e inferior roxas) e o texto "↳ Quiz sobre {conteúdo}" na meta.

**Não alterar:**
- a regra de módulos (próximo módulo só depois do anterior);
- a prova/exercício final;
- o cálculo de progresso e o certificado;
- o quiz solto;
- o conteúdo do professor (só o visual do vínculo);
- abrir PDF continuar marcando o conteúdo como concluído.

## Testes

### xUnit (backend)

- **Quiz vinculado:** liberado quando o conteúdo-pai está concluído, mesmo com outros conteúdos do módulo pendentes; bloqueado quando o pai não está concluído.
- **Quiz solto:** continua exigindo todos os conteúdos do módulo.
- **Iniciar tentativa:** iniciar o quiz vinculado com o pai concluído passa; com o pai pendente, é recusado.
- **Prova final:** sem mudança (`CursoCompleto`).

### Vitest (web)

- **`montarItensOrdenadosAluno`:**
  - Conteúdo 1 concluído, quiz vinculado não enviado → **quiz liberado** e **Conteúdo 2 bloqueado**, com "Responda o quiz acima para liberar";
  - depois de enviar o quiz → Conteúdo 2 liberado.
- **`PainelItensModulo`:** a linha de quiz vinculado tem a classe de recuo, o conector e "Quiz sobre Conteúdo 1"; a de quiz solto não tem.
- Os testes atuais das três telas continuam passando, com os ajustes de texto.

### jest (celular)

- A mesma sequência de bloqueio. A linha recuada mostra "Quiz sobre {conteúdo}".

## Critérios de aceite

Verificar no app real, com uma aluna de teste no Módulo 2 do "Desenvolvimento Web" (Conteúdo 1 PDF → Quiz vinculado → Conteúdo 2 Vídeo):

1. **Abrir o PDF do Conteúdo 1:** ele fica concluído e o **Quiz** logo abaixo aparece **recuado, com a seta**, "Quiz sobre Conteúdo 1", **liberado e destacado**. O **Conteúdo 2** fica **bloqueado**, com "Responda o quiz acima para liberar".
2. **Responder e enviar o quiz:** o Conteúdo 2 libera.
3. **Outros perfis:** o mesmo recuo com seta na tela do professor e do coordenador/Admin, e no celular.
4. **Quiz solto:** um quiz sem vínculo continua no fim do módulo, sem recuo, liberando só com todos os conteúdos.
5. **Testes:** `dotnet test` e `npm test` (web e mobile) sem falhas novas.
