> **RESOLVIDO em 2026-11-23:** decidido o mesmo fluxo do professor (módulos em cartões › tela do módulo), com o botão "Continuar" e o selo "Certificado emitido". Prompt: `PROMPT-agente-trilha-aluno-modulo-em-tela-propria.md`; imagem: `aluno-modulos-igual-professor.png`.

# PENDENTE para segunda-feira, 23/11/2026: trilha do aluno no mesmo estilo das telas do coordenador e do professor

**Pedido do usuário (19/11/2026):** deixar a trilha de conteúdos do **aluno (web)** igual às telas do módulo do coordenador e do professor, nesse estilo.

## Referência do estilo (já aprovado e aplicado para professor/coordenador/Admin)

| Arquivo | O que é |
|---|---|
| `docs/TelaConteudosProfessor/PROMPT-agente-tela-modulo-lista-e-janela.md` | Prompt aplicado no commit `150d31d`. |
| `docs/TelaConteudosProfessor/PROMPT-agente-tela-modulo-correcoes-1.md` | Correções da rodada 1, ainda não aplicadas em 19/11. Aplicar **antes**, porque o aluno vai reaproveitar os mesmos componentes. |
| `docs/TelaConteudosProfessor/modulo-lista-e-janela.png` e `modulo-fundos-solidos.png` | Imagens do estilo. |
| A imagem de referência que o usuário mandou | Mostra exatamente o ponto de vista do aluno: "✓ Concluído", "▶ Não iniciado" e o progresso do curso no cartão. |

O estilo tem:
- **cartão do curso** com a barra de progresso;
- **módulos em cartões** à esquerda, todos da mesma altura;
- **painel do módulo** com itens em linhas grandes (ícone, título, descrição, linha de dados e selo do tipo);
- **fundos sólidos** com o "relevo duplo";
- **clique no card abre a janela grande** (imagem com zoom, PDF, vídeo, texto, link).

## O que já existe e precisa ser respeitado

- **Prompt antigo do aluno:** `PROMPT-agente-padronizar-conteudos-aluno.md` (06/11), ainda **não aplicado**. Provavelmente será **substituído** pelo novo. Decidir na segunda.
- **Decisões antigas que continuam valendo:**
  - **não mexer** no aviso de avaliação liberada (`AvisoAvaliacaoLiberada`) nem no texto dele;
  - a linha de ligação do quiz vinculado foi aprovada;
  - a mudança é só na web; o app mobile fica fora.
- **Tela atual do aluno:** `frontend/src/pages/workspace/SecoesAluno.jsx` (trilha `SlideConteudosCurso`, ≈ 2.800 linhas no arquivo).
  - Visualizadores do aluno: `VisualizadorPdf` e `VisualizadorImagem`.
  - Ao abrir um conteúdo, ele é marcado como concluído (`marcarConcluidoAoAbrir`).
- **Quiz do aluno:** hoje abre a execução (responder) e a revisão. Na janela nova, **não** vale "Mostrar gabarito": o aluno responde de verdade.

## Perguntas para fazer ao usuário na segunda (uma por vez, com imagem antes)

1. **Concluir conteúdo:** a janela marca como concluído **ao abrir** (como hoje), ou ganha um botão "Marcar como concluído"?
2. **Quiz do aluno:** responder **dentro da janela grande** (uma questão por vez, igual à prévia) ou continuar com a tela de execução atual?
3. **Linha de dados do item:** mostrar "✓ Concluído / ▶ Não iniciado / Em andamento", como na referência? E no quiz, mostrar a última nota?
4. **Módulos bloqueados ou ainda não liberados** (Acompanhado, com conteúdo publicado aos poucos): como aparecem? Cadeado? "Em breve"?
5. **Cartão do curso:** progresso do aluno (%) e selo ("Curso em andamento", "Concluído" e "Certificado emitido" com troféu, se houver)?
6. **Botão "Continuar de onde parou"**, que abre o próximo item não concluído: no cartão do curso?
7. **Atualização de 19/11:** na tela do módulo de professor/coordenador/Admin, a **coluna de módulos saiu**, assim como o seletor e o "Módulo anterior/Próximo". Só o "← Voltar" leva à lista de módulos, e o curso aparece numa linha compacta. **Perguntar se o aluno segue o mesmo padrão.** Hoje a trilha do aluno mostra todos os módulos numa página só.

## Ordem sugerida na segunda

1. Aplicar `PROMPT-agente-tela-modulo-correcoes-1.md` (professor/coordenador) e conferir.
2. Gerar a imagem da trilha do aluno nesse estilo, com o ponto de vista do aluno.
3. Fazer as perguntas acima, uma por vez.
4. Escrever o prompt do aluno, reaproveitando os componentes já criados (`CartaoCursoModulo`, `ListaModulosCartoes`, `PainelItensModulo`, `JanelaPreviaItem`) com um modo "aluno".
