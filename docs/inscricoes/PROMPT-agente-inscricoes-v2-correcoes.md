# Prompt: Inscrições v2 — correções (KPI de receita cortado, botão "Ver curso", filtros em relevo) — só frontend web

## Pedido do usuário (print de 2026-11-17, depois de aplicar `PROMPT-agente-inscricoes-v2.md`)

1. **Um KPI ficou quebrado:** no cartão de receita, o valor aparece como "R$ 10.23…" e o selo como "Simu", os dois cortados.
2. **O botão "Ver detalhes":** quer uma **seta** e o nome **"Ver curso"**.
3. **Filtros de Modalidade** (Todos, Gratuito, Pago, Acompanhado): estão simples demais, parecem selo e não botão. O usuário quer um aspecto **em relevo**.
   - Ele escolheu a **opção A, "Botão em relevo"**, na imagem `docs/inscricoes/opcoes-filtros-relevo.png`. A imagem mostra também os estados: normal, mouse em cima, selecionado e no clique.

O agente de arquitetura viu no mesmo print mais um problema, incluído no item 3: o nome do curso e os selos quebram em várias linhas, e as linhas da tabela ficam com alturas diferentes.

A v2 ainda **não foi commitada**: as mudanças estão no working tree.

## Onde está (verificado pelo agente de arquitetura)

- **KPI:** `frontend/src/pages/workspace/SecaoMatriculas.jsx`, componente do KPI ≈ linhas 464–485.
  - A estrutura é `inscricoes-kpi__cabeca` > ícone + texto (`__valor` e `__rotulo`, com o selo `Insignia` dentro do rótulo), e `__extra` embaixo.
- **CSS:** `frontend/src/styles/workspace.css`.
  - `.inscricoes-kpi__valor` (≈ linha 5720) e `.inscricoes-kpi__rotulo` (≈ linha 5731) usam `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`. **Essa é a causa do corte.**
  - Na largura do print (≈ 1660px de janela), cada KPI tem ≈ 235px.
  - Tirando ícone, espaço e padding, sobram ≈ 140px, e "R$ 10.235,00" com 1.55rem precisa de ≈ 175px.
- **Botão:** "Ver detalhes" com `TbChevronRight size={14}` aparece em `SecaoMatriculas.jsx` ≈ linha 814 (tabela) e ≈ linha 912 (cartões do celular). No print, a seta quase não aparece.

## Tarefa

1. **KPIs sem corte, nunca com reticências:**
   - Em `.inscricoes-kpi__valor` e `.inscricoes-kpi__rotulo`, **tirar** `overflow: hidden` e `text-overflow: ellipsis`. O valor continua `nowrap`; o rótulo pode quebrar em 2 linhas.
   - O valor se ajusta à largura do cartão: pôr `container-type: inline-size` em `.inscricoes-kpi` e usar `font-size: clamp(1.1rem, 9cqi, 1.55rem)` no valor. Ajustar o `9cqi` até "R$ 10.235,00" caber inteiro em ≈ 235px; valores maiores, como "R$ 100.000,00", também têm de caber.
   - **KPI de receita:** o selo "Simulada" sai de dentro do rótulo e vai para a linha colorida de baixo, antes dos pendentes: `[Simulada] 3 pendentes`. Quando não houver pendentes, a linha fica só com o selo.
   - O rótulo volta a ser só "Receita estimada", sem quebrar.
   - Os outros 4 KPIs ficam iguais.
2. **Botão "Ver curso"**, na tabela e nos cartões do celular:
   - o texto muda de "Ver detalhes" para **"Ver curso"**;
   - a seta vira `TbArrowRight` com 16px, à direita do texto, com 6px de espaço e a mesma cor do texto. Ela precisa ficar bem visível;
   - no hover, a seta anda 2px para a direita (`transform`, 150ms; nada de animação com `prefers-reduced-motion`);
   - `aria-label`: "Ver curso {título}";
   - o destino não muda (`/app/cursos/:id`).
3. **Coluna Curso sem quebras:**
   - a coluna Curso ganha `min-width: 320px`;
   - os selos (modelo + situação) ficam numa linha só (`flex-wrap: nowrap`, `white-space: nowrap`);
   - o nome do curso pode quebrar em no máximo 2 linhas (`-webkit-line-clamp: 2`, com o título completo no `title`);
   - todas as linhas ficam com altura parecida (≈ 72px).
4. **Filtros de Modalidade em relevo (opção A).** Ajustar `.inscricoes-chip` e `.inscricoes-chip--ativo` em `styles/workspace.css` (≈ linha 5799). Hoje o chip é uma pílula transparente com borda de 1px.
   - **Formato:** `height: 40px` (a mesma altura da busca e do período), `padding: 0 18px`, `border-radius: 10px` (sai a pílula), `font-weight: 600` e texto `#e7e3f0`.
   - **Normal:**
     - `background: linear-gradient(180deg, #2f3240 0%, #22242f 100%)`;
     - `border: 1px solid rgba(255,255,255,.10)` e `border-bottom-color: rgba(0,0,0,.55)`;
     - `box-shadow: inset 0 1px 0 rgba(255,255,255,.10), 0 2px 0 #0b0c10, 0 4px 10px rgba(0,0,0,.35)`.
   - **Mouse em cima:**
     - fundo um tom mais claro (`#373a4a → #282a36`), borda `rgba(168,85,247,.55)` e texto branco;
     - `transform: translateY(-1px)` e a sombra de base com 3px.
   - **No clique (`:active`):**
     - `transform: translateY(2px)`;
     - `box-shadow: inset 0 2px 4px rgba(0,0,0,.5)`, ou seja, a sombra de base some e o botão "afunda".
   - **Selecionado (`--ativo`):**
     - `background: linear-gradient(180deg, #9d4dff 0%, #7b2ff7 100%)` e texto branco;
     - borda `#9d4dff` com `border-bottom-color: #4c1d95`;
     - `box-shadow: inset 0 1px 0 rgba(255,255,255,.30), 0 2px 0 #3b1577, 0 6px 16px rgba(123,47,247,.45)`.
     - O selecionado também tem hover e clique, com o mesmo movimento.
   - **Foco por teclado:** `:focus-visible` com anel roxo de 2px (`outline: 2px solid var(--cor-marca-clara); outline-offset: 2px`).
   - **Transição:** `transform`, `box-shadow`, `background` e `border-color` em 150ms. Com `prefers-reduced-motion: reduce`, sem `transform`.
   - **Tema claro** (`[data-tema="claro"]`, que existe em `base.css`, `layout.css` e `workspace.css`): mesma ideia com cores claras. Fundo `#ffffff → #f1f0f5`, borda `rgba(0,0,0,.12)`, sombra de base `0 2px 0 rgba(0,0,0,.12)`. O selecionado continua roxo.
   - **Botões, não selos:** os chips continuam `<button>` com `aria-pressed`, como hoje.
   - **Campo de busca:** ganha uma leve sombra para dentro, `box-shadow: inset 0 2px 4px rgba(0,0,0,.35)`, para parecer campo e não botão.
   - **Só nesta tela.** Não mudar os filtros de outras telas.
5. **Testes (vitest):**
   - o botão se chama "Ver curso" e abre o curso;
   - o selo "Simulada" aparece junto de "N pendente(s)" na linha de baixo do KPI de receita;
   - nenhum KPI usa reticências (a classe não tem `text-overflow`). O teste de CSS pode ser substituído por um teste do texto completo renderizado.

**Não alterar:**
- os números;
- o KPI roxo "Total de cursos";
- os filtros, a paginação e as outras colunas;
- o Dashboard.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173), **sem modo demo**, logado como Admin:

- **1660px de janela (a mesma do print):** o KPI de receita mostra **"R$ 10.235,00" inteiro**, o rótulo "Receita estimada" e embaixo "[Simulada] 3 pendentes". Nenhum KPI tem "…".
- **1920px e ≈ 1100px:** os 5 KPIs continuam sem corte.
- **Botão:** na tabela, mostra "Ver curso →" com a seta visível, e o clique abre o curso. No celular, igual.
- **Coluna Curso:**
  - "Curso Teste Gratuito QA" mostra os selos "Gratuito" e "Em andamento" na mesma linha;
  - "Desenvolvimento Web Full Stack" ocupa no máximo 2 linhas;
  - as linhas da tabela têm altura parecida.
- **Filtros:** comparando com a opção A de `opcoes-filtros-relevo.png`:
  - os 4 chips parecem botões em relevo, com 40px de altura, a mesma da busca e do período;
  - o selecionado fica roxo com brilho;
  - o hover sobe 1px e o clique afunda;
  - o Tab mostra o anel de foco.
- `npm run lint` e `npm test` sem erros novos.

## Observação (não é tarefa deste prompt)

A capa do curso "Desenvolvimento Web Full Stack" aparece **preta** no print. Isso não é bug do código: o arquivo enviado, `Storage/Uploads/cursos/f4222a6c-….png`, é uma imagem de **1×1 pixel preta**. O certo é trocar a capa pela tela do curso. Sem capa própria, o sistema já usa a imagem padrão do curso.
