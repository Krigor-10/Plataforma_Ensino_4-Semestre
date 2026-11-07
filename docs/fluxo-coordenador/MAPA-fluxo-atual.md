# Mapa do fluxo atual — Coordenador (web)

Fonte: gravação de 63 s do acesso do coordenador (2026-11-07, sem áudio) e leitura do código em `frontend/src` no commit `e9f8005`.
A tela logada não foi aberta por este agente: o comportamento na tela vem do vídeo, e as causas vêm do código.

## Telas do coordenador

| Menu | Rota | Componente | O que entrega |
|---|---|---|---|
| Dashboard | `/app` | `DashboardCoordenador` | KPIs, gráfico, "Cursos acompanhados" (itens não clicáveis) |
| Gestão > Professores | `/app/professores` | `SecaoProfessores` | Cadastro de professores, sem vínculo com curso |
| Acadêmico > Cursos | `/app/cursos` | `SecaoCursos` | Grade de cursos → detalhe com 4 KPIs e 3 botões |
| Acadêmico > Modulos | `/app/modulos` | `SecaoModulos` | Grade de cursos → módulos com criar/editar/excluir |
| Acadêmico > Progresso | `/app/turmas` | `SecaoDesempenhoCoordenador` | Grade de cursos → KPIs, avaliações e módulos com materiais e progresso |

## Navegação real

```
                     ┌──────────── sidebar / abas ────────────┐
                     ▼                  ▼                     ▼
              Grade de cursos    Grade de cursos       Grade de cursos
              (Cursos)           (Modulos)             (Progresso)
                     │                  │                     │
                 escolhe curso      escolhe curso         escolhe curso
                     ▼                  ▼                     ▼
              Detalhe do curso   Módulos do curso      Progresso do curso
              4 KPIs + botões    gestão + contagens    materiais + médias
                 │       │              ▲                     ▲
                 │       └─ "Ver modulos" ─┘                  │
                 └── "Ver professores" ───────────────────────┘
                     (troca a aba da sidebar e não mostra professores)

Voltar ao curso a partir de Modulos ou Progresso = sidebar Cursos → grade → escolher de novo.
```

## O que aconteceu no vídeo

| Tempo | Ação | Resultado |
|---|---|---|
| 0–5 s | Abre Cursos e escolhe Desenvolvimento Web | Detalhe do curso |
| 9–10 s | "Ver modulos" | Sidebar pula para Modulos |
| 11–13 s | Volta por Cursos | Grade de novo; escolhe o curso outra vez |
| 13–14 s | "Ver professores" | Sidebar pula para Progresso |
| 16–18 s | Volta por Cursos | Grade de novo; escolhe o curso outra vez |
| 21–23 s | "Editar curso" e cancela | Modal |
| 24–25 s | "Ver professores" | Progresso de novo |
| 26–27 s | Volta por Cursos | Grade de novo; escolhe o curso outra vez |
| 28–30 s | Clica Modulos na sidebar | "Escolha o curso"; escolhe o curso outra vez |
| 33–40 s | Abre módulos | Só código, contagens e data de criação |
| 41–44 s | ⋮ > Editar módulo e fecha | Modal |
| 46–50 s | Volta por Cursos | Grade de novo; escolhe o curso outra vez |
| 58–61 s | "Ver modulos", volta por Cursos, escolhe o curso, "Ver professores" | Mesmo vaivém |

**O mesmo curso foi escolhido 7 vezes em 63 segundos.**

## Pontos de atrito

### Fluxo

1. **Três grades iguais para escolher o mesmo curso.** Cursos, Modulos e Progresso repetem a mesma capa e pedem o curso de novo.
2. **O curso escolhido se perde ao trocar de aba.** Cada seção guarda `cursoSelecionadoId` em estado local (`SecaoCursos.jsx:47`, `SecaoModulos.jsx:34`, `SecaoDesempenhoCoordenador.jsx:21`), e a seção é desmontada na troca. `cursoEmFoco` só existe para os botões e é limpo logo após o uso.
3. **O detalhe do curso é só um índice.** Tem KPIs e botões que mandam para outras abas, sem mostrar módulos nem progresso.
4. **As informações do módulo estão separadas.** Modulos tem as ações, mas só contagens. Progresso tem materiais, avaliações e percentuais, mas nenhuma ação.
5. **"Ver professores" abre Progresso.** O botão chama a seção `turmas` (`SecaoCursos.jsx:694`), que para Admin é `SecaoProfessoresCurso` e para Coordenador é `SecaoDesempenhoCoordenador` (`WorkspaceScreen.jsx:816`).
6. **O coordenador não tem tela para vincular professor.** A API permite (`CursosController.cs:116` e `:129`), mas `SecaoProfessoresCurso` só é renderizada para Admin.
7. **Dois menus repetem os mesmos links.** A sidebar e as abas mostram Cursos, Modulos e Progresso, e o `›` entre as abas sugere uma sequência que não existe.
8. **Em Progresso, as avaliações vêm antes dos módulos.** Com 10 avaliações do curso, os módulos ficam fora da tela (`PainelModulosDesempenho.jsx:53`).
9. **A URL não guarda o curso.** `/app/cursos` não muda ao abrir um curso, então F5 e o voltar do navegador perdem a posição. O roteador já aceita `/app/secao/:param`, e o Professor usa isso em Conteúdos.
10. **Atalhos não levam ao curso.** Na busca global, curso e módulo abrem as grades (`BarraTopo.jsx:192` e `:206`). No Dashboard, "Ver todos" vai para Progresso (`DashboardCoordenador.jsx:120`).

### Dados e texto

11. **Alunos: 4 ou 6 no mesmo curso.** Cursos e Modulos contam matrículas aprovadas (4). Progresso mostra "Total de alunos" com todas as matrículas, de qualquer status (6) (`CursoDesempenhoService.cs:173`).
12. **As médias de Progresso usam esse total de 6.** Progresso médio e "Concluíram o curso" contam matrículas não aprovadas como 0% (`CursoDesempenhoService.cs:177-180` e `:219-220`).
13. **"Alunos aprovados" é ambíguo.** O número é de matrículas aprovadas, não de alunos aprovados no curso (`IndicadoresDesempenhoCurso.jsx:19`).
14. **Professor vem de fontes diferentes.** Cursos usa `/Cursos/{id}/professores`. Modulos e Progresso usam `Turma`, então os resultados podem divergir.
15. **"Sem professor vinculado" pisca ao abrir o curso.** A lista começa vazia e não há estado de carregamento (`SecaoCursos.jsx:160` e `:681`). Isso aparece em vários trechos do vídeo.
16. **O nome do professor é cortado.** "Professor D..." está num cartão feito para números.
17. **O curso não fica travado ao editar módulo.** O modal diz que sim, mas `SelectSimples` não tem `disabled`, e o PUT envia só o título (`SecaoModulos.jsx:371` e `:229-232`).
18. **Erro de texto: "10 avaliacaooes".** A causa é o sufixo `"oes"` em `PainelModulosDesempenho.jsx:62`.
