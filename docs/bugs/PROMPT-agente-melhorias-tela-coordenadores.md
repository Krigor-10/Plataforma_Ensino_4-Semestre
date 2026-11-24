# Prompt — Melhorias de organização na tela Coordenadores (Admin, web)

## Contexto

Projeto CodeRyse Academy, frontend web (`frontend/`, React + Vite). Tela: Admin › Gestão › Coordenadores.

O usuário pediu sugestões de componentes, espaçamento, hierarquia e organização para esta tela e validou o resultado por imagem, nesta pasta:
- `coordenadores-hoje.png`: como está;
- `coordenadores-proposta-ajustada.png`: **aprovada**. À esquerda sem seleção, à direita com 2 marcados.

**Decisões do usuário:**
- Aplicar a reorganização e manter a linha de apoio embaixo do título.
- **As cores ficam como estão hoje**: avatares roxos, caixas de seleção nativas, selos no estilo neutro já existente, sem fundo colorido na linha marcada. Nenhuma cor nova nesta tela.

## O que o agente de arquitetura já verificou (não repetir)

Tudo em `frontend/src/pages/workspace/SecaoCoordenadores.jsx`, no estado atual, já com a seleção em lote e o hook `hooks/useSelecaoEmLote.js`:
- Header (≈ linha 383 em diante): título, busca `type="search"` (≈ 400) e "Cadastrar coordenador".
- `.linha-abas-status` (≈ 413): abas + `.indicadores-status` com "N cadastrados / N ativos / N inativos" (≈ 439), que repetem as contagens das abas.
- `.barra-filtros` (≈ 446): "Limpar filtros", que só limpa a busca (`limparFiltros`, ≈ 207), mais `.barra-filtros__selecao` com o contador e as ações em lote. Sem filtro e sem seleção, essa linha fica com um botão desativado sozinho.
- Tabela:
  - colunas: caixa, "Coordenador", "Curso sob supervisao" (≈ 491), "Status" (≈ 536, sempre igual à aba aberta) e ações; `colSpan={5}` na linha vazia (≈ 499);
  - na coluna de cursos, o primeiro curso + `+N`, ou `<span className="tabela-matricula__vazio">Sem curso</span>` (≈ 529–533).
- `obterCursosDoCoordenador` (≈ 97) devolve os cursos do coordenador.
- Estilos de tela já escopados em `.tela-coordenadores` (`styles/workspace.css` ≈ 3677).

A tela real logada **não** foi conferida, porque o navegador estava na tela de login.

## Tarefa

1. **Linha de apoio:** embaixo do título, o texto "Quem supervisiona cada curso", no estilo de texto suave já usado em subtítulos.
2. **Indicadores:** trocar os três por um só, "N sem curso", com `Insignia` neutro, contando os coordenadores da aba aberta sem nenhum curso.
   - Funciona como atalho de filtro: é um botão com `aria-pressed` que mostra só quem está sem curso, e um segundo clique desfaz.
   - Quando ativo, usa um destaque leve com as cores existentes (borda `--cor-borda-forte`, sem cor nova).
   - Some quando o número for 0.
3. **Linha do "Limpar filtros":** remover. A tabela sobe.
   - Para limpar a busca, mostrar um botão "×" dentro do campo (`aria-label="Limpar busca"`), só quando houver texto, chamando `limparFiltros`. Esconder o "×" nativo do `type="search"` para não aparecerem dois.
   - Se o filtro "sem curso" estiver ativo, `limparFiltros` não precisa desligá-lo: ele tem o próprio botão.
4. **Ações em lote:** o contador "N coordenador(es) selecionado(s)" e os botões "Inativar/Reativar selecionados" e "Limpar seleção" vão para a **direita da `.linha-abas-status`** (`margin-left: auto`), só quando houver seleção, sem mudar a altura da linha. Em tela estreita, quebram para baixo.
5. **Tabela:**
   - remover a coluna "Status" e ajustar o `colSpan` da linha vazia. A ação individual de inativar/reativar pelo menu ⋮ continua;
   - o título "Curso sob supervisao" vira **"Cursos supervisionados"**, inclusive no `data-label`;
   - célula de cursos: "N curso(s)" em destaque e, embaixo, em texto menor e suave, "<primeiro curso> e mais N" (ou só o nome, se for 1);
   - sem curso: `Insignia` neutro "Sem curso";
   - linhas um pouco mais baixas, só em `.tela-coordenadores`, reduzindo o padding vertical das células da tabela. Avatar, cores e caixas sem mudança.
6. Tudo escopado em `.tela-coordenadores`. **Não alterar** Professores, Alunos, a tabela base (`.tabela-dados`), `Insignia` nem as cores globais.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo, como Admin, comparando com `coordenadores-proposta-ajustada.png`:

- Título com a linha de apoio, e a busca com "×" só quando há texto.
- Na linha das abas, só "N sem curso", sem os três indicadores. O clique filtra e o segundo clique volta. Com 0, o indicador some.
- Não existe mais a linha do "Limpar filtros", e a tabela começa logo abaixo das abas.
- Marcar coordenadores mostra o contador e as ações à direita das abas, sem nada se mexer. Inativar e reativar em lote continuam funcionando.
- A tabela não tem coluna Status. "Cursos supervisionados" mostra "9 cursos / Ciência de Dados Aplicada e mais 8" e "Sem curso" neutro.
- Cores iguais às de hoje.
- Em ≈ 400px, nada é cortado.
- Professores e Alunos sem mudança.
- Testes (vitest) do filtro "sem curso", do "×" da busca e da célula de cursos. `npm run lint` e `npm test` sem erros novos.
