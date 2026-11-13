# Parte 1 de 3 — Grade de Cursos do Coordenador: situação do curso e abas (só frontend web)

> Faz parte de `docs/fluxo-coordenador/partes/LEIA-ME-ordem.md`. É independente das partes 2 e 3 e pode ir sozinha num commit.

## Contexto

Projeto CodeRyse Academy, frontend web (`frontend/`, React + Vite). O fluxo de venda de cursos (`docs/fluxo-venda-cursos/`) já está aplicado: Professor conclui › Coordenador encerra › Admin transforma em pacote.

**Problema relatado pelo usuário:** quando o professor conclui um curso, o coordenador recebe a notificação, mas a grade de Cursos dele não mostra nada. Ele precisa entrar curso por curso para descobrir qual está aguardando encerramento.

**Imagem aprovada:** `../coordenador-parte1-grade.png`. Os números amarelos e o quadro lateral são só explicação.

## O que o agente de arquitetura já verificou (não repetir)

- `pages/workspace/SecaoCursos.jsx` ≈ linhas 860–880: o card mostra `<Insignia texto={… "Coordenado" : "Pendente"} />` (≈ 866) e `<Insignia texto={\`Media …\`} />` (≈ 876).
- O Coordenador vê a lista sem abas (subtítulo "Cursos ativos vinculados a sua coordenacao.", ≈ 718).
- O Admin já tem abas de situação e etiqueta de modelo desde o round 5 do fluxo de venda, e **não muda**.
- Campos disponíveis no curso: `concluidoPeloProfessorEm` e `encerradoEm`.
- A tela real logada **não** foi conferida, porque o navegador estava na tela de login.

## Tarefa (só na visão do Coordenador)

1. **Abas "Ativos | Encerrados"** com contagem, no mesmo padrão `.abas-matriculas` / `.linha-abas-status` de Professores e Coordenadores.
   - Ativos: sem `encerradoEm`.
   - Encerrados: com `encerradoEm`, incluindo os que viraram pacote.
2. **Selo de situação no lugar do selo de Média:**
   - **Aguardando encerramento** (`concluidoPeloProfessorEm` e sem `encerradoEm`): selo âmbar "Aguardando você", com ícone de alerta ou relógio já usado no projeto, e borda âmbar no card. Esses cursos aparecem **primeiro** na aba Ativos;
   - **Em andamento**: sem selo de situação;
   - **Encerrado**: selo cinza "Encerrado" com cadeado (`TbLock`).
3. **Remover os selos "Coordenado" e "Média"** do card do Coordenador. A média continua dentro do curso. No Admin, nada muda.
4. O subtítulo acompanha a aba: "Cursos ativos da sua coordenação." / "Cursos que você encerrou."
5. Clicar no card continua abrindo o curso nas duas abas, inclusive para reabrir.

**Não alterar:** a grade do Admin, a tela do curso e o backend.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo, como Coordenador, comparando com a imagem:

- Abas Ativos e Encerrados com contagem certa.
- Um curso concluído pelo professor aparece **primeiro**, com o selo "Aguardando você" e a borda âmbar.
- Nenhum card mostra Média nem "Coordenado".
- Depois de encerrar um curso, ele aparece na aba Encerrados com o cadeado e continua abrindo.
- Como Admin, a grade continua igual.
- Testes (vitest): a separação das abas, a ordem com o aguardando primeiro e os selos. `npm run lint` e `npm test` sem erros novos.
