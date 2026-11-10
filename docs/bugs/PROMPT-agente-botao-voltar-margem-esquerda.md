# Prompt — Botão Voltar na margem esquerda (todas as telas)

## Contexto

Em todas as telas de detalhe, o botão `← Voltar para X` (`.atividades-curso__voltar`) ocupa **uma linha inteira acima do título**. Em telas largas sobra um espaço vazio grande à esquerda da coluna de conteúdo: `.layout-principal` tem `max-width: 1320px` e fica centralizado (`layout.css`, linhas 19 e 777).

**Decisão do usuário:** usar esse espaço livre para o botão Voltar. O botão sai de cima do título e vai para a margem esquerda, alinhado ao título. Assim o título sobe e a tela ganha uma linha.

## Onde o botão aparece hoje (10 lugares, nos 4 perfis)

| Perfil | Arquivo | Linha aprox. | Tela |
|---|---|---|---|
| Aluno | `SecoesAluno.jsx` | 388 | Progresso → curso |
| Aluno | `SecoesAluno.jsx` | 1366 | Avaliações → curso |
| Aluno | `SecoesAluno.jsx` | 1966 | Conteúdos → curso |
| Professor | `SecaoConteudosProfessor.jsx` | 1398 | Conteúdos → curso |
| Professor | `SecaoAvaliacoesProfessor.jsx` | 358 | Avaliações → curso |
| Professor | `SecaoTurmasProfessor.jsx` | 144 | Progresso (seção `turmas`) → curso |
| Coordenador | `PainelCursoCoordenador.jsx` | 186 | Cursos → curso (tela única; `SecaoCursos` renderiza este painel para o Coordenador) |
| Admin | `SecaoCursos.jsx` | 703 | Cursos → detalhe |
| Admin | `SecaoModulos.jsx` | 275 | Módulos → detalhe |
| Admin | `SecaoProfessoresCurso.jsx` | 69 | Turmas / Professores por curso → detalhe (seção `turmas` quando não é Professor) |

**Fora do escopo (não são botão de página, não mexer):**
- os botões do modal de avaliação do aluno: "Voltar às avaliações" e "Voltar" da questão anterior (`SecoesAluno.jsx` ~965 e ~985);
- o "Voltar" do assistente de quiz (`AssistenteQuizAvaliacao.jsx` ~858);
- o `fecharComoVoltar` do `Modal.jsx`;
- a prévia "Visualizar como aluno" do Professor.

Se o agente achar outro Voltar de página que não esteja na tabela, aplicar o mesmo padrão e avisar.

## O que fazer

1. **Criar um componente único** (ex.: `components/BotaoVoltar.jsx`) que renderize o `<nav className="atividades-curso__navegacao">` com o botão, e trocar os 10 lugares por ele. O componente recebe `destino` (ex.: "Avaliações") e `onClick`. Hoje cada tela monta o botão do seu jeito e algumas não usam o `<nav>`.
2. **Em telas largas, o botão vai para a margem esquerda:**
   - Ele sai do fluxo (ex.: `position: absolute`, com `.layout-principal` como referência de posição) e fica **à esquerda da coluna**, encostado nela, com um respiro de `--espaco-lg`.
   - **Altura:** alinhado à **primeira linha do título da tela**, que agora sobe para o lugar onde o botão estava. Dica: com `position: absolute` e `top: auto`, o elemento fica na altura em que estaria no fluxo, que é justamente onde o título começa.
   - **Texto na margem:** só `← Voltar`, porque nomes como "Voltar para Professores por curso" não cabem. O nome completo vai para o `aria-label` ("Voltar para Avaliações") e para o `title` (dica ao passar o mouse).
   - O botão não pode ficar por baixo da barra lateral nem encostado nela.
3. **Quando não há espaço sobrando** (barra lateral aberta em monitor menor, notebook 1366/1440, tablet, celular), o botão **continua como hoje**, acima do título, com o texto completo.
   - A largura da barra lateral muda (aberta ~240px, fechada ~55px), então **não** usar só `@media` pela largura da janela. Usar **container query** na área de conteúdo, à direita da barra lateral (`container-type: inline-size`). O botão só vai para a margem quando sobrarem pelo menos ~9rem de cada lado da coluna de 1320px.
4. **Progresso do aluno (`SecoesAluno.jsx`, 388):** hoje, ao abrir um curso, o título genérico "Progresso / Acompanhe o andamento..." continua na tela, e o Voltar fica abaixo dele. Em Conteúdos e Avaliações do aluno esse título some no detalhe (`ocultarHeroGenerico` em `WorkspaceScreen.jsx`, linha ~102, que depende de `route.param`). Em Progresso o curso aberto é só um estado local (`cursoSelecionadoId`), então a regra não vale. Para ficar igual às outras telas:
   - passar o curso aberto para a URL (`/app/meus-cursos/:cursoId`, como `/app/conteudos/:id`);
   - incluir `meus-cursos` com `route.param` em `ocultarHeroGenerico`;
   - assim o Voltar fica ao lado do nome do curso, como nas outras telas, e o voltar do navegador também funciona.
5. **Manter o visual do botão:** cor `--cor-marca-clara`, peso 600, a pulsação no hover e o foco visível pelo teclado. Na margem, alinhar o botão à direita, colado na coluna.

## Não mexer

- O que cada botão faz ao clicar (destino, limpar seleção etc.).
- Os títulos, os cabeçalhos e o botão "Exportar desempenho" do Professor.
- Os espaços entre o título e os indicadores. Revisar só as margens que existiam para separar o Voltar do título (`.tela-avaliacoes-aluno .atividades-curso__navegacao`, `.tela-progresso-* .atividades-curso__navegacao`, `.tela-conteudos .atividades-curso__navegacao`), que deixam de valer quando o botão está na margem.

## Como conferir

- No app real, em `http://127.0.0.1:5173`, **sem** `VITE_DEMO_MODE`, entrando com **os 4 perfis (Admin, Coordenador, Professor e Aluno)** e abrindo o detalhe de cada uma das 10 telas da tabela.
- **1920px com a barra lateral aberta e fechada:** o botão aparece na margem, na altura do título, sem linha vazia acima do título.
- **1440px e 1366px com a barra aberta:** o botão volta para cima do título, com o texto completo, sem cortar nem sobrepor nada.
- **Celular (375px):** como hoje.
- **Teclado:** o Tab passa pelo Voltar antes do conteúdo, e o leitor de tela anuncia "Voltar para X".
- **Progresso do aluno:** abrir um curso e conferir que a URL muda, que o título genérico some e que o voltar do navegador fecha o curso.
- Rodar `npm test`, ajustando os testes que procuram o botão pelo nome "Voltar para ..." (o `aria-label` mantém esse nome), e o build. Mandar prints em 1920 e 1366.
