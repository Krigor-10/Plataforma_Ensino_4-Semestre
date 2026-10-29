# Script de carga dos 3 cursos de teste + ajustes de exibição

Leia `CLAUDE.md`/`AGENTS.md` da raiz antes.

Esta tarefa **substitui a Parte B** de `docs/producao/PROMPT-agente-ia-anthropic-e-cursos-teste.md`. Os temas, os preços e o conteúdo mudaram, e o pacote já está pronto. **Não há roteiro de teste/SUS**: o usuário decidiu não ter.

**Segurança:**
- Nenhuma senha ou token entra no repositório, em log ou em arquivo de exemplo preenchido.
- O script recebe tokens só por variável de ambiente e nunca pede senha.
- Em produção, quem roda o script é o usuário. **Não rode contra produção.**

---

## 1. O pacote (já pronto, não alterar)

`docs/teste-usabilidade/cursos/`: leia o `README.md` da pasta. Resumo:

- **`cursos.json`:** 3 cursos (`gratis-ia`, `pago-eng-software`, `acompanhado-redes`). Os campos usam os nomes dos DTOs da API em camelCase, e os enums vêm **por nome** (a tabela de conversão está no README).
- **`aulas/*.pdf`:** 12 aulas, sendo 2 módulos × 2 aulas por curso.
- **`figuras/*.png`:** 6 figuras, que são anexos das questões finais (2 por curso).
- **`capas/*.jpg`:** capas dos cursos (campo `imagemCapa`). São cópias de `frontend/src/assets`, escolhidas pelo usuário: IA → `course-eng-ia.jpg`, Engenharia de Software → `course-arquitetura-soft.jpg`, Redes → `course-devops-cloud.jpg`.
- **Questões:** cada uma está no formato do `CriarQuestaoAvaliacaoDto` (alternativas com `justificativa`, `afirmativas` quando o tipo é `AfirmativasCombinadas`), mais a chave extra `anexos: [{titulo, arquivo}]`.

**O conteúdo não muda.** Se a API recusar algum campo (tamanho, validação), **não edite o JSON**: pare e reporte qual campo e qual regra.

## 2. Script de carga: `tools/carga-cursos-teste/`

Use Node ou C#, como for mais simples no repositório. Ele lê o pacote e cria tudo **pela API pública** (`/api/v1/...`), respeitando os perfis.

**Variáveis de ambiente:**
- `CARGA_API_URL`
- `CARGA_TOKEN_ADMIN`: precisa ser **Admin**, porque a capa (`POST /Cursos/{id}/imagem`) só aceita Admin
- `CARGA_TOKEN_PROFESSOR`
- `CARGA_PROFESSOR_ID`

O usuário obtém os tokens fazendo login.

**Opções:**
- `--dry-run` (padrão): só lista o que criaria.
- `--aplicar`: cria de verdade.
- `--curso <chave>`: carrega só um curso.

**Ordem por curso:**

1. **Admin:**
   - `POST /Cursos` com `{titulo, descricao, preco, modeloCurso}`;
   - `POST /Cursos/{id}/imagem` (multipart, campo `imagem`) com o arquivo de `imagemCapa`;
   - `POST /Modulos` com `{titulo, cursoId}` (2 módulos);
   - `POST /Cursos/{id}/professores/{CARGA_PROFESSOR_ID}`;
   - `POST /Turmas` com `{nomeTurma, cursoId, professorId}`.
2. **Professor, aulas:** para cada aula, `POST /ConteudosDidaticos/arquivo` (multipart: `arquivo` + `tipoConteudo=2`) devolve `arquivoUrl`. Depois, `POST /ConteudosDidaticos` com:
   - `tipoConteudo: 2`, `arquivoUrl`, `turmaId`, `moduloId`;
   - `statusPublicacao: 2`;
   - `ordemExibicao`: 1 e 2 dentro do módulo.
3. **Professor, quiz por módulo:**
   - `POST /Avaliacoes` com `{tipoAvaliacao: 1, moduloId, turmaId, tentativasPermitidas: 3, statusPublicacao: 1}`;
   - `POST /Avaliacoes/{id}/questoes/lote` com as 3 questões;
   - publicar (`PUT /Avaliacoes/{id}` com `statusPublicacao: 2`).
4. **Professor, avaliação final:**
   - `POST /Avaliacoes` com `{tipoAvaliacao: 2, moduloId: null, turmaId, tentativasPermitidas: 3, tempoLimiteMinutos: 40, notaMaxima: 10, statusPublicacao: 1}`;
   - `POST /Avaliacoes/{id}/questoes/lote` com as 5 questões;
   - para cada questão com `anexos`, usar o `questaoBancoId` devolvido e chamar `POST /Avaliacoes/questoes-banco/{questaoBancoId}/anexos` (multipart: `arquivo`, `titulo`, `tipoAnexo=5`);
   - publicar.

**Regras:**
- **Tudo publicado nos 3 cursos**, inclusive no Acompanhado (decisão do usuário).
- **Idempotente.** Curso, módulo, conteúdo e avaliação já existentes com o mesmo título são reaproveitados, não duplicados. Se a carga cair no meio, rodar de novo completa o que falta.
- **Resumo no fim:** mostra os ids criados ou reaproveitados por curso.
- **Testar no ambiente local:** `dotnet run` com o banco de desenvolvimento, nos três modos: `--dry-run`, depois `--aplicar`, depois `--aplicar` de novo (não pode duplicar).
- **`README.md` da pasta `tools/carga-cursos-teste/`:** documente o passo a passo para o usuário rodar em produção.

## 3. Conferir a exibição (corrigir o que faltar)

Com os cursos carregados no ambiente local, confira **no web e no mobile**, logado como aluno:

0. **Capas:** os 3 cursos aparecem com a capa própria (não a genérica) na Home pública, no catálogo e em Cursos, no web e no mobile.
1. **Aulas em PDF:** abrem no visualizador e marcam a aula como concluída. Os quizzes aparecem na trilha **depois** das 2 aulas do módulo.
2. **Anexo da questão ao responder:** o mobile já mostra (commit `38eaddd`). **Confira o web.** Se o aluno não vir a figura ao responder no web, implemente igual ao mobile.
3. **Quebras de parágrafo:** contexto, enunciado e explicação vêm com `\n\n` entre parágrafos (o contexto das questões ENADE tem texto-base, fonte e cenário). Hoje o web parece juntar tudo num bloco só, porque não há `white-space: pre-line`. Faça respeitar as quebras em contexto, enunciado, explicação e justificativas, nas telas de responder e de revisão.
4. **Revisão das questões `AfirmativasCombinadas`:**
   - só a alternativa correta tem justificativa ("Alternativa correta: X");
   - as outras vêm vazias e **não podem mostrar caixa ou rótulo vazio**;
   - as justificativas de cada afirmativa (I, II, III…) precisam aparecer.
5. **Explicação longa:** a introdução teórica tem entre 3 e 7 mil caracteres. Ela tem que caber com rolagem, sem cortar, no web e no mobile.
6. **Quiz:** continua sem mostrar nota (regra existente).
7. **Avaliação final:** fica fora dos módulos, na tela de Avaliações. Com 4 de 5 acertos (nota 8) o certificado é liberado. Com 3 de 5 (nota 6), não.

Rode a suíte de testes do backend e do frontend/mobile que o repositório já tem. Adicione teste para o que você mudar no item 3.

## Fora do escopo

- Editar o conteúdo do pacote.
- Criar contas em produção.
- Rodar o script em produção.

## Pronto quando

- `tools/carga-cursos-teste/` funciona em `--dry-run` e `--aplicar` no ambiente local, é idempotente e tem `README.md`.
- Os itens 0 a 7 conferidos no web e no mobile, com o que faltava corrigido e testado.
- Testes verdes.
- Ao terminar, liste:
  - os arquivos alterados e criados;
  - o que você conferiu manualmente;
  - o que o usuário precisa fazer: criar a conta do professor em produção, pegar os tokens e rodar o script.
