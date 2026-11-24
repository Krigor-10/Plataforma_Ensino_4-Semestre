# Prompt — Mesmo padrão de métricas nas Avaliações do Aluno e na aba Avaliações do curso (Admin/Coordenador, web)

## Contexto

Projeto CodeRyse Academy, frontend web (`frontend/`, React + Vite).

O card de avaliação do Professor acabou de ganhar métricas centralizadas, com ícone + rótulo em cima do valor e divisórias (`PROMPT-agente-metricas-avaliacoes-professor.md`). **Essa mudança está no working tree, ainda sem commit**, em `SecaoAvaliacoesProfessor.jsx` e `styles/workspace.css`. Partir dela.

**Pedidos do usuário:**
1. Aplicar o mesmo estilo no card de avaliação do **Aluno** (Acadêmico › Avaliações).
2. Na tela do curso do **Admin** (Cursos › curso › aba "Avaliações do curso"), trocar a lista plana pelo mesmo padrão das telas do aluno e do professor: card em relevo, que abre ao clicar, com os detalhes nesse formato de métricas. A tela é a mesma do Coordenador, então ele também ganha.

**Decisão do usuário (Admin/Coordenador):** mostrar só os valores que **já vêm** do backend: Participantes, Nota média, Nota máxima, Conclusão e Aproveitamento. **Sem mudar o backend.**

Imagens nesta pasta: `avaliacoes-aluno-metricas-proposta.png` e `avaliacoes-curso-gestao-proposta.png`.

## O que o agente de arquitetura já verificou (não repetir)

**Estilo de métricas (Professor, working tree):**
- CSS em `workspace.css`, escopado em `.tela-avaliacoes-professor .lista-detalhes--inline`:
  - colunas `repeat(auto-fit, minmax(0, 1fr))`, item centralizado, divisória `border-left` a partir do 2º;
  - `dt` em flex com ícone em `--cor-marca-clara`, `dd` em fonte display de 1.15rem;
  - 2 colunas em ≤ 480px.
- O corpo usa `className="conteudos-modulo__corpo"` no `motion.div`.

**Aluno:** `pages/workspace/SecoesAluno.jsx` ≈ linhas 1395–1490.
- O card já é `conteudos-modulo--cartao` e o corpo já tem `conteudos-modulo__corpo`.
- `<dl className="conteudos-modulo__lista lista-detalhes lista-detalhes--inline">` com:
  - "Status" (`StatusPill` com `statusLabel`/`statusTone`);
  - "Questoes";
  - "Tentativas" (`realizadas/permitidas`);
  - "Tipo / Quiz - formativo, sem nota" (quiz) **ou** "Ultima nota" (se `temNota`) / "Nota maxima".
- Embaixo, em `.atividades-curso__acoes-aluno`: botão "Iniciar/Continuar avaliacao" ou `.cartao-avaliacao__bloqueado-info` com `disponibilidade.mensagem`.

**Admin/Coordenador:** `pages/workspace/PainelCursoGestao.jsx`.
- A aba "Avaliações do curso" (≈ linhas 405–423) é um `<ul className="atividades-curso__lista">` plano: ícone de troféu, título, tipo e `"N participante(s) · Media X"`.
- `avaliacoesDoCurso` (≈ linha 147) vem de `desempenho` (`GET /Cursos/{id}/desempenho`): `avaliacoesSemModulo` + as avaliações não-quiz dos módulos.
- Cada item é `AvaliacaoDesempenhoResponseDto` (`DTOs/TurmaDesempenhoResponseDto.cs` ≈ linha 30): `avaliacaoId`, `titulo`, `tipoAvaliacao`, `statusPublicacao`, `totalParticipantes`, `mediaNota`, `notaMaxima`, `percentualConclusao`, `percentualAproveitamento`. **Não tem** questões, tentativas nem tempo limite (`GET /Avaliacoes` é só para Professor), por isso a decisão acima.
- A mesma tela já tem o padrão de card que abre ao clicar na aba Módulos (≈ linhas 302–395): `conteudos-modulo conteudos-modulo--cartao`, `AnimatePresence`, chevron e `moduloAbertoId`.

**Ícones** (todos já usados no projeto):

| Item | Ícone | Onde já é usado |
|---|---|---|
| Questões | `TbHelpCircle` | modal do aluno / Professor |
| Tentativas | `TbRepeat` | modal do aluno / Professor |
| Nota máxima | `TbTarget` | modal do aluno / Professor |
| Nota média, Última nota | `TbAward` | "Media" no Coordenador / Professor |
| Tipo (quiz) | `TbTrophy` | — |
| Participantes | `TbUsers` | KPI "Alunos" da tela do curso |
| Conclusão | `TbCircleCheck` | — |
| Aproveitamento | `TbChartBar` | KPI "Progresso" |
| Status | `TbLock` quando bloqueada, `TbCircleCheck` nos outros estados | — |

A tela real logada **não** foi conferida, porque o navegador estava na tela de login.

## Tarefa

1. **Estilo compartilhado:** transformar o CSS do Professor num modificador reaproveitável, por exemplo `.lista-detalhes--metricas`, usado junto com `.lista-detalhes--inline`.
   - Aplicar o modificador nas três telas. A do Professor não pode mudar visualmente.
   - Não alterar `.lista-detalhes` / `.lista-detalhes--inline` nas telas que não usam o modificador (Progresso do professor, detalhe do módulo no Coordenador etc.).
2. **Aluno:**
   - aplicar o modificador e os ícones na `<dl>`;
   - corrigir os acentos dos rótulos ("Questões", "Última nota", "Nota máxima");
   - o `StatusPill` fica centralizado na coluna Status;
   - a área de ação embaixo (botão ou mensagem de bloqueio) fica centralizada, separada das métricas por uma divisória fina, como na imagem.
3. **Admin/Coordenador — aba Avaliações do curso:**
   - trocar a lista por cards `conteudos-modulo conteudos-modulo--cartao` dentro de `.atividades-curso__lista-modulos`, com estado de aberto próprio (um aberto por vez, como os módulos);
   - cabeçalho: caixa com troféu (como no aluno), "Avaliação NN", título e, à direita, "<tipo> · N participante(s)", mais o chevron;
   - corpo aberto (`conteudos-modulo__corpo`) com as métricas: Participantes, Nota média (`formatGrade`), Nota máxima, Conclusão e Aproveitamento (`formatPercent`). Se vier um quiz nessa lista, trocar Nota média e Nota máxima por "Tipo / Quiz - formativo, sem nota";
   - sem ações novas: nada de editar ou excluir aqui.
4. **Não alterar** a aba Módulos, os KPIs do topo, o backend, nem o fluxo de iniciar avaliação do aluno.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo, comparando com as imagens:

- **Aluno:** card aberto com 4 métricas centralizadas e com ícone (Status com cadeado quando bloqueada) e a mensagem ou botão centralizado embaixo. Disponível, bloqueada, com nota e quiz aparecem certos.
- **Admin e Coordenador:** a aba Avaliações do curso mostra cards em relevo fechados. Ao clicar, abre com as 5 métricas. Só um aberto por vez, e a contagem da aba continua.
- **Professor:** igual ao estado atual do working tree.
- Em ≈ 400px, 2 colunas nas três telas.
- Progresso do professor e o detalhe do módulo no Coordenador sem mudança.
- Testes (vitest): abrir e fechar o card na aba Avaliações do curso e renderizar as métricas do aluno. `npm run lint` e `npm test` sem erros novos.
