# Prompt: app mobile — Início: seta → nos botões e texto do catálogo inteiro (só visual)

## Pedido do usuário (2026-11-24, print da Início já com o prompt `PROMPT-agente-inicio-referencia.md` aplicado)

1. **Seta dos botões** "Ver ›" (banner Avaliações pendentes) e "Ver cursos ›" (banner Explorar catálogo): ela está fina e desalinhada do texto. O usuário viu a imagem `docs/redesign-mobile/inicio-seta-opcoes.png` e escolheu a **opção B, a seta → (`arrow-forward`)**.
2. **Texto do catálogo cortado:** aparece "Descubra novos cursos para turbinar seus …". Deve mostrar inteiro: **"Descubra novos cursos para turbinar seus conhecimentos."**

## Onde está (verificado)

- **`mobile/src/screens/HomeScreen.jsx`:**
  - **banner de avaliações:** botão `estilos.botaoContorno` com `<Text>Ver</Text>` e `Ionicons "chevron-forward" size={14}` (≈ linhas 204–205);
  - **banner do catálogo:** `BannerExplorarCatalogo` (≈ linha 272). Descrição com **`numberOfLines={2}`** (≈ linha 285), que é o que corta. Botão "Ver cursos" com `chevron-forward` 14 (≈ linhas 296–297);
  - **"Ver todos ›"** de "Meus cursos" usa o caractere "›" no próprio texto (≈ linha 219);
  - **estilos:** `botaoContorno` (≈ linha 375; `gap: 2`, `alignItems: "center"`) e `botaoContornoTexto` (`tipografia.rotulo`, peso 700, sem `lineHeight`).
- **Causa do desalinhamento:**
  - o `<Text>` sem `lineHeight` ganha a sobra de linha da fonte (no Android, `includeFontPadding`);
  - o centro visual do texto fica abaixo do centro da caixa, e o chevron fino de 14px parece "subido".

## Tarefa

### 1. Seta → nos botões contorno (opção B)

- **Componente reutilizável** `mobile/src/components/BotaoContornoSeta.jsx`, com as props `rotulo`, `onPress`, `accessibilityLabel`, `accessibilityHint` e `style`:
  - pílula com borda de 1px `cores.destaque`, `paddingHorizontal` cerca de 12 e altura cerca de 32. Área de toque ≥ 44 via `hitSlop`;
  - `flexDirection: "row"`, `alignItems: "center"`, **`gap: 6`**;
  - **texto:** `tipografia.rotulo`, peso 700, cor `cores.destaque`, com **`lineHeight` fixo igual ao tamanho do ícone** (cerca de 16). No Android, também `includeFontPadding: false` e `textAlignVertical: "center"`;
  - **ícone:** `Ionicons` **`arrow-forward`**, cerca de 15px, mesma cor do texto. **Sem** `marginTop` nem ajuste manual: o alinhamento vem do `lineHeight`.
- **Usar o componente** no "Ver" do banner de avaliações e no "Ver cursos" do banner do catálogo, com os mesmos `onPress` e textos de acessibilidade de hoje.
- **"Ver todos"** de "Meus cursos": continua como link sem borda, mas troca o caractere "›" por `arrow-forward` de 13px ao lado do texto. Mesma regra: `lineHeight` igual ao ícone e `gap` 4.
- Remover os estilos `botaoContorno` e `botaoContornoTexto` da Home, se ficarem sem uso.

### 2. Texto do catálogo inteiro

- **Remover o `numberOfLines={2}`** da descrição do `BannerExplorarCatalogo`. O texto "Descubra novos cursos para turbinar seus conhecimentos." aparece inteiro e quebra em quantas linhas precisar (3 em telas estreitas).
- **Para não ficar alto demais:** foguete de 40 para cerca de 34px e `gap` do banner `espacamentos.sm`. O botão fica alinhado ao centro vertical, como hoje.

**Não alterar:**
- a navegação dos botões;
- as cores e o degradê dos banners;
- o restante da Início;
- outras telas. O componente novo fica disponível, mas só a Início o usa agora.

## Testes (jest)

- **Banner de avaliações:** renderiza "Ver" com o ícone `arrow-forward`; tocar abre `ROUTES.AVALIACOES`.
- **Banner do catálogo:**
  - renderiza o texto completo "Descubra novos cursos para turbinar seus conhecimentos.";
  - a descrição não tem `numberOfLines`;
  - "Ver cursos" usa `arrow-forward` e abre `ROUTES.CATALOGO`.
- **`BotaoContornoSeta`:** repassa `onPress` e `accessibilityLabel`.

## Critérios de aceite

Verificar no app (Expo; web no iPhone e um Android):

- **Setas:** "Ver →" e "Ver cursos →" com a seta de haste **centralizada** na altura do texto, sem parecer "subida".
- **"Ver todos →":** com a mesma seta.
- **Catálogo:** "Descubra novos cursos para turbinar seus conhecimentos." aparece **inteiro**, sem "…".
- `npm test` (mobile) e o lint sem erros novos.
