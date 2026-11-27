# Auditoria de pendências e regras de negócio — CodeRyse (26/11/2026)

Auditoria somente de leitura: nenhum código, banco ou migration foi alterado.

O relatório é entregue **por blocos**, na ordem combinada:

| Bloco | Itens do pedido | Situação |
|---|---|---|
| **1. Ciclo de vida e venda do curso** | 8, 11 (os dois "11") e 4 | **Entregue, decisões fechadas** |
| **2. Avaliação do professor** | 6, 7 e 3 | **Entregue, decisões fechadas** |
| **3. Notas e certificados** | 2 | **Entregue, decisões fechadas** |
| **4. Itens rápidos** | 1, 5 e 9 | **Entregue, decisões fechadas** |
| **5. Biometria no celular** | 10 | **Entregue, decisões fechadas** |
| **Fechamento** | — | Situação de cada item, ordem de implementação e lista de decisões, no fim do arquivo |

> O pedido tem dois itens numerados como "11". O segundo ("Ciclo de vida e classificação") já traz a **regra oficial**, então ele é tratado como a regra que vale. O primeiro fica respondido dentro dele.

---

# BLOCO 1 — Ciclo de vida e venda do curso

## Resumo em 5 linhas

1. O erro **"Informe um preco maior que zero."** não é um bug isolado: a janela "Preparar para venda" foi feita para **um único caminho**, *Gratuito encerrado → pacote pago*. **Não existe** no sistema o caminho *encerrado → Gratuito à venda*.
2. O caminho da regra oficial, **Acompanhado encerrado → Pago ou Gratuito**, também **não existe**: o botão nem aparece para o Acompanhado, e o servidor recusa a conversão.
3. "Encerrado" hoje faz **duas coisas ao mesmo tempo**: trava a edição (acadêmico) e **tira o curso do catálogo e bloqueia matrícula nova** (comercial). Por isso um curso encerrado convertido em Gratuito nunca receberia alunos novos.
4. As abas do Admin são calculadas **só no frontend**, com uma prioridade diferente da usada pelo servidor (tela Inscrições) e pelo cartão do módulo. O **mesmo curso aparece como "À venda" numa tela e "Encerrado" em outra**.
5. O encerramento está **bem protegido** (permissões, sem duplicidade, persistido no banco). Falta o **selo** na grade de cursos do professor e do Admin.

---

## ITEM 8 + ITEM 11 — Conversão de modalidade, preço e abas do Admin

**Classificação:** **BUG IDENTIFICADO** (erro do preço) + **NÃO IMPLEMENTADO** (Acompanhado/Gratuito → venda gratuita) + **REGRA DE NEGÓCIO NÃO DEFINIDA** (onde ficam alguns estados nas abas).

### 1. Situação atual

- A janela **"Preparar para venda"** tem um único campo de valor, **"Preço (R$) \*"**, obrigatório e maior que zero. **Não há escolha de modalidade** (Pago ou Gratuito).
- Ao salvar, ela chama `PUT /Cursos/{id}/pacote`, que **sempre transforma o curso em PagoPacote**.
- O botão só aparece para curso **Gratuito encerrado** (tela Cursos, aba Encerrados) ou para **PagoPacote** (painel do curso). **Curso Acompanhado encerrado não tem o botão.**

### 2. Arquivos, classes, métodos e componentes

| Camada | Onde | O que faz |
|---|---|---|
| Web | `frontend/src/components/ModalPrepararVenda.jsx`, `executar()` (≈ linha 66) | **Origem exata da mensagem.** `if (precoNumero <= 0) "Informe um preco maior que zero."` antes de chamar o servidor, em qualquer botão (Salvar, Colocar à venda, Tirar da venda) |
| Web | `frontend/src/pages/workspace/SecaoCursos.jsx`, `mostrarBotaoPrepararVenda` (≈ linha 981) | Botão só com `ehAdmin && abaCurso === "encerrados" && modelo === Gratuito` |
| Web | `frontend/src/pages/workspace/PainelCursoGestao.jsx`, `podeGerenciarVenda` (≈ linha 364) | `ehAdmin && (PagoPacote \|\| (Gratuito && encerradoEm))` |
| Web | `SecaoCursos.jsx`, `categoriaCicloCurso` (≈ linha 41) | Decide a aba de cada curso |
| Servidor | `Services/CursoService.cs`, `DefinirPacoteAsync` (≈ linha 456) | Só aceita `PagoPacote` ou `Gratuito` encerrado; **recusa Acompanhado**; exige `Preco > 0`; grava `ModeloCurso = PagoPacote` |
| Servidor | `CursoService.PublicarParaVendaAsync` (≈ linha 490) | Só aceita `PagoPacote` com `Preco > 0` |
| Servidor | `CursoService.GarantirCursoAbertoParaMatriculaAsync` (≈ linha 220) | **Bloqueia matrícula nova** em Gratuito/Acompanhado **encerrado** |
| Servidor | `Services/MatriculaService.cs` (≈ linha 129) | Bloqueia compra de pacote não publicado |
| Servidor | `Services/CursoInscricoesService.cs` (≈ linha 145) | Situação na tela Inscrições: Encerrado > À venda > Aguardando > Em andamento |
| Compartilhado | `shared/catalogoVisibilidade.js`, `isCursoVisivelNoCatalogoPublico` | Gratuito/Acompanhado **some do catálogo quando encerrado**; Pago só aparece publicado |
| Web | `frontend/src/lib/trilhaConteudos.js`, `obterSituacaoCurso` (≈ linha 115) | Selo do cartão do módulo: Encerrado > À venda > Aguardando > Em andamento |
| Modelo | `Models/Curso.cs` | `ModeloCurso`, `Preco` (`EhGratuito => Preco <= 0`), `ConcluidoPeloProfessorEm/Id`, `EncerradoEm/PorId`, `PublicadoParaVendaEm` |

### 3. Fluxo atual (web e servidor)

```
Professor conclui (POST /Cursos/{id}/concluir)       → ConcluidoPeloProfessorEm
Coordenador encerra (POST /Cursos/{id}/encerrar)     → EncerradoEm
   (Acompanhado: certificados emitidos em lote na mesma transação)
Admin, aba Encerrados:
   - Gratuito encerrado → botão "Preparar para venda"
        janela exige preço > 0 → PUT /pacote → ModeloCurso = PagoPacote
        "Colocar à venda" → POST /venda/publicar → PublicadoParaVendaEm
   - Acompanhado encerrado → SEM botão (e o servidor recusaria)
```

### 4. Regra de negócio identificada

Há **três regras escritas** e elas não são a mesma:

| Data | Regra | Onde está |
|---|---|---|
| 11/11 (aplicada) | **Gratuito** concluído → encerrado → Admin transforma em **pacote pago**. "O Acompanhado continua igual." | `docs/fluxo-venda-cursos/PROMPT-agente-fluxo-curso-gratuito-para-pacote.md` |
| 25/11 (não aplicada) | **Gratuito e Pago chegam completos**: professor monta, conclui, **Admin publica** ("Publicar no catálogo" / "Colocar à venda"). Acompanhado não muda. | `docs/fluxo-venda-cursos/PROMPT-agente-gratuito-e-pago-ja-completos.md` |
| 26/11 (este pedido) | **Acompanhado** concluído → encerrado → Admin transforma em **Pago/Pacote ou Gratuito** → publica → À venda → Fora de venda | Item 11 deste pedido |

O código implementa **só a de 11/11**.

### 5. Problemas encontrados

1. **Erro do preço (o caso relatado).** A janela barra no próprio navegador qualquer valor ≤ 0. Mesmo passando dela, o servidor também exige preço > 0 e só sabe gravar `PagoPacote`. **Não existe "Gratuito à venda".**
2. **Acompanhado não converte.** O botão não aparece (`mostrarBotaoPrepararVenda`/`podeGerenciarVenda`) e `DefinirPacoteAsync` responde "Somente um curso Gratuito encerrado ou ja do modelo Pago…".
   - Observação: pelo cenário relatado, o curso testado era **Gratuito** (só nele o botão aparece). Para um **Acompanhado**, o erro seria outro.
3. **"Encerrado" mistura acadêmico com comercial.** Num Gratuito ou Acompanhado encerrado:
   - `isCursoVisivelNoCatalogoPublico` → **some do catálogo**;
   - `GarantirCursoAbertoParaMatriculaAsync` → **recusa matrícula nova**.
   - Um curso **convertido para Gratuito** continuaria encerrado e, portanto, **invisível e sem matrícula**. Só o PagoPacote escapa disso, porque a regra dele olha `PublicadoParaVendaEm`.
4. **A modalidade original se perde.** A conversão grava `ModeloCurso = PagoPacote` por cima. A origem só fica "adivinhável" por `ConcluidoPeloProfessorEm` preenchido. Não dá para saber se o pacote veio de um Gratuito ou de um Acompanhado.
5. **Abas × regra oficial:**

| Aba | Como o código decide hoje | Regra oficial (26/11) | Diferença |
|---|---|---|---|
| **Em andamento** | Acompanhado **e Gratuito** não encerrados, **inclusive concluídos pelo professor** aguardando o coordenador | Só Acompanhado em execução, **sem** os concluídos pelo professor | Gratuitos e "aguardando encerramento" estão aqui |
| **Encerrados** | **Qualquer** curso encerrado que não esteja à venda (inclusive **pacote convertido tirado da venda**) | Concluído + encerrado, **aguardando preparação comercial** | O pacote tirado da venda volta para cá em vez de ir para Fora de venda |
| **À venda** | Só **PagoPacote** publicado | Pago **ou Gratuito** preparado e publicado | Gratuito nunca chega aqui |
| **Fora de venda** | PagoPacote **não publicado e não encerrado**, inclusive **pacote criado direto que nunca foi vendido** | Só o que **já foi vendido e foi retirado** | Mistura "nunca publicado" com "retirado". Não há campo que diga "já foi publicado" (`DespublicarDaVenda` apaga `PublicadoParaVendaEm`) |

6. **Três prioridades diferentes para o mesmo curso.** Um pacote convertido e à venda tem `EncerradoEm` **e** `PublicadoParaVendaEm`:
   - aba do Admin (`categoriaCicloCurso`): **À venda**;
   - tela Inscrições (`CursoInscricoesService`) e cartão do módulo (`obterSituacaoCurso`): **Encerrado**.
7. **Curso sem coordenador não pode ser encerrado.** `EncerrarCursoAsync` exige `curso.CoordenadorId == coordenadorId`. O Admin não encerra. Um Acompanhado sem coordenador fica parado em "aguardando encerramento" e nunca chega à venda.
8. **Correção de prova depois da conversão.** O certificado espera prova corrigida (`CertificadoService`, `avaliacaoPendenteCorrecao`). Se o Acompanhado tiver questão **dissertativa** e virar Gratuito/Pago, **não está definido quem corrige** as provas dos alunos novos.

### 6. O que já está implementado corretamente

- Conclusão (professor), encerramento (coordenador), reabrir e devolver: **persistidos** em `Curso`, com permissão e sem duplicidade.
- A conversão **preserva o mesmo registro do curso**: matrículas, notas, tentativas, progresso e certificados **não são apagados** (`DefinirPacoteAsync` só troca modelo, preço e descrição).
- O pacote convertido continua **travado para edição** e só reabre **fora da venda** (decisão de 12/11).
- A matrícula guarda o valor pago ("o valor fica congelado na matrícula").
- Certificados do Acompanhado são emitidos **no encerramento, na mesma transação**, antes de qualquer conversão.

### 7. O que falta implementar ou corrigir

- Escolha de **modalidade** (Pago ou Gratuito) na preparação para venda, com o preço **só para o Pago**.
- Servidor aceitar **Acompanhado encerrado** e **Gratuito encerrado** como origem da conversão, e **Gratuito** como destino.
- **Publicação do Gratuito** (é o item 1 do prompt de 25/11: `PublicadoParaVendaEm` passa a valer para Gratuito também).
- Catálogo e matrícula olharem a **publicação**, e não o **encerramento**, para cursos convertidos.
- Uma **única regra de situação** (servidor + `shared/`) usada pelas abas, pela Inscrições e pelo cartão do módulo.
- Distinguir **"nunca publicado"** de **"retirado da venda"**.
- Guardar a **modalidade original** (se você decidir que precisa, ver D4).

### 8. Risco de regressão

- **Alto** em catálogo e matrícula: `isCursoVisivelNoCatalogoPublico` é usado pela Home pública, pelo Catálogo (web e celular) e pelo Cadastro. `GarantirCursoAbertoParaMatriculaAsync` protege a matrícula.
- **Médio** no certificado: a regra muda conforme o `ModeloCurso` atual (Acompanhado espera encerramento; Gratuito/Pago não). Trocar o modelo de um curso com alunos antigos muda a regra que vale para eles.
- **Baixo** na janela "Preparar para venda": componente isolado, usado em 2 telas.
- Testes que hoje cobrem o fluxo de venda (`CursoServiceTests`, `SecaoCursos.test.jsx`, `PainelCursoGestao.test.jsx`, `demoApi.smoke.test.js`) precisam continuar verdes.

### 9. Solução recomendada (para aprovar, não implementada)

**Três dimensões, sem estado duplicado, quase tudo com os campos que já existem:**

| Dimensão | Valores | De onde vem (hoje) | Precisa de campo novo? |
|---|---|---|---|
| **Acadêmica** | Em andamento · Aguardando encerramento · Encerrado | `ConcluidoPeloProfessorEm` + `EncerradoEm` | **Não** |
| **Comercial** | Não preparado · Pronto para publicar · Publicado · Fora de venda | `PublicadoParaVendaEm` + **"já foi publicado alguma vez"** | **Sim, um**: por exemplo `RetiradoDaVendaEm` (data em que saiu da venda). Assim "Fora de venda" = retirado, e "não preparado" = nunca publicado |
| **Modalidade** | Pago · Gratuito · Acompanhado | `ModeloCurso` (atual) | **Opcional**: `ModeloCursoOriginal`, gravado só na conversão (ver D4) |

**Regras que decorrem disso:**
- **Encerrado** passa a significar **só** "ciclo acadêmico fechado e conteúdo travado".
- **Catálogo e matrícula nova** de Gratuito/Pago passam a olhar **só a dimensão comercial** (publicado). O Acompanhado continua como hoje.
- A **conversão** (Admin, curso encerrado) define a modalidade de destino:
  - **Pago:** exige preço > 0, como hoje;
  - **Gratuito:** preço = 0, sem campo de preço na janela.
- **Publicar** vale para Pago e Gratuito (alinha com o prompt de 25/11).
- **Uma função de situação** no servidor (o DTO do curso devolve a situação/aba já calculada) e a mesma regra em `shared/` para as telas. As três prioridades diferentes de hoje somem.

**Abas propostas (falta confirmar D5 e D6):**

| Aba | Regra |
|---|---|
| Em andamento | Acompanhado não concluído (+ o que você decidir em D5 e D6) |
| Encerrados | Encerrado **e nunca publicado** (aguardando preparação comercial) |
| À venda | Publicado (Pago ou Gratuito; rótulo "Grátis" ou preço) |
| Fora de venda | `RetiradoDaVendaEm` preenchido e não publicado |

**Janela "Preparar para venda":**
- Escolha **Pago | Gratuito** no topo;
- **Preço só aparece no Pago**;
- a prévia do cartão já sabe mostrar "Grátis" (`ehGratuito`).

### 10. Critérios de aceite (para a futura implementação)

1. Acompanhado concluído pelo professor e encerrado pelo coordenador aparece em **Encerrados** com o botão "Preparar para venda".
2. Na janela, escolher **Gratuito** não pede preço e não mostra "Informe um preço maior que zero".
3. "Publicar" leva o curso para **À venda** e para o catálogo (web, celular, Home pública), e um aluno novo consegue **começar grátis**.
4. Escolher **Pago** continua exigindo preço > 0, como hoje.
5. "Tirar da venda" leva para **Fora de venda** (não volta para Encerrados). Quem já tem matrícula continua acessando.
6. Depois da conversão, continuam iguais: matrículas antigas, notas, tentativas, progresso, certificados emitidos e datas de conclusão e encerramento.
7. A aba, a tela Inscrições e o cartão do módulo mostram **a mesma situação** para o mesmo curso.
8. O fluxo atual *Gratuito encerrado → pacote pago* continua funcionando.
9. `dotnet test` e `npm test` (web e celular) sem falhas novas.

---

## ITEM 4 — Encerramento do curso (selo ENCERRADO)

**Classificação:** **PARCIALMENTE IMPLEMENTADO**

> Observação de vocabulário: no sistema, o **professor conclui** e o **coordenador encerra**. O pedido fala em "Professor encerrar". Abaixo, "encerrado" é sempre o passo do coordenador.

### 1. Situação atual

- O encerramento é **registrado e persistido** em `Curso.EncerradoEm` e `Curso.EncerradoPorId` (coluna no banco). A conclusão do professor fica em `ConcluidoPeloProfessorEm` e `ConcluidoPeloProfessorId`.
- **Selos que existem hoje:**

| Quem | Onde | O que vê |
|---|---|---|
| Professor | Cabeçalho do curso (`SecaoConteudosProfessor.jsx` ≈ linhas 1257 e 1264) | Selo "Concluído, aguardando o coordenador" e aviso "Curso encerrado. A edição está travada." |
| Professor | **Grade de cursos** (`GradeCursosProfessor.jsx`) | **Nenhum selo** |
| Coordenador | Grade de cursos (`SecaoCursos.jsx` ≈ linha 1027) | "Aguardando você" ou "🔒 Encerrado" |
| Admin | Grade de cursos | **Nenhum selo de situação** (só a aba, o modelo, "Coordenado" e a média) |
| Todos | Painel do curso (`PainelCursoGestao.jsx` ≈ linha 484) | "Encerrado" / "Aguardando encerramento" / "Em andamento" |

### 2. Arquivos e métodos

- `Services/CursoService.cs`: `ConcluirCursoComoProfessorAsync`, `EncerrarCursoAsync`, `ReabrirCursoAsync`, `DevolverAoProfessorAsync`.
- `Models/Curso.cs`: `ConcluirPeloProfessor`, `Encerrar`, `Reabrir`, `DesfazerConclusao`, `AceitaEdicao`.
- `Controllers/CursosController.cs`: `POST {id}/concluir` (Professor), `encerrar`, `reabrir`, `devolver-ao-professor` (Coordenador).
- Web: `SecaoConteudosProfessor.jsx`, `GradeCursosProfessor.jsx`, `SecaoCursos.jsx`, `PainelCursoGestao.jsx`, `lib/trilhaConteudos.js` (`obterSituacaoCurso`).
- Celular: **não tem** concluir/encerrar (só o aluno usa o app). Desktop: é o mesmo web.

### 3–4. Fluxo e regra

- **Concluir:** só professor **vinculado**, só Acompanhado/Gratuito, só uma vez. O coordenador recebe uma notificação.
- **Encerrar:** só o **coordenador responsável**, só depois da conclusão, só uma vez, em transação. Os Admins recebem notificação. No Acompanhado, os certificados são emitidos em lote.
- **Reabrir:** só o coordenador responsável; o pacote precisa sair da venda antes. **Devolver:** só antes de encerrar.

### 5. Problemas encontrados

1. **Falta o selo** na grade de cursos do **professor** e do **Admin** (o pedido do item 4).
2. **Curso sem coordenador fica sem dono do encerramento** (ver item 8/11, problema 7).
3. As **três prioridades** de situação (ver item 8/11, problema 6) também afetam o selo: um pacote convertido e à venda mostraria "Encerrado" ou "À venda" dependendo da tela.

### 6. Correto hoje

- Persistência, permissões (`CoordenadorId` responsável, professor vinculado), bloqueio de duplicidade ("já está encerrado"), transação com certificados e notificações.
- **Não há** encerramento indevido por outro perfil: o Admin **não** encerra, e o professor **não** encerra.
- Encerramento acadêmico e retirada da venda **já são ações separadas** (`encerrar` × `venda/despublicar`).

### 7. Falta

- Selo de situação na grade do professor e do Admin, usando a **mesma regra única** proposta no item 8/11.
- Decidir quem encerra curso sem coordenador (D9).

### 8. Risco de regressão

**Baixo** para o selo (só exibição). **Médio** se a regra única de situação for criada junto (mexe em três telas).

### 9. Solução recomendada

- Um componente de selo (por exemplo `SeloSituacaoCurso`, sobre o `Insignia` que já existe) que recebe a **situação calculada pela regra única**.
- Usar o selo nas grades do professor, do coordenador e do Admin, e no painel do curso.
- Textos: "Em andamento", "Concluído · aguardando coordenador", "🔒 Encerrado", "À venda", "Fora de venda".

### 10. Critérios de aceite

1. O professor vê "Concluído · aguardando coordenador" e depois "🔒 Encerrado" **na grade**, sem abrir o curso.
2. O Admin vê o mesmo selo na grade, em qualquer aba.
3. O mesmo curso mostra o **mesmo texto** na grade, no painel, no cartão do módulo e na tela Inscrições.
4. Sem mudança de permissão: só o coordenador responsável encerra.

---

## Decisões do bloco 1 que dependem de você

| # | Decisão | Por que importa |
|---|---|---|
| **D1** ✅ | A regra de 26/11 (**Acompanhado** encerrado → Pago ou Gratuito) **substitui** a de 11/11 (Gratuito encerrado → pacote) ou **as duas** continuam valendo? | **DECIDIDO (26/11): os dois.** Acompanhado encerrado **e** Gratuito encerrado podem virar **Pago ou Gratuito** à venda |
| **D2** ✅ | O prompt de 25/11 (Gratuito/Pago **criados direto**, montados pelo professor, publicados pelo Admin) **continua valendo** junto com a conversão? | **DECIDIDO (26/11): sim.** Dois caminhos até "À venda": **criado direto** (montado, concluído, publicado pelo Admin — regra de 25/11) e **convertido** de um curso encerrado |
| **D3** ✅ | Para o curso convertido, **catálogo e matrícula nova** passam a olhar a **publicação**, e não o encerramento? | **DECIDIDO (26/11): sim.** Pago e Gratuito aparecem e aceitam matrícula **só se publicados**; "encerrado" passa a significar apenas "conteúdo travado". Acompanhado continua como hoje |
| **D4** ✅ | Guardar a **modalidade original** num campo próprio, ou basta saber que "veio de um curso encerrado"? | **DECIDIDO (26/11): guardar.** Campo novo (ex.: `ModeloCursoOriginal`), preenchido só na conversão, com 1 migration |
| **D5** ✅ | Curso **concluído pelo professor e aguardando o coordenador**: em qual aba do Admin? (Em andamento, Encerrados ou uma aba nova) | **DECIDIDO (26/11): Em andamento, com o selo "Concluído · aguardando coordenador".** O Admin ainda não tem ação nele |
| **D6** ✅ | Gratuito ou Pago **criado direto e ainda em montagem**: em qual aba? | **DECIDIDO (26/11): Em andamento**, com selo do modelo e da situação. "Fora de venda" fica só para o que já foi vendido e retirado |
| **D6b** ✅ | Gratuito ou Pago **criado direto, já concluído pelo professor e pronto para o Admin publicar** (não passa pelo encerramento do coordenador): em qual aba? | **DECIDIDO (26/11): Encerrados.** A aba passa a reunir tudo em que o Admin precisa agir (convertido ou criado direto), com o botão de publicar. Observação: esses cursos não estão "encerrados" de fato, então o selo do cartão deve dizer "Pronto para publicar" |
| **D7** ✅ | Curso **retirado da venda** com alunos matriculados: os alunos mantêm o acesso, como hoje? | **DECIDIDO (26/11): sim**, como hoje. Só some do catálogo para quem não tem o curso; quem tem continua estudando e pode tirar certificado |
| **D8** ✅ | Acompanhado com **prova dissertativa** convertido: quem corrige as provas dos alunos novos? (Exigir só provas objetivas para converter, manter o professor responsável, ou outra regra) | **DECIDIDO (26/11): correção pela IA.** ⚠️ **DEPENDÊNCIA DE OUTRA FUNCIONALIDADE:** a IA de hoje só **gera** questões (`IAvaliacaoIAService.GerarQuestoesAsync`, Gemini). **Não existe** correção de dissertativa por IA; ela precisa ser criada (nova operação na interface de IA + lançamento de nota + revisão/contestação) |
| **D8b** ✅ | Até a correção por IA existir, o que vale para curso convertido com dissertativa? | **DECIDIDO (26/11): bloquear a conversão.** A janela avisa e só converte cursos com provas publicadas 100% objetivas. A trava sai quando a correção por IA existir |
| **D9** ✅ | **Curso sem coordenador**: o Admin pode encerrar, ou atribuir coordenador passa a ser obrigatório antes de concluir? | **DECIDIDO (26/11): coordenador obrigatório.** O professor só conclui Acompanhado/Gratuito com coordenador atribuído; sem ele, o "Concluir" avisa "peça ao Admin para atribuir um coordenador". O Admin continua sem encerrar |
| **D10** ✅ | Textos dos selos: "Concluído · aguardando coordenador", "🔒 Encerrado", "À venda", "Fora de venda"? | **DECIDIDO (26/11):** Em andamento · Concluído · aguardando coordenador · 🔒 Encerrado · Pronto para publicar · À venda (Pago) / No catálogo (Gratuito) · Fora de venda. Iguais em todas as telas |

### Regra fechada do bloco 1 (depois das decisões)

**Caminhos até a venda (D1, D2):**
1. **Convertido:** Acompanhado ou Gratuito → professor conclui (exige coordenador, D9) → coordenador encerra → Admin escolhe **Pago ou Gratuito** (só se as provas forem 100% objetivas, D8b) → publica.
2. **Criado direto:** Gratuito ou Pago → professor monta e conclui → Admin publica (regra de 25/11).

**Catálogo e matrícula nova (D3, D7):** Pago e Gratuito só com **publicado**; o encerramento não interfere. Quem já tem matrícula mantém o acesso sempre. Acompanhado continua como hoje.

**Abas do Admin (D5, D6, D6b):**

| Aba | Entra aqui | Selo do cartão |
|---|---|---|
| **Em andamento** | Acompanhado em execução; qualquer curso concluído pelo professor aguardando o coordenador; Gratuito/Pago criado direto em montagem | "Em andamento" ou "Concluído · aguardando coordenador" |
| **Encerrados** (precisa de ação do Admin) | Encerrado e nunca publicado; criado direto concluído e nunca publicado | "🔒 Encerrado" ou "Pronto para publicar" |
| **À venda** | Publicado (Pago ou Gratuito) | "À venda" (Pago) ou "No catálogo" (Gratuito) |
| **Fora de venda** | Já publicado alguma vez e retirado | "Fora de venda" |

**Dados (D4):** a conversão grava a **modalidade original** num campo novo. Matrículas, notas, tentativas, progresso, certificados e datas não mudam.

**Funcionalidade nova que fica registrada (D8):** correção de dissertativa por IA. Quando existir, a trava da D8b sai.

**Ordem sugerida de implementação (depois das decisões):**
1. Regra única de situação no servidor + `shared/` (base para tudo).
2. Publicação do Gratuito e catálogo/matrícula olhando a publicação (prompt de 25/11, ajustado por D2 e D3).
3. Conversão com escolha Pago/Gratuito, aceitando o Acompanhado (D1, D4, D8).
4. Abas e selos (D5, D6, D10).

---

# BLOCO 2 — Avaliação do professor

## Resumo em 4 linhas

1. **Item 6 (crítico) — confirmado:** o modal "Ajustes rápidos" **salva cada campo sozinho quando o campo perde o foco**. Clicar no **X** ou em **Fechar** tira o foco do campo e, por isso, **salva**. Não é o X que salva: é o `onBlur` do campo.
2. **Item 7:** o toggle Publicado/Arquivado muda na tela **antes** do servidor responder, mostra mensagem de sucesso, mas **em erro volta calado** (sem mensagem) e **pode ser clicado várias vezes** durante o envio.
3. **Item 3:** o quiz **sempre grava 1 tentativa**. O campo some no formulário do quiz e, ao salvar, o valor é **forçado para 1**, mesmo se antes fosse outro. O servidor limita as tentativas corretamente.
4. Achado extra: o modal monta o pedido de atualização **sem o vínculo do quiz com o conteúdo** (`conteudoDidaticoId`). Hoje isso não estraga nada, porque a tela só lista Prova/Exercício, mas é uma armadilha.

---

## ITEM 6 — Modal "Ajustes rápidos da avaliação"

**Classificação:** **BUG IDENTIFICADO**

### 1. Situação atual

- Rodapé: **Fechar** (vermelho, à esquerda) e **Excluir**. **Não há Salvar.**
- Campos editáveis pelo lápis: **Título**, **Tentativas permitidas**, **Tempo limite** e **Nota máxima** (só em Prova/Exercício).
- Cada campo vira um `<input>` com `onBlur={() => salvarCampoDetalhe(...)}`. **Enter** também salva (força o blur). **Esc** cancela.
- O modal só abre na tela **Avaliações** do professor, que lista **só Prova e Exercício** (o quiz é gerido em Conteúdos).

### 2. Arquivos e métodos

- `frontend/src/pages/workspace/SecaoAvaliacoesProfessor.jsx`:
  - modal ≈ linhas 421–630;
  - `salvarCampoDetalhe` (≈ 310): monta o pedido e faz `PUT /Avaliacoes/{id}`;
  - `fecharDetalheAvaliacao` (≈ 282): **não salva nada**, só limpa o estado;
  - `montarPayloadAtualizacao` (≈ 292);
  - `alternarStatusDetalhe` (≈ 343): o toggle do item 7.
- Servidor: `Services/AvaliacaoService.cs`, `AtualizarAvaliacaoAsync` (≈ 225) + `DTOs/AtualizarAvaliacaoDto.cs`.

### 3. Fluxo atual

```
lápis → campo vira input (valor inicial = salvo)
digita → nada acontece
clica no X / Fechar / fora do campo → onBlur → salvarCampoDetalhe → PUT /Avaliacoes/{id} → modal fecha
```

- O X e o Fechar fazem **a mesma coisa** (`fecharDetalheAvaliacao`). Nenhum dos dois salva por si.
- O salvamento vem do **blur**, que o navegador dispara quando o clique no X/Fechar tira o foco do campo.

### 4. Regra identificada

Edição **por campo, com salvamento automático**, sem estado de formulário separado do que está salvo. Foi uma escolha de "edição rápida", mas contradiz o comportamento esperado (X/Fechar = sair sem salvar).

### 5. Problemas encontrados

1. **Fechar salva** (o caso relatado).
2. **Erro de salvamento é silencioso:** o `catch` volta o valor antigo **sem mensagem**. Exemplo: a validação do servidor recusa, o campo "pisca" de volta e o professor não sabe por quê.
3. **Sucesso também é silencioso:** nenhum aviso de "salvo".
4. **Valor inválido some calado:** tentativas/tempo/nota ≤ 0 ou título vazio só fecham o campo, sem avisar.
5. **Pedido incompleto:** `montarPayloadAtualizacao` **não manda `conteudoDidaticoId`**, e o servidor grava `ConteudoDidaticoId = null` quando ele não vem. Se um dia um quiz vinculado passar por esse modal, **o vínculo com o conteúdo se perde**. Existe uma versão completa pronta, `montarPayloadAvaliacao` em `lib/trilhaConteudos.js`, que manda tudo.
6. O modal tem um ramo para **Quiz** ("atividade formativa…") que **nunca aparece**, porque a tela filtra os quizzes.

### 6. Correto hoje

- **Excluir** já tem **confirmação** própria ("Excluir avaliação" → "Confirmar exclusão"), e no servidor arquiva em vez de apagar quando já há tentativa de aluno.
- O servidor valida tudo (título, tentativas > 0, nota > 0, tempo > 0) e bloqueia edição em curso travado.
- **Esc** cancela a edição do campo sem salvar.

### 7. Falta

- Botão **Salvar**, com o formulário guardando as alterações **pendentes** separadas do que está salvo.
- X/Fechar sem salvar (e, se houver alteração pendente, perguntar "Descartar alterações?").
- Mensagens de sucesso e de erro.
- Usar o pedido completo (`montarPayloadAvaliacao`), para não perder campos.

### 8. Risco de regressão

**Baixo.** Componente de uma tela só. Atenção a: `SecaoAvaliacoesProfessor.test.jsx` (se houver testes de edição por blur) e à trava de curso concluído/encerrado (os lápis devem continuar escondidos quando a edição está travada).

### 9. Solução recomendada (ver decisão E1)

- Os campos passam a editar um **rascunho local** do modal.
- **Salvar** valida e faz **um** `PUT` com tudo. Mensagem "Avaliação atualizada." ou o erro do servidor, **sem fechar** o modal em caso de erro.
- **X / Fechar:** fecha sem salvar. Se houver alteração pendente, pergunta antes ("Descartar alterações?").
- **Excluir:** como hoje, com a confirmação que já existe.
- Pedido montado com `montarPayloadAvaliacao` (o completo).

### 10. Critérios de aceite

1. Editar o título e clicar em **X** ou **Fechar**: nada é salvo (com aviso de descarte, se houver alteração).
2. Editar e clicar em **Salvar**: salva, mostra "Avaliação atualizada." e a lista reflete.
3. Valor inválido: mensagem clara, nada é enviado.
4. Erro do servidor: a mensagem aparece e o modal continua aberto com o que foi digitado.
5. **Excluir** continua pedindo confirmação e não salva edições pendentes.

---

## ITEM 7 — Toggle Publicado / Arquivado (no mesmo modal)

**Classificação:** **PARCIALMENTE IMPLEMENTADO**

### 1–3. Situação, arquivos e fluxo

- Único toggle desse tipo no web: `SecaoAvaliacoesProfessor.jsx`, `alternarStatusDetalhe` (≈ 343), botão `role="switch"` (≈ 614).
- **Fluxo:** clique → a tela já mostra o novo estado → `PUT /Avaliacoes/{id}` com `statusPublicacao` 2 (Publicado) ou 3 (Arquivado).
  - Sucesso: mensagem "Avaliacao publicada/despublicada com sucesso." e recarrega.
  - Erro: volta ao estado anterior, **sem mensagem**.

### 4. Regra identificada

- **Rascunho → Publicado** pelo toggle (o toggle trata qualquer estado diferente de Publicado como "publicar").
- O servidor **recusa publicar sem questão** ("Adicione ao menos uma questão antes de publicar…") e recusa em curso travado.

### 5. Problemas encontrados

1. **Erro sem aviso:** o caso mais comum, publicar sem questões, só faz o toggle "voltar sozinho".
2. **Sem estado de processamento:** o toggle não fica desabilitado durante o envio. Cliques rápidos mandam pedidos em sequência, cada um baseado num estado diferente.
3. O texto diz "**despublicada**", mas o estado gravado é **Arquivado**. O rótulo da insígnia diz "Arquivado".
4. Como o toggle grava pelo mesmo `PUT` incompleto do item 6, ele também **não manda o `conteudoDidaticoId`**.

### 6. Correto hoje

- Mensagem de **sucesso** existe.
- Volta ao estado anterior em erro (só falta dizer o motivo).
- Acessibilidade básica: `role="switch"`, `aria-checked` e `aria-label` com a ação.

### 7. Falta

- Mensagem de **erro** com o motivo do servidor.
- Desabilitar o toggle durante o envio (e mostrar "Salvando…").
- Texto coerente: "Avaliação **arquivada**".

### 8. Risco de regressão

**Baixo.** Atenção à interação com a solução do item 6 (ver decisão E2).

### 9. Solução recomendada

- O toggle continua sendo **ação imediata**: publicar/arquivar não espera o "Salvar" dos outros campos, porque tem validação própria (ter questões).
- Enquanto envia: toggle desabilitado + texto "Salvando…".
- Erro: volta ao estado anterior **e** mostra a mensagem do servidor.
- Textos: "Avaliação publicada." / "Avaliação arquivada.".
- Se houver alteração pendente nos campos (item 6), o toggle avisa antes: "Salve ou descarte as alterações antes de publicar/arquivar".

### 10. Critérios de aceite

1. Publicar sem questões: mensagem "Adicione ao menos uma questão…" e o toggle volta.
2. Clique duplo rápido: só um pedido é enviado.
3. Sucesso: mensagem correta (publicada/arquivada) e lista atualizada.

---

## ITEM 3 — Tentativas do quiz

**Classificação:** **REGRA DE NEGÓCIO NÃO DEFINIDA** (o código tem uma regra fixa, mas ela nunca foi decidida com você)

### 1. Situação atual

- **Onde fica guardado:** `Avaliacao.TentativasPermitidas` (coluna no banco), validado em `Avaliacao.DefinirTentativasPermitidas` (> 0).
- **Professor no quiz:** o formulário do quiz (aberto pela tela Conteúdos, `modoExclusivoQuiz`) **esconde** o campo "Tentativas permitidas" e, ao salvar, **força `tentativasPermitidas: 1`**. O gerador de quiz por IA também grava 1.
  - Isso veio com o commit `91a1154` ("Move criação de Quiz para o módulo em Conteúdos…").
- **Professor na Prova/Exercício:** o campo aparece no formulário e no modal de ajustes rápidos, e é editável.
- **Aluno:** vê "Tentativa X de N" na confirmação ("Antes de começar") e na lista. Web: `SecoesAluno.jsx` ≈ 970 e 1532; celular: `QuizModal.jsx` ≈ 292.
- **Servidor:** limita de verdade. `EnviarRespostasAlunoAsync` (≈ linha 705) recusa com "O limite de tentativas para esta avaliação já foi atingido.", e o DTO do aluno calcula `TentativasRestantes`.

### 2. Arquivos

- `frontend/src/pages/workspace/AssistenteQuizAvaliacao.jsx` (≈ 388 força 1; ≈ 1084 o campo só aparece fora do `modoExclusivoQuiz`).
- `frontend/src/pages/workspace/AssistenteGeracaoIA.jsx` (≈ 209 e 506, grava 1).
- `Models/Avaliacao.cs`, `Services/AvaliacaoService.cs`.

### 3–4. Fluxo e regra

Regra **implícita** no código: "**quiz tem sempre 1 tentativa**". O professor não vê nem altera.

### 5. Problemas encontrados

1. O professor **não sabe** quantas tentativas o aluno tem: a informação só aparece do lado do aluno.
2. **Quiz antigo com mais de 1 tentativa** (criado antes de `91a1154`): ao ser **editado** em Conteúdos, volta para **1 sem aviso**.
3. Não há divergência entre o configurado e o mostrado ao aluno: o aluno vê exatamente o valor salvo.

### 6. Correto hoje

- O limite é aplicado no servidor; o aluno vê o número certo; o modal de ajustes rápidos e o formulário de Prova/Exercício mostram e editam o campo.

### 7. Falta

Depende da decisão E3: só **mostrar** o "1 tentativa" ao professor, ou deixar **escolher**.

### 8. Risco de regressão

**Baixo.** Se o quiz passar a aceitar mais de 1 tentativa:
- conferir o progresso: o quiz conta como feito na 1ª tentativa (`tentativasRealizadas > 0`), e isso não muda;
- conferir a **ordem estrita** recém-aplicada: o quiz "segura" o próximo conteúdo só até a 1ª tentativa.

### 9. Solução recomendada

Mostrar no formulário do quiz, na seção de configurações, a linha **"Tentativas permitidas"**:
- se a regra continuar fixa: só leitura, "1 tentativa (padrão do quiz)";
- se for configurável: campo numérico de 1 a 10, padrão 1.

Mostrar também a mesma informação na linha do quiz na tela do módulo do professor (por exemplo, "3 questões · 1 tentativa").

### 10. Critérios de aceite

1. O professor vê as tentativas do quiz ao criar, ao editar e na lista do módulo.
2. Editar um quiz **não muda** as tentativas sem o professor pedir.
3. O aluno vê o mesmo número que o professor configurou.

---

## Decisões do bloco 2 que dependem de você

| # | Decisão |
|---|---|
| **E1** ✅ | Modal de ajustes rápidos: **formulário com Salvar** (X/Fechar descartam) ou **manter a edição por campo**, mas salvando só no ✓/Enter (o blur deixa de salvar)? **DECIDIDO (26/11): Opção A, formulário com Salvar.** Todos os campos editáveis de uma vez; alteração pendente com borda laranja e aviso; Salvar grava tudo; Fechar/X perguntam "Descartar alterações?". Imagem: `docs/auditorias/bloco2-modal-ajustes-opcoes.png` |
| **E2** ✅ | O toggle Publicado/Arquivado continua **salvando na hora** (ação própria) ou passa a valer **só ao clicar em Salvar**? **DECIDIDO (26/11): na hora.** Travado com "Salvando…" durante o envio, mensagem de sucesso ("publicada"/"arquivada") e de erro com o motivo do servidor; com campo pendente, pede para salvar ou descartar antes |
| **E3** ✅ | Quiz: tentativas **fixas em 1** (só mostrar ao professor) ou **configuráveis** pelo professor? **DECIDIDO (26/11): configurável, de 1 a 10, padrão 1.** Campo no formulário do quiz (criar/editar e gerar com IA); a linha do quiz mostra "N questões · N tentativas"; editar um quiz não muda mais as tentativas sozinho. A ordem estrita continua liberando o próximo conteúdo na 1ª tentativa enviada |

**Ordem sugerida de implementação do bloco 2:** item 6 + item 7 juntos (mesmo modal, mesmo arquivo), depois o item 3. Os três são independentes do bloco 1.

---

# BLOCO 3 — Notas e certificados

## ITEM 2 — Nota final e emissão do certificado

**Classificação:** **PARCIALMENTE IMPLEMENTADO** (a emissão funciona e é automática; há pontos de integridade e regras não decididas)

### Resumo em 5 linhas

1. A **nota final** é a média ponderada (pelo `PesoNota`) das **Provas e Exercícios publicados**, na escala 0–10. **O quiz não entra.** Cada avaliação usa a **última** tentativa corrigida, e não a melhor.
2. A nota final só é gravada quando **todas** as Provas/Exercícios publicados têm nota. O mínimo para o certificado é **7,00**, e só vale se o curso tiver Prova/Exercício.
3. O certificado é emitido **sozinho pelo servidor** assim que os requisitos fecham. No Acompanhado, a emissão é **em lote no encerramento**.
4. O certificado **não é um arquivo**: é uma **data** na matrícula (`CertificadoEmitidoEm`) + o **código da matrícula** para verificação pública. O "Baixar" da web é a impressão do navegador.
5. **Risco de integridade:** o certificado mostra **nome do aluno, título do curso e nota final "ao vivo"**. Se algum deles mudar depois da emissão, o certificado já emitido muda junto. Também é possível um certificado emitido passar a mostrar nota **abaixo de 7** (refazer a prova depois da emissão).

### 1. Situação atual — cálculo da nota

| Pergunta | Resposta (código) |
|---|---|
| Quais atividades entram? | **Prova e Exercício publicados** do curso (com ou sem módulo). **Quiz fica fora** (é formativo: conta só para o progresso) |
| Quiz e avaliação pesam diferente? | Sim: o quiz **não tem nota** e pesa só no **progresso** (`PesoProgresso`). Prova e Exercício pesam na nota pelo `PesoNota` |
| Fórmula | Para cada avaliação: `nota ÷ nota máxima × peso`; soma ÷ soma dos pesos × 10; 2 casas (`ProgressoAlunoService.CalcularMediaPonderada`) |
| Várias tentativas | Vale a **última tentativa corrigida** (`OrderByDescending(NumeroTentativa)` em `ProgressoAlunoService`, ≈ linha 162), mesmo que seja pior que uma anterior |
| Quando vira "nota final" | Só quando **todas** as Provas/Exercícios publicados têm lançamento (`cursoTotalmenteAvaliado`). Antes disso há só a média parcial (`ProgressoCursoAluno.MediaCurso`) |
| Média do módulo | Mesma fórmula, só com as avaliações do módulo (`ProgressoModuloAluno.MediaModulo`) |
| Correção manual | Questão dissertativa deixa a tentativa aguardando correção; o certificado espera a correção (`avaliacaoPendenteCorrecao`) |

### 2. Situação atual — certificado

**Requisitos** (`CertificadoService.ObterSinaisAsync`), todos juntos:

1. **Acesso liberado:** matrícula aprovada e, se o curso foi pago, pagamento confirmado (`AcessoAcademicoService.TemAcessoLiberadoAsync`).
2. **Progresso 100%** (conteúdos + quizzes).
3. **Nenhuma Prova/Exercício publicado sem nota** (inclui aguardando correção).
4. **Nota final ≥ 7,00**, se o curso tiver Prova/Exercício. Curso só com conteúdo e quiz **não tem nota** e não é barrado.
5. **Acompanhado:** só depois do **encerramento** pelo coordenador.

**Quando é emitido:**
- **Automático, sem o aluno pedir** (`TentarEmitirAutomaticamenteAsync`): depois de concluir conteúdo, lançar nota e confirmar pagamento. Se faltar algo, não faz nada e tenta de novo no próximo evento. Notifica o aluno ("Certificado emitido").
- **Acompanhado:** em lote, no encerramento, **na mesma transação** (`EmitirCertificadosDoCursoAsync`).
- Também existe a rota `POST /Certificados/matricula/{id}/emitir` (Aluno), que usa as mesmas pendências.
- **Uma vez emitido, vale para sempre:** nenhum sinal novo tira o certificado (decisão de 18/11).
- Em dev/homologação existe um **modo de teste** que ignora a nota mínima (`RecursosTeste:AprovacaoCertificadoSimulada`). Ele é **bloqueado em produção** no código.

**Onde fica e como é validado:**

| Pergunta | Resposta |
|---|---|
| Banco | `Matricula.CertificadoEmitidoEm` (data). Não há tabela própria de certificado |
| Arquivo físico / nuvem | **Nenhum.** A web desenha o certificado na tela e "Baixar / Imprimir" chama `window.print()` (`SecaoCertificados.jsx` ≈ 166). O celular copia/compartilha o **link de verificação** |
| Identificador | `Matricula.CodigoRegistro` (código da matrícula) |
| Vínculo | Matrícula → aluno + curso (+ nome da turma congelado em `NomeTurmaSnapshot`) |
| Validação pública | `GET /Certificados/verificar/{codigo}` (`[AllowAnonymous]`) + tela `/verificar/{codigo}` (`VerificarCertificadoScreen.jsx`). Mostra aluno, curso, turma, nota final e data |
| Recuperar | Aluno: `GET /Certificados/meus`. Qualquer pessoa: pelo código |

### 3. Fluxo completo (da conclusão ao armazenamento)

```
Aluno conclui conteúdo / envia quiz / tem prova corrigida / pagamento confirmado
  → ProgressoAlunoService recalcula progresso e média (nota final só com tudo avaliado)
  → CertificadoService.TentarEmitirAutomaticamenteAsync
       requisitos OK? → Matricula.CertificadoEmitidoEm = agora → notificação ao aluno
       faltou algo?   → nada (tenta no próximo evento)
Acompanhado: coordenador encerra → EmitirCertificadosDoCursoAsync (lote, mesma transação)
Exibição: web desenha + window.print; celular mostra e compartilha o link
Verificação: /verificar/{CodigoRegistro} (público)
```

### 4. Regra de negócio identificada

Está acima. O que **não foi decidido** por você está nas decisões F1–F3.

### 5. Problemas encontrados

1. **Certificado "ao vivo".** `CertificadoResponseDto` lê `Aluno.Nome`, `Curso.Titulo` e `Matricula.NotaFinal` na hora da consulta:
   - o Admin muda o **nome do aluno** (função de 25/11) → o certificado antigo muda o nome;
   - o Admin muda o **título do curso** (`AtualizarCursoAsync`) → idem;
   - o aluno **refaz a prova** depois da emissão e tira menos → a **nota impressa cai**, podendo ficar **abaixo de 7** num certificado já emitido. Isso acontece porque vale a última tentativa (problema 2) e porque o certificado não guarda a nota da emissão.
2. **Última tentativa, e não a melhor.** Quem tirou 9 e refez por curiosidade com 6 fica com 6. Isso nunca foi decidido com você (F1).
3. **Gratuito/Pago pela metade emite certificado.** O curso não espera encerramento, e um Gratuito ainda em montagem pode chegar a 100% do que já foi publicado. Já está identificado no prompt de 25/11 e **resolvido pelas decisões D2/D3** (só publica curso concluído).
4. **Perda de acesso não afeta o certificado.** Matrícula **cancelada**, pagamento **não confirmado** depois ou aluno **inativado**: o certificado já emitido continua válido na verificação pública (`ObterCertificadoPorCodigoAsync` não olha o status). Não existe **revogação**. Pode ser o desejado, mas não foi decidido (F3).
5. **Sem PDF de verdade:** o "Baixar" depende da impressão do navegador (o resultado varia por navegador e tamanho de página). No celular não há PDF, só o link. Isso é melhoria, não bug.
6. **BUG — pontos das questões × "Nota máxima".** A nota da tentativa é a **soma dos pontos acertados** (`QuestaoPublicada.Pontos`, padrão 1; `AvaliacaoService` ≈ linha 753). A média usa `nota ÷ Avaliacao.NotaMaxima`, mas **nada obriga os pontos a somarem a nota máxima**:
   - 4 questões de 1 ponto com nota máxima 10: acertar tudo = **4/10**;
   - 4 questões de 5 pontos com nota máxima 10: acertar tudo = **20/10** e a média passa de 10.
7. O formulário de Prova/Exercício mostra **"Peso de progresso"**, que não tem efeito nelas (o progresso só conta conteúdo e quiz).

### 6. Correto hoje

- Emissão automática e **idempotente**, sem o aluno pedir; nunca derruba a operação que a chamou (erro só vai para o log).
- Certificado emitido **não some** quando surge avaliação nova.
- Nota mínima só para curso com avaliação formal; prova sem correção bloqueia.
- Acompanhado espera o encerramento, emitido em lote e em transação.
- Verificação pública por código funciona sem login e mostra os dados essenciais.
- O modo de teste da nota mínima é impossível em produção (trava no código, não na configuração).

### 7. Falta

- **Congelar** no momento da emissão os dados impressos (F2).
- Definir **qual tentativa vale** (F1).
- Definir o efeito da **perda de acesso / cancelamento** (F3).
- Opcional: PDF gerado de verdade (não decidido; fora do escopo deste pedido).

### 8. Risco de regressão

- **F1 (trocar última por melhor):** muda notas já lançadas de quem refez prova. Precisa recalcular as matrículas existentes, e algumas podem passar a ter certificado. **Médio.**
- **F2 (congelar dados):** 1 migration com colunas novas na matrícula, preenchidas na emissão. Para os certificados **já emitidos**, a migration copia os valores de hoje. **Baixo.**
- **F3:** se houver revogação, muda a verificação pública e a tela do aluno. **Médio.**
- Testes envolvidos: `CertificadoServiceTests` (19+ casos), `ProgressoAlunoServiceTests`, `AvaliacaoServiceTests` (certificado na nota da prova).

### 9. Solução recomendada (depende de F1–F3)

- **Congelar na emissão:** `NomeAlunoCertificado`, `TituloCursoCertificado` e `NotaFinalCertificado` na `Matricula` (mesmo padrão do `NomeTurmaSnapshot`, que já existe). O certificado e a verificação passam a ler esses campos.
- **Tentativa que vale:** a **melhor** tentativa corrigida. É o padrão mais comum em EAD e evita "punir" quem refaz.
- **Perda de acesso:** certificado já emitido **continua válido** (é a comprovação de algo que o aluno concluiu). A revogação, se existir, é manual e só do Admin, com motivo, e a verificação pública passa a mostrar "Certificado revogado em …".

### 10. Critérios de aceite

1. Mudar o nome do aluno ou o título do curso **não altera** um certificado já emitido (tela do aluno e `/verificar/{codigo}`).
2. Refazer a prova depois da emissão **não altera** a nota impressa no certificado.
3. A nota de cada avaliação segue a regra F1, e a média do curso/módulo também.
4. Matrícula cancelada / aluno inativado: o certificado se comporta como decidido em F3.
5. Os testes de certificado e progresso continuam verdes, com casos novos para F1–F3.

---

## Decisões do bloco 3 que dependem de você

| # | Decisão |
|---|---|
| **F0** ✅ | **Escala e cálculo da nota** (pedido do usuário durante a auditoria). **DECIDIDO (26/11):** toda Prova/Exercício vale **de 0 a 10**, pela proporção de acertos: `pontos acertados ÷ pontos totais das questões × 10`. O campo **"Nota máxima" sai** (fixo em 10). A **nota final** do curso (e do módulo) é a **média simples** das avaliações: o campo **"Peso da nota" sai** (todas valem 1). O "Peso de progresso" também sai do formulário de Prova/Exercício. Corrige o bug 6. **Impacto:** recalcular as médias e notas finais das matrículas existentes (notas por pontos passam a ser proporcionais); certificados já emitidos não são retirados |
| **F1** ✅ | Prova/Exercício com várias tentativas: vale a **última** (hoje), a **melhor** ou a **média** das tentativas? **DECIDIDO (26/11): a melhor** nota entre as tentativas corrigidas; refazer nunca piora. Recalcular quem já refez |
| **F2** ✅ | O certificado deve **congelar**, no momento da emissão, o nome do aluno, o título do curso e a nota final? **DECIDIDO (26/11): congelar.** Campos novos na matrícula, preenchidos na emissão (mesmo padrão do `NomeTurmaSnapshot`); certificado e verificação pública leem só eles. Os já emitidos recebem os valores atuais na migration |
| **F3** ✅ | Certificado já emitido quando o aluno **perde o acesso** (matrícula cancelada, aluno inativado): continua válido, ou o Admin pode **revogar**? **DECIDIDO (26/11): continua válido, e o Admin pode revogar** com motivo obrigatório (fraude, erro). A verificação pública passa a mostrar "Certificado revogado em {data}". **Não implementado hoje** (campos de revogação + rota só do Admin + tela) |

**Ordem sugerida de implementação do bloco 3:**
1. F0 + F1 (cálculo da nota: escala 0–10, média simples, melhor tentativa) com o recálculo das matrículas existentes.
2. F2 (congelar dados na emissão), **depois** do recálculo, para os já emitidos receberem a nota certa.
3. F3 (revogação pelo Admin).

---

# BLOCO 4 — Itens rápidos

## ITEM 1 — Quiz vinculado em ordem estrita

**Classificação:** **IMPLEMENTADO CORRETAMENTE** (em 26/11, **ainda sem commit**)

- **Aplicado** pela sessão do Claude Code em 26/11, seguindo `docs/TelaConteudosAlunos/PROMPT-agente-quiz-vinculado-ordem-estrita.md`, nos 4 itens:
  - servidor: o quiz vinculado libera com o conteúdo-pai (`LiberacaoAvaliacoesInfo.ConteudosConcluidos`, `AvaliacaoService.AvaliacaoLiberadaPorProgresso`);
  - web: bloqueio em ordem e motivo "Responda o quiz acima para liberar" (`TelaModuloGestaoAluno.montarItensOrdenadosAluno`);
  - recuo com conector e "↳ Quiz sobre…" nos 3 perfis (`PainelItensModulo`);
  - celular (`lib/conteudos.js`, `ConteudosScreen.jsx`).
- **Frontend × servidor alinhados:**
  - a web e o celular usam a mesma regra do servidor;
  - o botão "Continuar" reaproveita a mesma função da tela do módulo;
  - o assistente (chatbot) explica o bloqueio citando só o conteúdo-pai.
- **Testes:** servidor 542, web 391, celular 212, todos passando. Visual conferido no app real (desktop, tablet, 375px).
- **Decisões tomadas durante a aplicação, fora do prompt:**
  - conteúdo já concluído nunca volta a bloquear;
  - quiz sem questões, agendado ou encerrado não trava a trilha;
  - quiz ligado a conteúdo despublicado volta à regra do quiz solto.
- **Pendente:**
  - **commit**;
  - conferir com uma aluna real o caso "quiz pendente bloqueia o Conteúdo 2" (coberto por testes automáticos, ainda não visto no app).
- **Relação com o bloco 2 (E3):** se o quiz passar a ter várias tentativas, o próximo conteúdo continua liberando na **1ª tentativa enviada**.

---

## ITEM 5 — "Conteúdos" passa a "Cursos" no menu (Professor e Aluno)

**Classificação:** **NÃO IMPLEMENTADO** (simples; uma decisão de escopo)

### Onde o nome aparece (web; o desktop é o mesmo web)

| Local | Arquivo | Texto hoje |
|---|---|---|
| **Menu lateral (e o menu do celular/web estreito, que usa a mesma lista)** | `frontend/src/data/appConfig.js` ≈ 12 (`{ key: "conteudos", label: "Conteudos" }`) | "Conteudos" (sem acento) |
| Título da seção | `appConfig.js`, `getSectionMeta` ≈ 130 | "Trilha de conteudos" |
| Botão Voltar (professor) | `SecaoConteudosProfessor.jsx` ≈ 1227, `TelaModuloGestaoProfessor.jsx` ≈ 558 | "← Conteúdos" |
| Caminho no topo (professor) | `TelaModuloGestaoProfessor.jsx` ≈ 559 | "Acadêmico › Conteúdos › {módulo}" |
| Botão Voltar (aluno) | `SecoesAluno.jsx` ≈ 2050, `TelaModuloGestaoAluno.jsx` ≈ 363 | "← Conteúdos" |
| Caminho no topo (aluno) | `TelaModuloGestaoAluno.jsx` | "Meus cursos › {curso} › {módulo}" (já fala "cursos") |
| **Celular (aluno)** | `mobile/src/screens/aluno/AlunoTabsNavigator.jsx` / `ScreenIndicator.jsx` | **já é "Cursos"**: nada a mudar |
| Testes que procuram o texto | `WorkspaceScreen.test.jsx`, `SecoesAluno.test.jsx`, `SecaoConteudosProfessor.test.jsx` e outros | precisam ser ajustados |

### Dependências (não mexer sem decidir)

- A **chave e a rota** são `conteudos` (`/app/conteudos/...`): navegação, botão "Continuar", links de notificação e testes dependem dela.
- **`/app/cursos` já existe** e é a seção **Cursos do Admin/Coordenador** (outra tela). Usar o mesmo endereço para o professor e o aluno exigiria separar por perfil.
- **Já existe precedente** de renomear só o texto por perfil, mantendo a chave: o "Matrículas" do Admin aparece como "Inscrições", e o "Turmas" do professor aparece como "Progresso" (`WorkspaceScreen.jsx` ≈ 88).
- No **aluno**, o menu já tem "Catálogo de Cursos". Com a mudança, ficam "Cursos" (os meus) e "Catálogo de Cursos" (comprar), que é o mesmo vocabulário do celular.

### Solução recomendada

Trocar **só os textos visíveis** ("Cursos" no menu, no título, no Voltar e no caminho), mantendo a chave e as rotas `conteudos`, como no precedente. Risco **baixo** (só testes de texto).

### Critérios de aceite

1. Professor e aluno veem "Cursos" no menu (largo, recolhido e estreito), no título, no Voltar e no caminho.
2. Admin e coordenador continuam com a seção "Cursos" deles, sem mudança.
3. Links e endereços antigos (`/app/conteudos/...`) continuam funcionando.

---

## ITEM 9 — Admin: inativar o acesso do aluno

**Classificação:** **IMPLEMENTADO CORRETAMENTE** (25/11, `7bff788`); falta só a escolha da interface

### Situação atual

| Pergunta | Resposta (código) |
|---|---|
| Onde fica | `Usuario.Ativo`, `InativadoEm`, `InativadoPorId`, motivo (5–300 caracteres) |
| Impede o login? | **Sim:** "Seu acesso foi inativado. Entre em contato com a administração." (`AuthService` ≈ 39) |
| Sessões já abertas? | **Cortadas:** a inativação **revoga todos os refresh tokens** (`RevogarTodosOsTokensAsync`), e **toda requisição** confere `Ativo` (`Program.cs`, `OnTokenValidated`, cache de 30 s limpo na hora). Na prática, o corte leva no máximo segundos |
| Histórico | **Não é tocado:** matrículas, notas, tentativas, progresso e certificados ficam como estão. Reativar devolve tudo |
| Certificados | Continuam válidos na verificação pública (e o Admin poderá revogar, decisão F3) |
| Interface hoje | Selo "Ativo/Inativo" na tabela + menu ⋮ "Inativar acesso"/"Reativar acesso" + botões no detalhe do aluno; **confirmação com motivo obrigatório** para inativar (`SecaoAlunos.jsx` ≈ 558–785) |

### Toggle × radio × como está

- **Toggle (interruptor):** passa a ideia de "liga/desliga na hora", sem pergunta. Aqui a ação **exige motivo** e **corta a sessão do aluno**, então o toggle teria que abrir a mesma confirmação. Funciona, mas o "clique e pronto" que ele sugere não acontece.
- **Radio (Ativo ○ Inativo ○):** é campo de formulário e pede um "Salvar" depois. Fica bom **dentro de um formulário de edição**, mas a inativação hoje é uma ação separada da edição dos dados.
- **Como está (ação no menu ⋮ + botão no detalhe, com confirmação):** padrão de ação **crítica e rara**; já testado.

### Recomendação

Manter **ação com confirmação** (como está). Se quiser o visual de interruptor, usar o **toggle só como gatilho** da mesma confirmação com motivo: o estado só muda depois do "Confirmar". **Radio não é recomendado.**

### Risco

**Baixo** (só interface). O servidor já garante o corte.

---

## Decisões do bloco 4 que dependem de você

| # | Decisão |
|---|---|
| **G1** ✅ | Item 5: trocar **só os textos** para "Cursos" (mantendo o endereço `/app/conteudos`), ou também mudar o **endereço**? **DECIDIDO (26/11): só os textos** (menu, título, Voltar, caminho). O endereço `/app/conteudos` continua |
| **G2** ✅ | Item 9 (inativar aluno): manter a **ação com confirmação** (como está), usar um **toggle que abre a confirmação**, ou **radio**? **DECIDIDO (26/11): como está** (selo + ação no menu ⋮ e no detalhe, confirmação com motivo). Nada a implementar. Imagem: `docs/auditorias/bloco4-inativar-aluno-opcoes.png` |

---

# BLOCO 5 — Biometria no celular

## ITEM 10 — Entrar com digital ou rosto

**Classificação:** **NÃO IMPLEMENTADO** (viável; a base de segurança já existe)

### 1. Situação atual

- **Expo SDK 57**, React Native 0.86. Builds Android pela EAS. **iOS ainda sem conta Apple Developer** (CLAUDE.md), então a biometria seria testada primeiro no Android.
- **Sessão:**
  - login com e-mail e senha (`POST /auth/login`) → JWT de **20 min** + **refresh token de 30 dias**;
  - os dois ficam no **cofre do aparelho** (`mobile/src/lib/secureStorage.js` com `expo-secure-store`: Keychain/Keystore). O resto da sessão (dados do usuário) fica no AsyncStorage;
  - na web (`npm run web`) o cofre não existe e cai no AsyncStorage.
- **Não existe** `expo-local-authentication` nem nenhuma tela de biometria.
- O **servidor já protege a sessão sozinho:**
  - refresh token revogado (logout, inativação pelo Admin) não renova;
  - toda requisição confere se o usuário está ativo.

### 2. Arquitetura recomendada

**A biometria é um cadeado LOCAL na frente da sessão que já existe.** Ela não substitui o login do servidor e **nunca guarda a senha**.

```
1º acesso: e-mail + senha (como hoje) → tokens no cofre do aparelho
           → "Usar digital/rosto para entrar da próxima vez?" [Ativar] [Agora não]
Próximas aberturas (biometria ativa):
           tela de bloqueio → LocalAuthentication.authenticateAsync()
             ✓ → usa o refresh token do cofre → servidor renova (ou recusa) → app
             ✗ / cancelou → "Tentar de novo" ou "Entrar com senha" (sai da sessão e vai ao login)
Servidor recusou o refresh (inativado, expirou, revogado) → login normal com senha
```

- **Biblioteca:** `expo-local-authentication` (oficial do Expo, compatível com o SDK 57), com o plugin no `app.config.js` e o texto de permissão do Face ID (`NSFaceIDUsageDescription`).
- **Checagem de suporte:** `hasHardwareAsync()` + `isEnrolledAsync()`. Sem sensor ou sem digital/rosto cadastrado no aparelho, a opção **não aparece**. Na web, também não.
- **Onde fica a escolha:** um marcador "biometria ativa para este usuário" no cofre, apagado no **logout** e quando o servidor recusa a sessão.
- **Ativar e desativar:** oferta única logo depois do 1º login com senha. Liga e desliga em **Meu perfil › Segurança**. Desativar só apaga o marcador; a sessão continua.
- **Quando pedir:** ao **abrir o app** e ao **voltar do segundo plano** depois de um tempo (decisão H1).
- **Reserva do aparelho:** permitir ou não o **PIN/padrão do próprio celular** quando a biometria falha (decisão H2).

### 3. Requisitos de segurança

1. **Nunca** guardar a senha do aluno no aparelho.
2. Tokens **só** no cofre do aparelho (já é assim).
3. A biometria **só destrava** o uso local. Quem decide se a sessão vale é sempre o **servidor** (refresh token + `Ativo`).
4. Logout e inativação **invalidam tudo**: o servidor revoga os tokens, e o app apaga tokens e marcador.
5. Limite de tentativas: depois de algumas falhas, o próprio sistema do aparelho bloqueia. O app oferece "Entrar com senha".
6. Nada de biometria na **web**, nem em aparelho sem tela de bloqueio configurada.
7. Mudar o cadastro de digital/rosto do aparelho **não** precisa invalidar a sessão (o refresh token continua valendo só no servidor). Isso é um limite aceito desta arquitetura simples.

### 4. Riscos e dependências

- **Testes no iOS** dependem da conta Apple Developer. O Face ID **não funciona no Expo Go**; precisa de build de desenvolvimento.
- **Risco de regressão:** baixo, se a biometria ficar como uma camada antes da tela inicial. O fluxo de login atual continua igual para quem não ativar.
- Cuidado com o **QuizModal**, que já reage à volta do segundo plano (rascunho da tentativa). O bloqueio não pode descartar a tentativa em andamento.

### 5. Critérios de aceite

1. Aparelho **com** digital/rosto: depois do 1º login aparece a oferta; ativando, a próxima abertura pede a biometria e entra sem senha.
2. Aparelho **sem** suporte ou na web: a opção não aparece, e o login é o de hoje.
3. Biometria falhou ou cancelou: "Tentar de novo" e "Entrar com senha" funcionam.
4. Aluno **inativado** pelo Admin: a biometria até passa, mas o servidor recusa e o app volta ao login com a mensagem de acesso inativado.
5. Logout apaga tudo: a próxima abertura pede e-mail e senha.
6. A tentativa de quiz em andamento não se perde quando o bloqueio aparece.

---

## Decisões do bloco 5 que dependem de você

| # | Decisão |
|---|---|
| **H1** ✅ | Quando pedir a biometria: só ao **abrir o app**, ou também ao **voltar do segundo plano** depois de X minutos? **DECIDIDO (26/11): ao abrir o app e ao voltar do segundo plano depois de 5 minutos.** Troca rápida de app não pede |
| **H2** ✅ | Se a biometria falhar, o aluno pode usar o **PIN/padrão do celular**, ou só a **senha da conta**? **DECIDIDO (26/11): PIN/padrão do celular ou senha da conta.** O sistema oferece o PIN do aparelho; "Entrar com senha" sai da sessão e vai ao login normal |

---

# FECHAMENTO — Resultado consolidado

## Situação de cada item

| Item | Assunto | Classificação | Precisa implementar? |
|---|---|---|---|
| 1 | Quiz vinculado em ordem estrita | **IMPLEMENTADO CORRETAMENTE** (26/11, sem commit) | Só commit + conferir com aluna real |
| 2 | Notas e certificados | **PARCIALMENTE IMPLEMENTADO** + **BUG** (pontos × nota máxima) | Sim (F0–F3) |
| 3 | Tentativas do quiz | **REGRA NÃO DEFINIDA** → decidida | Sim (E3) |
| 4 | Selo de encerramento | **PARCIALMENTE IMPLEMENTADO** | Sim (D9, D10) |
| 5 | "Conteúdos" → "Cursos" | **NÃO IMPLEMENTADO** | Sim, só textos (G1) |
| 6 | Modal que salva no X | **BUG IDENTIFICADO** | Sim (E1) |
| 7 | Retorno do toggle Publicado/Arquivado | **PARCIALMENTE IMPLEMENTADO** | Sim (E2) |
| 8 + 11 | Preço > 0 no Gratuito / abas / ciclo de vida | **BUG** + **NÃO IMPLEMENTADO** | Sim (D1–D8b) |
| 9 | Inativar aluno | **IMPLEMENTADO CORRETAMENTE** | Não (G2: fica como está) |
| 10 | Biometria | **NÃO IMPLEMENTADO** | Sim (H1, H2) |

## Funcionalidades novas que surgiram das decisões

- **Correção de questão dissertativa pela IA** (D8). Até existir, curso com dissertativa **não converte** (D8b). → **DEPENDÊNCIA DE OUTRA FUNCIONALIDADE.**
- **Revogação de certificado pelo Admin** (F3).
- **Publicação do Gratuito** (D2/D3, junto com o prompt de 25/11).

## Ordem recomendada de implementação

| # | Pacote | Itens / decisões | Por que nessa ordem |
|---|---|---|---|
| 0 | Commit da ordem estrita | Item 1 | Já está pronto; libera a árvore de trabalho |
| 1 ✅ | **Modal de ajustes rápidos + toggle** | Itens 6 e 7 (E1, E2) | **APLICADO em 26/11, sem commit:** `SecaoAvaliacoesProfessor.jsx` (`ModalAjustesRapidos`), `componentes.css`, `workspace.css`, testes novos em `SecaoAvaliacoesProfessor.test.jsx` (11). Conferido no app real (desktop e 375px) |
| 2 ✅ | **Menu "Cursos"** | Item 5 (G1) | **APLICADO em 26/11, sem commit:**<br>• `appConfig.js`: rótulo e título da seção;<br>• botões Voltar: `SecaoConteudosProfessor`, `TelaModuloGestaoProfessor`, `TelaModuloGestaoAluno`, `SecoesAluno`;<br>• caminho do professor;<br>• 2 textos de ajuda;<br>• testes novos em `WorkspaceScreen.test.jsx`.<br>A rota `/app/conteudos` não mudou. Conferido no app real (desktop e 375px) |
| 3 ✅ | **Cálculo da nota** | Item 2 (F0, F1) + recálculo das matrículas | **APLICADO em 86456cf + migration `RecalcularNotasEscalaDezMediaSimples` aplicada no banco local em 26/11.** Amostra antes/depois conferida (tentativas na escala 0–10, lançamentos na melhor tentativa, 3 avaliações ajustadas para 10/1, totais iguais). **Observação para o pacote 4:** matrícula com nota final antiga e curso ainda não totalmente avaliado mantém o valor antigo (ex.: matrícula 1 do seed, 0,50), pela mesma regra do servidor. Ao congelar os certificados já emitidos, decidir se esse valor é recalculado antes. **DECIDIDO (26/11): recalcular pela média** — certificado já emitido congela a média simples das provas que têm nota hoje; onde a nota final já está completa, usa ela |
| — | **Lacuna encontrada** | D8 | **Não existe correção manual de dissertativa:** tentativa com dissertativa fica "aguardando correção" para sempre. Reforça a correção por IA (D8) |
| 4 ✅ | **Certificado congelado + revogação** | Item 2 (F2, F3) | **APLICADO em 26/11** + migration `CongelarERevogarCertificado` aplicada no banco local (2 certificados congelados: matrícula 1 com 4,00 pela média, 3034 com 4,00). Revogação só do Admin, no detalhe do aluno; verificação pública e telas do aluno (web e celular) mostram "revogado em {data}" |
| 5 | **Tentativas do quiz** | Item 3 (E3) | Independente; pequeno |
| 6 | **Regra única de situação do curso + selos** | Itens 4 e 11 (D5, D6, D6b, D9, D10) | Base dos pacotes 7 e 8 |
| 7 | **Publicação (Gratuito e Pago) + catálogo/matrícula pela publicação** | Itens 8/11 (D2, D3, D7) + prompt de 25/11 | Precisa da regra única |
| 8 | **Conversão Acompanhado/Gratuito → Pago/Gratuito** | Itens 8/11 (D1, D4, D8b) + migration | Precisa da publicação |
| 9 | **Biometria** | Item 10 (H1, H2) | Independente; depende de build Android para testar |
| — | Correção por IA | D8 | Projeto próprio; quando existir, tira a trava D8b |

## Decisões

**Todas as decisões deste pedido foram tomadas em 26/11** (D1–D10 + D6b + D8b, E1–E3, F0–F3, G1–G2, H1–H2) e estão registradas em cada bloco. Nenhum item ficou com regra de negócio em aberto.

> **Atenção para a implementação:** as decisões D2/D3 mudam a regra do prompt `docs/fluxo-venda-cursos/PROMPT-agente-gratuito-e-pago-ja-completos.md` (25/11). Ele precisa ser **atualizado** antes de ser aplicado (passa a incluir o curso convertido e a aba "Encerrados" como "precisa de ação do Admin").
