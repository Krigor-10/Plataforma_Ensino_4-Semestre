# Parte 3 de 3 — Coordenador revisa o conteúdo do curso, só para leitura (backend + frontend web)

> Faz parte de `docs/fluxo-coordenador/partes/LEIA-ME-ordem.md`. É a maior das três. Não depende das partes 1 e 2, mas deve vir **depois** do prompt da confirmação de encerramento (`docs/fluxo-venda-cursos/PROMPT-agente-confirmacao-encerrar-curso.md`), por causa do link do item 3.4.

## Contexto

Projeto CodeRyse Academy: backend ASP.NET (raiz) e frontend web (`frontend/`).

**Decisão do usuário:** o Coordenador passa a ver, **só para leitura**, o conteúdo publicado dos cursos que coordena (módulos, materiais e quizzes com as questões e o gabarito), para acompanhar a qualidade do ensino. Encaixa no fluxo: o professor conclui, o coordenador **revisa** e depois encerra.

**Imagens aprovadas:** `../coordenador-parte2-tela-curso.png` (item 1, botão "Ver conteúdo") e `../coordenador-parte3-ver-conteudo.png` (visão de leitura com gabarito).

## O que o agente de arquitetura já verificou (não repetir)

- Hoje só o Professor lê conteúdos e avaliações:
  - `ConteudosDidaticosController`: GET com `[Authorize(Roles = "Professor")]`, ≈ linhas 25 e 52;
  - `AvaliacoesController`: GET e GET de questões só Professor;
  - o Aluno tem rotas próprias.
- Prévia existente "Visualizar como aluno": `PreviaTrilhaAluno` em `pages/workspace/SecaoConteudosProfessor.jsx` ≈ linha 2035, com as props `conteudosPorModuloId`, `cursoTitulo`, `modulosDoCurso`, `onFechar`, `quizPorConteudoId` e `quizzesPorModuloId`. Já filtra só o publicado.
- Regra de posse: `CursoAutorizacaoService.PodeGerenciarCursoAsync` (Admin sempre; Coordenador só se for o dono).
- Arquivos (PDF e imagem) passam por `UploadAutorizacaoService`, com testes em `UploadAutorizacaoServiceTests`.
- A tela real logada **não** foi conferida, porque o navegador estava na tela de login.

## Tarefa

### 0. Antes de alterar
- Rodar `dotnet test` e `npm test` como linha de base.
- Ver quais consultas e DTOs de conteúdo, avaliação e questão podem ser reaproveitados.
- Se a liberação de arquivos exigir mudar uma regra de segurança além do previsto, **parar e relatar**.

### 1. Backend
- Rota nova, **só leitura**: `GET /Cursos/{id}/revisao-conteudo`, com `[Authorize(Roles = "Admin,Coordenador")]` e checagem de `PodeGerenciarCursoAsync`.
- Devolve só o que está **publicado** (sem rascunho e sem arquivado):
  - módulos em ordem;
  - conteúdos de cada módulo (tipo, título, texto, URL ou arquivo, ordem);
  - quizzes e avaliações (vinculados a material, do módulo e do curso), com **questões, alternativas e a correta**, mais a explicação, se existir.
- Liberar o acesso aos **arquivos** desses conteúdos para o Coordenador do curso (e para o Admin) em `UploadAutorizacaoService`, sem abrir para outros cursos.
- **Nenhuma rota de escrita nova.**
- Testes:
  - Coordenador dono: 200, só o publicado;
  - Coordenador de outro curso: 403;
  - Professor e Aluno: 403;
  - arquivo de conteúdo: o Coordenador dono acessa e o de outro curso não.

### 2. Extrair a prévia
- Mover `PreviaTrilhaAluno` para `components/`, **sem mudar o comportamento** na tela do Professor.

### 3. Frontend do Coordenador
1. Na tela do curso (`PainelCursoGestao.jsx`), botão **"Ver conteúdo"** para o Coordenador. O Admin também pode ver, pela mesma regra.
2. O botão abre a visão de leitura usando a prévia extraída, alimentada pela rota nova, com o selo **"Somente leitura"**. Nenhum botão de editar, publicar ou excluir.
3. Nos quizzes, mostrar as questões com as alternativas e a **correta destacada em verde**. Materiais abrem como para o aluno (PDF, imagem, vídeo, link).
4. Na janela de confirmação do encerramento (do prompt `PROMPT-agente-confirmacao-encerrar-curso.md`), acrescentar o link **"Revisar conteúdo antes de encerrar"**, que abre essa visão. Se aquela janela ainda não existir, registrar isso no relatório final e não criar a janela aqui.

**Não alterar:** o fluxo de venda, as telas do Professor e do Aluno (exceto a extração da prévia, sem mudar o comportamento), a grade do Admin e as regras de edição.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo:

- **Coordenador, tela do curso:** "Ver conteúdo" abre a visão "Somente leitura" com módulos, materiais e quizzes.
  - PDF e imagem abrem.
  - As questões mostram a resposta certa em verde.
  - Só aparece o que está publicado.
- **Coordenador de outro curso:** a rota devolve 403 e os arquivos não abrem.
- **Admin:** consegue usar "Ver conteúdo".
- **Professor:** "Visualizar como aluno" continua igual.
- **Janela de encerramento:** tem o link "Revisar conteúdo antes de encerrar", se ela já existir.
- `dotnet test`, `npm run lint` e `npm test` sem erros novos em relação à linha de base.

Depois de aplicado, avisar o agente de arquitetura para atualizar a planilha de permissões e os casos de uso do Coordenador.
