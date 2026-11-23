# Prompt: correções da tela do módulo (lista + janela) — rodada 1 (frontend web)

## Contexto

`PROMPT-agente-tela-modulo-lista-e-janela.md` foi aplicado no commit `150d31d`. O usuário testou e mandou dois prints (2026-11-19) com estes problemas:

1. **O quiz não carrega na janela do professor:** fica para sempre em "Carregando questões…".
2. **"Anterior" e "Próximo" grudados na borda** da janela.
3. **Publicar e Editar devem ficar só no menu ⋮.** Hoje aparecem como botões no topo da janela.
4. **Cards de módulo com tamanhos diferentes:** um título em 1 linha deixa o card mais baixo que o de 2 linhas.
5. **KPIs com texto grande demais** (coordenador/Admin: Progresso, Conclusão, Desempenho médio).
6. **Ao selecionar um módulo, o número dele desaparece.**

Causas verificadas no código pelo agente de arquitetura (não repetir a investigação):

| # | Causa | Onde |
|---|---|---|
| 1 | **Corrida no `useEffect`.** O efeito chama `setCarregandoQuestoesId(quizId)`, e `carregandoQuestoesId` está nas dependências do próprio efeito. O efeito roda de novo: a limpeza marca `ativo = false` na requisição em andamento, e a nova execução sai cedo porque `carregandoQuestoesId === quizId`. Quando a resposta chega, o `then`/`finally` é ignorado (`ativo` é false), então **nem as questões são gravadas nem o "carregando" é desligado**. | `pages/workspace/TelaModuloGestaoProfessor.jsx` ≈ linhas 206–245 |
| 2 | O rodapé é passado ao `Modal` como `<footer className="janela-previa-item__rodape">` **sem a classe `modal-rodape`**, que é a que dá o padding (`componentes.css` ≈ linha 782) e a borda superior. As outras janelas do app usam `modal-rodape`. | `components/JanelaPreviaItem.jsx` ≈ linha 201 |
| 3 | O topo da janela tem os botões "Publicar/Voltar para rascunho" e "Editar". | `components/JanelaPreviaItem.jsx` ≈ linhas 185–191 |
| 4 | `.lista-modulos-cartoes__item` não tem altura mínima, e o título não tem limite de linhas. | `styles/workspace.css` ≈ linha 9808 |
| 5 | Os KPIs usam o `CartaoEstatistica` no tamanho padrão (só o padding foi reduzido em `.modulo-lista-janela__kpis .cartao-estatistica`, ≈ linha 9680). O valor e o rótulo continuam grandes. | `pages/workspace/TelaModuloGestao.jsx` ≈ linha 214 |
| 6 | No módulo atual, o número ganha `background: var(--cor-marca-clara)` (#b992ff), que é a **mesma cor do texto do número**. Ele some. | `styles/workspace.css` ≈ linha 9835 |

## Tarefa

1. **Quiz carregando para sempre**, em `TelaModuloGestaoProfessor.jsx`:
   - tirar `carregandoQuestoesId` das dependências do efeito e controlar o "já estou buscando este quiz" com um **`useRef` (Set de ids em andamento)**;
   - a limpeza do efeito **não** pode descartar a resposta: grava as questões no `Map` por `quizId` sempre que a requisição terminar, mesmo que o usuário já tenha ido para outro item, e só evita mexer em estado depois que a tela foi desmontada;
   - em erro: toast (como hoje), sai do estado de carregamento e mostra "Não foi possível carregar as questões. Tentar de novo" com um botão que refaz a busca;
   - conferir que a tela do **coordenador/Admin**, que usa os dados do `revisao-conteudo`, não tem o mesmo problema.
2. **Rodapé da janela:** em `JanelaPreviaItem.jsx`, o `<footer>` passa a ter as classes `modal-rodape janela-previa-item__rodape`, ficando com o padding e a borda superior do padrão. Manter `justify-content: space-between`. Os botões não podem encostar na borda em nenhuma largura.
3. **Ações só no ⋮:**
   - **tirar** os botões "Publicar/Voltar para rascunho" e "Editar" do topo da janela;
   - no lugar, um **⋮** (o mesmo `MenuAcoes` da linha), ao lado do selo e antes do ✕, com as mesmas ações do ⋮ da linha, **menos "Visualizar"**: Editar, Publicar/Voltar para rascunho, Mover para cima, Mover para baixo, Arquivar e Excluir;
   - **coordenador/Admin:** sem ⋮; fica só o selo "Somente leitura" e o ✕;
   - **depois de uma ação:** Publicar e Voltar para rascunho atualizam o selo na janela e na lista sem fechar a janela. Excluir e Arquivar fecham a janela e removem o item da lista. Editar abre o modal de edição de hoje.
4. **Cards de módulo do mesmo tamanho:**
   - `.lista-modulos-cartoes__item` com **altura fixa mínima** (≈ 76px, a de um título em 2 linhas mais o resumo);
   - o título com `-webkit-line-clamp: 2` e o nome completo no `title`;
   - o resumo ("N itens") sempre na mesma posição;
   - o quadrado do número e a seta ficam centralizados na vertical.
5. **KPIs menores**, na linha de KPIs do coordenador/Admin na tela do módulo:
   - reaproveitar o tamanho compacto que já existe: o mesmo de `.atividades-curso__kpis-compactos` (`workspace.css` ≈ linha 4092) ou do modificador compacto dos KPIs do Dashboard do Admin;
   - valor com ≈ 1.1rem, rótulo com 0.75rem, ícone com 20px e altura ≈ 56px;
   - **não** mexer no `CartaoEstatistica` base, que outras telas usam.
6. **Número do módulo atual visível:** em `.lista-modulos-cartoes__item[aria-current="true"] .conteudos-modulo__numero`, usar `background: var(--cor-marca)`, `color: #fff` e borda `var(--cor-marca-clara)`.
   - Conferir também o **tema claro**, onde `--cor-marca-clara` é escuro (#5b19cf): o número precisa continuar legível.
   - Não mudar o número nos cards que não estão selecionados.

### Itens acrescentados depois (19/11, decisões do usuário)

Mais um print do professor: a coluna de módulos à esquerda repete a lista da tela anterior (Acadêmico › Conteúdos › curso), onde o módulo já foi escolhido. O usuário decidiu, uma coisa por vez:

7. **Tirar a coluna de módulos da esquerda** (`ListaModulosCartoes` nesta tela), no professor, no coordenador e no Admin.
   - O painel do módulo passa a ocupar a **largura toda**.
   - **Sem seletor de módulo** no lugar (o usuário recusou).
   - **Tirar também** "Módulo anterior / Próximo módulo" do rodapé.
   - A **única** forma de trocar de módulo é **"← Voltar"**, que leva à lista de módulos do curso: professor em Acadêmico › Conteúdos › curso; coordenador/Admin na tela do curso, aba Módulos.
   - Usar o `BotaoVoltar` padrão do app, no topo, à esquerda do caminho.
   - Se `ListaModulosCartoes` e `.lista-modulos-cartoes*` ficarem sem uso, **remover** o componente e o CSS. Nesse caso o item 4 (mesma altura) e o item 6 (número visível) deixam de ser necessários para esta tela. Se o componente continuar usado em outro lugar, aplicar os itens 4 e 6 lá.
8. **Cartão do curso vira uma linha compacta** (≈ 60px), em vez do cartão grande que repetia o topo da tela anterior:
   - ícone de 40px, nome do curso, barra fina de progresso e, à direita, "N% publicado" e o selo "N rascunhos" (professor);
   - no coordenador/Admin: progresso médio dos alunos e a situação do curso, com os KPIs compactos do item 5 logo abaixo ou na mesma linha, se couber.
9. **Linha de dados dos itens:** hoje o ícone aparece **em cima** do texto ("▤" numa linha e "Texto | Publicado" na de baixo). O ícone e o texto ficam **lado a lado** na mesma linha ("▤ Texto | ✓ Publicado", "☰ 3 questões | ● Rascunho"), com `display: inline-flex; align-items: center; gap: 4px` em cada parte.
10. **Plural errado:** em `TelaModuloGestaoProfessor.jsx` ≈ linha 563, `questão{total === 1 ? "" : "ões"}` gera **"questãoões"**. Trocar por `total === 1 ? "questão" : "questões"`. Procurar o mesmo erro em `PreviaTrilhaAluno.jsx` ≈ linha 208 e em outros lugares.

11. **Subtítulo da janela cortado** (print de 19/11, item "Boas-vindas ao modulo"): a linha "TEXTO · MÓDULO 01" aparece com a metade de cima cortada, colada no texto de baixo.
    - **Causa:** `.janela-previa-item__titulo-sub` (`styles/workspace.css` ≈ linha 10103) tem `margin: -0.5rem 0 0`. Como o `<p>` fica no **corpo** da janela (`JanelaPreviaItem.jsx` ≈ linha 234), e não no cabeçalho, a margem negativa empurra a linha para baixo da borda do cabeçalho, que a corta.
    - **Correção:**
      - levar o subtítulo para o **cabeçalho**, logo abaixo do título (ex.: a prop do `Modal` para subtítulo, ou o título como nó com título + subtítulo), como na imagem aprovada ("Imagem · Módulo 01" embaixo do título);
      - **tirar** a margem negativa;
      - entre o cabeçalho e o conteúdo, o espaçamento normal do corpo.
    - Se não der para levar ao cabeçalho, manter no corpo com `margin: 0 0 var(--espaco-sm)`.
    - O texto continua "Texto · Módulo 01", com acento. As maiúsculas, se forem mantidas, vêm do CSS e preservam o "Ó".
    - **Aceite:** em qualquer item, a linha "Tipo · Módulo NN" aparece inteira embaixo do título, sem corte, com espaço até o conteúdo.

Imagem de apoio: `docs/TelaConteudosProfessor/modulo-seletor-sem-coluna.png`. Ela mostra a linha compacta do curso e o painel na largura toda. **Ignorar o seletor e o rodapé com Anterior/Próximo** que aparecem nela, porque o usuário recusou os dois.

**Observação, não é tarefa:** o ícone do curso aparece **preto** no cartão do curso porque a capa enviada para "Desenvolvimento Web Full Stack" é uma imagem de **1×1 pixel preta** (`Storage/Uploads/cursos/f4222a6c-….png`). É dado, não código: basta trocar a capa na tela do curso.

## Testes (vitest)

- **Quiz:**
  - abrir um quiz mostra as questões depois da resposta da API (o teste precisa reproduzir a corrida: a mudança de estado durante a requisição não pode deixar o "carregando" preso);
  - em erro, aparece "Tentar de novo";
  - trocar de item e voltar usa as questões já carregadas.
- **Janela:**
  - o rodapé tem a classe `modal-rodape`;
  - o topo não tem os botões "Publicar" e "Editar";
  - o ⋮ da janela tem as ações, e Publicar troca o selo sem fechar;
  - o coordenador/Admin não tem ⋮.
- **Módulo atual:** o número tem a classe ou estilo de contraste.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), **sem modo demo**, em 1366px e 1920px:

- **Professor**, em `/app/conteudos/1/modulos/1`:
  - **Quiz:** clicar em "teste conteudo quiz" mostra as questões, em formato de quiz, em menos de 1 segundo. Se o quiz não tiver questões, aparece "Este quiz ainda não tem questões".
  - **Janela:** "Anterior" e "Próximo" ficam com espaço da borda. O topo tem selo, ⋮ e ✕, sem botões de Publicar e Editar. O ⋮ publica e edita.
  - **Módulos:** os 4 cards têm a mesma altura, e o número do módulo selecionado aparece em branco no quadrado roxo.
- **Coordenador/Admin**, em Cursos › Desenvolvimento Web Full Stack › Fundamentos de HTML e CSS:
  - os KPIs ficam compactos (≈ 56px de altura);
  - os cards têm a mesma altura;
  - o número do módulo selecionado aparece;
  - a janela não tem ⋮.
- **Itens 7–10:**
  - não há coluna de módulos nem seletor;
  - o painel ocupa a largura toda;
  - o curso aparece numa linha compacta;
  - não há "Módulo anterior/Próximo módulo";
  - "← Voltar" leva à lista de módulos (professor e coordenador/Admin);
  - a linha de dados tem ícone e texto lado a lado;
  - aparece "0 questões" e "1 questão", nunca "questãoões".
- `npm run lint` e `npm test` sem erros novos.
