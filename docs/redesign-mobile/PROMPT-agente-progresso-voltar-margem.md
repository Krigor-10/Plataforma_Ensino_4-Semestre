# Prompt: app mobile — Progresso › detalhe do curso: "Voltar" grudado na borda e conteúdo cortado embaixo dele (correção pequena)

## Pedido do usuário (2026-11-25, print do detalhe do curso em Progresso)

"Ajustar esse botão de VOLTAR, está grudado na borda da tela."

No mesmo print, ao rolar, o cartão do curso passa **por baixo** do "Voltar" e aparece cortado: a linha "2/2 módulos · 4/4 conteúdos · 2,0 nota final" fica sem o topo. É o mesmo problema que a trilha do curso tinha.

## Causa (verificada pelo agente de arquitetura)

- `mobile/src/screens/aluno/ProgressoScreen.jsx` ≈ linha 279: `<BotaoVoltar onPress={onVoltar} style={estilos.botaoVoltar} />`, com `botaoVoltar: { marginHorizontal: espacamentos.xl, marginTop: espacamentos.md }` (≈ linha 413).
- `mobile/src/components/BotaoVoltar.jsx` tem no estilo base `marginLeft: -6`, um ajuste ótico para alinhar o chevron.
- **No React Native, `marginLeft` tem prioridade sobre `marginHorizontal`, seja qual for a ordem no array de estilos.** Por isso o `marginHorizontal: xl` da tela é ignorado à esquerda, e o botão fica com −6px, colado na borda.
- O "Voltar" fica **fora** do `ScrollView` (fixo), e o conteúdo rola por baixo dele, cortado.

## Tarefa

1. **Mover o `BotaoVoltar` para dentro do `ScrollView`**, como o primeiro item do `contentContainerStyle` `estilos.corpo` (que já tem `padding: espacamentos.xl`). Ele rola junto com o conteúdo, e nada fica cortado embaixo dele.
2. **Margem:**
   - remover `estilos.botaoVoltar` da tela (ou deixar só `marginTop: 0`/`marginBottom: -espacamentos.xs`, se precisar de ajuste vertical);
   - dentro do `corpo`, o `marginLeft: -6` do componente passa a funcionar como foi pensado: o chevron fica alinhado à borda esquerda dos cartões (cerca de 18px da borda da tela, não colado).
3. **No `BotaoVoltar.jsx`**, acrescentar um comentário curto: o `marginLeft: -6` vence `marginHorizontal` vindo de `style`; quem precisar afastar da borda deve colocar o botão dentro de um contêiner com padding ou passar `marginLeft` explícito. **Não** mudar o visual do componente.
4. **Conferir** se outra tela usa `BotaoVoltar` com `marginHorizontal` (hoje só o Progresso importa; Perfil, Notificações e Catálogo aparecem no comentário do componente). Se usar, aplicar a mesma correção.

**Não alterar:**
- o `onVoltar`;
- o cabeçalho do curso, o cartão de certificado e os módulos;
- a lista da visão geral do Progresso.

## Testes (jest)

- No detalhe do curso, o `BotaoVoltar` é renderizado **dentro** do `ScrollView` (por exemplo, `getByLabelText("Voltar")` é descendente do scroll) e continua chamando `onVoltar`.

## Critérios de aceite

Verificar no app (Expo; web no iPhone e um Android):

- **Alinhamento:** em Progresso › um curso, o "‹ Voltar" fica alinhado com a borda esquerda dos cartões, e não colado na borda da tela.
- **Rolagem:** ao rolar, o "Voltar" sobe junto e o cartão do curso (anel, título e "2/2 módulos · 4/4 conteúdos · nota final") nunca aparece cortado embaixo dele.
- `npm test` (mobile) sem falhas novas.
