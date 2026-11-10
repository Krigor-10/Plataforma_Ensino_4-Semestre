# Mapa do fluxo atual — Admin (web)

Fonte: gravação de 45 s do acesso do Admin (2026-11-10, sem áudio) e leitura do código em `frontend/src` (depois do commit `40aac70`).
A tela logada não foi aberta por este agente: o comportamento na tela vem do vídeo, e as causas vêm do código.

## Telas do Admin que tratam de um curso

| Menu | Rota | Componente | O que entrega |
|---|---|---|---|
| Acadêmico > Cursos | `/app/cursos` | `SecaoCursos` | Grade de cursos com filtro por coordenador e atribuição em massa → detalhe com 5 KPIs e 4 botões |
| Acadêmico > Modulos | `/app/modulos` | `SecaoModulos` | Grade de cursos → módulos do curso com Novo/Editar/Excluir |
| Acadêmico > Professores por Curso | `/app/turmas` | `SecaoProfessoresCurso` | Grade de cursos → professores vinculados, Vincular/Desvincular |
| Matriculas | `/app/matriculas` | `SecaoMatriculas` | Lista geral de matrículas (não aparece no vídeo) |

O detalhe do curso do Admin é **estado local** (`cursoSelecionadoIdLocal` em `SecaoCursos.jsx`): a URL continua `/app/cursos`, sem `/app/cursos/:id`, diferente do Coordenador.

## Navegação real

```
                ┌──────────────── sidebar / abas ────────────────┐
                ▼                       ▼                        ▼
         Grade de cursos         Grade de cursos          Grade de cursos
         (Cursos)                (Modulos)                (Professores por Curso)
                │                       │                        │
            escolhe curso          escolhe curso            escolhe curso
                ▼                       ▼                        ▼
         Detalhe do curso        Módulos do curso         Professores do curso
         5 KPIs + 4 botões       Novo/Editar/Excluir      Vincular/Desvincular
            │        │                  ▲   │                    ▲   │
            │        └ "Ver modulos" ───┘   │                    │   │
            └──────── "Ver professores" ────┼────────────────────┘   │
                                            ▼                        ▼
                                   "Voltar" = grade de       "Voltar" = grade de
                                   Modulos (não o curso)     Professores (não o curso)

Voltar ao detalhe do curso = sidebar Cursos → grade → escolher o curso de novo.
```

## O que aconteceu no vídeo

| Tempo | Ação | Resultado |
|---|---|---|
| 0–4 s | Cursos → escolhe "Arquitetura de Software Moderna" | Detalhe do curso (**1ª escolha**) |
| 6–9 s | "Ver modulos" | Muda para a seção Modulos (a barra lateral troca), lista Scrum e Kanban, abre um módulo |
| 10–11 s | "Voltar" | Cai na **grade de cursos de Modulos**, não no curso |
| 12–14 s | Sidebar Cursos → escolhe o mesmo curso | Detalhe (**2ª escolha**) |
| 15–17 s | "Ver professores" | Muda para a seção Professores por Curso: 1 professor, Vincular/Desvincular |
| 18–21 s | Sidebar Cursos → escolhe o mesmo curso | Detalhe (**3ª escolha**) |
| 22–24 s | "Editar curso" | Modal com Título, Descrição, Preço e Modelo; cancela |
| 25–27 s | "Alterar foto de capa" | Modal de upload; cancela |
| 30–41 s | "Voltar" → grade; marca/desmarca "Selecionar todos", abre "Selecionar coordenador", clica "Atribuir coordenador" sem curso marcado | Toast "Selecione ao menos um curso para atribuir coordenador" |
| 42–45 s | Escolhe o mesmo curso → "Ver professores" | Detalhe (**4ª escolha**) e de novo Professores por Curso |

**Resumo:** em 45 s o Admin escolheu o mesmo curso **4 vezes** e passou por 3 seções do menu para ver uma coisa só: o curso.

## Problemas encontrados

1. **"Ver módulos" e "Ver professores" tiram o Admin do curso.** Os dois chamam `abrirSecaoRelacionada("modulos" | "turmas", curso)` (`SecaoCursos.jsx` ~741 e ~745), que troca de seção e passa o curso por `cursoEmFocoPorSecao`. Em cada seção nova, o "Voltar" leva para a grade daquela seção e não volta para o curso.
2. **O curso aberto não fica na URL.** Como é estado local, o voltar do navegador e o F5 perdem o curso, e não dá para mandar o link de um curso.
3. **O detalhe do curso tem pouco conteúdo:** 5 KPIs e 4 botões, e o resto da página fica vazio. Módulos e professores, que são o que o Admin quer ver, ficam em outras telas.
4. **KPIs cortados:** "Profess…" / "Sem pr…" no card Professores e "R$ 1.59…" em Valor do curso. O texto não cabe no card. O card Professores mostra um nome (ou "Sem professor") no lugar de um número.
5. **Modulos e Professores por Curso viraram só caminhos para o curso:** cada uma é uma grade de cursos que leva a uma parte do curso. É o mesmo cenário que o Coordenador tinha antes da tela única (`docs/fluxo-coordenador`).
6. **"Atribuir coordenador" sem curso marcado:** o botão fica ativo e só avisa por toast depois do clique. Detalhe pequeno, fora do fluxo principal.

## O que já existe para reaproveitar

- `PainelCursoCoordenador.jsx`, a tela única do curso do Coordenador (commits `588adf1` e `eeadb21`): topo compacto, 4 KPIs, abas "Módulos" / "Avaliações do curso", modal "Professores (N)" com `BlocoProfessoresCurso` (vincular/desvincular), breadcrumb `Cursos › Título` e rota `/app/cursos/:id`.
- `ModaisModulo` / `useModaisModulo`: criar, editar e excluir módulo, já usados em `SecaoModulos` e no Professor.
- Modais de "Editar curso" (com Preço e Modelo, só Admin) e "Alterar foto de capa", já em `SecaoCursos`.

O que o Admin tem e o Coordenador não tem: preço e modelo do curso, foto de capa, criar/editar/excluir módulo, filtro e atribuição de coordenador na grade, e Matrículas.
