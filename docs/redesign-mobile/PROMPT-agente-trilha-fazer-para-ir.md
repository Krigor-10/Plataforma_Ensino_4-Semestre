# Prompt: app mobile — trilha do curso: botão "Fazer" passa a ser "Ir" (correção de texto)

## Pedido do usuário (2026-11-25, print da trilha já com o `PROMPT-agente-trilha-curso-compacta.md` aplicado)

No cartão "Avaliação liberada", trocar o rótulo do botão **"Fazer ›"** por **"Ir ›"**.

## Onde está (verificado)

- `mobile/src/screens/aluno/ConteudosScreen.jsx` ≈ linha 764: `<Text style={estilos.avisoAvaliacaoPilulaTexto}>Fazer</Text>`.
- `mobile/src/screens/aluno/__tests__/ConteudosScreen.test.jsx` ≈ linhas 140 e 147: o título do teste e `getByText("Fazer")`.

## Tarefa

1. Trocar o texto **"Fazer"** por **"Ir"** no botão do cartão "Avaliação liberada". O ícone, a cor, o tamanho e a navegação continuam iguais.
2. **Acessibilidade:** o `accessibilityLabel` continua "Ir para a avaliação {título}". Se ele usar "Fazer", ajustar para esse texto.
3. **Teste:** atualizar `ConteudosScreen.test.jsx` (o título do teste e `getByText("Ir")`).
4. **Prompt anterior:** em `PROMPT-agente-trilha-curso-compacta.md`, trocar as menções a "Fazer ›" por "Ir ›", para o documento ficar coerente.

**Não alterar** nada além do rótulo.

## Critérios de aceite

- **Rótulo:** na trilha de "Desenvolvimento Web Full Stack", o cartão "Avaliação liberada" mostra o botão verde **"Ir ›"**, e o toque continua abrindo Avaliações no curso.
- `npm test` (mobile) sem falhas.
