# Prompt: tela do módulo: rodapé da leitura com "Anterior" / "Próximo" (só frontend web)

## Pedido do usuário (print de 2026-11-16)

Fazer no rodapé da leitura da tela do módulo o mesmo que foi feito na tela da avaliação (`PROMPT-agente-avaliacao-botoes-anterior-proxima.md`): textos curtos e fixos no lugar de "Item anterior: Boas-vi…" e "Próximo item: teste co…", que ficam cortados.

## Onde está (verificado pelo agente de arquitetura)

`pages/workspace/TelaModuloGestao.jsx`, rodapé da leitura:
- ≈ linha 346: `` itemAnterior ? `Item anterior: ${itemAnterior.titulo}` : "Item anterior" ``
- ≈ linha 350: `Item {indiceItemAberto + 1} de {itensOrdenados.length}`
- ≈ linha 359: `` itemProximo ? `Próximo item: ${itemProximo.titulo}` : "Próximo item" ``

## Tarefa

1. **Botão da esquerda:** `<TbArrowLeft /> Anterior`, com `aria-label="Item anterior"`. O nome do item vizinho vai para o `title` (dica ao passar o mouse), por exemplo `title="Boas-vindas ao modulo"`, quando houver.
2. **Botão da direita:** `Próximo <TbArrowRight />` (item é masculino), com `aria-label="Próximo item"` e o nome do item vizinho no `title`.
3. "Item X de Y" continua no meio. Os botões continuam desativados nas pontas.

**Não alterar:**
- os botões "Módulo anterior / Próximo módulo: …" do pé da lista;
- a versão em tela cheia do celular, além dos mesmos textos curtos;
- o resto da tela.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), **sem modo demo**, como **Admin** e como **Coordenador**, no módulo "Fundamentos da Web Moderna":

- O rodapé mostra "← Anterior", "Item 2 de 7" e "Próximo →", sem texto cortado.
- Passar o mouse mostra o nome do item vizinho.
- No 1º item, "← Anterior" fica desativado. No último, "Próximo →" fica desativado.
- O leitor de tela anuncia "Item anterior" e "Próximo item".
- No celular (≈ 390px), na leitura em tela cheia, aparecem os mesmos textos.
- **Testes (vitest):** ajustar os que procuram "Item anterior: …" / "Próximo item: …" pelo texto. Novo teste: textos "Anterior"/"Próximo", `aria-label` e `title` com o nome do vizinho.
- `npm run lint` e `npm test` sem erros novos.
