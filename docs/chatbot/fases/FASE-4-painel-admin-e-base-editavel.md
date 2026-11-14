# Fase 4 de 4 — Painel do Admin: dúvidas frequentes, sem resposta e base de conhecimento editável

> Parte do plano em `docs/chatbot/fases/LEIA-ME-ordem.md`. **Depende das fases 1 e 2 em uso por algum tempo**, para haver dados reais. Backend e frontend web.

## Contexto

Com o Assistente CodeRyse em uso, o Admin precisa:
1. ver **o que os alunos mais perguntam** e **o que o assistente não soube responder**;
2. **editar a base de conhecimento** pela plataforma, sem depender de desenvolvedor;
3. **aproveitar os chamados respondidos** para melhorar a base.

**Decisão do usuário:** a base pode crescer com o uso, mas **nada entra sem a aprovação do Admin**, e o assistente **nunca aprende sozinho** com as conversas. Ver `../ANALISE-viabilidade-chatbot.md`, seção "Alimentação da base de conhecimento".

## O que já existe depois das fases 1 e 2 (conferir no passo 0)

- `MensagemChatbot` com texto, ferramentas usadas, `SemResposta` (marcador `[[sem_resposta]]`), feedback 👍/👎 e custo.
- `ChamadoSuporte` e `MensagemChamado` com resumo, conversa e status.
- A base de conhecimento lida de `docs/chatbot/BASE-conhecimento-suporte.md` (v1 aprovada), em cache no prompt.
- A tela de Chamados e o cartão "Assistente" do Admin (fase 2).

## Tarefa

### 0. Antes de alterar
- Rodar os testes como linha de base.
- Conferir os nomes reais das tabelas e campos criados nas fases 1 e 2.
- Propor o modelo de dados da base editável antes de criar.

### 1. Base de conhecimento editável
- **Banco de dados:** mover a base do arquivo para o banco, organizada em **tópicos** (os títulos das seções da base atual: Sobre, Tipos de curso, Compra e matrícula, etc.), cada um com o texto.
  - **Histórico de versões:** quem mudou, quando e o texto anterior.
  - A **primeira carga** vem do arquivo aprovado.
- **Tela "Base de conhecimento"** (Admin):
  - lista de tópicos, edição de texto simples, pré-visualização;
  - "Salvar", que cria uma nova versão;
  - "Ver histórico" e "Voltar a esta versão".
- **Uso pelo assistente:** o prompt de sistema passa a montar a base a partir do banco, na mesma ordem de tópicos. Cada versão salva gera um novo prefixo de cache, que é recriado uma vez, o que é esperado. Manter o resto do sistema estável para o cache.
- **Fallback:** se o banco estiver vazio ou falhar, usar o arquivo.

### 2. Painel "Dúvidas do assistente" (Admin)
- **Perguntas frequentes:** agrupar perguntas parecidas do período (7, 30 ou 90 dias), com a quantidade e exemplos.
  - O agrupamento pode ser feito por um job que chama o modelo do chat em lote, de forma assíncrona e barata (Batches API, se for simples no padrão HTTP do projeto). Uma alternativa mais simples, sem IA, é por palavras-chave. O agente propõe no passo 0.
- **Sem resposta:** a lista das mensagens com `SemResposta`, mais as de 👎, com a pergunta, a resposta dada e a data.
- Em cada item, o botão **"Criar item na base"**, que abre o tópico sugerido com um rascunho para o Admin editar e salvar.

### 3. Sugestões a partir dos chamados
- No chamado **resolvido**, botão **"Transformar em item da base"** (Admin), que gera um rascunho com a pergunta do aluno e a resposta da equipe, sem nome nem dados do aluno.
- O rascunho entra numa fila **"Sugestões pendentes"** na tela da base. O Admin edita e **aprova** (vira nova versão do tópico) ou **descarta**.

**Não alterar:** as regras de escopo e segurança do assistente, os limites, os chamados e a guarda de 90 dias.

## Critérios de aceite

- **Base editável:**
  - o Admin edita um tópico, salva, e o assistente passa a responder com o texto novo na pergunta seguinte;
  - o histórico mostra a versão anterior, e "Voltar" restaura.
- **Painel:** mostra as perguntas frequentes e as sem resposta do período. "Criar item na base" leva ao tópico com o rascunho.
- **Chamado resolvido:** "Transformar em item da base" cria a sugestão sem dados pessoais. Aprovar vira versão; descartar some da fila.
- **Regressão:** depois das mudanças, rodar de novo os grupos D e E de `../TESTE-perguntas-suporte.md`, que precisam continuar em 100%.
- `dotnet test`, `npm run lint` e `npm test` sem erros novos.
