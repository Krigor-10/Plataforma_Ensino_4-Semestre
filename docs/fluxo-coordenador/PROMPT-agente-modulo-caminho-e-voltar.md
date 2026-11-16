# Prompt: tela do módulo (Admin e Coordenador): caminho mais limpo e "← Voltar" na margem esquerda (só frontend web)

## Contexto

Projeto CodeRyse Academy, frontend web (`frontend/`, React + Vite). A tela do módulo é `pages/workspace/TelaModuloGestao.jsx` (commits `2324570`, `edda3a7` e `545a7cb`) e é a mesma para Admin e Coordenador.

**O usuário pediu:**
- melhorar o caminho ("breadcrumb") que fica acima do título do módulo;
- levar a seta de voltar para a **coluna livre à esquerda**, como já é feito nas outras telas de detalhe do projeto, para manter a consistência.

**Proposta APROVADA em 2026-11-15:** imagem `modulo-caminho-e-voltar.png`, nesta pasta, metade "PROPOSTA" e quadro "TELA SEM MARGEM SOBRANDO". Os números amarelos e a legenda são só explicação.

**O usuário escolheu manter o caminho dentro da tela**, só que sem a seta. A barra do topo (`BarraTopo.jsx`) **não muda**.

## O que o agente de arquitetura já verificou (não repetir)

- **Padrão do projeto para o voltar:** `components/BotaoVoltar.jsx`, prompts `docs/bugs/PROMPT-agente-botao-voltar-margem-esquerda.md` e `...-seta-sumiu.md`.
  - Em telas largas, o `@container (min-width: 100.5rem)` em `styles/workspace.css` (≈ linha 4014) tira o `.atividades-curso__navegacao` do fluxo e o põe na margem esquerda da coluna, mostrando só "← Voltar".
  - Sem margem, ele fica no fluxo com o texto completo "← Voltar para X".
  - Nome completo no `aria-label` e no `title`.
  - A tela do curso (`PainelCursoGestao.jsx` ≈ linha 345) já usa `<BotaoVoltar destino="Cursos" … />`.
- **A tela do módulo NÃO usa esse padrão.** Em `TelaModuloGestao.jsx` (≈ linhas 203–215), o `<nav className="modulo-gestao__migalha">` tem um botão próprio só com a seta (`.modulo-gestao__migalha-voltar`, `aria-label="Voltar para Módulos"`, chama `voltarParaModulos`), seguido de "Cursos › {curso.titulo} › {módulo}".
- **CSS do caminho:** `.modulo-gestao__migalha*`, em `workspace.css` ≈ linhas 8843–8890. Todos os links estão em `--cor-marca-clara`, e o atual em `font-weight: 600`.
- **Container:** `.modulo-gestao` é `flex` em coluna com `gap: var(--espaco-lg)`. Um filho com `position: absolute` não entra no gap.

## Tarefa (comparar com `modulo-caminho-e-voltar.png`)

1. **"← Voltar" pelo componente padrão** (marcador 1):
   - em `TelaModuloGestao.jsx`, remover o botão `.modulo-gestao__migalha-voltar` de dentro do caminho e colocar `<BotaoVoltar destino="Módulos" onClick={voltarParaModulos} />` como **primeiro elemento** da tela, antes do caminho;
   - em tela larga, ele vai para a margem esquerda **na altura da 1ª linha da tela** (a linha do caminho), pela regra que já existe. Assim fica na mesma altura do "← Voltar" da tela do curso e não "pula" ao entrar no módulo;
   - **não** criar outro CSS de posicionamento: reaproveitar o do `BotaoVoltar`. Se a tela do módulo tiver um ancestral com `position: relative` que mude a referência e tire o botão do lugar, conferir e corrigir só o necessário.
   - Apagar a regra `.modulo-gestao__migalha-voltar`, que fica sem uso.
2. **Caminho mais limpo** (marcador 2): continua "Cursos › {curso.titulo} › {módulo}", sem a seta.
   - **Links** ("Cursos" e o nome do curso): `--cor-texto-suave`; no hover e no foco, `--cor-texto-forte` com sublinhado em `--cor-marca-clara` (`text-underline-offset` ≈ 3px). Foco visível pelo teclado.
   - **Separadores "›":** `--cor-texto-mudo`, com `aria-hidden` (como já está).
   - **Módulo atual:** `--cor-texto-forte`, `font-weight: 700`, `aria-current="page"` (como já está).
   - Tamanho ≈ `0.82rem`, numa linha só. **Nome de curso longo** termina em "…" (`max-width` + `text-overflow: ellipsis`, por exemplo ≈ 280px), com `title={curso.titulo}` para o nome completo.
   - O que cada link faz não muda: "Cursos" vai para `/app/cursos`; o curso chama `voltarParaModulos`.
3. **Título e KPIs** (marcador 3): sem mudança. Só conferir que o espaço entre o caminho e o título fica uniforme (≈ `--espaco-sm`/`--espaco-md`), já que o gap de `--espaco-lg` do `.modulo-gestao` pode ficar grande demais entre essas duas linhas.
4. **Sem margem sobrando** (marcador 4): notebook com menu lateral aberto, tablet e celular.
   - O `BotaoVoltar` fica no fluxo, **acima do caminho**, com o texto completo "← Voltar para Módulos", igual às outras telas.
   - O espaço entre o botão e o caminho deve ser pequeno (≈ `--espaco-sm`), não o `--espaco-lg` do gap.

**Não alterar:**
- `BarraTopo.jsx` (caminho da barra do topo);
- `BotaoVoltar.jsx` e a regra do container;
- a lista, a leitura, os KPIs, a troca de módulo e de item, e o "← Voltar ao módulo" da leitura em tela cheia no celular;
- rotas, dados, permissões e backend;
- a tela do curso (`PainelCursoGestao`) e a tela do Professor.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), **sem modo demo**, como **Admin** e como **Coordenador**, comparando com `modulo-caminho-e-voltar.png`.

- **1920px, menu lateral aberto e fechado:**
  - "← Voltar" na margem esquerda, na linha do caminho, e sem seta dentro do caminho;
  - ao ir do curso para o módulo, o "← Voltar" fica na mesma altura nas duas telas.
- **Caminho:**
  - "Cursos" e o curso em cinza claro, com sublinhado roxo no hover e no foco; o módulo em branco e negrito;
  - um curso de nome longo termina em "…" e mostra o nome completo ao parar o mouse;
  - clicar em "Cursos" vai para a grade; clicar no curso volta à lista de módulos.
- **1366px com o menu aberto e ≈ 390px:**
  - "← Voltar para Módulos" acima do caminho, com pouco espaço entre os dois;
  - nada cortado e sem rolagem horizontal.
- **Teclado:** o Tab passa por Voltar, Cursos e o curso, nessa ordem. O leitor de tela anuncia "Voltar para Módulos".
- **Tema claro:** os links do caminho continuam legíveis.
- **Testes (vitest):** ajustar os que procuram o botão "Voltar para Módulos" (o `aria-label` continua o mesmo); um teste confirmando que o caminho não tem mais o botão só com seta.
- `npm run lint` e `npm test` sem erros novos.
