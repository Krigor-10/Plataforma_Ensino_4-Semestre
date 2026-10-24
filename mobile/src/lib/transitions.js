// Duracao unica de transicao reaproveitada por toda animacao de navegacao do
// app (entrada de tela, selecao de aba) - mesmo valor ja validado em producao
// pelo slide do MenuLateral.jsx (Animated.timing, 220ms), dentro da faixa
// 180-280ms recomendada para feedback perceptivel sem parecer lento.
export const DURACAO_TRANSICAO = 220;
