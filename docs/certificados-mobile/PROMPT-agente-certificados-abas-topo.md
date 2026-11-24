# Prompt: app mobile — Certificados com abas no topo "Em andamento | Conquistados" (só visual)

## Pedido do usuário (2026-11-24, print do celular)

A aba Certificados, reescrita em `4de3b14` ("Certificado automático + Certificados mobile reescrito"), mostra as seções **empilhadas**: "Conquistados" primeiro, depois "Em andamento", e no fim "Aguardando pagamento". O usuário prefere **abas de navegação no topo**, na ordem **"Em andamento" › "Conquistados"**, em vez da rolagem empilhada.

## Onde está (verificado pelo agente de arquitetura)

- `mobile/src/screens/aluno/CertificadosScreen.jsx`:
  - estados `certificadosConquistados` (de `GET /Certificados/meus`), `emAndamento` e `aguardandoPagamento`;
  - estado vazio ≈ linha 162;
  - linha de números `estilos.statsLinha` ≈ linha 172, com os totais Conquistados e Em andamento;
  - as seções vêm em seguida, cada uma com seu título.
- **Não existe** um componente de abas segmentadas reaproveitável no mobile. A única barra de abas é a de navegação (`AlunoTabsNavigator.jsx`).
- **Tema:** `mobile/src/lib/theme.js` (`cores.destaque`, `cores.fundoCartao`, `raios.pilula`…).

## Tarefa

1. **Criar um componente pequeno e reutilizável** `mobile/src/components/AbasSegmentadas.jsx`, um seletor segmentado de 2 ou mais opções:
   - **trilho** com fundo `cores.fundoCartao`, borda fina e cantos `raios.pilula`;
   - **opção ativa** como uma pílula roxa (`cores.destaque`) com o texto branco; as inativas com o texto cinza;
   - cada opção com o **rótulo e um contador**, por exemplo "Em andamento · 3";
   - área de toque mínima de 44px;
   - acessibilidade: `accessibilityRole="tablist"` no trilho, `"tab"` em cada opção e `accessibilityState={{ selected }}`;
   - troca com uma animação curta do fundo ativo (reanimated, já instalado), respeitando `useReducedMotion`.
2. **Na tela Certificados**, logo abaixo do cabeçalho da seção:
   - `AbasSegmentadas` com **"Em andamento"** (1ª) e **"Conquistados"** (2ª), cada uma com o seu total;
   - **remover** a linha `statsLinha` (Conquistados N | Em andamento N), porque os totais passam a ficar nas abas;
   - **remover** os títulos de seção "Conquistados" e "Em andamento", porque a aba já diz onde o aluno está.
3. **Conteúdo de cada aba** (o mesmo de hoje, sem mudar os cartões):
   - **Em andamento:** os cartões em andamento com os selos de situação. **No fim dessa aba**, o grupo recolhido **"Aguardando pagamento · N"** (como hoje), que só aparece se N > 0;
   - **Conquistados:** os cartões compactos dos certificados, com "Ver certificado", compartilhar e copiar link.
4. **Aba inicial:**
   - abre em **"Em andamento"**;
   - se "Em andamento" estiver vazia e houver certificados, abre em **"Conquistados"**;
   - lembrar a última aba escolhida enquanto a tela estiver montada. Não precisa salvar entre sessões.
5. **Estado vazio por aba:**
   - "Em andamento": "Nenhum curso em andamento.";
   - "Conquistados": "Você ainda não tem certificados. Conclua um curso para ganhar o seu.".
   - O estado vazio geral de hoje (nada em nenhum grupo) continua.
6. **Navegação até a aba:** se a tela recebe um parâmetro para abrir um certificado (vindo de uma notificação "Seu certificado foi emitido" ou do selo "Certificado emitido"), ela abre já em **"Conquistados"**. Se esse parâmetro ainda não existir, deixar a tela pronta para recebê-lo (prop ou `route.params.aba`).

**Não alterar:**
- os dados e endpoints;
- a emissão automática e a reserva;
- os cartões, a tela "Ver certificado" e o "Aguardando pagamento";
- as outras abas do app.

## Testes (jest)

- **`AbasSegmentadas`:** renderiza as opções com os contadores, troca a aba no toque e expõe `tablist`/`tab`/`selected`.
- **Certificados:**
  - abre em "Em andamento" e mostra só esse conteúdo;
  - tocar em "Conquistados" mostra os certificados;
  - com "Em andamento" vazia, abre em "Conquistados";
  - "Aguardando pagamento" aparece no fim de "Em andamento";
  - não existe mais a `statsLinha`.

## Critérios de aceite

Verificar no app (Expo), num Android e num iPhone, logado como Aluno Demo:

- **Abas:** no topo de Certificados aparecem as abas **"Em andamento · N" | "Conquistados · 2"**, com a ativa em roxo.
- **Em andamento:** mostra os cursos em andamento e, no fim, "Aguardando pagamento" (se houver).
- **Conquistados:** mostra os 2 certificados ("Introdução à Inteligência Artificial" e "Desenvolvimento Web Full Stack").
- **Limpeza:** os títulos de seção empilhados e a linha de números sumiram.
- **Barra de navegação flutuante:** não cobre o último cartão de nenhuma das abas.
- `npm test` (mobile) e o lint sem erros novos.
