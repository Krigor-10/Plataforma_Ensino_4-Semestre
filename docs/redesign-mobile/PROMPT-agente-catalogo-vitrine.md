# Prompt: app mobile — Catálogo em vitrine com capa grande, filtros por tipo e preço sem repetir (só visual)

## Pedido do usuário (2026-11-25, print do Catálogo no celular)

"Alguma sugestão pra tela de catálogo?"

O usuário viu a imagem `docs/redesign-mobile/catalogo-opcoes.png` e escolheu a **opção A, Vitrine**.

**Problemas de hoje:**
- a capa é pequena (56px);
- o **preço aparece duas vezes** (no canto e no botão "Comprar · R$ 29,90");
- cada cartão tem um botão roxo grande, e todos competem entre si;
- não há filtro;
- curso sem imagem vira um quadrado vazio com ícone de livro.

## Onde está (verificado)

- **Tela:** `mobile/src/screens/aluno/CatalogoScreen.jsx` (≈ 190 linhas).
  - Busca (≈ linhas 82–92), `FlatList` de `cursosDisponiveis` (≈ linha 95). Os filtros de hoje — fora os já matriculados, `isCursoVisivelNoCatalogoPublico` e a busca pelo título — continuam.
  - `ItemCursoCatalogo` (≈ linha 121):
    - `CapaCurso` 56px;
    - título e preço/"Gratuito";
    - descrição em 2 linhas;
    - selo "Com acompanhamento" (`modeloCurso === MODELO_ACOMPANHADO`);
    - botão "Começar grátis" / "Comprar · R$".
  - **Fluxos:** `comecarGratis(curso)` e `setCursoParaComprar(curso)`, que abre `ConfirmacaoCompraSheet`. **Não mudam.**
- **Capa:** `components/CapaCurso.jsx` já aceita `largura`, `altura` e `estilo`. Sem imagem, mostra o ícone `book-outline`.
- **Dados:** o curso tem `titulo`, `descricao`, `preco`, `imagemUrl` e `modeloCurso`. **Não precisa de endpoint novo.**

## Tarefa

### 1. Topo: busca + chips + contagem

- **Busca:** a de hoje.
- **Chips** logo abaixo, com rolagem horizontal, no mesmo estilo compacto dos chips de Avaliações (`PROMPT-agente-avaliacoes-ajustes-1.md`: cerca de 28px, ativo em roxo translúcido com borda):
  - **Todos** (padrão);
  - **Grátis** (`preco <= 0`);
  - **Pagos** (`preco > 0`);
  - **Com acompanhamento** (`modeloCurso === MODELO_ACOMPANHADO`).
- **Combinação:** chip **E** busca.
- Chip sem nenhum curso (por exemplo, nenhum grátis): **não aparece**.
- **Contagem:** "N cursos disponíveis" (singular/plural) abaixo dos chips, em `textoRotulo`, 11px.

### 2. Cartão de vitrine

- **Cartão:** raio 16, fundo `cores.fundoCartao`, borda `rgba(123,47,247,.2)`, `overflow: hidden`.
- **Capa no topo:** largura total e cerca de 118px de altura, com `CapaCurso` (`largura="100%"`, `altura={118}`, sem raio próprio, porque o cartão corta).
- **Sobre a capa:**
  - **etiqueta de preço** no canto superior direito:
    - pago: fundo `rgba(0,0,0,.7)`, texto branco, "R$ 29,90" (`formatMoney`);
    - grátis: fundo `cores.sucesso`, texto escuro, **"Grátis"**;
    - 11.5px, peso 800, pílula;
  - **"Com acompanhamento"** no canto inferior esquerdo, quando for o caso: fundo `rgba(17,19,25,.8)`, borda roxa, texto roxo-claro, 10px. **Sai** o selo de hoje debaixo da descrição.
- **Embaixo** (padding 12):
  - **título** (2 linhas, 14px, peso 700);
  - **descrição** em 2 linhas, se existir;
  - **rodapé** em linha: à esquerda o link **"Detalhes"** (roxo-claro, peso 700); à direita o botão **em pílula, menor** (cerca de 34px, `paddingHorizontal` 14):
    - pago: **"Comprar"**, roxo cheio, **sem repetir o preço**;
    - grátis: **"Começar grátis"**, verde cheio (`cores.sucesso`, texto escuro);
    - processando: `ActivityIndicator` no lugar do texto, como hoje.
- `gap` entre cartões: `espacamentos.md`.

### 3. "Detalhes": painel de baixo para cima

- Tocar em "Detalhes" **ou na capa** abre um painel inferior com:
  - capa grande (cerca de 150px, raio 14), com a mesma etiqueta de preço;
  - título;
  - "Com acompanhamento", se for o caso;
  - a **descrição inteira**;
  - o botão principal largo: "Comprar · R$ 29,90" (roxo) ou "Começar grátis" (verde). **Aqui o preço aparece no botão**, porque é a confirmação.
- O botão do painel chama os **mesmos** `onComprar` / `onComecarGratis` e fecha o painel antes de abrir o `ConfirmacaoCompraSheet`.
- **Componente:** reaproveitar o padrão de sheet já usado no `ConfirmacaoCompraSheet` (mesmo `Modal`/animação e as mesmas cores) num componente novo `DetalheCursoSheet.jsx`.

### 4. Capa reserva com iniciais (curso sem imagem)

- Em `CapaCurso`, nova prop opcional **`reservaIniciais`** (padrão `false`, para não mudar as outras telas). Com ela, quando não houver imagem:
  - **degradê** (`expo-linear-gradient`) escolhido pelo `curso.id`, numa lista fixa de 4 pares: roxo→azul, ciano→índigo, roxo→roxo-claro e verde→azul, nos tons da imagem;
  - as **iniciais** das duas primeiras palavras do título (ex.: "Curso Teste Header" vira "CT"), em branco 85%, peso 800, cerca de 28px.
- Usar `reservaIniciais` no cartão de vitrine e no painel de detalhe.

**Não alterar:**
- quais cursos aparecem (matriculados fora, `isCursoVisivelNoCatalogoPublico`);
- a busca;
- `comecarGratis`, `ConfirmacaoCompraSheet` e `irParaCurso`;
- os toasts;
- o cabeçalho "← Catálogo";
- as outras telas que usam `CapaCurso` (a prop nova é opcional).

## Testes (jest)

- **Chips:**
  - "Grátis" mostra só os de preço 0;
  - "Pagos" mostra só os de preço > 0;
  - "Com acompanhamento" mostra só os do modelo Acompanhado;
  - chip sem cursos não renderiza;
  - a contagem acompanha o filtro e a busca.
- **Cartão:**
  - pago mostra a etiqueta "R$ 29,90" e o botão "Comprar" **sem** o preço;
  - grátis mostra "Grátis" e "Começar grátis";
  - "Com acompanhamento" aparece sobre a capa.
- **Detalhes:**
  - abre o painel com a descrição inteira;
  - o botão do painel chama o mesmo fluxo de compra ou de começar grátis.
- **`CapaCurso`:** com `reservaIniciais` e sem imagem renderiza as iniciais; sem a prop mantém o ícone de livro.

## Critérios de aceite

Verificar no app (Expo; web no iPhone e um Android), logado como Aluno Demo:

- **Topo:** busca, os chips "Todos · Grátis · Pagos · Com acompanhamento" e "N cursos disponíveis".
- **Cartões:**
  - capa grande e preço **uma vez só**, na etiqueta da capa;
  - botão menor "Comprar" ou "Começar grátis" (verde);
  - "Redes e Infraestrutura" com "Com acompanhamento" sobre a capa;
  - "Curso Teste Header Cursos" com capa em degradê "CT", em vez do quadrado vazio.
- **Detalhes:** abre o painel com a descrição completa e "Comprar · R$ 29,90"; o fluxo de compra é o mesmo de hoje.
- `npm test` (mobile) e o lint sem erros novos.
