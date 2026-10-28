# Redesign do app mobile do aluno — CodeRyse Academy

Você vai aplicar um redesign visual no app mobile do aluno (`mobile/`, React Native + Expo). Leia antes `mobile/CLAUDE.md` e `mobile/AGENTS.md`.

**Referência visual:** as imagens desta pasta (`docs/redesign-mobile/`), geradas no Google Stitch (projeto "CodeRyse Academy - Redesign"). Elas mostram layout, hierarquia e estilo; **os dados das imagens são de exemplo**. Siga as regras de dados abaixo e não invente informação.

| Imagem | Tela |
|---|---|
| `1_inicio.png` | Aba 1: Início (dashboard) |
| `2a_cursos_grade.png` | Aba 2: Cursos, grade de seleção |
| `2b_cursos_trilha.png` | Aba 2: Cursos, trilha do curso (depois de tocar num curso) |
| `3_avaliacoes.png` | Aba 3: Avaliações |
| `4_progresso.png` | Aba 4: Progresso (a barra de baixo dela ainda é a antiga, com 5 abas: ignore) |
| `5_certificados.png` | Aba 5: Certificados (a barra e a seta de voltar dela são antigas: ignore) |

## 1. Navegação nova (`AlunoTabsNavigator.jsx`, `MenuLateral.jsx`, `lib/routes.js`)

Barra de baixo com **5 abas, nesta ordem**:

| # | Rótulo | Ícone Ionicons | Tela |
|---|---|---|---|
| 1 | Início | `home` / `home-outline` | `HomeScreen.jsx` |
| 2 | Cursos | `school` / `school-outline` | **a atual `ConteudosScreen.jsx`, renomeada** |
| 3 | Avaliações | `clipboard` / `clipboard-outline` | `AvaliacoesScreen.jsx` |
| 4 | Progresso | `bar-chart` / `bar-chart-outline` | `ProgressoScreen.jsx` |
| 5 | Certificados | `ribbon` / `ribbon-outline` | `CertificadosScreen.jsx` |

- A aba "Cursos" antiga (`CursosScreen.jsx`) **sai da barra**. Não apague o arquivo sem confirmar com o usuário (veja a seção 4).
- Menu lateral (☰): ficam **Meu perfil** e **Catálogo**. Saem "Cursos" e "Certificados", que viraram abas.
- Aba ativa: ícone e rótulo em `#7b2ff7`, com fundo em pílula `rgba(123,47,247,0.15)`.

## 2. Tokens visuais (`lib/theme.js`)

Atualize os valores e mantenha os nomes das chaves que as telas já usam:

- Fundo da tela `#111319`; cartão `#1d1f26` (cartão em destaque `#22242e`)
- Borda do cartão `1px rgba(123,47,247,0.2)`; divisória `rgba(255,255,255,0.06)`
- Marca `#7b2ff7`; acento `#9d67ff`
- Texto `#e2e2ea`; texto suave `#ccc3d9`; rótulo/apagado `#958da2`
- Status (iguais aos de hoje): sucesso `#22c55e`, aviso `#f59e0b`, erro `#ef4444`, info `#3b82f6`. Pílula = fundo da cor a 12–15% + texto na cor + borda a 30%.
- Raios: cartões 16, botões 10–12, pílulas 999. Toque mínimo de 44px. Margem lateral de 16.
- Barra de progresso: trilho 6–8px, preenchimento roxo (verde quando 100%).
- Fonte: as imagens usam Inter. Adicionar `@expo-google-fonts/inter` é opcional; se não adicionar, mantenha a fonte do sistema.

## 3. Telas

**Início (dashboard)** (`1_inicio.png`)
- Saudação "Olá, {primeiro nome} 👋" + subtítulo. **Sem selo de nível, XP ou gamificação.**
- Cartão "Continuar estudando": curso e módulo atuais, anel de progresso e botão "Continuar aula", que leva à trilha do curso na aba Cursos.
- "Acesso rápido" em grade 2x2: Cursos, Avaliações, Progresso, Certificados.
- "Avaliações disponíveis" (até 2, link "Ver todas" para a aba Avaliações). Rodapé de cada uma: "Tempo limite: X min" ou "Sem tempo limite" · "Tentativa N de M". **Sem prazos ("Vence em…").**
- "Meus cursos": carrossel horizontal com nome, % e barra.

**Cursos: grade** (`2a_cursos_grade.png`). É a etapa de seleção de curso que já existe em `ConteudosScreen` (`GradeCursosConteudos.jsx`), restilizada:
- Título "Cursos", subtítulo "Escolha um curso para continuar sua trilha" e botão de contorno "Ver catálogo".
- **Grade de 2 colunas** (mantenha a grade atual). Cartão: capa (`resolverImagemCurso`), nome (2 linhas), barra + %, pílula de status (Em andamento / Não iniciado / Concluído / Pagamento pendente) e chevron.
- Matrícula aguardando pagamento: pílula âmbar "Pagamento pendente" + botão de texto "Confirmar pagamento", com o mesmo fluxo que hoje está em `CursosScreen.jsx`.

**Cursos: trilha** (`2b_cursos_trilha.png`)
- Cabeçalho com seta de voltar (volta para a grade) e nome do curso. Abaixo, um resumo com capa pequena e "X% concluído". Sai o seletor "Trocar curso".
- Cartão "Continue de onde parou" com botão "Abrir".
- Módulos em sanfona: pílula Concluído/Em andamento, barra com %. Módulo bloqueado com cadeado e "Conclua o módulo anterior para desbloquear".
- Itens do módulo com ícone por tipo (PDF, vídeo, link), ✓ verde quando concluído e botão de contorno "Concluir". **Quiz** recuado logo abaixo do conteúdo a que pertence, com "Concluído" ou botão "Responder". **Quiz não mostra nota.**

**Avaliações** (`3_avaliacoes.png`)
- Lista **só Prova e Exercício** (como hoje: o quiz fica na trilha do curso). Selo do tipo (PROVA / EXERCÍCIO).
- Resumo **discreto**: uma linha fina "2 disponíveis · 3 concluídas · Média 8,4", sem cor, sem ícone e sem cartões grandes.
- Filtro segmentado: Todas | Disponíveis | Concluídas.
- Cartão: tipo, título, módulo, pílula de status, "Tempo limite · Tentativa N de M", botão "Iniciar"/"Continuar". Concluída: "Resultado: Nota X / Y" + "Ver revisão". **Use a mesma cor para todas as notas**, ou verde só quando ≥ 7,00, a nota mínima do curso. Não deixe uma verde e outra neutra sem regra.

**Progresso** (`4_progresso.png`)
- Seletor de curso, anel grande com o % geral, "Média" e "Módulos X de Y".
- Cartão da regra do certificado: "Seu certificado é liberado automaticamente com progresso 100% e média final ≥ 7,00", com os dois requisitos marcados (atingido em verde / pendente apagado).
- Lista de módulos com % e barra: verde "Módulo concluído", roxo "Em andamento" e cadeado nos bloqueados.

**Certificados** (`5_certificados.png`)
- Agora é aba: sem seta de voltar, com o cabeçalho padrão das abas.
- Linha de resumo (Conquistados / Cursos) + aviso "O certificado é liberado automaticamente quando você conclui 100% do curso com média final ≥ 7,00." **O aluno nunca solicita o certificado.**
- Certificado liberado como cartão horizontal: "CERTIFICADO DE CONCLUSÃO", "Outorgado a", nome, curso, data de emissão (`emitidoEm`), código de verificação (`codigoVerificacao`). Botões "Compartilhar" e "Baixar PDF" só se já existir ação para eles; se não existir, deixe só o que já funciona.
- "Em andamento": certificados bloqueados com cadeado, barra de progresso e "Conclua o curso para desbloquear".

## 4. Regras de dados (importante)

- **Nada fictício.** Todo número vem do snapshot já carregado (`AlunoWorkspace` / `loadAlunoSnapshot`). Se um dado não existir, omita o elemento.
- **Não existem no backend/mobile hoje**, então não mostre: categoria do curso (tags "Frontend/Backend" das imagens), carga horária, nome do professor no cartão, contagem de aulas, nível/XP, prazo/vencimento de avaliação.
- Matrícula é sempre automática: não crie nenhum estado de "aguardando aprovação". O único pendente é o de **pagamento**.
- `CursosScreen.jsx` sai da barra. As funções dela que continuam necessárias (confirmar pagamento, status do certificado) passam para a grade de Cursos e para a aba Certificados. **Pergunte ao usuário** antes de apagar o arquivo ou a função "Cancelar solicitação".

## 5. Pronto quando

- As 5 abas aparecem na ordem acima, o menu lateral tem só Meu perfil e Catálogo, e todas as telas seguem os tokens da seção 2.
- Tocar num curso da grade abre a trilha, e a seta volta para a grade. "Continuar aula" do Início abre a trilha certa.
- Avaliações não lista quiz. Quiz não mostra nota em lugar nenhum.
- Lint e testes do `mobile/` passando. Teste no Expo em tela pequena (~360px) e grande, sem texto cortado.
- Ao terminar, liste os arquivos alterados e o que ficou de fora.
