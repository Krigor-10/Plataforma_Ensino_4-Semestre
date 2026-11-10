# Prompt — Menu ⋮ das tabelas de Coordenadores e Professores sai cortado

## Problema (print do usuário, 10/11)

Admin → Gestão → **Coordenadores**: ao abrir o ⋮ de uma linha perto do fim da tela (ex.: "Coordenador Teste 05", a última), o menu abre **para baixo** e passa da borda da janela. Só aparece "Ver detalhes"; **Editar e Excluir ficam fora da tela**. O mesmo código existe em **Professores**.

## Causa

`SecaoCoordenadores.jsx` (~linha 166) e `SecaoProfessores.jsx` (mesmo trecho):

```js
function abrirKebab(event, coordenadorId) {
  const retangulo = event.currentTarget.getBoundingClientRect();
  setKebabPos({ top: retangulo.bottom + 6, left: retangulo.right - 168 });
  ...
}
```

O menu (`.kebab-menu`, `position: fixed`, renderizado com `createPortal` no `body`) **sempre** abre 6px abaixo do botão. Não há conferência do espaço até o fim da janela, então nas últimas linhas ele sai pela borda de baixo. O `left` também não é limitado (em telas estreitas pode sair pela esquerda). E o menu não fecha nem acompanha quando a página rola, ficando solto na tela.

## Correção

1. **Criar um componente único** para esse menu (ex.: `components/MenuKebabTabela.jsx`) e usar nas duas telas. Hoje o mesmo código (estado `kebabPos`, `abrirKebab`, listeners e portal) está duplicado em Coordenadores e Professores.
2. **Abrir para cima quando não couber embaixo:**
   - depois de renderizar o menu, medir a altura real dele (`useLayoutEffect` + `getBoundingClientRect` no `ref` do menu, para não piscar);
   - se `botao.bottom + 6 + alturaMenu > window.innerHeight - 8`, posicionar em `top = botao.top - 6 - alturaMenu` (abre para cima);
   - limitar `left` entre `8` e `window.innerWidth - larguraMenu - 8`.
3. **Fechar ao rolar a página e ao redimensionar a janela** (`scroll` com `capture: true`, para pegar a rolagem de qualquer contêiner, e `resize`), além do que já fecha hoje (clique fora e Esc).
4. **Acessibilidade:** o botão já tem `aria-haspopup="menu"` e `aria-expanded`, mas a lista não tem `role="menu"` nem os itens `role="menuitem"`. Acrescentar, com setas ↑↓ entre os itens, foco no primeiro item ao abrir e foco de volta no ⋮ ao fechar, como o `MenuAcoes.jsx` já faz. Se der para usar o próprio `MenuAcoes` com portal e a regra de abrir para cima, melhor ainda.

## Não mexer

- Os itens do menu (Ver detalhes, Editar, Excluir) e o que cada um faz.
- O visual do menu (`.kebab-menu`, `.kebab-menu__item`).
- O resto das tabelas (ordenação, busca, paginação).

## Como conferir

- No app real, em `http://127.0.0.1:5173`, **sem** `VITE_DEMO_MODE`, como Admin:
  - **Coordenadores:** abrir o ⋮ da **última** linha. O menu abre para cima, com Ver detalhes, Editar e Excluir visíveis. Abrir o ⋮ da primeira linha: abre para baixo.
  - **Professores:** o mesmo teste.
  - Com um menu aberto, rolar a página: o menu fecha.
  - Teclado: Tab até o ⋮, Enter abre, setas navegam, Esc fecha e o foco volta para o ⋮.
  - Janela baixa (ex.: 1366×700) e largura de celular (375px): o menu não sai da tela.
- Temas escuro e claro. Rodar `npm test` e o build.
