# Prompt: tela da avaliação: botões "Anterior" / "Próxima" no pé da questão (correção, só frontend web)

## Problema relatado pelo usuário (print de 2026-11-16)

No pé da questão da tela da avaliação (`pages/workspace/TelaAvaliacaoGestao.jsx`, `footer.avaliacao-gestao__questao-rodape`), os botões mostram o número da questão vizinha:
- na Questão 1, o botão da esquerda aparece como **"← Questão 0"** (desativado), que não existe;
- o da direita aparece como **"Questão 2 →"**.

O usuário pediu textos fixos.

## Decisão (usuário + arquitetura)

Usar **"← Anterior"** e **"Próxima →"**:
- "Voltar" não, porque já é o botão "← Voltar" da margem, que sai da tela;
- é o mesmo padrão de "Avaliação anterior / Próxima avaliação" e "Item anterior / Próximo item";
- "Questão X de Y" continua no meio.

## Tarefa

1. No `footer.avaliacao-gestao__questao-rodape`:
   - botão da esquerda: `<TbArrowLeft /> Anterior`, com `aria-label="Questão anterior"`;
   - botão da direita: `Próxima <TbArrowRight />`, com `aria-label="Próxima questão"`.
   - Os dois são desativados nas pontas, como já estão.
   - Nunca mostrar "Questão 0".
2. **Conferir o destaque do índice:** no print, "Questão 1" (aberta) **e** "Questão 5" aparecem com contorno ao mesmo tempo. Só a questão aberta (`aria-current`) pode ficar destacada.
   - Se o contorno da outra for o foco do teclado ou do clique que ficou depois de navegar, ele deve aparecer só com `:focus-visible` (teclado), nunca depois de um clique de mouse.
   - Se for o `:hover`, tudo bem.

**Não alterar:** a navegação entre avaliações, o índice (além do destaque), as setas ←/→ do teclado e o resto da tela.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), **sem modo demo**, como **Admin** e como **Coordenador**, em "Apostila - Inteligência Artificial":

- Na Questão 1: "← Anterior" desativado e "Próxima →" ativo. Na Questão 5: "Próxima →" desativado.
- "Questão X de Y" continua no meio, e nunca aparece "Questão 0".
- Depois de clicar em "Questão 5" e voltar para a 1 pelo "← Anterior" ou pelo índice, só a questão aberta fica destacada.
- O leitor de tela anuncia "Questão anterior" e "Próxima questão".
- **Testes (vitest):** ajustar os testes que procuram "Questão N" nos botões. Novo teste: os textos "Anterior"/"Próxima", os `aria-label` e a ausência de "Questão 0".
- `npm run lint` e `npm test` sem erros novos.
