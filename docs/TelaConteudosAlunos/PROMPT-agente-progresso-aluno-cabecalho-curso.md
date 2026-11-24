# Prompt: Progresso do aluno (detalhe do curso) — trocar título + 4 KPIs pelo cabeçalho do curso com métricas (frontend web, só visual)

## Pedido do usuário (2026-11-24)

Aplicar na tela de **Progresso do aluno**, no detalhe de um curso, o **mesmo cabeçalho do curso com métricas** da tela do módulo do coordenador. O usuário achou esse cabeçalho "excelente" em 23/11:
- cartão médio;
- rótulo "CURSO", título grande e descrição;
- barra de progresso com legenda;
- KPIs compactos à direita.

Esse cabeçalho entra **no lugar** do título e dos 4 cartões de KPI de hoje.

**Hoje** (print do aluno em "Desenvolvimento Web Full Stack"):
- título "Desenvolvimento Web Full Stack" com o subtítulo **"Turma online - Desenvolvimento Web Full Stack"**. A interface não deve mostrar turma (regra do projeto);
- 4 cartões grandes: Progresso 100%, Módulos concluídos 2/2, Conteúdos concluídos 4/4 e Nota final 0,5.

## Onde está (verificado pelo agente de arquitetura)

- `frontend/src/pages/workspace/SecoesAluno.jsx` ≈ linhas 395–410: `<header className="atividades-curso__cabecalho">` com `detalhe.curso` e `detalhe.turma`, e a `grade-estatisticas` com 4 `CartaoEstatistica`.
- **Componente pronto:** `frontend/src/components/CartaoCursoModulo.jsx`, `variante="medio"`, com as props `kpis` (lista de `{ id, icone, valor, rotulo }`), `legendaProgresso`, `percentual`, `selo` e `seloVariante`. É o mesmo da tela do módulo do coordenador.
- **Selo:**
  - aplicar **depois** de `PROMPT-agente-tela-modulo-redundancias-e-icones.md`, que corrige o selo da variante média com `kpis` (com KPIs, o selo vai para a linha da barra);
  - se aplicado antes, conferir que o selo aparece **uma vez**.

## Tarefa

1. **Substituir** o `<header>` (título + subtítulo da turma) e a `grade-estatisticas` dos 4 KPIs por **um** `CartaoCursoModulo` com `variante="medio"`:
   - **`curso`:** o objeto do curso (título, descrição e imagem), buscado em `cursoPorId` pelo `cursoId` da matrícula. Hoje `detalhe.curso` é só o título;
   - **`percentual`:** o progresso do aluno (o mesmo `percentual` de hoje);
   - **`legendaProgresso`:** "{N}% do curso concluído";
   - **`kpis`** (3, nesta ordem, com os ícones de hoje):
     - "Módulos concluídos" → `{modulosConcluidos}/{modulosComConteudo.length}`;
     - "Conteúdos concluídos" → `{conteudosConcluidos}/{totalConteudos}`;
     - "Nota final" → `formatGrade(detalhe.notaFinal)`. Mostrar "—" quando o curso não tem avaliação formal (nota 0 sem avaliação), em vez de "0,0";
   - **`selo`**, a mesma regra da trilha do aluno:
     - "🏆 Certificado emitido" (dourado) quando `certificadoEmitidoEm` está preenchido (o campo já vem no `MatriculaResponseDto` desde `9de13eb`);
     - senão "Concluído" com 100%;
     - senão "Curso em andamento".
2. **Remover** o subtítulo com o nome da turma ("Turma online - …"). **Não** substituir por outro texto de turma: a descrição do curso já aparece no cartão.
3. **Manter** o "← Voltar" (Progresso), os módulos em acordeão logo abaixo e o cartão "Certificado de conclusão" do fim, sem mudança neste prompt.
4. **Responsivo:** até 1200px os KPIs descem para dentro do cartão, e no celular quebram sem esticar. É o comportamento que o componente já tem.

**Não alterar:**
- os cálculos (percentual, módulos, conteúdos, nota);
- o acordeão dos módulos;
- o cartão de certificado;
- a tela de lista do Progresso;
- as telas do professor e do coordenador.

## Testes (vitest)

- O detalhe do Progresso do aluno renderiza `CartaoCursoModulo` médio, com 3 KPIs (valores certos) e a legenda da barra.
- Não existe mais a `grade-estatisticas` nem o texto da turma nessa tela.
- Selo: "Certificado emitido" com `certificadoEmitidoEm`; "Concluído" com 100% sem certificado; "Curso em andamento" abaixo de 100%.
- Nota "—" sem avaliação formal.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173), **sem modo demo**, logado como Aluno Demo, em Progresso › Desenvolvimento Web Full Stack, em 1366px e 390px:

- **Cabeçalho:** o topo mostra o cartão do curso igual ao do coordenador:
  - "CURSO", título, descrição, barra com "100% do curso concluído";
  - os KPIs "2/2 Módulos concluídos", "4/4 Conteúdos concluídos" e "0,5 Nota final" à direita;
  - o selo "🏆 Certificado emitido" (o Aluno Demo tem certificado desde 28/08).
- **Turma:** não aparece "Turma online" em lugar nenhum dessa tela.
- **Resto da tela:** os módulos e o cartão de certificado continuam como estavam.
- `npm run lint` e `npm test` sem erros novos.
