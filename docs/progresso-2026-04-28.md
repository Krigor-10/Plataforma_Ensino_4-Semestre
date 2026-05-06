## Implementado - 2026-05-04 - Conteudos do aluno por curso e modulo

- A tela de `Conteudos` do aluno passou a organizar a trilha em `Curso` recolhivel > `Modulo` recolhivel > materiais compactos.
- O detalhe lateral foi removido; ao selecionar um material, o detalhe abre abaixo do proprio item da lista.
- A hierarquia visual foi refinada com mais separacao entre curso, modulo e conteudo, mantendo a cor apenas como apoio visual discreto.
- A tela agora recebe `modulos`, `cursos` e `turmas` no snapshot do aluno para listar tambem cursos aprovados que ainda nao possuem conteudo publicado.
- Criado o endpoint real `GET /api/Modulos/aluno/{alunoId}`, retornando modulos dos cursos em que o aluno possui matricula aprovada.
- `frontend/src/lib/dashboard.js`, `WorkspaceScreen.jsx` e `frontend/src/lib/demoApi.js` foram alinhados para manter o mesmo comportamento no backend real e no modo demo.
- Os registros antigos de proximas tarefas sobre hierarquia de conteudos, detalhe lateral e cursos sem conteudo foram removidos desta nota porque foram concluidos neste ciclo.

## Corrigido - 2026-05-04 - Aprovacao de matricula duplicada

- Corrigido o caso em que uma pendencia duplicada aparecia para aluno que ja tinha matricula aprovada na mesma turma.
- `Services/MatriculaService.cs` agora consolida a pendencia duplicada, cancela a solicitacao redundante e preserva a matricula ativa.
- `Data/DevelopmentDataSeeder.cs` deixou de recriar pendencias para aluno que ja possui matricula aprovada no mesmo curso; se encontrar duplicata antiga, marca a pendencia como cancelada.
- O modo demo recebeu a mesma regra em `frontend/src/lib/demoApi.js`.
- Caso validado: `Aluno Teste 01` tinha uma matricula aprovada e uma pendencia duplicada em `UX para Produtos Digitais`; apos o ajuste, ficou sem pendencias duplicadas.

## Validacao - 2026-05-04

- Backend recompilado com sucesso:
  `dotnet build "Sistema Academico Integrado.csproj" -c Release /p:UseAppHost=false`
- EF confirmou ausencia de mudancas pendentes no modelo:
  `dotnet ef migrations has-pending-model-changes --configuration Release --no-build`
- Frontend recompilado com sucesso usando Vite sem limpar o diretorio de saida:
  `node.exe .\node_modules\vite\bin\vite.js build --emptyOutDir false`
- `git diff --check` executado nos arquivos alterados sem erros de whitespace, apenas avisos normais de conversao LF/CRLF no Windows.
- Aplicacao real ficou disponivel em `http://127.0.0.1:5019` usando o DLL Release.
- Smoke HTTP confirmou que `wwwroot/index.html` referencia os bundles atuais `index-Df1JUE0A.js` e `index-CHMu3c2a.css`.
- Consulta no LocalDB confirmou `pendentes_aluno_teste_01=0` e `PendenciasDuplicadas=0`.
## Proximo ajuste - Refatoracao CSS semantica

- Reorganizar os arquivos `.css` do frontend com nomes semanticos em portugues para facilitar identificacao e manutencao.
- Separar sem alterar visual primeiro, validando build antes de qualquer renomeacao mais profunda de classes.
- Aproveitar a refatoracao para identificar e remover codigo morto, estilos nao usados e componentes/variaveis obsoletos com validacao depois de cada limpeza.
- Sugestao inicial: `base.css`, `publico.css`, `workspace.css`, `aluno.css`, `gestao.css`, `professor.css` e `componentes.css`.
## Melhoria futura - Navegacao global e menu lateral

- Adicionar uma navegacao global para os perfis `Admin`, `Coordenador` e `Professor`, facilitando troca entre areas principais sem depender apenas do menu lateral.
- Reorganizar o menu lateral do workspace por grupos semanticos, separando gestao academica, operacao, conteudos/avaliacoes e perfil/sessao.
- Preservar a experiencia do aluno ja focada em `Meus cursos`, `Conteudos`, `Avaliacoes` e `Matriculas`, ajustando apenas se houver ganho claro de navegacao.
- Validar responsividade desktop/mobile para evitar menus longos, duplicados ou com acoes importantes escondidas.
- Reduzir o menu/modal de perfil do usuario para informacoes essenciais, mantendo identificacao, perfil, contato principal e acoes de sessao sem excesso de detalhes.
## Implementado - 2026-05-04 - Aba Coordenadores no Admin

- Adicionada a aba `Coordenadores` no menu do Admin.
- Criada a tela `SecaoCoordenadores`, listando `REGISTRO DO COORDENADOR`, `NOME`, `EMAIL`, `CURSO SOB SUPERVISAO` e `STATUS`.
- A tabela segue o padrao das telas administrativas com busca ao vivo, filtro por status, contador de resultados e popup quando um coordenador supervisiona mais de um curso.
- `Coordenador` ganhou `CodigoRegistro` publico no backend, usando o prefixo `COORD-*`, evitando expor o id interno do banco.
- Criada a migration `20260504215933_AdicionarCodigoRegistroCoordenador`, com preenchimento seguro para coordenadores existentes antes do indice unico.
- `GET /api/Coordenadores`, `POST /api/Coordenadores`, DTOs, seed de desenvolvimento e modo demo foram alinhados ao novo registro publico.
- O modo demo passou a garantir `codigoRegistro` para coordenadores antigos e novos carregamentos da base local.

## Validacao - 2026-05-04 - Aba Coordenadores

- Backend recompilado com sucesso:
  `dotnet build "Sistema Academico Integrado.csproj" -c Release /p:UseAppHost=false`
- EF confirmou ausencia de mudancas pendentes no modelo:
  `dotnet ef migrations has-pending-model-changes --configuration Release --no-build`
- Migration aplicada no LocalDB com sucesso:
  `dotnet ef database update --configuration Release --no-build`
- A primeira tentativa de Vite com `node.exe` do PATH falhou com `Acesso negado`, conforme problema conhecido do ambiente Windows.
- Frontend recompilado com sucesso usando o Node empacotado do Codex:
  `C:\Users\Krigor\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe .\node_modules\vite\bin\vite.js build --emptyOutDir false`
- Smoke real em `http://127.0.0.1:5021` validou login Admin e `GET /api/Coordenadores`.
- Resultado do smoke: `6` coordenadores, `0` sem codigo `COORD-*`, `6` com curso sob supervisao e primeiro registro `COORD-000003`.
## Complemento - 2026-05-04 - Cadastro de coordenacao

- Adicionado na aba `Coordenadores` o botao `Cadastrar coordenacao`, seguindo o mesmo padrao visual do botao `Cadastrar professor`.
- O botao abre um modal de cadastro com dados de identificacao, endereco, curso sob supervisao, senha e confirmacao de senha.
- A tela valida campos obrigatorios, CPF, CEP, UF e confirmacao de senha antes de chamar a API.
- Ao salvar com sucesso, a lista de coordenadores e atualizada e exibe feedback no topo da tabela.
- O modo demo recebeu `POST /Coordenadores`, criando coordenadores com `COORD-*` para manter paridade com o backend real.

## Validacao - 2026-05-04 - Cadastro de coordenacao

- Backend recompilado com sucesso:
  `dotnet build "Sistema Academico Integrado.csproj" -c Release /p:UseAppHost=false`
- Frontend recompilado com sucesso usando o Node empacotado do Codex:
  `C:\Users\Krigor\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe .\node_modules\vite\bin\vite.js build --emptyOutDir false`
- Smoke real em `http://127.0.0.1:5021` validou login Admin, `POST /api/Coordenadores` e nova listagem via `GET /api/Coordenadores`.
- Resultado do smoke: coordenacao criada com registro `COORD-E9XBM6`, encontrada na listagem, total subiu para `7` coordenadores no LocalDB de desenvolvimento.
## Complemento - 2026-05-04 - Modulos recolhiveis por curso

- A tela administrativa de `Modulos` deixou de repetir o curso em cada linha como visual principal.
- A tabela agora agrupa por `Curso`; ao clicar na linha do curso, os modulos daquele curso expandem ou recolhem logo abaixo.
- As acoes existentes foram preservadas: busca ao vivo, filtro por curso, selecionar todos, selecionar modulos de um curso, editar selecionado, excluir selecionados e detalhe lateral do modulo.
- Quando a navegacao vem de `Cursos > Ver modulos`, o curso em foco ja abre expandido.

## Validacao - 2026-05-04 - Modulos recolhiveis por curso

- Frontend recompilado com sucesso usando o Node empacotado do Codex:
  `C:\Users\Krigor\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe .\node_modules\vite\bin\vite.js build --emptyOutDir false`

## Implementado - 2026-05-05 - Home publica para apresentacao

- Adicionado o banner `frontend/src/assets/home-publica-banner.png` na home publica como imagem real do hero, mantendo overlay para leitura do texto.
- A home publica foi limpa para focar em `banner`, cards de diferenciais e catalogo de cursos.
- Removidas as secoes `Jornada`, CTA final duplicado e `Ajuda para decidir`, alem da metrica `100% fluxo online` e textos longos.
- O menu superior publico foi simplificado para manter apenas o atalho `Cursos`.
- Adicionado o botao `ACESSO ADMINISTRATIVO` na topbar publica, apontando para `/login`.
- A ordem dos botoes da topbar ficou: `ACESSO ADMINISTRATIVO`, `Entrar`, `Criar conta`.

## Validacao - 2026-05-05 - Home publica para apresentacao

- Frontend recompilado com sucesso usando o Node empacotado do Codex:
  `C:\Users\Krigor\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe .\node_modules\vite\bin\vite.js build --emptyOutDir false`
- Preview local validado em `http://127.0.0.1:5177`.
- Evidencias visuais geradas em `logs/home-publica-limpa.png` e `logs/home-publica-acesso-admin.png`.
