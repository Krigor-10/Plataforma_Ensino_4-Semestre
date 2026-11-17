# Prompt: tela "Matrículas" do Admin vira "Inscrições", com foco em inscrições e vendas (backend + frontend web)

## Contexto e decisão do usuário (2026-11-16)

Não existe mais aprovação de matrícula: o aluno entra no curso sozinho, de graça ou comprando. A tela atual do Admin (`SecaoMatriculas.jsx`, `VistaGestorMatriculas`, ≈ linha 362) ficou sem função:
- **"Matrículas aprovadas" e "Alunos ativos" sempre dão o mesmo número;**
- **"% Conclusão" é ambíguo;**
- nenhuma linha tem ação.

**O usuário aprovou:**
- a imagem `docs/inscricoes/inscricoes-proposta.png`;
- o nome visível **"Inscrições"**;
- o foco em **inscrições e vendas**.

**A palavra "Matrícula" continua no banco, no código, nas rotas e nas telas do aluno.** Só muda o que o Admin vê.

## Onde está (verificado pelo agente de arquitetura)

- **Tela:** `pages/workspace/SecaoMatriculas.jsx`, em `VistaGestorMatriculas`.
  - Ela usa `GET /Cursos/desempenho` (`CursoDesempenhoService.ObterDesempenhoParaAdminAsync`), que lista todos os cursos para o Admin.
- **Menu e caminho:** `data/appConfig.js`.
  - Linha 14: `{ key: "matriculas", label: "Matriculas", roles: ["Admin", "Aluno"] }`.
  - Linha 145: o título é "Catalogo de Cursos" para o aluno e "Fluxo de matriculas" para os outros.
- **Pagamento:** `Models/Pagamento.cs`, com `Status` (1 Pendente, 2 Pago, 3 Cancelado), `Valor`, `CriadoEm` e `PagoEm`.
  - **Não existe endpoint de Admin com os pagamentos.** Só existe `GET /Pagamentos/aluno`, como lembra o comentário em `DashboardAdmin.jsx`.
- **Progresso:** `ProgressoCursoAluno.PercentualConclusao`.
- **Certificado:** `Matricula.CertificadoEmitidoEm`.
- **Dashboard:** o KPI "Taxa de aprovacao" de `DashboardAdmin.jsx` (≈ linha 93) é calculado com matrículas aprovadas / matrículas, e por isso dá sempre 100%.

## Definições (usar exatamente estas)

Por curso, considerando só as matrículas **Aprovadas**:
- **Inscritos:** matrículas com acesso liberado, ou seja, curso gratuito ou pagamento **Pago**. A mesma regra de `IAcessoAcademicoService.TemAcessoLiberadoAsync`.
- **Pendentes:** matrículas cujo pagamento está **Pendente**. Elas **não** entram em Inscritos. Em curso gratuito, a tela mostra "—".
- **Começaram:** inscritos com `PercentualConclusao > 0`.
- **Concluíram:** inscritos com `PercentualConclusao >= 100`.
- **Com certificado:** inscritos com `CertificadoEmitidoEm` preenchido.
- **Receita (simulada):** soma de `Pagamento.Valor` com status **Pago**.
- **Situação do curso:**
  - **Encerrado:** `EncerradoEm` preenchido;
  - **À venda:** pacote com `PublicadoParaVendaEm`;
  - **Aguardando encerramento:** `ConcluidoPeloProfessorEm` preenchido e curso não encerrado;
  - **Em andamento:** todos os outros casos.
- **Filtro de período:** pela data da inscrição (`Matricula.DataSolicitacao`). Para a receita, usar `PagoEm`.

## Tarefa

### Backend

1. Criar um endpoint **só para Admin**: `GET /Cursos/inscricoes?de=AAAA-MM-DD&ate=AAAA-MM-DD`. Os dois parâmetros são opcionais, e sem eles vale todo o período.
   - Por curso, devolver: `cursoId`, `titulo`, `modeloCurso`, `situacao`, `preco`, `inscritos`, `comecaram`, `concluiram`, `comCertificado`, `pendentes` e `receita`.
   - Fazer o cálculo em poucas consultas agrupadas, sem N+1.
   - Não mexer no `GET /Cursos/desempenho`: ele é usado por outras telas.
2. **Testes:**
   - cada definição acima, incluindo o pendente que não conta como inscrito e o curso gratuito sem pendentes nem receita;
   - o filtro de período;
   - Coordenador, Professor e Aluno recebem 403.

### Frontend web (Admin)

3. **Nome:**
   - para o **Admin**, o item do menu vira "Inscrições" e o título do caminho vira "Inscrições";
   - para o **aluno**, nada muda ("Matriculas" e "Catalogo de Cursos");
   - a chave `matriculas` da rota continua a mesma.
4. **Cabeçalho:** título "Inscrições" e subtítulo "O aluno entra no curso sozinho, de graça ou comprando. Acompanhe quem entrou, quem terminou e o que foi vendido."
5. **Resumo com 5 `CartaoEstatistica` compactos**, do mesmo tamanho dos KPIs do Dashboard do Admin (ver `docs/dashboard-admin/PROMPT-agente-kpis-menores.md`; reaproveitar o modificador se ele já existir):
   - Inscrições;
   - Começaram, com "· N%" em relação aos inscritos;
   - Concluíram, com "· N%";
   - Certificados emitidos;
   - Receita (simulada), com "· N pendente(s)".
   - Os números respeitam os filtros.
6. **Filtros:**
   - chips de modelo: Todos, Gratuito, Pago, Acompanhado. Esse filtro é feito no cliente;
   - seletor de período: Todo o período, Este mês, Últimos 3 meses, Este ano. Esse filtro chama o endpoint de novo com `de`/`ate`.
7. **Tabela**, com as colunas Curso, Preço, Inscritos, Funil, Pendentes, Receita e uma seta:
   - **Curso:** o nome e, embaixo, dois selos: o modelo (Gratuito verde, Pago roxo, Acompanhado azul) e a situação (neutro);
   - **Preço:** "Grátis" quando é gratuito;
   - **Funil:** uma barra com 4 partes, cada uma proporcional aos inscritos:
     - concluíram com certificado, em verde;
     - concluíram sem certificado, em roxo;
     - em andamento, em azul;
     - não começaram, no fundo.
     - Abaixo da barra, o texto "5 começaram › 4 concluíram › 2 com certificado", no singular quando for 1. Com 0 inscritos, a barra fica vazia e o texto diz "Ninguém inscrito ainda".
     - Embaixo da tabela, uma legenda com as 4 cores.
   - **Pendentes:** o número fica em amarelo e em negrito quando for maior que 0. Em curso gratuito, "—".
   - **Receita:** em R$. Em curso gratuito, "—".
   - **Linha de total** no rodapé ("Total · N cursos"), no lugar da frase "N matriculas aprovadas no total…".
   - **Clicar na linha** (ou Enter com o foco nela) abre a tela do curso, `/app/cursos/:id`, a mesma de Cursos › curso.
   - Ordem: por inscritos, do maior para o menor, como hoje.
8. **Celular (≤ 768px):** cada curso vira um cartão com o nome, os selos, a barra do funil com o texto e uma linha "Preço · Inscritos · Pendentes · Receita". O total fica num cartão no fim.
9. **Dashboard do Admin:** o KPI "Taxa de aprovacao" vira **"Taxa de conclusão"**:
   - conta = concluíram / inscritos, com os mesmos dados de `GET /Cursos/inscricoes` sem filtro;
   - o ícone e a cor continuam os mesmos.

**Não alterar:**
- as telas do aluno (catálogo, Meus Cursos e compra);
- as rotas e as entidades `Matricula`;
- `GET /Cursos/desempenho`;
- as telas do Coordenador e do Professor.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), **sem modo demo**:

- **Admin:**
  - o menu e o caminho mostram "Inscrições";
  - os 5 números batem com a soma da tabela.
  - Conferir pelo menos um curso pago no banco: inscritos, pendentes e receita.
- **Aluno:** o menu continua "Matriculas" e o catálogo não mudou.
- **Filtros:**
  - o chip "Gratuito" mostra só os cursos gratuitos, e o resumo é recalculado;
  - "Este mês" muda os números conforme a data da inscrição.
- **Funil:** a barra e o texto batem, e o curso sem inscritos mostra "Ninguém inscrito ainda".
- **Pagamento pendente:** um aluno clica em comprar e não confirma → o número aparece em amarelo na coluna Pendentes e "1 pendente" aparece no resumo. Esse aluno não conta como inscrito.
- **Clique:** clicar na linha abre a tela do curso.
- **Celular (≈ 390px):** os cursos aparecem como cartões, sem rolagem lateral.
- **Dashboard:** mostra "Taxa de conclusão" com o valor certo.
- **Testes:**
  - backend: definições, período e permissões;
  - vitest: nome por perfil, filtros, texto do funil (singular e plural, zero inscritos), pendentes em destaque, clique na linha e KPI do Dashboard.
- `dotnet test`, `npm run lint` e `npm test` sem erros novos.
