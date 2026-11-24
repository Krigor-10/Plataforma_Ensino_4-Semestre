# Prompt — Ajuste: indicadores de status ao lado das abas (Professores e Coordenadores, web)

## Contexto

Projeto CodeRyse Academy, frontend web (`frontend/`, React + Vite).

**Pedido do usuário (print da tela Professores):** os indicadores "N cadastrado(s) · N ativo(s) · N inativo(s)", que hoje ficam embaixo do título "Professores", devem ir para o lado direito da barra de abas "Ativos / Inativos", na mesma linha e logo depois dela.

## O que o agente de arquitetura já verificou (não repetir)

- `frontend/src/pages/workspace/SecaoProfessores.jsx`:
  - ≈ linhas 431–439: `<header className="cabecalho-pagina cabecalho-pagina--centralizado">`, com o título e, embaixo dele, `<div className="indicadores-status">` com as 3 `Insignia`;
  - ≈ linha 463: logo depois do header vem `<nav className="abas-matriculas" role="tablist">`.
- `frontend/src/pages/workspace/SecaoCoordenadores.jsx` (≈ linhas 312–343) tem **a mesma estrutura**. O prompt aplica a mudança nas duas telas, para não ficarem diferentes.
- `.indicadores-status` (`styles/componentes.css` ≈ linha 33) é flex com `gap` e `margin-top: var(--espaco-xs)`, e só é usada nessas duas telas.
- `.abas-matriculas` (`styles/layout.css` ≈ linha 1126) é `inline-flex` e tem a própria `margin-bottom: var(--espaco-lg)`. Ela também é usada no modal Meu perfil, no cadastro e na tela do curso, que não podem mudar.
- A tela real logada **não** foi conferida, porque o navegador estava na tela de login.

## Tarefa

1. Nas duas telas, tirar o `.indicadores-status` do header. O header fica com o título à esquerda e a busca + "Cadastrar …" à direita.
2. Envolver a `nav.abas-matriculas` e o `.indicadores-status` numa linha nova, por exemplo `.linha-abas-status`:
   - `display: flex`, `align-items: center`, `flex-wrap: wrap`, `gap: var(--espaco-md)`;
   - a margem de baixo fica nessa linha (`var(--espaco-lg)`), não mais na nav;
   - zerar a `margin-bottom` da nav e a `margin-top` dos indicadores só dentro dela, sem alterar `.abas-matriculas` nem `.indicadores-status` nas outras telas.
3. Os indicadores ficam logo à direita das abas, centralizados na altura delas, e não colados na borda direita da página.
4. Em tela estreita, os indicadores quebram para a linha de baixo das abas, alinhados à esquerda.
5. Manter os textos, as variantes das `Insignia` (cadastrados e inativos neutros, ativos sucesso) e a contagem dentro das abas.

**Não alterar** o modal Meu perfil, o cadastro, a tela do curso nem a lógica de filtros, busca e seleção. O prompt `PROMPT-agente-selecao-professores-sem-deslocar.md` mexe na linha do "Limpar filtros", logo abaixo. Se ele já tiver sido aplicado, não desfazer.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo, nas telas Professores e Coordenadores, como Coordenador e como Admin:

- Os indicadores aparecem na linha das abas, logo à direita delas e alinhados ao centro vertical.
- Embaixo do título não sobra espaço vazio, e o header continua alinhado com a busca.
- O espaço entre a linha das abas e o "Limpar filtros" é o mesmo de antes.
- Em ≈ 400px, os indicadores descem para baixo das abas sem cortar.
- Meu perfil, cadastro e abas da tela do curso sem mudança.
- `npm run lint` e `npm test` sem erros novos.
