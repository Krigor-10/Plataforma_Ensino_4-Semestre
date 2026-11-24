# Prompt: app mobile — Avaliações, ajustes 1: selo Concluída, chips compactos com nome do curso, nota colorida e título repetido

## Pedido do usuário (2026-11-24, print da aba Avaliações → Concluídas, já com a lista direta aplicada)

1. **Selo "Concluída":** hoje é azul. Deve ficar **verde e com ✓**.
2. **Chips de curso:** devem ficar mais **compactos e minimalistas**, com o **nome do curso**. Hoje aparecem "Curso #1" e "Curso #1018". Nome grande deve ser **abreviado**.
3. **Nota no cartão:** texto diferente e cor própria. **Vermelho quando < 7**, **verde quando ≥ 7**.
4. **Título repetido:** "AVALIAÇÕES" aparece na faixa do topo (breadcrumb `ScreenIndicator`) e de novo como título grande "Avaliações". **Fica só o do breadcrumb**, e a regra vale para as outras telas.

Não precisa de imagem.

## Diagnóstico (verificado pelo agente de arquitetura)

### "Curso #1" / "Curso #1018" é bug de dado, não de layout

- `AvaliacoesScreen.jsx` ≈ linha 112 usa `avaliacao.cursoTitulo || \`Curso #${avaliacao.cursoId}\``.
- No backend, `MapAvaliacaoAluno` (`Services/AvaliacaoService.cs` ≈ linha 1719) preenche `CursoTitulo = avaliacao.Modulo?.Curso?.Titulo ?? string.Empty`.
- Avaliação **sem módulo** (prova final do curso, como "Avaliação final – Introdução à IA") vem com `CursoTitulo` **vazio**, mesmo tendo `CursoId`. `Avaliacao` não tem navegação para `Curso`, só `CursoId`.
- Por isso o cartão também não mostra a linha com o nome do curso nesses casos.
- Em `ListarAvaliacoesPorAlunoAsync` (≈ linhas 60–160) as matrículas já são carregadas com `.Include(matricula => matricula.Curso)`. O título do curso já está em memória.

### Onde está cada coisa

- **Selo:** `AvaliacoesScreen.jsx` ≈ linhas 222–229. "Concluída" e "Em andamento" usam `cores.informativo`.
- **Linha de dados:** `partesLinha2`, ≈ linhas 232–237. Hoje é `Nota X,X` ou `Nota —` no mesmo texto cinza.
- **Chips:** `Chip` (≈ linha 357), estilos `chip` / `chipAtivo` / `chipTexto` (≈ linhas 377–390). O ativo tem fundo roxo cheio.
- **Título repetido:** o breadcrumb é `components/ScreenIndicator.jsx`, que recebe o título de `TELAS_INFO` em `AlunoHeaderBar.jsx`. O título grande é repetido em:
  - `AvaliacoesScreen.jsx` ≈ linhas 181–182 e 285–286 (título "Avaliações" e o subtítulo "Testes práticos e teóricos do seu curso");
  - `ProgressoScreen.jsx` ≈ linhas 203–204 ("Progresso" e "Acompanhamento da sua evolução acadêmica");
  - `ConteudosScreen.jsx` ≈ linha 383 ("Cursos" e "Escolha um curso para continuar sua trilha", ao lado do botão "Ver catálogo").
  - `CertificadosScreen.jsx` e `HomeScreen.jsx` **não** repetem. "Meus cursos" da Home é título de seção, fica.

## Tarefa

### 1. Backend: nome do curso sempre preenchido (aluno)

- Em `ListarAvaliacoesPorAlunoAsync`, montar `tituloCursoPorId` a partir das matrículas, que já têm `Curso` carregado. Passar para `MapAvaliacaoAluno`:
  - `CursoTitulo = avaliacao.Modulo?.Curso?.Titulo ?? tituloCursoPorId.GetValueOrDefault(avaliacao.CursoId) ?? string.Empty`
- Revisar os outros pontos que chamam `MapAvaliacaoAluno`, se houver, para usar a mesma regra.
- **Não mudar** `AvaliacaoMappingExtensions.ParaResponseDto` (professor) neste prompt. Só registrar no relatório se o mesmo vazio acontece lá.
- **Teste xUnit:** uma avaliação sem módulo retorna `CursoTitulo` igual ao título do curso da matrícula.

### 2. Frontend: reserva para o nome do curso

- Nos chips e no cartão, se `cursoTitulo` vier vazio, buscar o título em `snapshot.cursos` pelo `cursoId`.
- Só em último caso usar "Curso" (sem "#id"). Nunca mostrar "Curso #1018".

### 3. Chips mais compactos e minimalistas

- **Altura:** ≈ 28px; `paddingHorizontal` ≈ 10; fonte `tipografia.legenda` (peso 600).
- **Inativo:** sem borda, fundo bem sutil (`cores.fundoCartao` ou equivalente) e texto `textoSuave`.
- **Ativo:** fundo roxo translúcido (`rgba(123,47,247,.18)`), borda fina roxa e texto roxo-claro/branco. **Não** usar o roxo cheio de hoje.
- **Primeiro chip:** só **"Todos"**, no lugar de "Todos os cursos".
- **Nome abreviado:**
  - função `abreviarNomeCurso(titulo, max = 18)`: se couber, mostra inteiro; senão corta na última palavra inteira antes do limite e acrescenta "…". Exemplo: "Desenvolvimento Web Full Stack" vira "Desenvolvimento Web…";
  - se a 1ª palavra sozinha passar do limite, corta nela;
  - `accessibilityLabel` com o nome **completo**;
  - também `maxWidth` ≈ 160 com `numberOfLines={1}`, como reserva.
- **Teste:** cobrir a função de abreviar (curto, longo e palavra única longa).

### 4. Selo "Concluída" verde com ✓

- "Concluída" usa `cores.sucesso` / `cores.sucessoFundo`, com `Ionicons` `checkmark-circle` (≈ 12px) antes do texto, na mesma cor.
- "Em andamento" continua azul (informativo).
- "Disponível" continua verde **sem** ícone. Os dois verdes ficam em abas diferentes.

### 5. Nota com texto e cor próprios

- **Tirar** a nota de `partesLinha2`. A linha 2 fica "N questões · N/M tentativas · N min".
- Acrescentar uma **linha própria da nota**, em negrito, logo abaixo, só quando houver nota:
  - **≥ 7:** verde (`cores.sucesso`), "✓ Nota 8,5 · aprovado";
  - **< 7:** vermelho (`cores.erro`), "Nota 2,0 · abaixo de 7,0".
- **Escala:** comparar a nota convertida para 0–10, `ultimaNota / notaMaxima * 10` quando `notaMaxima` for diferente de 10. Exibir o mesmo valor convertido. O mínimo 7 é a regra que a tela já usa.
- **Sem tentativa:** não mostrar linha de nota. Some o "Nota —".
- **Testes:**
  - 7,0 fica verde (limite incluído);
  - 6,9 fica vermelho;
  - `notaMaxima` 5 com nota 4 vira 8,0 e fica verde.

### 6. Título só no breadcrumb (regra para as abas do aluno)

- **Avaliações:** remover o título grande e o subtítulo nos dois lugares (lista e estado de carregamento ou vazio). As abas "Disponíveis | Concluídas" sobem para logo abaixo do breadcrumb, com o mesmo respiro superior (`espacamentos.lg`).
- **Progresso:** remover "Progresso" e o subtítulo. Se o prompt `PROMPT-agente-progresso-visao-geral.md` for aplicado depois, ele **não** deve recolocar o título. O resumo começa logo abaixo do breadcrumb.
- **Cursos** (`ConteudosScreen`): remover o título "Cursos" e o subtítulo. O botão "Ver catálogo" continua, alinhado à direita numa linha compacta acima da lista.
- Registrar a regra num comentário curto no `ScreenIndicator.jsx`: o título da aba é o breadcrumb, e as telas das abas não repetem um título grande. Telas empilhadas, como detalhe do curso ou do módulo, continuam com o título próprio do conteúdo (nome do curso etc.).

**Não alterar:**
- regras de disponibilidade, conclusão e tentativas;
- o modal de confirmação e a revisão;
- a ordem e o conteúdo das abas;
- o quiz continua fora;
- a barra de navegação.

## Testes (jest e xUnit)

Os itens 1, 3 e 5 acima já trazem os seus testes. Além deles:

- **Chips:** com uma avaliação de prova final (sem módulo), o chip mostra o nome do curso, nunca "Curso #id".
- **Selo:** "Concluída" renderiza com o ícone de check e a cor de sucesso.
- **Título:** Avaliações, Progresso e Cursos não renderizam mais o título grande da aba.

## Critérios de aceite

Verificar no app (Expo) logado como Aluno Demo:

- **Chips:** pequenos e discretos, "Todos" e os nomes reais dos cursos, abreviados com "…" quando longos. Não aparece "Curso #1" nem "Curso #1018".
- **Cartão da prova final:** "Avaliação final – Introdução à IA" mostra o nome do curso abaixo do título.
- **Selo:** "Concluída" verde com ✓.
- **Nota:** "Nota 2,0 · abaixo de 7,0" em vermelho; uma nota ≥ 7 aparece verde com "aprovado".
- **Breadcrumb:** "AVALIAÇÕES" aparece **uma vez só**; o mesmo vale para Progresso e Cursos.
- **Testes:** `npm test` (mobile) e `dotnet test` sem falhas novas.
