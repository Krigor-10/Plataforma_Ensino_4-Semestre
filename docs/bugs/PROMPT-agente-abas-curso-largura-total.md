# Prompt — Bug: barra de abas da tela do curso ocupando a largura toda (Admin/Coordenador, web)

## Contexto

Projeto CodeRyse Academy, frontend web (`frontend/`, React + Vite).

**Relato do usuário (print, tela do curso do Admin, curso "Curso Teste Gratuito QA"):** a caixa das abas ("Modulos 0") se estende até a borda direita da página, com uma área vazia grande depois da aba. Nas outras telas (Professores, Coordenadores, Meu perfil), a caixa só tem o tamanho das abas. O usuário quer a mesma borda das outras.

## O que o agente de arquitetura já verificou (não repetir)

- `pages/workspace/PainelCursoGestao.jsx`: a raiz é `<div className="conteudos-aluno">` (≈ linha 231), e a `<nav className="abas-matriculas…">` (≈ linha 309) é **filha direta** dessa div.
- `.conteudos-aluno` (`styles/workspace.css` ≈ linha 3721) é `display: flex; flex-direction: column`. Num flex em coluna, os filhos esticam na largura (`align-items: stretch` padrão), então a nav, que é `inline-flex` em `.abas-matriculas` (`styles/layout.css` ≈ linha 1138), ocupa a linha inteira.
- Em Professores e Coordenadores, a nav fica dentro de `.linha-abas-status` (flex em linha), por isso tem o tamanho do conteúdo.
- A tela real logada **não** foi conferida, porque o navegador estava na tela de login. O print mostra o problema.

## Tarefa

1. Fazer a barra de abas ter o tamanho do próprio conteúdo quando estiver direto dentro de um container flex em coluna. Por exemplo, em `layout.css`, junto de `.abas-matriculas`, acrescentar `align-self: flex-start;`. Isso vale para qualquer container flex em coluna e não muda nada onde ela já fica numa linha ou num bloco.
2. Manter `max-width: 100%` e a rolagem horizontal das abas: em tela estreita, a caixa continua limitada à largura disponível, com o degradê só quando houver aba escondida.
3. Conferir as outras telas que usam `.abas-matriculas` (Professores, Coordenadores, modal Meu perfil, cadastro) e confirmar que nada mudou nelas.

**Não alterar** o visual das abas (cores, raio, espaçamento), a lógica das abas nem o restante da tela do curso.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo:

- Tela do curso (Admin e Coordenador), com só "Módulos" e com "Módulos" + "Avaliações do curso": a caixa das abas termina logo depois da última aba, como em Professores.
- Em ≈ 400px, as abas continuam rolando sem estourar a tela.
- Professores, Coordenadores, Meu perfil e cadastro sem mudança.
- `npm run lint` e `npm test` sem erros novos.
