# Prompt: Home pública — cartões do catálogo com a mesma altura e rodapé alinhado (correção pequena, só CSS e texto)

## Pedido do usuário (2026-11-25, print da seção "Catálogo de cursos ativos · Escolha uma trilha e comece agora")

O usuário pediu "apenas o prompt para correção". O print mostra os 3 cartões **com alturas diferentes**:
- "Introdução à Inteligência Artificial" (descrição de 3 linhas) termina antes dos outros;
- "Redes e Infraestrutura" (4 linhas) passa dos outros;
- por isso a linha do preço e do botão fica **desalinhada** entre os cartões.

O print também mostra dois textos sem acento:
- **"Gratis"**, no lugar de "Grátis";
- **"3 curso(s) disponivel(is)."**

## Causa (verificada)

- **`frontend/src/components/CartaoCursoPublico.jsx`:**
  - `<article class="cartao-curso">` com o botão `cartao-curso__acionador` (capa + `cartao-curso__corpo` com o título e a descrição) e, depois, o `<footer class="cartao-curso__rodape">` com o preço e o botão;
  - "Gratis" na linha 46.
- **CSS:**
  - `styles/layout.css` ≈ linha 538: `.cartao-curso` **não é flex** (só fundo, borda, raio e `overflow`);
  - ≈ linha 589: `.cartao-curso__corpo` tem `flex: 1`, mas o pai, `.cartao-curso__acionador` (`styles/publico.css` ≈ linha 351), é `display: block`, então o `flex: 1` não tem efeito;
  - ≈ linha 631: `.cartao-curso__rodape` vem logo depois do conteúdo, sem ser empurrado para o fim;
  - a grade é `.secao-cursos__inner .grade-cursos` (`publico.css` ≈ linha 331), com 3 colunas.
- **Contagem:** `frontend/src/pages/PublicHome.jsx` ≈ linha 128 (`${courses.length} curso(s) disponivel(is).`). A ≈ linha 175 do modal também tem "Gratis".

## Tarefa

### 1. Mesma altura e rodapé sempre no fim

- **Grade:** em `.secao-cursos__inner .grade-cursos`, `align-items: stretch`. É o padrão, mas deixar explícito, caso algo acima force `start`.
- **`.cartao-curso`:** `display: flex; flex-direction: column; height: 100%;`.
- **`.cartao-curso__acionador`:** `display: flex; flex-direction: column; flex: 1;`, no lugar de `block`. Manter o `width: 100%` e o reset de botão que já existem.
- **`.cartao-curso__corpo`:** já tem `flex: 1`, que passa a funcionar.
- **`.cartao-curso__rodape`:** `margin-top: auto;`, para garantir que fica colado no fim.
- **Descrição com o mesmo número de linhas:** `.cartao-curso__descricao` com `display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;`. O texto completo continua no modal de detalhes, que já abre ao clicar no cartão.
- **Escopo:** aplicar às regras da Home pública (`publico.css`). Se a classe `.cartao-curso` também for usada no workspace (`layout.css` ≈ linha 1226) ou na prévia do `ModalPrepararVenda`, conferir que essas telas continuam iguais ou também melhoram. Não pode quebrar.

### 2. Textos

- **`CartaoCursoPublico.jsx` linha 46** e **`PublicHome.jsx` ≈ linha 175:** "Gratis" vira **"Grátis"**.
- **`PublicHome.jsx` ≈ linha 128:** "1 curso disponível." / "N cursos disponíveis." (singular/plural de verdade, com acento).

**Não alterar:**
- as capas, as cores e os botões;
- a ordem dos cursos e o modal de detalhes;
- o fluxo de compra e de "começar grátis".

## Testes (Vitest)

- **Contagem:** `PublicHome` com 1 curso mostra "1 curso disponível."; com 3, "3 cursos disponíveis.".
- **Preço:** `CartaoCursoPublico` gratuito mostra "Grátis".

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, Home pública):

- **Alinhamento:** os 3 cartões têm **a mesma altura**, e a linha do preço com o botão fica **na mesma altura** nos três, mesmo com descrições de tamanhos diferentes.
- **Descrições:** param em 3 linhas com "…"; a completa aparece no detalhe.
- **Textos:** "Grátis" com acento e "3 cursos disponíveis.".
- **Telas estreitas:** em 2 colunas e em 1 coluna continua alinhado.
- **Outras telas:** a prévia do Admin (`ModalPrepararVenda`) continua igual.
- `npm test` (web) e o lint sem erros novos.
