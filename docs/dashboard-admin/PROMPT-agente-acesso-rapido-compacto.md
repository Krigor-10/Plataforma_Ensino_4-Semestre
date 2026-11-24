# Prompt: Dashboard do Admin — "Acesso rápido" compacto (frontend web, só visual)

## Pedido do usuário (2026-11-24, print do Panorama de Admin)

O bloco **"Acesso rápido"** ocupa muito espaço vertical. São 4 botões grandes (Cursos, Matrículas, Alunos e Professores) numa grade de 3 colunas, com o ícone em cima e o texto embaixo. O 4º cai sozinho numa segunda linha, deixando um vão. O usuário quer o bloco **mais compacto** e pediu **só o prompt**, sem imagem.

## Onde está (verificado pelo agente de arquitetura)

- **Markup:** `frontend/src/pages/workspace/DashboardAdmin.jsx` ≈ linhas 166–186: `<section className="painel-secao">` com o cabeçalho "Acesso rapido" e `<ul className="grade-acesso-rapido">`, com um `<button className="botao-acesso-rapido">` por item de `ACESSO_RAPIDO`.
- **CSS:** `frontend/src/styles/workspace.css`:
  - ≈ linha 3151: `.grade-acesso-rapido` com `repeat(3, 1fr)`;
  - ≈ linha 3158: `.botao-acesso-rapido` em `flex-direction: column` e `padding: var(--espaco-md) var(--espaco-sm)`;
  - ajustes em ≈ linhas 3209 e 3221 (até 480px: 2 colunas).
  - **Essas classes só são usadas no Dashboard do Admin.**
- **Nome:** o atalho mostra **"Matrículas"**, mas para o Admin essa tela se chama **"Inscrições"** (menu e caminho, desde `ca9cf05`).

## Tarefa

1. **Sem o cartão do bloco:** tirar o `painel-secao` com cabeçalho e moldura do "Acesso rápido". No lugar, um título pequeno de seção, "Acesso rápido" (0.78rem, maiúsculas, espaçado, `--cor-texto-suave`), com os botões logo abaixo, sem caixa em volta. A margem superior passa a ser `--espaco-lg`, não `--espaco-xl`.
2. **Botões em linha, todos numa fileira:**
   - `.grade-acesso-rapido` vira `display: flex; flex-wrap: wrap; gap: var(--espaco-sm)`, ou uma grade de **4 colunas iguais** (`repeat(4, minmax(0, 1fr))`), para os 4 caberem **numa linha só** a partir de 1024px. Sem vão sobrando;
   - `.botao-acesso-rapido` em **linha**: `flex-direction: row`, ícone à **esquerda** do texto, `gap: 0.5rem` e conteúdo alinhado à esquerda;
   - **altura ≈ 44px**: `padding: 0.6rem 0.9rem`, `min-height: 44px` (área de toque);
   - ícone de 18px na cor da marca (`--cor-marca-clara`), texto 0.86rem, peso 600;
   - **à direita**, uma seta `›` discreta (`--cor-texto-mudo`), que no hover anda 2px e fica roxa;
   - fundo e borda do padrão de cartão do app (`--cor-fundo-elevado`, borda `--borda-card-modulo` e o `--relevo-card-*` que já existe);
   - hover com borda `--cor-marca-clara`, e foco visível por teclado.
3. **Responsivo:**
   - de 768px a 1023px, 2 colunas (2 linhas de 2);
   - abaixo de 768px, 2 colunas;
   - abaixo de 400px, 1 coluna.
4. **Nome:** o rótulo do atalho de matrículas passa a ser **"Inscrições"**, com o `aria-label` "Ir para Inscrições". A seção de destino continua a mesma (`matriculas`).
5. **Acentos** nos textos visíveis do bloco: "Acesso rápido" e "Inscrições".

**Não alterar:**
- os itens e o destino de cada atalho (`ACESSO_RAPIDO`, `onMudarSecao`);
- os KPIs do topo;
- os gráficos de baixo;
- os dashboards do Coordenador, do Professor e do Aluno.

## Testes (vitest)

- O Dashboard do Admin mostra os 4 atalhos (Cursos, Inscrições, Alunos e Professores), e cada clique chama `onMudarSecao` com a seção certa.
- O atalho de matrículas tem o rótulo "Inscrições".
- O bloco não usa mais `painel-secao`; o título "Acesso rápido" continua presente (`aria-labelledby`).

## Critérios de aceite

Verificar no app real (127.0.0.1:5173), **sem modo demo**, logado como **Admin**:

- **1920px e 1366px:** os 4 atalhos ficam **numa linha só**, cada um com ≈ 44px de altura, ícone à esquerda, texto e "›" à direita, sem a moldura grande do bloco. O bloco ocupa ≈ 80px de altura no total, com o título; hoje são ≈ 250px.
- **≈ 900px:** 2 linhas de 2.
- **≈ 390px:** 2 colunas (1 abaixo de 400px), sem rolagem lateral.
- **Clique:** cada atalho continua indo para a tela certa, e "Inscrições" abre a tela Inscrições.
- `npm run lint` e `npm test` sem erros novos.
