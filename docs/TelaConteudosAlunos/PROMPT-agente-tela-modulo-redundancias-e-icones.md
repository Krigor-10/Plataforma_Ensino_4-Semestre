# Prompt: tela do módulo — tirar informações redundantes e padronizar a cor dos ícones (aluno, professor, coordenador e Admin; frontend web, só visual)

## Pedido do usuário (2026-11-24, print do aluno na tela do módulo)

1. **Remover informações redundantes.** No print, o selo "🏆 Certificado emitido" aparece **duas vezes** no cartão do curso: ao lado da barra e no canto.
2. **A cor do ícone segue o tipo, igual ao professor:** **roxo para quiz** e **verde para conteúdo** (material). No aluno, os quizzes concluídos aparecem com ícone verde.

As telas usam os mesmos componentes (`CartaoCursoModulo` e `PainelItensModulo`). A correção vale para **todos os perfis**, para manter a consistência.

## Causas (verificadas pelo agente de arquitetura)

| Problema | Causa | Onde |
|---|---|---|
| Selo duplicado (aluno e professor) | Na variante **média**, sem `kpis`, o selo é desenhado **duas vezes**: na linha da barra (`{!kpis && selo ? <Insignia …selo-inline>}`) e no canto (`kpis ? … : selo ? <Insignia …__selo>`). | `components/CartaoCursoModulo.jsx` ≈ linhas 51 e 66 |
| Selo **sumido** no coordenador/Admin ("À venda" não aparece) | Com `kpis`, a condição da linha da barra é falsa e o canto está ocupado pelos KPIs, então o selo não aparece em lugar nenhum. | o mesmo trecho |
| Cor do ícone por **status**, não por tipo | `corIcone` depende do status: aluno `concluido ? "verde" : "roxo"`; professor `publicado ? "verde" : "roxo"`; coordenador sempre `"verde"`. Quiz concluído ou publicado fica verde, e material pendente fica roxo. | `TelaModuloGestaoAluno.jsx` ≈ linhas 188 e 232; `TelaModuloGestaoProfessor.jsx` ≈ linhas 498 e 527; `TelaModuloGestao.jsx` ≈ linhas 171 e 190 |

## Tarefa

1. **Selo em um lugar só**, em `CartaoCursoModulo` (variante média):
   - **com `kpis`** (coordenador/Admin): o selo fica na **linha da barra** (`__selo-inline`), porque o canto é dos KPIs;
   - **sem `kpis`** (professor e aluno): o selo fica **só no canto** (`__selo`);
   - ou seja, a condição da linha da barra passa a ser `kpis && selo`;
   - o botão "▶ Continuar" do aluno (prop `extra`) continua funcionando na variante em que estiver.
2. **Cor do ícone pelo tipo, em todos os perfis:**
   - **conteúdo (material: texto, PDF, imagem, vídeo, link) → verde**;
   - **quiz → roxo**;
   - **bloqueado** (aluno) continua com o estilo de bloqueado;
   - o status (concluído, rascunho etc.) fica **só no texto da linha de dados**, nunca na cor do ícone;
   - centralizar a regra num lugar só, por exemplo uma função `corIconePorTipo(linha)` usada pelas três telas, sem repetir o ternário em cada uma.
3. **Linha de dados sem repetir o tipo:** o selo do tipo à direita ("Texto", "Imagem", "Quiz") já diz o tipo, então a linha de dados mostra **só o que não está no selo**:
   - **material:** só o status ("✓ Concluído", "▶ Não iniciado", "✓ Publicado", "● Rascunho"), sem "▤ Texto |";
   - **quiz:** "☰ N questões | {status}". A contagem de questões não está no selo e fica;
   - **coordenador/Admin** (sem status): material sem linha de dados; quiz só com "☰ N questões".
4. **Cabeçalho do módulo sem a pílula "N itens":** o resumo ao lado do título já diz "N conteúdos · N quizzes", então a pílula é **removida** em todos os perfis. No professor, "Selecionar" continua à direita.

**Não alterar:**
- os KPIs do coordenador, o rótulo "CURSO", o título e a descrição do cartão;
- o "Abrir ›" e o "Ver revisão" / "Iniciar quiz" das linhas;
- a janela grande, o bloqueio, as regras e os dados.

## Testes (vitest)

- **Cartão médio:**
  - sem `kpis`, o selo aparece **uma vez** (no canto);
  - com `kpis`, o selo aparece **uma vez** (na linha da barra).
- **Ícones:**
  - nas três telas, material tem a classe `--verde` e quiz tem `--roxo`, independente do status;
  - bloqueado continua `--bloqueado`.
- **Linha de dados:**
  - o material não repete o tipo;
  - o quiz mostra "N questões".
- **Cabeçalho:** não tem mais a pílula "N itens".

## Critérios de aceite

Verificar no app real (127.0.0.1:5173), **sem modo demo**, em 1366px e 390px:

- **Aluno**, na tela do módulo Fundamentos da Web Moderna:
  - "🏆 Certificado emitido" aparece **uma vez só**;
  - os quizzes "Validacao Codex…" e "ANALISE_DESENVOLV_SIST_TOMO_01" ficam com **ícone roxo**, e os conteúdos com ícone verde;
  - a linha dos conteúdos mostra só "✓ Concluído";
  - sem a pílula "5 itens".
- **Professor:**
  - "4 rascunhos" aparece uma vez;
  - quiz sempre roxo e material sempre verde, publicado ou não.
- **Coordenador/Admin:** a situação ("À venda") **aparece** na linha da barra, junto com os KPIs à direita.
- `npm run lint` e `npm test` sem erros novos.
