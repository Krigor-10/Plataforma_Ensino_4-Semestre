> **SUBSTITUÍDO (2026-11-12):** este prompt foi dividido em 3 partes, em `partes/` (ver `partes/LEIA-ME-ordem.md`). Mande ao agente as partes, não este arquivo. Ele fica só como histórico.

# Prompt — Coordenador: situação do curso na grade, edição só do Admin e revisão do conteúdo (web + backend)

## Contexto

Projeto CodeRyse Academy: backend ASP.NET (raiz) e frontend web (`frontend/`). O fluxo de venda de cursos (`docs/fluxo-venda-cursos/`, rounds 1–7) já está aplicado: Professor conclui › Coordenador encerra › Admin transforma em pacote.

**Pedido e decisões do usuário** (aprovou as recomendações do agente de arquitetura e pediu o prompt):

1. **Grade de Cursos do Coordenador:** hoje não mostra que um curso está aguardando encerramento. O coordenador recebe a notificação, mas precisa entrar curso por curso. Trocar o selo de **Média** por um **selo de situação**:
   - "Aguardando encerramento" chamativo;
   - "Encerrado" com cadeado.

   Tirar o selo "Coordenado" na visão do coordenador. Separar os cursos em **abas "Ativos | Encerrados"**: o encerrado sai da frente, mas continua acessível para reabrir, acompanhar alunos e ver o histórico.
2. **Editar título e descrição do curso passa a ser só do Admin.** A descrição agora é o texto de venda na home, definido pelo Admin em "Preparar para venda", e quem cria curso é o Admin.
3. **O Coordenador passa a ver, só para leitura, o conteúdo publicado dos cursos que coordena** (módulos, materiais e quizzes com as questões e o gabarito), para acompanhar a qualidade do ensino. Natural no fluxo: o professor conclui, o coordenador **revisa** e depois encerra.

**Imagens de referência (nesta pasta):** `coordenador-parte1-grade.png`, `coordenador-parte2-tela-curso.png` e `coordenador-parte3-ver-conteudo.png`. Os números amarelos e o quadro lateral são só explicação, não fazem parte da tela.

## O que o agente de arquitetura já verificou (não repetir)

**Grade:**
- `pages/workspace/SecaoCursos.jsx` ≈ linhas 860–880: o card mostra `<Insignia texto={… "Coordenado" : "Pendente"} />` (≈ 866) e `<Insignia texto={\`Media …\`} />` (≈ 876).
- O Coordenador hoje vê a lista sem abas (subtítulo "Cursos ativos vinculados a sua coordenacao.", ≈ 718).
- O Admin já tem abas de situação e etiqueta de modelo desde o round 5, e **não muda**.

**Edição:**
- `Controllers/CursosController.cs` ≈ linhas 77–79: `PUT {id}` com `[Authorize(Roles = "Admin,Coordenador")]`. O Coordenador edita título e descrição; só o Admin muda preço (403).
- Botão "Editar curso" em `PainelCursoGestao.jsx` ≈ linha 295 (`onEditarCurso`) e o modal de edição em `SecaoCursos.jsx`.

**Leitura de conteúdo:**
- Hoje só o Professor lê conteúdos e avaliações:
  - `ConteudosDidaticosController` (GET `[Authorize(Roles = "Professor")]`, ≈ linhas 25 e 52);
  - `AvaliacoesController` (GET e GET de questões só Professor);
  - o Aluno tem rotas próprias.
- Existe a prévia "Visualizar como aluno": `PreviaTrilhaAluno` em `SecaoConteudosProfessor.jsx` ≈ linha 2035, com as props `conteudosPorModuloId`, `cursoTitulo`, `modulosDoCurso`, `onFechar`, `quizPorConteudoId` e `quizzesPorModuloId`. Ela já filtra só o publicado. Reaproveitar.
- Regra de posse do curso: `CursoAutorizacaoService.PodeGerenciarCursoAsync` (Admin sempre; Coordenador só se for o dono).
- Arquivos (PDF e imagem) passam por autorização de upload (`UploadAutorizacaoService` e testes em `UploadAutorizacaoServiceTests`). O Coordenador precisa conseguir abrir os arquivos dos cursos dele.

A tela real logada **não** foi conferida, porque o navegador estava na tela de login.

## Tarefa

### 0. Antes de alterar: viabilidade
- Rodar `dotnet test` e `npm test` como linha de base.
- Mapear quem usa o `PUT /Cursos/{id}` como Coordenador (telas e testes, por exemplo `CursosControllerIntegrationTests`).
- Se surgir conflito com regra existente, **parar e relatar**.

### 1. Grade de Cursos do Coordenador (só a visão do Coordenador)
1. **Abas "Ativos | Encerrados"** com contagem, no mesmo padrão `.abas-matriculas` / `.linha-abas-status`.
   - Ativos: sem `encerradoEm`.
   - Encerrados: com `encerradoEm`, incluindo os que viraram pacote.
2. **Selo de situação** no lugar da Média:
   - **Aguardando encerramento** (`concluidoPeloProfessorEm` e sem `encerradoEm`): selo âmbar "Aguardando você", com ícone de alerta ou relógio. Esses cursos aparecem **primeiro** na aba Ativos;
   - **Em andamento**: sem selo de situação, ou com um selo neutro discreto;
   - **Encerrado**: selo cinza "Encerrado" com cadeado (`TbLock`).
3. **Remover o selo "Coordenado"** na visão do Coordenador. No Admin continua.
4. **Remover o selo de Média** do card do Coordenador. A média continua dentro do curso. A grade do Admin não muda.
5. O subtítulo da tela acompanha a aba (por exemplo, "Cursos ativos da sua coordenação" / "Cursos que você encerrou").

### 2. Editar título e descrição: só o Admin
1. `PUT /Cursos/{id}` passa a `[Authorize(Roles = "Admin")]`. Remover a lógica de "Coordenador não pode mudar o preço", que perde o sentido, e atualizar os testes: o Coordenador recebe 403.
2. Frontend: esconder **"Editar curso"** para o Coordenador na tela do curso e onde mais aparecer.
3. Atualizar o comentário do topo do `PainelCursoGestao.jsx`, se ele descrever as ações por perfil.

### 3. Revisão de conteúdo pelo Coordenador (só leitura)
**Backend:**
- Rota nova: `GET /Cursos/{id}/revisao-conteudo`, com `[Authorize(Roles = "Admin,Coordenador")]` e checagem de `PodeGerenciarCursoAsync`.
- Devolve, só do que está **publicado** (sem rascunho e sem arquivado):
  - módulos em ordem;
  - conteúdos de cada módulo (tipo, título, texto, URL ou arquivo, ordem);
  - quizzes e avaliações (vinculados a material, do módulo e do curso), com **questões, alternativas e a correta**, mais a explicação, se existir.
- Reaproveitar as consultas e DTOs existentes onde der. **Sem nenhuma rota de escrita.**
- Liberar o acesso aos **arquivos** desses conteúdos para o Coordenador do curso (e para o Admin) em `UploadAutorizacaoService`, sem abrir para outros cursos.
- Testes:
  - Coordenador dono: 200, só o publicado;
  - Coordenador de outro curso: 403;
  - Professor e Aluno: 403;
  - arquivo de conteúdo: o Coordenador dono acessa e o de outro curso não.

**Frontend:**
- Na tela do curso (`PainelCursoGestao.jsx`), botão **"Ver conteúdo"** para o Coordenador. O Admin também pode ver, pela mesma regra.
- Ele abre a visão de leitura reaproveitando `PreviaTrilhaAluno`: extrair para `components/`, sem mudar o comportamento na tela do Professor.
- Nos quizzes, mostrar as questões com as alternativas e a **correta destacada**, com o selo "Somente leitura". Nenhum botão de editar, publicar ou excluir.
- Na janela de confirmação do encerramento (`PROMPT-agente-confirmacao-encerrar-curso.md`, quando aplicado), acrescentar o link "Revisar conteúdo antes de encerrar", que abre essa visão.

**Não alterar:** o fluxo de venda, as telas do Professor e do Aluno, a grade do Admin, a regra de reabrir pacote à venda e as notificações.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo:

- **Coordenador, grade de Cursos:**
  - abas Ativos e Encerrados com contagem;
  - um curso concluído pelo professor aparece **primeiro**, com o selo "Aguardando você";
  - sem selo de Média e sem "Coordenado";
  - ao encerrar, o curso passa para a aba Encerrados com o cadeado e continua abrindo, inclusive para reabrir.
- **Coordenador, tela do curso:**
  - sem "Editar curso", e o `PUT /Cursos/{id}` devolve 403;
  - "Ver conteúdo" mostra módulos, materiais (com abertura de PDF e imagem) e quizzes com o gabarito, só leitura, só do publicado;
  - curso de outro coordenador: 403.
- **Admin:** a grade com abas de venda continua igual; "Editar curso" continua funcionando; pode usar "Ver conteúdo".
- **Professor e Aluno:** nada muda.
- `dotnet test`, `npm run lint` e `npm test` sem erros novos em relação à linha de base.

Depois de aplicado, avisar o agente de arquitetura para atualizar a planilha de permissões (Coordenador perde a edição de curso e ganha a revisão de conteúdo) e os casos de uso do Coordenador.
