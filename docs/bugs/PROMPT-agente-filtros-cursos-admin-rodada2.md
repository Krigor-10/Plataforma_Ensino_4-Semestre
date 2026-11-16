# Prompt — Filtros da tela Cursos do Admin, rodada 2: tudo numa linha e sem pular (só frontend web)

## Contexto

Projeto CodeRyse Academy, frontend web (`frontend/`, React + Vite).

A rodada 1 (`PROMPT-agente-filtros-cursos-admin.md`, commit `80950ef`) levou os filtros para a linha das abas, mas **o resultado não ficou bom**. Num vídeo de 30 s, o usuário mostrou que a linha de filtros **pula de lugar** a cada troca de aba ou de filtro: às vezes fica ao lado das abas, às vezes quebra para a linha de baixo, alinhada à direita.

**Causa:** os itens do grupo **aparecem e somem** conforme a aba e o filtro, e cada um muda a largura do grupo:
- o atalho "N sem coordenador", que some quando N = 0;
- o filtro de Modelo, escondido nas abas de venda;
- o "Limpar filtros", que só aparece com filtro.

Quando o grupo passa do espaço livre, o `flex-wrap` joga tudo para baixo.

**Decisão do usuário (imagem aprovada `filtros-cursos-admin-uma-linha.png`, nesta pasta):** abas e filtros **sempre na mesma linha**, com itens **compactos de largura fixa** que **nunca aparecem nem somem**, só ficam ativos ou desativados. Os números amarelos e o quadro lateral da imagem são só explicação.

## O que o agente de arquitetura já verificou (não repetir)

- Tela: `pages/workspace/SecaoCursos.jsx`, visão do Admin, com as abas Em andamento / Encerrados / À venda / Fora da venda e o grupo de filtros criado na rodada 1 (ver o diff de `80950ef`).
- Abas: `.abas-matriculas` (`styles/layout.css` ≈ linha 1138), compartilhadas com outras telas. **Não** mudar a classe base.
- A grade do Coordenador não usa esses filtros.
- A tela real logada **não** foi conferida, porque o navegador estava na tela de login. O vídeo mostra o problema.

## Tarefa (só na visão do Admin)

1. **Uma linha só, estável:** abas à esquerda e grupo de filtros à direita (`margin-left: auto`), **sem quebra de linha no desktop**. Quebrar só abaixo de um breakpoint de tela estreita (≈ 900px). Lá o grupo vai inteiro para baixo das abas, também com largura fixa.
2. **Abas mais compactas, só nesta tela:** modificador próprio, por exemplo `.abas-matriculas--compacta`, com fonte de ≈ 0.82rem e padding de ≈ 7px 13px nas abas, como na imagem. Mesmo visual, com as cores e o destaque da aba ativa.
3. **Grupo de filtros com 3 itens fixos, sempre presentes e com largura fixa:**
   - **Coordenador** (≈ 230px): "Coordenador: Todos", **"Sem coordenador (N)"**, com N contando a aba aberta, e os nomes. Com filtro ativo, borda `--cor-marca-clara`.
   - **Modelo** (≈ 150px): "Modelo: Todos", "Grátis" e "Acompanhado". Nas abas **À venda** e **Fora da venda**, fica **desativado** mostrando "Modelo: Pago", em vez de sumir. Ao entrar nessas abas, o filtro de modelo é zerado (regra da rodada 1).
   - **Limpar** (34×34px): botão só com ícone "✕", `aria-label="Limpar filtros"` e `title` igual. **Desativado** sem filtro ou busca ativa; ativo com qualquer um.
   - O texto que não couber nos selects termina em reticências e mostra o texto inteiro no `title`.
4. **Remover o chip "N sem coordenador"** da rodada 1. A função continua pela opção "Sem coordenador (N)" do select.
5. Mantém da rodada 1:
   - selo "Sem coordenador" no card;
   - zerar o filtro de modelo nas abas de venda;
   - `limparFiltros` limpando coordenador, modelo e busca.
6. Acessibilidade: `<label>` ligado a cada select (pode ser `visualmente-oculto`, já que o prefixo "Coordenador:" ou "Modelo:" está no texto) e `disabled` de verdade no Modelo e no Limpar, quando for o caso.

**Não alterar:** as regras e contagens das abas, a busca e o "Novo curso" no topo, os cards, a grade do Coordenador e a classe base `.abas-matriculas` usada em outras telas.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo, como Admin, comparando com a imagem:

- No desktop, abas e filtros ficam **sempre na mesma linha**.
- Trocar entre as 4 abas, escolher "Sem coordenador", escolher um coordenador e limpar: **nenhum item muda de posição ou de largura** e nada quebra para a linha de baixo.
- Nas abas À venda e Fora da venda, o Modelo aparece desativado como "Modelo: Pago".
- O ✕ fica desativado sem filtro e ativo com filtro, e limpa tudo.
- "Sem coordenador (N)" mostra a contagem da aba aberta.
- Abaixo de ≈ 900px, o grupo desce inteiro para baixo das abas, sem cortar.
- Professores, Coordenadores e as outras telas com abas não mudam.
- Testes (vitest): Modelo desativado nas abas de venda, ✕ desativado ou ativo, contagem do "Sem coordenador (N)" e ausência do chip antigo. `npm run lint` e `npm test` sem erros novos.
