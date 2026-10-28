# Redesign mobile — Rodada 3: alinhamento das grades e tela Meu perfil

Continuação das rodadas 1 e 2 (`PROMPT-agente-mobile.md` e `PROMPT-agente-mobile-rodada2.md`: mesmos tokens e as mesmas regras de dados). Leia `mobile/CLAUDE.md` e `mobile/AGENTS.md`.

| Imagem | O quê |
|---|---|
| `8_meu_perfil.png` | Tela Meu perfil (`screens/aluno/PerfilScreen.jsx`) |

As imagens mostram layout e estilo. **Os dados delas são de exemplo.**

## 1. Grades desalinhadas (erro de layout)

**Sintoma:** no painel "Antes de começar", os blocos da 1ª linha ("Questões" | "Tempo limite") têm larguras diferentes dos da 2ª linha ("Nota máxima" | "Tentativa"). A divisão entre as colunas fica fora de prumo, como se o espaçamento mudasse de uma linha para outra.

**Causa:** em `components/QuizModal.jsx`, os estilos `blocoResumo` (grade 2x2) e `resumoItem` (resumo das fases execução/resultado) usam `minWidth: "45%"` + `flexGrow: 1` dentro de uma linha com `flexWrap: "wrap"` e `gap`. Como a base do flex é a largura do conteúdo, cada linha divide a sobra de um jeito, conforme o texto ("Sem limite" é mais largo que "10"). As colunas nunca batem.

**Correção:** a largura dos blocos não pode depender do conteúdo.
- Monte a grade em **linhas explícitas de 2**: `<View style={{ flexDirection: "row", gap }}>`, com cada bloco em `flex: 1` (base 0, largura igual). Uma linha de blocos abaixo da outra, com o mesmo `gap` na vertical e na horizontal.
- **Número ímpar de blocos** (quiz, sem "Nota máxima" = 3 blocos): a última linha leva o bloco + um `<View style={{ flex: 1 }} />` vazio, para ele manter a largura de meia coluna e ficar alinhado com os de cima. Não deixe o bloco esticar até a largura toda.
- Blocos da mesma linha com a **mesma altura** (`alignItems: "stretch"` na linha, que é o padrão; não fixe altura pelo conteúdo).
- Aplique o mesmo padrão ao `resumoItem` (fases execução/resultado do `QuizModal`).
- Isso é melhor que trocar para `width: "48%"`, porque o `gap` não fica somado à porcentagem.

**Mesmo tipo de erro no resto do app:** passe pelas telas do redesign e corrija qualquer grade ou linha de cartões que use largura pelo conteúdo (`flexGrow` sem `flexBasis: 0`, `minWidth` em porcentagem). Confira em especial:
- "Acesso rápido" do Início (`HomeScreen.jsx`)
- Os cartões de estatística lado a lado de Progresso e Certificados
- A grade de Cursos (`GradeCursosConteudos.jsx`)

Regra geral para todas as telas:
- Espaçamento só pela escala de `theme.js` (`espacamentos.*`), nada de números soltos.
- Margem lateral de 16 em todas as telas.
- O mesmo `gap` entre blocos irmãos.
- Rótulo e valor de blocos lado a lado começando na mesma altura.

## 2. Tela Meu perfil (`screens/aluno/PerfilScreen.jsx`) — `8_meu_perfil.png`

- **Cabeçalho simples:** a tela Perfil (aberta pelo menu, empilhada sobre as abas) usa uma barra só com **seta de voltar + título "Meu perfil"**. Sem o `HeaderGlobal` (logo/busca/sino/avatar), sem a faixa `ScreenIndicator` ("MEU PERFIL") e sem o link "< Voltar" (`BotaoVoltar`) dentro do conteúdo.
  - Hoje são três camadas no topo: cabeçalho, faixa e link.
  - O cabeçalho completo, com a faixa e o troféu, **continua nas 5 abas**. O troféu fica: está reservado para a gamificação futura.
  - Para não ficar metade-metade, aplique a mesma barra simples às outras telas empilhadas: Catálogo, Notificações e Busca. Configure em `AlunoWorkspace.jsx` (`screenOptions`/`options` de cada `AlunoStack.Screen`) e `AlunoHeaderBar.jsx`.
- **Cartão do perfil compacto:** avatar de 72px (iniciais via `obterIniciais`) à esquerda. À direita, nome (20px, semibold), pílula de contorno com o perfil ("Aluno") e e-mail em texto apagado.
- **Dados em grupos**, com o título da seção em rótulo pequeno e maiúsculo e, à direita, um botão de texto roxo **"Editar"** com lápis. O lápis solto que existe hoje sai.
  - **DADOS PESSOAIS:** linhas rótulo/valor separadas por divisória fina: Nome completo, E-mail, Telefone.
  - **ENDEREÇO:** um bloco com ícone de localização e endereço compacto em 2 linhas: `"{Rua}, {Número} — {Bairro}"` e `"{Cidade} – {UF} · CEP {CEP}"`. Se faltar algum pedaço, omita o pedaço e o separador dele, sem deixar vírgula ou traço sobrando. Endereço todo vazio: "Nenhum endereço cadastrado".
  - Os dois "Editar" abrem o **mesmo modal de edição que já existe**. Não crie um modal novo.
- **Formatação:**
  - Telefone com máscara: `(11) 99999-0004` (celular, 11 dígitos) ou `(11) 3333-4444` (fixo, 10 dígitos). Crie `formatTelefone` em `lib/format.js`, ao lado do `formatCep`, com teste em `lib/__tests__/format.test.js`. Sem DDD ou com tamanho diferente: mostre só os dígitos.
  - CEP com `formatCep` (`01001-000`).
  - Rótulo "Numero" → **"Número"**, no texto e no modal de edição. Confira os outros rótulos do perfil com acento.
- **SEGURANÇA DA CONTA:** linha "Alterar senha" com o cadeado num círculo tingido, legenda apagada "Troque sua senha de acesso" e chevron. O comportamento que já existe de abrir os campos de troca de senha não muda.
- **Sair da conta:** fica no fim, **discreto**: só contorno vermelho a ~40% e texto vermelho, sem fundo. Mesma ação de hoje, com a confirmação de saída.
- Sem barra de abas nesta tela, como hoje.

## 3. Pronto quando

- No "Antes de começar", as duas colunas da grade se alinham nas duas linhas, para prova e para quiz (3 blocos, o último com meia largura).
- Nenhuma grade das telas do redesign muda de largura conforme o texto.
- A tela Meu perfil segue a imagem: barra simples, grupos, telefone e CEP formatados, "Número" com acento.
- Catálogo, Notificações e Busca com a mesma barra simples.
- `npx jest` passando (com o teste novo do `formatTelefone`) e `npx expo lint` sem erros novos nos arquivos alterados.
- Teste no Expo em tela pequena (~360px) e grande. Ao terminar, liste os arquivos alterados.
