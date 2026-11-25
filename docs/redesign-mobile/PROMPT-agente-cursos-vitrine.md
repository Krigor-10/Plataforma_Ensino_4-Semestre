# Prompt: app mobile — aba Cursos (meus cursos) no mesmo formato de vitrine do Catálogo (só visual)

## Pedido do usuário (2026-11-25, prints da aba Cursos e do Catálogo já em vitrine)

"O que acha de deixar a tela de cursos no mesmo formato e estilo da tela de catálogo?"

O usuário **aprovou** a imagem `docs/redesign-mobile/cursos-vitrine-proposta.png`. Foi alertado do custo: cabem menos cursos por tela, cerca de 2,5 contra cerca de 4 hoje, e os chips compensam.

**Pré-requisito:** o Catálogo em vitrine (`PROMPT-agente-catalogo-vitrine.md`), já aplicado. Reaproveitar dele os chips, o cartão, `DetalheCursoSheet` e `CapaCurso` com `reservaIniciais`.

## Onde está (verificado)

- **Grade:** `mobile/src/components/GradeCursosConteudos.jsx` (≈ 230 linhas).
  - `FlatList` com `numColumns={2}`.
  - **Situação (`obterStatus`):**
    - "Compra pendente" (`pagamentoPendente`);
    - "Comprar" (`acessoLiberado === false`: pagamento cancelado ou vencido);
    - "Concluído" (100%), "Não iniciado" (0%) ou "Em andamento".
  - **Botões de compra pendente:** "Concluir compra" e "Desistir da compra" (com confirmação).
- **Tela:** `mobile/src/screens/aluno/ConteudosScreen.jsx`.
  - Sem curso selecionado, renderiza `GradeCursosConteudos` (≈ linha 459) com `itensGrade` (≈ linha 292). Cada item traz `curso { imagemUrl, titulo }`, `id`, `matriculaId`, `acessoLiberado`, `pagamentoPendente`, `pagamentoVenceEm`, `progresso` e `valorPagamento`.
  - **Callbacks:** `onSelecionar` (abre a trilha), `onConcluirCompra` e `onDesistir`. **Não mudam.**
- **Dados extras, sem endpoint novo:**
  - nº de módulos e concluídos vêm de `grupos` (cada grupo tem `modulos` com `concluido`);
  - descrição vem de `snapshot.cursos`;
  - certificado emitido vem de `matricula.certificadoEmitidoEm` (já está em `MatriculaResponseDto`).

## Tarefa

### 1. Chips por situação + contagem

- **Acima da lista**, os chips no mesmo componente e estilo do Catálogo:
  - **Todos** (padrão);
  - **Em andamento**;
  - **Não iniciados**;
  - **Concluídos**;
  - **Compra pendente**, que só aparece se houver; os itens "Comprar" (sem acesso) também entram nele.
- Chip sem nenhum curso: **não aparece**.
- **Contagem:** "N cursos" (singular/plural) abaixo dos chips.
- **Ordem da lista em "Todos":**
  1. em andamento (maior % primeiro);
  2. compra pendente;
  3. não iniciados;
  4. concluídos.

### 2. Cartão de vitrine (1 coluna)

- **Formato:** o **mesmo cartão do Catálogo**. Extrair um componente comum, por exemplo `CartaoVitrineCurso`, usado pelas duas telas.
  - Capa de cerca de 112–118px, com `CapaCurso` e `reservaIniciais`.
  - Raio 16, borda roxa sutil.
- **Etiqueta no canto superior direito da capa** (no lugar do preço):

| Situação | Etiqueta |
|---|---|
| Em andamento | fundo escuro translúcido, borda e texto roxo-claro |
| Não iniciado | fundo escuro translúcido, texto claro |
| Concluído | verde cheio, "✓ Concluído" |
| Compra pendente / Comprar | âmbar cheio (`cores.aviso`, texto escuro) |

- **Canto inferior esquerdo da capa:** **"🏆 Certificado"** quando `certificadoEmitidoEm` existir (fundo escuro, borda e texto dourados).
- **Barra fina** de 4px, na largura total, colada embaixo da capa: roxa, ou verde em 100%. Não aparece em compra pendente ou "Comprar".
- **Texto:**
  - título (2 linhas);
  - linha de apoio:
    - com acesso: "N de M módulos · N% concluído";
    - compra pendente: "Pagamento vence em N dias" (ou a data, com `formatDayMonth`, como hoje);
    - "Comprar": "Pagamento cancelado".
- **Rodapé:**

| Situação | Ação principal (pílula à direita) | Ação secundária (link à esquerda) | Destino |
|---|---|---|---|
| Em andamento | "▶ Continuar" (roxo) | "Detalhes" | trilha (`onSelecionar`) |
| Não iniciado | "▶ Começar" (roxo) | "Detalhes" | trilha (`onSelecionar`) |
| Concluído | "Revisar" (contorno roxo, menos destaque) | "Detalhes" | trilha (`onSelecionar`) |
| Compra pendente | "Concluir compra" (âmbar) | "Desistir" (cinza) | `onConcluirCompra` / `onDesistir`, com a mesma confirmação de hoje |
| Comprar | "Comprar" (âmbar) | — | mesmo fluxo de hoje |

- **"Detalhes"** abre o `DetalheCursoSheet` do Catálogo com a capa, a descrição inteira e o botão principal da situação.
- Tocar na **capa** abre a trilha (com acesso) ou o painel (sem acesso).
- **Processando:** `ActivityIndicator` no botão, como hoje (`processandoPagamentoId`).

### 3. Limpeza

- `GradeCursosConteudos` passa a renderizar a lista em 1 coluna com `CartaoVitrineCurso` (ou é substituída). Remover `numColumns`, `columnWrapperStyle` e os estilos da grade antiga que ficarem sem uso.
- O `paddingBottom` da barra flutuante continua (`alturaBarraAbas`).

**Não alterar:**
- `itensGrade` e as regras de acesso, pagamento e progresso;
- `ConfirmacaoCompraSheet`, `onConcluirCompra` e `onDesistir`;
- a trilha do curso (com curso selecionado);
- o estado vazio;
- o Catálogo, exceto a extração do cartão comum, sem mudança visual.

## Testes (jest)

- **Chips:** filtram por situação; chip sem cursos não renderiza; "Compra pendente" só aparece se houver; a contagem acompanha o filtro.
- **Ordem em "Todos":** em andamento, compra pendente, não iniciados, concluídos.
- **Cartão:**
  - em andamento mostra a etiqueta "Em andamento", "N de M módulos · N% concluído" e "Continuar", que chama `onSelecionar`;
  - 0% mostra "Começar";
  - 100% mostra "✓ Concluído", "Revisar" e o selo "Certificado" quando `certificadoEmitidoEm` existe;
  - compra pendente mostra a etiqueta âmbar, "Concluir compra" e "Desistir", chamando os mesmos callbacks.
- **Detalhes:** abre o painel com a descrição.
- **Catálogo:** os testes do Catálogo continuam verdes com o cartão comum.

## Critérios de aceite

Verificar no app (Expo; web no iPhone e um Android), logado como Aluno Demo:

- **Topo:** na aba Cursos, os chips "Todos · Em andamento · Não iniciados · Concluídos" e "N cursos".
- **Lista:** os cursos em cartões de 1 coluna, iguais aos do Catálogo:
  - situação na capa;
  - barra embaixo da capa;
  - "N de M módulos · N%";
  - "Continuar" / "Começar" / "Revisar".
- **Concluído:** "Desenvolvimento Web Full Stack" mostra "✓ Concluído" e "🏆 Certificado". A capa preta é dado (PNG 1×1), não código.
- **Compra pendente:** um curso nessa situação mostra a etiqueta âmbar e "Concluir compra", com o mesmo fluxo de hoje.
- `npm test` (mobile) e o lint sem erros novos.
