# Prompt — Ajustes da tela do curso do coordenador, rodada 2 (web)

## Contexto

A primeira rodada (commit `588adf1`) criou `PainelCursoCoordenador.jsx`. O usuário testou e pediu os ajustes abaixo. Prompt anterior: `docs/fluxo-coordenador/PROMPT-agente-tela-unica-curso-coordenador.md`.

## Decisões do usuário

1. Compactar o topo: o painel de "Editar curso" ocupa espaço demais, e os KPIs menores vão à direita do título.
2. Vincular e desvincular professor ficam no topo.
3. Avaliações do curso vão para uma aba separada.
4. O bloco do módulo mostra "Quiz", não "Avaliações".
5. "Novo módulo" sai do coordenador e passa para o professor.
6. Módulos numerados no formato da tela do professor, e ícones de conteúdo e quiz com as mesmas cores no projeto todo.
7. O breadcrumb precisa ser visível e ter ação real.

## O que o agente de arquitetura já verificou (não repetir)

Referências do commit `588adf1`. A tela foi vista só nos prints do usuário.

- O breadcrumb pequeno é um texto sem ação em `PainelCursoCoordenador.jsx:170-172`. A barra superior ainda mostra "Catalogo academico" (`appConfig.js:143`, `BarraTopo.jsx:276`): o item 8 da rodada 1 não ficou como pedido.
- O botão Editar está em um painel próprio (`PainelCursoCoordenador.jsx:187-203`). Os KPIs usam `grade-estatisticas` em linha inteira (`:205-210`).
- "Modulos (4)" e "Professores" encostam na borda porque `painel-secao` é usado sem `painel-secao__conteudo` nesses blocos (`:214` e `:393`).
- Quadrado de ícone em módulo: `PainelCursoCoordenador.jsx:248`, `PainelModulosDesempenho.jsx:89`, `SecaoModulos.jsx:323`, `SecoesAluno.jsx:436`. Formato padrão: `conteudos-modulo__numero` em `SecaoConteudosProfessor.jsx:1500` e `:2005`, `SecoesAluno.jsx:2024`.
- `SecaoAvaliacoesProfessor.jsx:697` e `SecoesAluno.jsx:1431` numeram avaliações, não módulos. Ficam fora.
- Sem `--conteudo`, o ícone sai cinza: `DetalheModuloDesempenho.jsx:35`, `SecoesAluno.jsx:492`. As cores padrão são `.atividades-curso__icone--conteudo` (verde) e `--quiz` (roxo).
- **Módulo 01 mostra 5 no coordenador e 4 quizzes no professor.** O professor filtra `tipoAvaliacao === 1` e ignora arquivados (`SecaoConteudosProfessor.jsx:1012` e `:1433`). `CursoDesempenhoService` devolve todas as avaliações do módulo. Não foi confirmado qual é o item a mais.
- `POST /Modulos` aceita só Admin e Coordenador (`ModulosController.cs:78-90`). O professor não tem nenhuma ação de módulo na tela.
- `PodeGerenciarCursoAsync` só libera Admin e o coordenador dono, e também protege vincular e desvincular professor. **Não abra essa regra para Professor.**

## Tarefa

### 1. Topo da tela

```
CodeRyse Academy › Cursos › Desenvolvimento Web Full Stack      (barra superior)

← Voltar para Cursos
Desenvolvimento Web Full Stack            [ 4 Alunos ] [ 50% Progresso ]
CUR-112648 · descrição                    [ 50% Concluíram ] [ 0,5 Média ]
[Editar curso] [Professores (1)]

[ Módulos (4) ]  [ Avaliações do curso (10) ]
```

1. Remova o painel `painel-secao` das ações. Editar curso, Professores, Encerrar e Reabrir ficam em uma linha compacta abaixo do título, com as regras atuais.
2. Coloque os 4 KPIs à direita do título, em versão menor, sem alterar `CartaoEstatistica` nas outras telas. Em telas estreitas, eles descem para baixo do título.
3. Ajuste os espaçamentos: títulos e listas não podem encostar na borda dos blocos.

### 2. Professores no topo

1. O botão "Professores (N)" abre um `Modal` com `BlocoProfessoresCurso`, mantendo vincular e desvincular com confirmação.
2. Remova o bloco Professores do fim da página.

### 3. Abas da tela

1. Crie as abas "Módulos (N)" e "Avaliações do curso (N)", com `role="tablist"` e navegação por teclado.
2. A aba de avaliações mostra a lista direto, sem bloco recolhível.
3. Ela só aparece quando `avaliacoesSemModulo` tiver itens.
4. A aba aberta é estado local. Ao abrir um curso, começa em Módulos.

### 4. Breadcrumb

1. Remova o texto das linhas 170-172.
2. Com curso aberto, a barra superior mostra `CodeRyse Academy › Cursos › Título do curso`. "Cursos" é um link real para `/app/cursos`.
3. Na grade do coordenador, a barra mostra "Cursos", não "Catalogo academico".
4. Use o tamanho de `.topbar__breadcrumb-secao`.

### 5. Quiz no módulo

1. Primeiro confirme qual é a avaliação a mais do Módulo 01.
2. Na tela do coordenador, conte e liste no módulo só quizzes não arquivados, para bater com a tela do professor. Texto: "3 conteúdos · 4 quizzes". Título do grupo: "Quiz".
3. Se o item a mais for Prova ou Exercício ligado ao módulo, ele não pode sumir: mostre na aba de avaliações e informe na entrega.
4. A aba "Avaliações do curso" mantém esse nome.

### 6. Novo módulo passa para o professor

1. Remova "Novo módulo" de `PainelCursoCoordenador`. Coordenador mantém Editar e Excluir no menu ⋮.
2. Em `ModulosController.CriarModulo`, troque os papéis para `Admin,Professor`.
3. Crie em `CursoAutorizacaoService` uma regra só para criar módulo: Admin, ou Professor com vínculo em `ProfessoresCursos` no curso. Curso sem vínculo responde acesso negado.
4. Em `SecaoConteudosProfessor`, adicione "Novo módulo" junto de "Visualizar como aluno" (linha 1413), usando `ModaisModulo` com o curso fixo.
5. Admin continua criando módulo por `SecaoModulos`.

### 7. Padrão de módulos e ícones

1. Crie um componente único para o número do módulo, baseado em `conteudos-modulo__numero`, e use nos 4 pontos listados. Remova o rótulo "MÓDULO 01" nesses pontos.
2. Confirme se `--coluna-icone-conteudo` existe fora da trilha do professor.
3. Aplique `--conteudo` nos 2 ícones sem cor, e confira todo uso de ícone de conteúdo e quiz na web.

### 8. Testes

- Backend: professor vinculado cria módulo; professor sem vínculo e coordenador são negados; Admin cria.
- Frontend: abas, contagem de quizzes igual à do professor, e coordenador sem "Novo módulo".

## Não fazer

- Não alterar `mobile/` e `desktop/`.
- Não dar a Professor editar ou excluir módulo, nem acesso a vincular professor.
- Não usar `VITE_DEMO_MODE` para verificar. Se o `demoApi` tratar `POST /Modulos`, mantenha coerente.

## Critérios de aceite

Verifique no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo, como coordenador, professor, admin e aluno.

- [ ] Título, ações e KPIs ficam no topo sem painel vazio, e nada encosta na borda.
- [ ] "Professores (N)" vincula e desvincula em modal, e o bloco antigo não existe mais.
- [ ] A aba de avaliações continua acessível com muitos módulos, sem rolagem longa.
- [ ] Breadcrumb legível, e "Cursos" volta à grade. "Catalogo academico" não aparece para o coordenador.
- [ ] Módulo 01 mostra a mesma quantidade de quizzes para coordenador e professor.
- [ ] Coordenador não vê "Novo módulo" e recebe acesso negado na API.
- [ ] Professor vinculado cria módulo pela tela; sem vínculo, não cria.
- [ ] Módulos numerados igual nas telas dos 4 perfis; conteúdo verde e quiz roxo em toda a web.
- [ ] Tema claro e escuro legíveis, sem rolagem horizontal em 375 px.
- [ ] `npm run lint`, `npm test` e `dotnet test` sem erros novos.
