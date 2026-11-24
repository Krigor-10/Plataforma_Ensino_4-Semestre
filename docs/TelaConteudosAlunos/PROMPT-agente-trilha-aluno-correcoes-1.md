# Prompt: trilha do aluno — módulos em pilha com seta à direita (correção 1, frontend web, só visual)

## Pedido do usuário (2026-11-24, print do aluno)

`PROMPT-agente-trilha-aluno-modulo-em-tela-propria.md` foi aplicado no commit `9de13eb`. Na tela do curso do aluno, os módulos aparecem em **2 colunas**, lado a lado. O usuário quer, **para manter a consistência** com a tela de curso do professor e do coordenador:
- os módulos **em pilha**, um embaixo do outro;
- **no final de cada linha, a seta apontando para a direita (›)**.

## Onde está (verificado pelo agente de arquitetura)

- **CSS:** `.modulos-curso-aluno` (`styles/workspace.css` ≈ linha 9633) é uma grade de 1 coluna que vira **2 colunas a partir de 1024px** (`@media (min-width: 1024px)`, ≈ linha 9640). Itens em `.modulos-curso-aluno__item` (≈ linha 9646); seta em `__seta` (≈ linha 9741); check em `__check` (≈ linha 9746).
- **Componente:** `frontend/src/pages/workspace/SecoesAluno.jsx` ≈ linhas 2069–2110 (lista "Módulos do curso").
- **Referência de consistência:** a lista de módulos da tela do curso do **professor** (Acadêmico › Conteúdos › curso). É uma linha por módulo com número, título, contagens e barra à direita, % e a seta ›.

## Tarefa

1. **Uma coluna sempre:** remover o `@media (min-width: 1024px)` que põe `.modulos-curso-aluno` em 2 colunas. Os módulos ficam em pilha, na largura do conteúdo, com o mesmo espaço entre linhas de hoje (`--espaco-md`).
2. **Linha do módulo**, no padrão da lista do professor:
   - **à esquerda:** o quadrado com o número (ou o cadeado, se bloqueado) e o título (uma linha, com reticências);
   - **à direita, nesta ordem:**
     - o texto "N de M concluídos";
     - a mini barra (≈ 110px);
     - a %;
     - o **✓ verde** quando 100%;
     - por último, a **seta › apontando para a direita**;
   - altura igual em todas as linhas (≈ 64px), com os fundos sólidos e o "relevo duplo" de hoje;
   - o módulo **em andamento** continua destacado em roxo;
   - **bloqueado:** cadeado no lugar do número e "Conclua o módulo NN para liberar" no lugar das contagens; sem barra e **sem seta** (ou seta apagada), não clicável, como hoje.
3. **A seta é sempre o último elemento** da linha (alinhada à direita) em todos os módulos liberados, inclusive os concluídos. Hoje o ✓ aparece no lugar dela.
4. **Abaixo de 768px:** a linha pode quebrar as contagens para baixo do título. A seta continua no fim, centralizada na vertical. Sem rolagem lateral.

**Não alterar:**
- o cartão do curso (selo "🏆 Certificado emitido", botão "Continuar");
- o aviso de avaliação liberada;
- a regra de bloqueio;
- o clique (abre a tela do módulo);
- a tela do módulo do aluno;
- as telas do professor e do coordenador.

## Testes (vitest)

- A lista de módulos do aluno é uma coluna (sem a regra de 2 colunas).
- Cada módulo liberado tem a seta › como último elemento; o concluído tem ✓ **e** seta.
- O bloqueado não tem seta clicável.
- Os testes atuais de `SecoesAluno.test.jsx` continuam passando.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173), **sem modo demo**, logado como aluno, em 1366px, 1920px e 390px:

- **Lista:** em Conteúdos › Desenvolvimento Web Full Stack, os módulos 01 e 02 aparecem **um embaixo do outro**, na largura toda.
- **Linha:** cada módulo mostra à direita "5 de 5 concluídos", a barra, "100%", ✓ e **›** no fim.
- **Visual:** igual à lista de módulos do professor (mesmo alinhamento, altura e seta).
- **Bloqueado:** um módulo bloqueado aparece com cadeado e sem seta.
- `npm run lint` e `npm test` sem erros novos.
