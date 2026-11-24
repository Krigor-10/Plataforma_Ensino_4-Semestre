# Prompt — Redesenho da Home pública (web)

## Contexto

A Home pública (`frontend/src/pages/PublicHome.jsx`, rota `/`) é a primeira tela do visitante. Hoje ela tem o topo com a foto do datacenter e o título "CodeRyse Academy", 3 cartões de diferenciais (`PUBLIC_PILLARS`) e uma grade com **todos** os cursos publicados (18 hoje, incluindo cursos de teste antigos). A vitrine fica longe do topo e o visitante precisa rolar muito para achar o que comprar.

Enquanto o `GET /Cursos` carrega, a Home mostra os cursos fictícios de `CURATED_COURSES` ("Programação Aplicada R$ 189,90" etc.) com botão de comprar, o que leva para `/cadastro/programacao`, um curso que não existe.

**Objetivo:** a Home vira uma vitrine curta, focada em **ver e comprar cursos**: 3 cursos em destaque logo na primeira dobra, escolhidos pelo Admin, e o catálogo completo vai para uma página própria.

## Decisões do usuário (11/11)

- **Foco:** ver e comprar cursos.
- **Visual:** mantém o tema escuro roxo/verde e a identidade atual (logo, cores, componentes `Botao`, `cartao-curso`).
- **Vitrine "opção A":** 3 destaques na Home + botão "Ver catálogo completo" que leva para outra página.
- **Topo "1":** mantém a foto de fundo, mas mais baixa, com os 3 destaques logo abaixo, ainda na primeira dobra.
- **Destaques escolhidos pelo Admin**, num campo novo do curso.
- **Admin pode marcar quantos quiser.** A Home mostra os **3 marcados mais recentemente**.
- **Menos de 3 marcados (ou nenhum):** a Home **completa automaticamente** até 3 com os cursos publicados mais recentes. A vitrine nunca fica vazia.
- **Diferenciais (3):** Quizzes com IA, Certificado verificável, Progresso e XP.

## Layout aprovado (de cima para baixo)

```
┌ Cabeçalho (GlobalHeader, sem mudança) ─ Cursos · Entrar · [Criar conta] ┐
│ TOPO: foto do datacenter escurecida, altura menor que a atual            │
│   CURSOS DIGITAIS COM ACOMPANHAMENTO                                     │
│   Aprenda tecnologia com trilhas práticas                                │
│   Comece grátis ou compre seu curso e acompanhe tudo no painel.          │
│   [Ver cursos em destaque]  (verde, rola até os destaques)               │
├──────────────────────────────────────────────────────────────────────────┤
│ DESTAQUES: 3 cartões lado a lado (capa, título, descrição, preço,        │
│   Comprar / Começar grátis)                                              │
│                    [Ver catálogo completo →]                             │
├──────────────────────────────────────────────────────────────────────────┤
│ DIFERENCIAIS: Quizzes com IA · Certificado verificável · Progresso e XP  │
├──────────────────────────────────────────────────────────────────────────┤
│ RODAPÉ (o atual) + link "Verificar certificado"                          │
└──────────────────────────────────────────────────────────────────────────┘
```

No celular, os 3 destaques e os 3 diferenciais ficam um embaixo do outro.

## O que fazer

### 1. Backend — campo "Em destaque" no curso

- Em `Models/Curso.cs`, acrescentar:
  - `EmDestaque` (`bool`, padrão `false`)
  - `DestaqueEm` (`DateTime?`): quando foi marcado. É ele que decide quais são os "3 marcados mais recentemente".
- Migration nova (ex.: `AdicionarDestaqueEmCurso`). Cursos existentes ficam com `EmDestaque = false`.
- Rota nova **`PUT /Cursos/{id}/destaque`**, `[Authorize(Roles = "Admin")]`, corpo `{ "emDestaque": true | false }`:
  - Marcar: `EmDestaque = true`, `DestaqueEm = DateTime.UtcNow`.
  - Desmarcar: `EmDestaque = false`, `DestaqueEm = null`.
  - Curso inexistente → 404. Coordenador, Professor e Aluno → 403.
  - Sem limite de quantidade (decisão do usuário).
- `GET /Cursos` (já público, usado pela Home) passa a devolver `emDestaque` e `destaqueEm`. Não criar outra rota de listagem.
- Teste no `PlataformaEnsino.Tests`: Admin marca e desmarca; outro perfil recebe 403.

### 2. Frontend — regra de seleção dos destaques

Uma função pura, por exemplo `selecionarDestaques(cursos)`, junto de `isCursoVisivelNoCatalogoPublico` em `frontend/src/data/appConfig.js` (mesma fonte da regra de visibilidade):

1. Filtra os cursos visíveis com `isCursoVisivelNoCatalogoPublico`.
2. Pega os que têm `emDestaque`, ordenados por `destaqueEm` do mais novo para o mais antigo, no máximo 3.
3. Se faltar, completa com os outros visíveis, do mais recente para o mais antigo (`id` decrescente), sem repetir.
4. Devolve no máximo 3.

Teste unitário: 0, 1, 3 e 5 marcados; curso marcado mas oculto/encerrado não entra.

### 3. Frontend — nova Home (`PublicHome.jsx`)

- **Topo:** mantém `assets/home-publica-banner.jpg` (a foto) com altura menor. Textos novos conforme o layout acima. Um só botão principal, verde: **"Ver cursos em destaque"**, que rola até a seção de destaques. O botão "Começar agora" sai, porque "Criar conta" já fica no cabeçalho.
- **Destaques:** usa `selecionarDestaques` sobre a resposta de `GET /Cursos`. Reaproveita o cartão de curso atual (capa com fallback `getCourseCover`, preço com `formatMoney`, "Grátis"/"Começar grátis"/"Comprar", modal ao clicar, ida para `/cadastro/:id`). Para isso, extrair o cartão e o modal para um componente compartilhado (ex.: `components/CartaoCursoPublico.jsx`) usado pela Home e pelo catálogo. Não copiar o código.
- Abaixo dos destaques, o botão **"Ver catálogo completo →"** (variante fantasma/contorno) leva para `/cursos`.
- **Carregando:** 3 cartões em esqueleto (sem texto falso). **Não** usar mais `CURATED_COURSES` como placeholder na Home: os cursos fictícios com botão de comprar levam para um cadastro que não existe.
- **Erro:** mensagem curta (`InlineMessage`) e o botão "Ver catálogo completo" continua visível.
- **Diferenciais:** troca o conteúdo de `PUBLIC_PILLARS` por:
  - **Quizzes com IA:** "Pratique cada módulo com questões geradas com apoio de IA."
  - **Certificado verificável:** "Conclua o curso e receba um certificado com código de verificação."
  - **Progresso e XP:** "Acompanhe seu avanço e ganhe XP a cada etapa concluída."
  Cada item com um ícone (`react-icons/tb`), na faixa logo abaixo dos destaques.
- **Rodapé:** mantém o atual e acrescenta **"Verificar certificado"** (vai para `/verificar`) na lista "Plataforma". "Cursos" no rodapé passa a ir para `/cursos`.

### 4. Frontend — página pública do catálogo (`/cursos`)

- Nova rota em `lib/router.js` (ex.: `kind: "catalogo"` para `/cursos`) e no `App.jsx`, acessível sem login.
- Nova página (ex.: `pages/CatalogoPublico.jsx`) com o `GlobalHeader`, o cabeçalho "Catálogo de cursos ativos / Escolha uma trilha e comece agora", a contagem e a **grade completa** que hoje está na Home (mesmo filtro `isCursoVisivelNoCatalogoPublico`), usando o cartão compartilhado do item 3, e o mesmo rodapé.
- `useDocumentTitle("Cursos | CodeRyse Academy")` e `applyPageMetadata` para o novo `kind`, se ele for usado para metadados.
- No `GlobalHeader`, o link **"Cursos"** passa a levar para `/cursos` (hoje é âncora `#cursos`).
- Filtros e busca no catálogo **não** entram agora.

### 5. Admin — marcar destaque na tela única do curso

- Em `pages/workspace/PainelCursoGestao.jsx`, **só para o perfil Admin**, uma ação na linha de ações do topo (mesmo estilo compacto das outras): **"Destacar na Home"** / **"Em destaque na Home"** (estado ligado com ícone de estrela). Ao clicar, chama `PUT /Cursos/{id}/destaque`, mostra um toast ("Curso destacado na Home" / "Destaque removido") e atualiza o estado sem recarregar a página.
- Junto da ação, um texto de ajuda curto (tooltip ou legenda): "A Home mostra os 3 cursos destacados mais recentemente."
- Na grade de cursos do Admin (`SecaoCursos.jsx`), um selo pequeno **"Destaque"** no card dos cursos marcados.
- Coordenador e Professor **não** veem essa ação.

## Sem regressão (obrigatório)

Esta mudança **não pode quebrar nada que funciona hoje**. Mexa só no que está descrito acima, e tudo abaixo precisa continuar igual:

- **Regra de visibilidade:** `isCursoVisivelNoCatalogoPublico` também é usada pelo `CadastroScreen.jsx` e pelo `SecaoMatriculas.jsx` (catálogo do aluno). Não mudar o comportamento dela. A seleção de destaques é uma função **nova**, à parte.
- **Fluxo de compra:** Comprar/Começar grátis continua indo para `/cadastro/:id` e o cadastro continua abrindo com o curso pré-selecionado, tanto pela Home quanto pelo `/cursos`.
- **Cabeçalho:** o `GlobalHeader` continua igual para quem está logado ("Abrir painel") e para o modo apresentação. Muda só o destino do link "Cursos".
- **Rotas existentes:** `/login`, `/cadastro`, `/cadastro/:id`, `/esqueci-senha`, `/redefinir-senha/:token`, `/verificar/:codigo`, `/app/...` e a tela de 404 continuam funcionando. A rota nova `/cursos` não pode capturar nenhuma delas.
- **Tela única do curso:** em `PainelCursoGestao.jsx`, o Coordenador vê exatamente o que vê hoje. As ações atuais do Admin (Editar curso, Foto de capa, Professores, Coordenador) continuam iguais. Só entra o botão de destaque.
- **`GET /Cursos`:** a resposta só **ganha** os campos `emDestaque` e `destaqueEm`. Nenhum campo existente muda de nome ou formato. O app mobile (`mobile/src/lib/dashboard.js`) e o desktop também consomem essa rota.
- **`PUT /Cursos/{id}` (Editar curso):** não pode zerar nem alterar `EmDestaque`/`DestaqueEm`. O destaque só muda pela rota própria.
- **Migration:** só acrescenta as duas colunas, com padrão para os cursos existentes. Nenhum dado existente é alterado ou apagado.
- **Acessibilidade da Home:** mantém o link "Pular para o conteúdo principal", os `aria-label` dos botões de compra e o modal do curso com Fechar.
- **Modo demo:** se o `demoApi.js` simula `/Cursos`, acrescente os campos novos e a rota de destaque lá também, para os testes de fumaça (`demoApi.smoke.test.js`) continuarem passando. A verificação final continua sendo no app real.
- **Testes:** todos os testes que passam hoje (backend e frontend, incluindo `PainelCursoGestao.test.jsx` e `CadastroScreen.test.jsx`) continuam passando. Teste existente não pode ser apagado nem afrouxado para fazer passar. Se algum precisar mudar por causa do novo layout, explique por quê no resumo.
- **Ao terminar**, informe no resumo o que foi conferido desta lista e o resultado dos testes (quantos passaram e quantos falharam).

## Fora do escopo

- Limpar ou despublicar os cursos de teste antigos (é dado, não layout).
- Filtros/busca no catálogo.
- App mobile e desktop.
- Diagramas UML (o agente de arquitetura atualiza depois: caso de uso do Admin "Destacar curso na Home" e o fluxo do Visitante).

## Como verificar

- No app real (`http://127.0.0.1:5173`), **nunca com `VITE_DEMO_MODE`**.
- Sem nenhum curso marcado: a Home mostra 3 cursos (os mais recentes visíveis).
- Logado como Admin, marcar Introdução à IA, Engenharia de Software e Redes e Infraestrutura: a Home mostra exatamente esses 3. Marcar um 4º: ele entra e sai o marcado há mais tempo.
- "Ver catálogo completo" abre `/cursos` com a grade completa; "Cursos" do cabeçalho também.
- Comprar/Começar grátis nos destaques leva para `/cadastro/:id` do curso certo.
- Celular (375 px): destaques e diferenciais empilhados, sem rolagem horizontal.
- Rodar os testes do backend e do frontend.
