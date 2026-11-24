# Prompt — Bug: aviso colado nos cartões do Dashboard do aluno (web)

## Contexto

Projeto CodeRyse Academy, frontend web (`frontend/`, React + Vite).

**Relato do usuário (print):** no Dashboard do ALUNO sem matrícula aprovada ("Olá, Maria"), a caixa "Assim que sua primeira matricula for aprovada, seu painel ganha vida por aqui." fica encostada embaixo dos 4 cartões (Cursos em andamento, Conteúdos concluídos, Módulos concluídos, Progresso geral). O usuário pediu para ajustar o espaçamento.

## O que o agente de arquitetura já verificou (não repetir)

- Tela: `frontend/src/pages/workspace/DashboardAluno.jsx`.
  - As seções "Meus cursos ativos" (≈ linha 169) e "Resumo de atividades" (≈ linha 200) separam-se com `style={{ marginTop: "var(--espaco-xl)" }}`.
  - O aviso (≈ linhas 225–227) é um `<EmptyState>` solto depois da seção dos cartões, **sem margem nenhuma**. Por isso encosta.
- `EmptyState` (`components/Primitives.jsx` ≈ linha 22) renderiza `.empty-state` (`styles/workspace.css` ≈ linha 1677), que não tem margem e é usado em várias telas.
- A tela real logada **não** foi conferida, porque o navegador estava na tela de login.

## Tarefa

1. Dar ao aviso o mesmo espaço que as seções do Dashboard têm entre si (`var(--espaco-xl)`), sem mexer no `.empty-state` global. Por exemplo, envolver o aviso num contêiner com essa margem de cima, seguindo o padrão das seções vizinhas.
2. Não mudar o texto nem a condição de quando o aviso aparece.

**Observação para o usuário, não implementar:** nesse estado, a tela mostra duas mensagens com o mesmo sentido: "Nenhuma matricula aprovada ainda…", em Meus cursos ativos, e este aviso. Se ele quiser, isso vira um pedido à parte.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo, com um aluno sem matrícula aprovada:

- Entre os cartões e o aviso há o mesmo espaço que entre "Meus cursos ativos" e os cartões.
- Mesmo resultado em largura de celular (≈ 400px), com os cartões empilhados.
- Outras telas que usam `EmptyState` sem mudança.
- `npm run lint` e `npm test` sem erros novos.
