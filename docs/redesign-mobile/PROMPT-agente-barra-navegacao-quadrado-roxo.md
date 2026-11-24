# Prompt: app mobile — barra de navegação flutuante com a aba ativa em quadrado roxo (variante B)

## Pedido do usuário (2026-11-24)

O usuário mandou uma referência com 3 estilos de barra de navegação, todos numa barra preta, flutuante e arredondada:
- 1º: ícone + rótulo, com a aba ativa em branco;
- 2º: um quadrado roxo grande em destaque;
- 3º: só ícones, com a aba ativa numa pílula escura.

Ele perguntou se dá para deixar a barra do app assim. Viu a imagem `docs/redesign-mobile/barra-navegacao-opcoes.png` e escolheu a **variante B**: **a aba ativa vira um quadrado roxo com o ícone branco**, e as outras ficam com ícone e rótulo em cinza.

Isto faz parte da avaliação de "mais vida e estilo" do mobile (`docs/redesign-mobile/PENDENTE-segunda-23-11-auditoria-ux-ui-mobile.md`).

## Onde está (verificado pelo agente de arquitetura)

- **Barra:** `mobile/src/screens/aluno/AlunoTabsNavigator.jsx`. É um **componente próprio**, `CustomTabBar`, passado em `tabBar={(props) => <CustomTabBar {...props} />}` (≈ linha 125).
  - Cada aba é um `ItemAba` (≈ linha 40), que já faz um "pulso" de escala no ícone com **react-native-reanimated** (já instalado, 4.5.1) e respeita `useReducedMotion`.
- **Abas** (≈ linhas 29–33, Ionicons): Início (`home`), Cursos (`school`), Avaliações (`clipboard`), Progresso (`bar-chart`) e Certificados (`ribbon`), cada uma com versão `-outline` e preenchida.
- **Estilos de hoje** (≈ linha 180):
  - `tabBar`: faixa encostada embaixo, com `borderTop` e `cores.fundoCartao`;
  - `tabPilula` / `tabPilulaAtiva`: pílula roxa a 15%;
  - `tabTexto`: 10px.
- **Área segura:** já usa `useSafeAreaInsets()` (`insets.bottom`).
- **Tema:** `mobile/src/lib/theme.js` (`cores.destaque` #7b2ff7, `cores.textoRotulo`, `raios`, `espacamentos`).
- **Não precisa de biblioteca nova.**

## Tarefa

1. **Barra flutuante:**
   - o `CustomTabBar` deixa de ser uma faixa encostada na borda e vira uma **barra flutuante**: margem de 14px nas laterais;
   - embaixo, `insets.bottom + 10px`, ou seja, acima do gesto do iPhone e Android;
   - **cantos de 24px**, **fundo preto** (`#000`, ou um token novo `cores.fundoBarra` em `theme.js`) e sombra suave (iOS `shadow*`, Android `elevation`);
   - **sem** `borderTop`;
   - altura ≈ 72px.
2. **Conteúdo não fica escondido:** como a barra passa a flutuar sobre as telas, toda tela das abas precisa de **espaço embaixo** igual à altura da barra mais a margem e `insets.bottom`. Fazer isso num ponto só (por exemplo `sceneStyle`/`contentStyle` do navegador, ou um hook `useAlturaBarraAbas()` usado pelas `ScrollView`/`FlatList` em `contentContainerStyle.paddingBottom`). Nenhuma lista pode ter o último item escondido atrás da barra.
3. **Abas inativas:** ícone `-outline` de 24px em cinza (`cores.textoRotulo`) com o rótulo embaixo (11px, peso 600, cinza), com espaço entre ícone e rótulo. Área de toque mínima de 44px.
4. **Aba ativa, em quadrado roxo:**
   - um quadrado de **56×56px**, cantos de 18px, fundo `cores.destaque` e uma sombra roxa leve;
   - dentro, o **ícone preenchido branco** de 24px, **sem rótulo** visível. O rótulo fica no `accessibilityLabel`, que já existe, e a aba mantém `accessibilityState={{ selected: true }}`;
   - o quadrado pode ultrapassar um pouco a altura da barra, centralizado na vertical, desde que não seja cortado.
5. **Animação:**
   - ao trocar de aba, o quadrado **muda para a aba tocada** com uma transição curta, de ≈ 200ms: um `View` absoluto animado com reanimated que desliza até a posição da aba (`withTiming`), ou um fade e escala entre as abas;
   - manter o "pulso" do ícone;
   - **respeitar `useReducedMotion`**: sem deslizar, só trocar de lugar.
6. **Tema claro**, se o app tiver: a barra fica com fundo `#ffffff` e sombra; o quadrado continua roxo e as abas inativas ficam em cinza escuro.
7. **Não alterar:**
   - as rotas, a ordem das abas e o comportamento do toque (`navigation.navigate`, inclusive o comportamento atual quando a aba já está ativa);
   - os ícones escolhidos;
   - o cabeçalho (`HeaderGlobal`);
   - as outras telas.

## Testes (jest)

- `CustomTabBar` renderiza as 5 abas.
- A aba ativa tem o quadrado (estilo ou testID) e **não** mostra o rótulo visível, mas mantém `accessibilityLabel` e `selected`.
- As inativas mostram ícone e rótulo.
- Tocar numa aba chama a navegação para a rota certa.
- A barra respeita `insets.bottom` (mock do safe area).

## Critérios de aceite

Verificar no app (Expo) num **Android** e num **iPhone** (ou nos simuladores), em tela pequena (≈ 360px) e grande:

- **Barra:** a barra flutua acima da borda, com cantos arredondados, fundo preto e sombra, acima do gesto do sistema.
- **Aba ativa:** fica num quadrado roxo com o ícone branco, e o quadrado se move ao trocar de aba. Com "reduzir movimento" ligado, só troca, sem deslizar.
- **Rótulos:** os rótulos das inativas cabem sem cortar, inclusive "Certificados" e "Avaliações" em 360px. Se não couberem, reduzir para 10px antes de cortar.
- **Conteúdo:** o último item de cada lista (Cursos, Avaliações, Progresso, Certificados, Início) aparece inteiro acima da barra.
- **Navegação e leitor de tela:** funcionam como antes.
- `npm test` (mobile) e o lint sem erros novos.
