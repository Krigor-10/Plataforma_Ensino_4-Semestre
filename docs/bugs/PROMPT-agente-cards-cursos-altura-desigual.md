# Prompt: cards da grade de Cursos com alturas diferentes (só frontend web, só CSS)

## Problema relatado pelo usuário (print de 2026-11-15)

Na tela **Cursos do Admin** (aba "Em andamento", filtro Modelo: Acompanhado), dois cards na mesma linha ficam com **alturas diferentes**:
- "Redes de Computadores (Teste …", à esquerda, fica mais alto;
- "Redes e Infraestrutura", ao lado, fica mais baixo, com o rodapé (código + "Media -") mais acima.

A linha de baixo dos cards fica desalinhada.

## Causa (verificada pelo agente de arquitetura no código, não repetir a investigação)

São duas coisas somadas:

1. **O card não preenche a altura da linha da grade.**
   - `.catalogo-grade` (`styles/workspace.css` ≈ linha 7576) é `display: grid`. O `<li>` estica até a altura da linha, mas o `<button class="catalogo-card">` dentro dele (`SecaoCursos.jsx` ≈ linha 977) tem só `width: 100%` (`.catalogo-card--acionavel`, ≈ linha 5275) e fica com a altura do próprio conteúdo.
   - Por isso, o `margin-top: auto` do `.catalogo-card__rodape-aluno` não empurra o rodapé até o fim da linha.
2. **O selo "Sem coordenador" quebra em 2 linhas quando o título é longo.**
   - `.meus-cursos__titulo-linha` (≈ linha 7652) é flex; o título tem `nowrap` + reticências, mas o selo (`.insignia`, `componentes.css` ≈ linha 268) não tem `white-space: nowrap` nem `flex-shrink: 0`.
   - Com título longo, o selo encolhe e vira 2 linhas, e só aquele card fica mais alto.

## Tarefa

1. **Card com a altura da linha**, em todas as grades que usam `.catalogo-grade` + `.catalogo-card`:
   - o `<li>` da grade vira coluna flex, por exemplo `.catalogo-grade > li { display: flex; flex-direction: column; }`;
   - o card que está dentro dele cresce (`flex: 1`). Assim, cards da mesma linha ficam com a mesma altura e o rodapé de todos fica alinhado embaixo (o `margin-top: auto` do rodapé já existe).
   - Atenção ao `<li>` com o botão "Preparar para venda" embaixo do card (aba Encerrados, Gratuito, `SecaoCursos.jsx` ≈ linha 1039): o botão continua embaixo do card, dentro do mesmo `<li>`, e a borda de baixo dos `<li>` da linha fica alinhada.
   - Em `SecaoMatriculas.jsx` ≈ linha 63, o próprio `<li>` é o `.catalogo-card`. A regra nova não pode quebrar esse caso: ele já estica por ser item da grade. Conferir.
2. **Selo sem quebra de linha no topo do card:**
   - dentro de `.meus-cursos__titulo-linha`, o selo não encolhe (`flex-shrink: 0`; `white-space: nowrap` na `.insignia`);
   - o título fica com `min-width: 0` e `flex: 1`, para as reticências entrarem no título e não no selo.
   - O título completo continua acessível: colocar `title={curso.titulo}` no `<strong>`, se ainda não houver.

**Não alterar:**
- textos, dados, filtros, abas e ordem dos cards;
- o tamanho da imagem (16:9) e o relevo do Coordenador (`.catalogo-grade--relevo`);
- o hover (levantar + sombra).

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), **sem modo demo**.

**Admin, Cursos, Em andamento, Modelo: Acompanhado:**
- os dois cards ficam com a mesma altura;
- o selo "Sem coordenador" fica numa linha só;
- o título longo termina em "…";
- o rodapé (código + Média) fica alinhado entre os cards.

**Outras grades:** conferir que continuam certas e com alturas iguais por linha:
- Admin nas outras abas, inclusive Encerrados, com "Preparar para venda";
- Coordenador;
- Professor (`GradeCursosProfessor`);
- Aluno: Meus cursos, Catálogo e Cursos ativos.

**Larguras:** em ≈ 390px, um card por linha, sem rolagem horizontal; em 1366px e 1920px, alturas iguais por linha.

`npm run lint` e `npm test` sem erros novos.
