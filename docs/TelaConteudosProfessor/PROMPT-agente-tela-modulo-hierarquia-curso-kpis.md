# Prompt: tela do módulo — curso em destaque, módulo discreto, KPIs do coordenador compactos (frontend web, só visual)

## Pedido do usuário (2026-11-23, print do coordenador)

1. **O cartão do curso está pequeno demais** e precisa ser **maior que o título do módulo**. O módulo deve ficar **mais discreto**, com hierarquia clara: **curso › módulo › itens**.
2. **Os KPIs do coordenador ficam esticados na largura toda:** 2 cartões por linha e o 3º sozinho embaixo.

O usuário aprovou a imagem `docs/TelaConteudosProfessor/modulo-hierarquia-curso-kpis.png`.

**Vale para:** professor, coordenador e Admin, e também para a trilha do aluno. O prompt `docs/TelaConteudosAlunos/PROMPT-agente-trilha-aluno-modulo-em-tela-propria.md`, ainda não aplicado, usa o mesmo cartão e o mesmo cabeçalho. Se ele for aplicado depois deste, segue este visual. Se for aplicado antes, este prompt ajusta os dois.

## Causas (verificadas pelo agente de arquitetura)

- **Cartão do curso:** a tela do módulo usa `.cartao-curso-modulo--compacto` (`styles/workspace.css` ≈ linha 9709), da correção 1 item 8 (`f1fad9a`): título de 0.95rem, ícone de 40px e altura de ≈ 60px.
- **Cabeçalho do módulo:** `.painel-itens-modulo__cabecalho` (≈ linha 9773) tem um **círculo roxo de 52px** (`__cabecalho-icone`) e título de 1.1rem. Fica mais forte que o curso.
- **KPIs:** `TelaModuloGestao.jsx` ≈ linha 200 usa `.atividades-curso__kpis-compactos` (≈ linha 4093). Essa classe é uma grade de **2 colunas** (`repeat(2, minmax(7.5rem, 1fr))`) criada para uma **coluna lateral estreita**. Na largura toda, cada cartão estica e o 3º cai para a linha de baixo.

## Tarefa

1. **Cartão do curso médio:** uma variante nova do `CartaoCursoModulo`, por exemplo `--medio`, no lugar do `--compacto` na tela do módulo. Remover o `--compacto` se ficar sem uso.
   - Altura ≈ 96px, padding de 16px 20px e o fundo e "relevo duplo" de hoje;
   - ícone ou capa de 60px;
   - acima do título, um **rótulo "CURSO"** (0.72rem, maiúsculas, espaçado, `--cor-marca-clara`);
   - **título em 1.45rem**, peso 800, numa linha com reticências;
   - **descrição numa linha** (0.86rem, `--cor-texto-suave`, com reticências);
   - **barra de progresso** (até ≈ 640px) com o texto ao lado: "64% publicado" (professor), "30% de progresso dos alunos" (coordenador/Admin) ou "62%" (aluno);
   - **selo:** no professor, à direita ("4 rascunhos"); no coordenador/Admin, na linha da barra ("À venda", "Em andamento" etc.); no aluno, à direita ("Curso em andamento", "Concluído" ou "🏆 Certificado emitido").
2. **KPIs do coordenador/Admin dentro do cartão do curso**, à direita:
   - Progresso, Conclusão e Desempenho médio **lado a lado**, compactos, cada um com ícone de 32px em quadrado colorido, valor em 1.1rem e rótulo em 0.74rem;
   - separados por linhas verticais finas e por uma linha vertical do resto do cartão;
   - **largura do conteúdo, não esticados**;
   - **remover** a linha `.atividades-curso__kpis-compactos` dessa tela. **Não** mexer na classe, que outra tela usa;
   - **abaixo de 1200px**, os 3 KPIs descem para uma linha logo abaixo do conteúdo do cartão, ainda dentro dele, alinhados à esquerda e com largura do conteúdo;
   - **abaixo de 768px**, ficam numa linha que pode quebrar, sem esticar.
3. **Cabeçalho do módulo discreto**, em `PainelItensModulo`:
   - **sai o círculo roxo de 52px**;
   - entra um **quadradinho com o número** do módulo (30px, borda e fundo roxo suaves, número `--cor-marca-clara`), com o rótulo **"MÓDULO 01"** pequeno em cima do título (0.72rem, maiúsculas, `--cor-texto-suave`);
   - **título em 1rem**, peso 700, com as contagens **na mesma linha** depois de um "·" (0.78rem). No professor, o "N rascunhos" fica em âmbar;
   - à direita continuam a pílula "N itens" e, no professor, "Selecionar";
   - padding inferior e linha divisória como hoje.
4. **Hierarquia visual a conferir:** o título do curso (1.45rem) fica claramente maior que o do módulo (1rem), e o do módulo maior ou igual ao dos itens (0.95–0.98rem). O curso é o bloco mais forte da página.

**Não alterar:**
- dados, regras, ações, ⋮, janela e linhas dos itens;
- "← Voltar";
- a decisão de não ter coluna de módulos nem anterior/próximo;
- a tela do curso (lista de módulos).

## Testes (vitest)

- **Tela do módulo:**
  - usa a variante média do cartão (classe), com o rótulo "Curso" e a descrição;
  - no coordenador/Admin, os 3 KPIs ficam dentro do cartão do curso, e não existe mais `.atividades-curso__kpis-compactos` nessa tela;
  - o cabeçalho do módulo não tem mais o círculo (`__cabecalho-icone`) e mostra "Módulo 01" e o número.
- Testes de professor e coordenador existentes passando.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173), **sem modo demo**, em 1366px, 1920px e 390px, comparando com `modulo-hierarquia-curso-kpis.png`:

- **Coordenador**, em Cursos › Desenvolvimento Web Full Stack › Fundamentos da Web Moderna:
  - cartão do curso médio com o título grande;
  - KPIs compactos à direita dentro do cartão;
  - nenhuma faixa de KPIs esticada;
  - módulo com "MÓDULO 01" e o título discreto.
- **Professor**, em Acadêmico › Conteúdos › Fundamentos da Web Moderna:
  - o mesmo cartão médio, com "64% publicado" e "4 rascunhos";
  - módulo discreto, com "7 itens" e "Selecionar".
- **1100px:** os KPIs descem dentro do cartão, sem esticar.
- **390px:** sem rolagem lateral.
- `npm run lint` e `npm test` sem erros novos.
