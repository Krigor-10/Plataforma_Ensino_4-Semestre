# Duas tarefas para produção: IA com Claude (Anthropic) e cursos para o teste de usabilidade

Leia `CLAUDE.md`/`AGENTS.md` da raiz antes. **Ordem:** faça a Parte A primeiro: a Parte B usa a geração de quiz por IA já com Claude. As duas partes valem para a produção (Azure App Service; o push na `main` dispara `.github/workflows/deploy-azure.yml`).

**Segurança (vale para as duas partes):**
- Nenhuma chave de API, senha ou token entra no repositório, em log ou em arquivo de exemplo preenchido.
- Chaves e tokens chegam só por variável de ambiente, `dotnet user-secrets` ou configuração do App Service. Quem coloca os valores é o usuário.

---

## Parte A: trocar a geração de avaliações e quizzes de Gemini para Claude

### Contexto

- O provedor já é configurável: `Program.cs` lê `IA:Provedor` (`"Anthropic"` | `"Gemini"`, padrão `Anthropic`).
  - `Anthropic` → `Services/AvaliacaoIAService.cs`, HTTP `POST https://api.anthropic.com/v1/messages`.
  - `Gemini` → `GeminiAvaliacaoIAService.cs`.
- Hoje o desenvolvimento usa Gemini (`appsettings.Development.json`: `"IA": { "Provedor": "Gemini" }`).
- O modelo padrão no código e no `appsettings.example.json` é `claude-sonnet-5` (geração anterior).
- Hoje o `AvaliacaoIAService` manda `anthropic-version: 2023-06-01`, `max_tokens = 8000`, sem `thinking` nem `temperature`, e lê só os blocos `type: "text"` da resposta. O `HttpClient` tem timeout de 90 s (`Program.cs`).

### O que fazer

1. **Provedor:** em `appsettings.Development.json`, `IA:Provedor` passa a `"Anthropic"`. O Gemini continua no código como alternativa por configuração. Não apague o `GeminiAvaliacaoIAService`.
2. **Modelo:** padrão **`claude-opus-5-5`**, no código (`_configuration["IA:Modelo"] ?? "claude-opus-5-5"`) e no `appsettings.example.json`. Continua trocável por `IA:Modelo`. Use o id exatamente assim, sem sufixo de data.
3. **Pedido (corpo) compatível com o Claude Opus 5.5:**
   - **Não** envie `thinking: {type: "disabled"}`, `budget_tokens`, `temperature`, `top_p`, `top_k`, nem uma mensagem `assistant` no fim (prefill): todos dão erro 400 nesse modelo. Hoje o código não envia nenhum desses; mantenha assim.
   - Envie `output_config: { effort: "high" }`. Nesse modelo o padrão é `medium`, e gerar questões boas pede `high`. Deixe configurável por `IA:Esforco`.
   - `max_tokens`: suba de 8000 para **16000**. O raciocínio do modelo conta dentro desse limite, e 8000 pode cortar o JSON no meio.
   - Timeout do `HttpClient` da Anthropic: de 90 s para **180 s**, porque o esforço `high` demora mais. O Gemini fica como está.
   - **Fallback de recusa:** adicione o cabeçalho `anthropic-beta: server-side-fallback-2026-07-01` e, no corpo, `fallbacks: "default"`. Se o modelo recusar o pedido por política, a API refaz em outro modelo na mesma chamada.
4. **Versão da API:** troque `anthropic-version` de `2023-06-01` para **`2026-10-21`**. Nada no pedido atual quebra com ela (não há `temperature` nem `document`/`citations`). Guia: https://platform.claude.com/docs/en/api/migration-2026-10-21
5. **Leitura da resposta:**
   - Continue lendo **só** os blocos `type: "text"`. A resposta agora pode trazer blocos `thinking` com texto vazio e blocos `fallback`: ignore os dois.
   - Antes de ler o texto, confira `stop_reason`:
     - `"refusal"` → erro amigável ("A IA não pôde gerar questões para este material. Tente outro texto.");
     - `"max_tokens"` → erro "Resposta da IA incompleta. Tente gerar menos questões.";
     - não tente interpretar o JSON cortado.
   - Registre no log `model`, `stop_reason` e `usage` (`input_tokens`, `output_tokens`), **sem** o conteúdo do material.
6. **Testes** (`PlataformaEnsino.Tests/AvaliacaoIAServiceTests.cs`): atualize ou crie testes para:
   - modelo padrão `claude-opus-5-5`;
   - cabeçalhos `anthropic-version: 2026-10-21` e `anthropic-beta`;
   - corpo com `output_config.effort` e `fallbacks`, e **sem** `temperature`/`thinking`;
   - resposta com bloco `thinking` antes do `text` (lê só o texto);
   - `stop_reason` igual a `refusal` e a `max_tokens`.

   Use o `HttpMessageHandler` falso que os testes já usam; nenhum teste chama a API de verdade.
7. **Infra:** em `infra/main.bicep`, o padrão de `iaProvedor` passa a `Anthropic` (o parâmetro `iaApiKey` já existe). Em `infra/README.md`, documente como o usuário configura a chave em produção:
   ```bash
   az webapp config appsettings set --resource-group <rg> --name <app> --settings IA__Provedor=Anthropic IA__ApiKey=<chave> IA__Modelo=claude-opus-5-5
   ```
   Inclua o aviso que já está no bicep: um novo deploy do template substitui as configurações do app. Ou a chave vai como parâmetro `iaApiKey` no deploy, ou precisa ser posta de novo depois.
8. **Desenvolvimento local:** documente no `README.md`
   ```bash
   dotnet user-secrets set "IA:ApiKey" "<chave>"
   ```
   O `UserSecretsId` já está no `.csproj`.

### Fora do escopo da Parte A

Trocar o HTTP manual pelo SDK oficial em C#. É uma melhoria possível depois, mas não é necessária para a troca.

---

## Parte B: 3 cursos reais e roteiro de teste de usabilidade

### Objetivo

Deixar em produção três cursos completos para testar o fluxo real de ponta a ponta:

| Curso | Modelo | Preço | Conteúdo |
|---|---|---|---|
| **Introdução à Inteligência Artificial** | Gratuito | R$ 0 | Material completo |
| **Qualidade de Software: Revisão ENADE** | Pago (pacote) | R$ 49,90 | Materiais + quiz em cada módulo |
| **Lógica de Programação com Python** | Acompanhado (pago) | R$ 99,90 | Materiais; avaliação a cargo do professor no teste |

Temas e preços são sugestões: **confirme com o usuário antes de criar em produção.** Material de base já no repositório: `docs/QuestoesCodeRyse/` (`Apostila - Inteligência Artificial.pdf`, `QuestoesBanco1.pdf`…`QuestoesBanco3.pdf`). Confirme com o usuário que esses arquivos podem ser publicados.

### B1. Pacote de conteúdo versionado (`docs/teste-usabilidade/cursos/`)

- Um `curso.json` por curso, com título, descrição, modelo e preço, e os **módulos** em ordem (3 a 4 por curso).
- Para cada módulo, os conteúdos com tipo (`Texto`/`Pdf`/`Video`/`Link`, enum `TipoConteudoDidatico`), título e fonte (texto em Markdown no próprio pacote, caminho do PDF ou URL).
- **Curso gratuito (IA):**
  - módulos tirados da apostila, um PDF por módulo (recorte das páginas), com um texto de resumo;
  - pelo menos 1 vídeo ou link público e estável por módulo, só de fonte oficial ou educacional;
  - no último módulo, uma prova com nota (Prova/Exercício), para testar média ≥ 7,00 e certificado.
- **Curso pago (Qualidade de Software / ENADE):**
  - módulos por tema dos bancos de questões, com um material de texto + PDF em cada um;
  - um **quiz por módulo**, criado pela geração por IA da Parte A a partir do material;
  - uma **prova final** com nota, com as questões dos bancos.
- **Curso acompanhado (Python):** materiais de texto, links e exercícios. As avaliações com nota o professor cria **durante** o teste, porque isso faz parte do roteiro.
- Textos em português, com acentos, escritos para o curso. Não copie trechos longos de terceiros.

### B2. Script de carga (`tools/carga-cursos-teste/`)

- Script de linha de comando, em Node ou C#, como for mais simples no repositório. Ele lê o pacote B1 e cria tudo **pela API pública**, como um usuário faria, respeitando os perfis:
  - **Coordenador ou Admin:** curso (`POST /Cursos`), módulos (`POST /Modulos`) e vínculo do professor (`POST /Cursos/{id}/professores/{professorId}`).
  - **Professor:** conteúdos (`POST /ConteudosDidaticos` e `POST /ConteudosDidaticos/arquivo` para os PDFs), quizzes (pela rota de geração por IA) e prova final (`POST /Avaliacoes`). Também publica o que for preciso.
- Configuração só por variável de ambiente:
  - `CARGA_API_URL`;
  - `CARGA_TOKEN_COORDENADOR`;
  - `CARGA_TOKEN_PROFESSOR`;
  - `CARGA_PROFESSOR_ID`.

  O usuário obtém os tokens fazendo login. **O script não pede nem guarda senha.**
- **`--dry-run`** (padrão): só lista o que criaria. **`--aplicar`**: cria de verdade.
- **Idempotente:** curso que já existe com o mesmo título é pulado, sem duplicar. No fim, mostra os ids criados.
- Teste primeiro contra o ambiente local (`dotnet run` + banco de desenvolvimento) e documente no `README.md` da pasta. **Em produção quem roda é o usuário**: não rode contra produção.

### B3. Roteiro do teste de usabilidade (`docs/teste-usabilidade/ROTEIRO.md`)

Para testadores sem conhecimento técnico, no celular e no web. Cada tarefa tem: objetivo, passos que o testador **não** recebe prontos (só a meta: "Compre o curso de Qualidade de Software"), o que observar (onde hesitou, erros, tempo) e o resultado esperado.

- **Aluno:**
  1. cadastrar-se;
  2. começar o curso gratuito;
  3. estudar um módulo e concluir os conteúdos;
  4. comprar o curso pago;
  5. responder um quiz;
  6. fazer a prova final;
  7. ver o progresso e a média;
  8. receber e compartilhar o certificado (grátis e pago);
  9. comprar o curso acompanhado.
- **Professor:** publicar um material, criar uma avaliação (manual e por IA), ver o desempenho da turma e exportar.
- **Coordenador:** acompanhar o curso acompanhado e encerrá-lo. Depois, conferir que os certificados dos alunos aprovados saíram sozinhos.
- No fim: questionário curto pós-teste (escala SUS de 10 itens, em português) e uma planilha ou modelo para anotar problemas, com tela, gravidade e descrição.
- Lista de contas de teste necessárias (aluno, professor, coordenador), **sem senhas**.

### Fora do escopo da Parte B

Criar contas em produção e rodar o script em produção: quem faz é o usuário.

---

## Pronto quando

- **Parte A:**
  - `dotnet test` verde, com os testes novos;
  - em desenvolvimento, com a chave via user-secrets, gerar um quiz por IA funciona com `claude-opus-5-5` (teste manual, que gasta pouco: peça ao usuário antes de rodar);
  - `README` e `infra/README.md` com os passos da chave.
- **Parte B:**
  - pacote dos 3 cursos em `docs/teste-usabilidade/cursos/`;
  - script com `--dry-run`/`--aplicar` testado no ambiente local;
  - `ROTEIRO.md` pronto.
- Ao terminar, liste os arquivos alterados e criados, e o que o usuário precisa fazer: pôr a chave no App Service, criar as contas, rodar o script em produção.
