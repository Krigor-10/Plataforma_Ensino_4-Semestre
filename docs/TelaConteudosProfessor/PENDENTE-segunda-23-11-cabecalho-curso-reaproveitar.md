# PENDENTE para segunda-feira, 23/11/2026: reaproveitar o cabeçalho do curso em outras telas

**Pedido do usuário (19/11/2026):** verificar a viabilidade de reaproveitar o **cartão de cabeçalho do curso** da tela do módulo em outros lugares. É o cartão com:
- ícone ou capa à esquerda;
- nome do curso e descrição;
- barra de progresso com a %;
- selo no canto, por exemplo "64% publicado · 4 rascunhos".

Ele aparece no print do professor em Acadêmico › Conteúdos › Fundamentos da Web Moderna.

## O que já foi levantado (19/11)

- **Componente:** `frontend/src/components/CartaoCursoModulo.jsx`.
  - Props: `curso` (usa `titulo`, `descricao` e `imagemUrl`), `percentual` e `selo`.
  - Já foi feito genérico: quem chama decide o selo e a %.
  - Usa `BarraProgresso` e `Insignia`, que já existem.
- **Onde é usado hoje:** só em `TelaModuloGestaoProfessor.jsx` e `TelaModuloGestao.jsx` (tela do módulo).
- **Conflito para resolver primeiro:** o item 8 de `PROMPT-agente-tela-modulo-correcoes-1.md`, ainda não aplicado, **troca esse cartão por uma linha compacta na tela do módulo**, porque repetia a tela anterior.
  - Caminho provável: o cartão **grande** vai para a tela do **curso** (a lista de módulos), e a tela do módulo fica com a versão **compacta**.
  - Isso pede uma variante `compacto` no mesmo componente, sem criar dois componentes.
- **Ícone preto no print:** é a capa de 1×1 pixel preta do curso "Desenvolvimento Web Full Stack" (dado, não código). Trocar a capa na tela do curso.

## Telas candidatas (avaliar uma por uma na segunda)

| Tela | Arquivo | O que tem hoje | Selo e % sugeridos |
|---|---|---|---|
| Professor › Acadêmico › Conteúdos › **curso** (lista de módulos) | parte de lista de módulos do professor, a partir de `SecaoConteudosProfessor.jsx` | título + "64% publicado · Falta publicar: 4", com "Novo módulo" e "Visualizar como aluno" | "N% publicado · N rascunhos"; barra = % publicado |
| Coordenador/Admin › Cursos › **curso** | `PainelCursoGestao.jsx` | título, código, descrição, "Professores (N)" e 4 KPIs à direita | situação do curso; barra = progresso médio dos alunos; KPIs abaixo |
| **Aluno** › trilha de conteúdos do curso | `SecoesAluno.jsx`, junto com o pendente `docs/TelaConteudosAlunos/PENDENTE-segunda-23-11-trilha-aluno-estilo-modulo.md` | cabeçalho próprio da trilha | "Curso em andamento"/"Concluído"/troféu "Certificado emitido"; barra = progresso do aluno |
| **Avaliações do curso** (gestão) | `TelaAvaliacaoGestao.jsx` | cabeçalho próprio | situação do curso ou nº de avaliações |
| Professor › **Progresso** (por curso) | `SecaoTurmasProfessor.jsx` (rotulada "Progresso") | lista por curso | progresso médio dos alunos |

## O que entregar na segunda

1. Imagem com o cartão aplicado nas telas candidatas (antes e depois), para o usuário escolher onde entra.
2. Decidir com ele, uma por vez:
   - em quais telas entra;
   - se a tela do módulo fica com a versão compacta (item 8);
   - onde ficam os botões de cada tela (no cartão ou acima).
3. Escrever o prompt: um componente só (`CartaoCursoModulo`, talvez renomeado para algo como `CabecalhoCurso`), com a variante compacta e o selo e a % por perfil. Sem duplicar CSS.
