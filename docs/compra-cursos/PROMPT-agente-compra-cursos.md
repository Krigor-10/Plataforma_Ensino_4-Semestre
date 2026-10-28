# Compra de cursos: trocar "Solicitar matrícula" por Comprar / Começar grátis

Escopo: **backend, web (`frontend/`), desktop (Electron, carrega o web) e mobile (`mobile/`)**. Leia os `CLAUDE.md`/`AGENTS.md` da raiz e de cada app.

## Contexto (como funciona hoje)

- Curso tem `ModeloCurso`: `Gratuito`, `PagoPacote` ou `Acompanhado` (pago, com professor e encerramento pelo coordenador). Gratuito/PagoPacote vêm do preço (`CursoService`, `preco <= 0 ? Gratuito : PagoPacote`).
- A matrícula é **sempre automática**: `POST /Matriculas` → `MatriculaService.MatricularComAprovacaoAutomaticaAsync` aprova na hora (sem turma). Se o curso tiver preço, cria um `Pagamento` **pendente** (`CriarPagamentoPendenteSeNecessarioAsync`), e o conteúdo fica bloqueado até `POST /Pagamentos/{matriculaId}/confirmar` (`PagamentoService.ConfirmarPagamentoAsync`). O pagamento é **simulado**: não há gateway.
- A interface ainda fala em "Solicitar matrícula":
  - Mobile: `screens/aluno/CatalogoScreen.jsx`. A confirmação do pagamento fica separada, na grade de Cursos (`ConteudosScreen.jsx` / `GradeCursosConteudos.jsx`).
  - Web: `pages/workspace/SecaoMatriculas.jsx` (catálogo da área logada + pagar) e `pages/PublicHome.jsx` (página pública, leva ao cadastro).
  - Web em modo demonstração: `lib/demoApi.js` imita a API.
  - Desktop: `desktop/main.js` só abre o web, então muda junto.

**Objetivo:** o aluno **compra** cursos pagos e **começa grátis** os gratuitos. A palavra "matrícula" some dos botões. Internamente o modelo continua `Matricula` + `Pagamento`: **não renomeie entidades, tabelas nem rotas que já existem.**

## 1. Backend: rota de compra atômica

- Nova rota **`POST /Matriculas/comprar`** (corpo `{ cursoId }`; aluno = usuário autenticado, perfil Aluno), em `MatriculasController` + método novo no `MatriculaService` (ex.: `ComprarCursoAsync(alunoId, cursoId)`).
- Numa **única transação**:
  1. matricula com aprovação automática, reaproveitando `MatricularComAprovacaoAutomaticaAsync`, que já reaproveita transação aberta;
  2. se o curso tiver preço, confirma o pagamento.

  Se qualquer passo falhar, nada fica gravado: nem matrícula, nem pagamento.
- **Já tem matrícula com pagamento pendente:** só confirma o pagamento ("concluir compra"). Não cria matrícula duplicada.
- **Já tem matrícula ativa e paga:** devolve conflito com mensagem clara ("Você já tem este curso").
- **Curso gratuito:** a rota também funciona (só matricula), mas o front usa a rota de compra **só para curso pago**. Para gratuito, segue com `POST /Matriculas`.
- **Acompanhado já encerrado** (`EncerradoEm` preenchido): recusar com mensagem ("Este curso já foi encerrado").
- Resposta: a matrícula com o pagamento já confirmado, no mesmo formato de `PostMatricula`, para o front atualizar sem outra chamada.
- `POST /Matriculas` e `POST /Pagamentos/{id}/confirmar` **continuam existindo**, usados pelo cadastro e pela compra pendente antiga.
- **Testes** (`PlataformaEnsino.Tests`, junto a `MatriculaServiceTests`/`PagamentoServiceTests`):
  - pago → matrícula aprovada + pagamento confirmado + acesso liberado;
  - gratuito → sem pagamento;
  - pendente → concluir compra sem duplicar;
  - já comprado → conflito;
  - acompanhado encerrado → recusa;
  - falha no meio → nada gravado.

## 2. Regra dos botões (igual nos três apps)

| Situação do curso para o aluno | Botão | Ação |
|---|---|---|
| Gratuito, sem matrícula | **"Começar grátis"** | `POST /Matriculas` → mensagem de sucesso e atalho para abrir o curso |
| Pago (pacote ou acompanhado), sem matrícula | **"Comprar · R$ X"** | Abre a **confirmação de compra** |
| Matrícula com pagamento pendente | **"Concluir compra"** | Abre a mesma confirmação |
| Já tem o curso (pago ou gratuito) | **"Continuar"** ou "Abrir curso" | Leva à trilha do curso |
| Acompanhado encerrado | Não aparece no catálogo para quem não tem o curso | — |

- **Acompanhado:** mostre também um selo discreto **"Com acompanhamento"** no cartão do catálogo.
- **Preço:** `formatMoney`. Gratuito com selo verde "Gratuito", como já é feito.
- **Turma:** **não exija turma para comprar.** O backend matricula direto no curso. Hoje o mobile bloqueia com "Sem turma disponível" (`CatalogoScreen.jsx`, `temTurma`). Tire esse bloqueio e o texto "Matrículas abertas / Sem turma disponível". O web já não exige turma.

## 3. Confirmação de compra (componente novo em cada app)

- **Mobile:** painel que sobe de baixo (bottom sheet), no mesmo estilo do "Antes de começar" do `QuizModal`. **Web:** modal.
- **Conteúdo:**
  - capa pequena + nome do curso + selo do modelo (Pago / Com acompanhamento);
  - linha "Total" com o preço em destaque;
  - aviso discreto: "Pagamento simulado — ambiente acadêmico, nenhuma cobrança real é feita.";
  - botão principal **"Confirmar compra"**;
  - botão de texto "Cancelar".
- **Ao confirmar:** `POST /Matriculas/comprar` → estado de sucesso no próprio painel ("Compra concluída! O curso já está liberado.") com o botão **"Ir para o curso"**, que abre a trilha. Recarregue o snapshot, para Início, Cursos e Progresso já mostrarem o curso.
- **Erros:** mostre a mensagem do servidor no painel. Não feche o painel.

## 4. Onde mudar

**Mobile**
- `CatalogoScreen.jsx`: botões da seção 2 + confirmação.
- Grade de Cursos (`GradeCursosConteudos.jsx` / `ConteudosScreen.jsx`): o cartão com pagamento pendente troca "Confirmar pagamento" por **"Concluir compra"**, abrindo a mesma confirmação. A pílula muda para "Compra pendente".
- Mensagens que citam "matrícula aprovada" ou "confirme o pagamento pendente em Cursos" passam a falar em compra.

**Web**
- `SecaoMatriculas.jsx`: catálogo com os botões da seção 2 + modal de confirmação. No lugar do botão "Pagar"/"Confirmar pagamento" de matrícula pendente, use "Concluir compra". O texto do `PopupResultadoMatricula.jsx` acompanha.
- `PublicHome.jsx` (sem login): "Solicitar matricula" vira **"Começar grátis"** / **"Comprar"**, conforme o curso. Os dois levam ao cadastro ou login.
  - Se for simples, guarde o `cursoId` escolhido para, depois de entrar, abrir o catálogo já na confirmação daquele curso.
  - Se não for simples, só leve ao cadastro/login.
- `lib/demoApi.js`: implemente `POST /Matriculas/comprar` no modo demonstração, com a mesma regra, e ajuste `demoApi.smoke.test.js`.

**Desktop:** nada próprio. Confirme que abre o web já com as mudanças.

**Textos:** onde o aluno lê "Solicitar matrícula" ou "Solicitação enviada", troque por compra ou inscrição. Telas de Admin e Coordenador que listam matrículas **continuam falando em matrícula**: é o registro administrativo.

## 5. Fora do escopo

- Gateway de pagamento real, cupom, carrinho com vários cursos, reembolso.
- Mudar o cadastro: `AlunoService.CadastrarAlunoCompletoAsync` continua matriculando no curso escolhido. Se ele for pago, o aluno conclui a compra depois, pelo "Concluir compra".

## 6. Pronto quando

- **Backend:** testes novos passando e `dotnet test` verde.
- **Mobile:** curso pago → "Comprar · R$ X" → confirmar → curso liberado em Cursos, sem passo extra. Gratuito → "Começar grátis" → curso liberado. Curso sem turma também pode ser comprado.
- **Web (normal e demonstração):** mesmo fluxo. A página pública sem "Solicitar matricula".
- **Desktop:** abre o web atualizado.
- Nenhum botão do aluno com "Solicitar matrícula".
- `npx jest` + `npx expo lint` (mobile) e os testes do frontend passando, sem erros novos de lint.
- Ao terminar, liste os arquivos alterados por app e o que ficou de fora.
