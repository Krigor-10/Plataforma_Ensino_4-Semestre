# Parte 2 de 3 — Editar título e descrição do curso: só o Admin (backend + frontend web)

> Faz parte de `docs/fluxo-coordenador/partes/LEIA-ME-ordem.md`. É independente das partes 1 e 3 e pode ir sozinha num commit.

## Contexto

Projeto CodeRyse Academy: backend ASP.NET (raiz) e frontend web (`frontend/`).

**Decisão do usuário:** editar título e descrição do curso passa a ser **só do Admin**.
- Quem cria curso é o Admin.
- A descrição agora é o **texto de venda na home**, definido pelo Admin na janela "Preparar para venda" do fluxo de venda. Se o Coordenador continuar editando, ele muda o texto de um pacote à venda sem o Admin saber.

**Imagem de referência:** `../coordenador-parte2-tela-curso.png`, item 2 ("Sem Editar curso").

## O que o agente de arquitetura já verificou (não repetir)

- `Controllers/CursosController.cs` ≈ linhas 77–79: `PUT {id}` com `[Authorize(Roles = "Admin,Coordenador")]`. No método há uma lógica que devolve **403 se o Coordenador tentar mudar o preço**.
- Testes existentes que usam essa rota como Coordenador, por exemplo `Integration/CursosControllerIntegrationTests.cs` (`AtualizarCurso_CoordenadorAlterandoModelo_Retorna403ENaoAltera`).
- Frontend:
  - botão "Editar curso" em `pages/workspace/PainelCursoGestao.jsx` ≈ linha 295 (`onEditarCurso`);
  - modal de edição em `pages/workspace/SecaoCursos.jsx`, com campos de preço e modelo só para `ehAdmin`.
- A tela real logada **não** foi conferida, porque o navegador estava na tela de login.

## Tarefa

### 0. Antes de alterar
- Rodar `dotnet test` e `npm test` como linha de base.
- Procurar **todos** os usos de `PUT /Cursos/{id}` feitos pelo Coordenador, em telas e testes.
- Se algum fluxo do Coordenador depender dessa rota, **parar e relatar**.

### 1. Backend
- `PUT /Cursos/{id}` passa a `[Authorize(Roles = "Admin")]`.
- Remover a lógica "Coordenador não pode mudar o preço", que perde o sentido.
- Atualizar os testes:
  - o Coordenador recebe 403 em qualquer edição;
  - o Admin edita título, descrição, preço e modelo como hoje.

### 2. Frontend
- Esconder **"Editar curso"** para o Coordenador na tela do curso e em qualquer outro lugar onde apareça para ele.
- Simplificar o modal de edição, se a condição `ehAdmin` dos campos de preço e modelo deixar de fazer sentido. O comportamento do Admin não muda.
- Atualizar o comentário do topo de `PainelCursoGestao.jsx`, se ele descrever as ações por perfil.

**Não alterar:** a janela "Preparar para venda", a foto de capa, a atribuição de coordenador e as outras ações do Coordenador (Professores, Encerrar, Reabrir).

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo:

- **Coordenador:** a tela do curso não tem "Editar curso"; uma chamada direta a `PUT /Cursos/{id}` devolve 403.
- **Admin:** "Editar curso" funciona com título, descrição, preço e modelo.
- `dotnet test`, `npm run lint` e `npm test` sem erros novos em relação à linha de base.
