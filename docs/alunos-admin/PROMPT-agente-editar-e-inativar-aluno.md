# Prompt: Admin — editar dados básicos do aluno e inativar/reativar o acesso (backend + web)

## Pedido do usuário (2026-11-25)

1. "Liberar edição de aluno para o admin, mas apenas dados básicos acadêmicos e de contato; dados pessoais sigilosos não."
2. "Colocar opção para inativar acesso de aluno da plataforma."

## Decisões do usuário (2026-11-25, uma por vez)

| Assunto | Decisão |
|---|---|
| Campos editáveis | **Nome, e-mail, telefone e RA** (número de matrícula do aluno, `Aluno.Matricula`). **Não editáveis:** CPF, senha e o endereço inteiro (CEP, rua, número, bairro, cidade, UF). |
| Troca de e-mail | **Troca e avisa:** confere se o e-mail já existe, **encerra as sessões abertas** do aluno e **envia aviso para o e-mail antigo e o novo**. |
| Quando perde o acesso | **Na hora.** As sessões são encerradas e **toda requisição confere se o usuário está ativo**, então o aluno sai do app no próximo clique. Matrículas, progresso e certificados ficam guardados, e **reativar devolve tudo**. |
| Motivo ao inativar | **Obrigatório.** Fica registrado com a data e quem inativou, e aparece nos detalhes do aluno. |

**Quem pode:** só o **Admin** edita, inativa e reativa. O Coordenador continua só vendo a lista e os detalhes, como hoje.

## Como está hoje (verificado pelo agente de arquitetura)

### Backend

- **Modelo:**
  - `Models/Usuario.cs` já tem `Ativo` (`private set`) com `Ativar()` / `Desativar()` e `AlterarDados(nome, email, telefone, cep, rua, numero, bairro, cidade, estado)`;
  - `Models/Aluno.cs` tem `Matricula` (o RA), gerado por `GerarCodigoAlunoAsync()` (`Services/AlunoService.cs`).
- **`Controllers/AlunosController.cs`:**
  - `GET /Alunos` (Admin, Coordenador; paginado);
  - `POST /Alunos` (Admin);
  - `POST /Alunos/cadastro-completo`;
  - **não existe PUT nem rota de ativar/inativar aluno**.
  - Professor e Coordenador já têm `Atualizar*Dto` com `Ativo` (`ProfessorService` / `CoordenadorService` ≈ linhas 72–80): usar como padrão de código, **não** de campos.
- **`Services/AuthService.cs`:**
  - o login já barra `!usuario.Ativo` (≈ linha 39), **mas com a mensagem errada**: "Seu cadastro ainda está pendente de liberação.";
  - o refresh (≈ linha 59) e a recuperação de senha (≈ linha 94) também barram inativo;
  - a revogação de todos os refresh tokens de um usuário já existe como trecho (≈ linhas 138–144, na redefinição de senha). Extrair para um método reutilizável.
- **JWT:**
  - `ExpireMinutes: 20` (`appsettings.json`);
  - `Program.cs` ≈ linha 203, `JwtBearerEvents` só tem `OnMessageReceived`;
  - **nada confere `Ativo` por requisição.** Hoje um token de acesso emitido continua valendo até expirar.
- **E-mail:** `Services/EmailService.cs`, com `EnviarAsync(destinatario, assunto, corpoHtml)`.
- **`AlunoResponseDto`** expõe CPF e endereço completo para Admin e Coordenador. Fica registrado; **não mudar neste prompt**.

### Web

- `frontend/src/pages/workspace/SecaoAlunos.jsx` (Admin, via `WorkspaceScreen.jsx` ≈ linha 738):
  - tabela com o filtro Ativos/Inativos e a insígnia Ativo/Inativo;
  - modal **"Detalhes do aluno"** só de leitura (≈ linhas 240–296), com CPF mascarado, telefone, Cidade/UF, cadastro, cursos e o botão "Fechar".

## Tarefa

### Parte A — Backend

#### A1. Dados de inativação no `Usuario` (migração)

- Novos campos:
  - `InativadoEm` (`DateTime?`);
  - `InativadoPorId` (`int?`, quem inativou);
  - `MotivoInativacao` (`string?`, máx. 300).
- `Desativar(int porUsuarioId, string motivo)` preenche os três. O motivo é obrigatório, com 5 a 300 caracteres depois do trim.
- `Ativar()` limpa os três.
- **Professor e Coordenador:** não quebrar o uso atual. Manter um `Desativar()` sem argumentos para eles, ou ajustar as chamadas sem mudar o comportamento.
- **Migração EF** com os três campos anuláveis. Os dados atuais não mudam.

#### A2. `PUT /Alunos/{id}`, só Admin

- **DTO novo `AtualizarAlunoAdminDto`, só com:**
  - `Nome` (obrigatório, até 150);
  - `Email` (obrigatório, `EmailAddress`);
  - `Telefone` (até 20, aceita vazio);
  - `Matricula` (RA; obrigatório, até 30).
- **Nenhum outro campo é aceito:** CPF, endereço, senha e `Ativo` **não** fazem parte do DTO. Se vierem no JSON, são ignorados.
- **Regras:**
  - **e-mail único** entre todos os usuários (comparação sem diferenciar maiúsculas). Conflito → 409 com "Este e-mail já está em uso.";
  - **RA único** entre alunos. Conflito → 409 com "Este RA já pertence a outro aluno.";
  - atualizar **sem tocar** em CPF e endereço: novo método no domínio, por exemplo `Usuario.AlterarDadosBasicos(nome, email, telefone)` + `aluno.Matricula = ra`. **Não** reaproveitar `AlterarDados` passando o endereço de volta.
- **Se o e-mail mudou:**
  - revogar **todos os refresh tokens** do aluno, com o método extraído do `AuthService`;
  - enviar e-mail para o **endereço antigo** e para o **novo**, assunto "Seu e-mail de acesso ao CodeRyse foi alterado". O corpo diz que o e-mail de login foi alterado pela administração, mostra o novo endereço mascarado (`a***@dominio.com`) e orienta a procurar a administração se não reconhecer a mudança;
  - **falha de envio não desfaz a edição.** Registrar no log e devolver `avisoEmailEnviado: false` na resposta, para a tela avisar.
- **Respostas:** 200 com o `AlunoResponseDto` atualizado; 404 se o aluno não existir; 403 para quem não é Admin.

#### A3. Inativar e reativar, só Admin

- **`POST /Alunos/{id}/inativar`**, com o corpo `{ "motivo": "..." }`:
  - valida o motivo (5–300);
  - aluno já inativo → 409 com "Este aluno já está inativo.";
  - chama `Desativar(adminId, motivo)` e **revoga todos os refresh tokens** do aluno;
  - 200 com o DTO.
- **`POST /Alunos/{id}/reativar`:**
  - aluno já ativo → 409;
  - chama `Ativar()`;
  - 200 com o DTO.
- O Admin não pode inativar a si mesmo. A rota é de alunos, então isso já não acontece, mas deixar o teste.

#### A4. Corte "na hora" (toda requisição confere se está ativo)

- Em `Program.cs`, `JwtBearerEvents.OnTokenValidated`: ler o id do usuário das claims e consultar **só** `Ativo` (`AsNoTracking`, `Select(u => u.Ativo)`).
  - Se estiver inativo ou não existir: `context.Fail("USUARIO_INATIVO")`, e a resposta 401 leva o corpo/cabeçalho `codigo: "USUARIO_INATIVO"` (via `OnChallenge`).
  - **Desempenho:** uma consulta leve por requisição autenticada é aceitável. Se quiser cache, que seja de no máximo 30 s e **invalidado** ao inativar ou reativar (`IMemoryCache` com uma chave por usuário).
- **Login de usuário inativado** (`InativadoEm` preenchido): mensagem **"Seu acesso foi inativado. Entre em contato com a administração."** Manter "pendente de liberação" só para quem nunca foi ativado (`InativadoEm` nulo).
- **`shared/apiClient.js`** (web e celular):
  - ao receber 401 com `USUARIO_INATIVO`, **não** tentar o refresh; limpar a sessão e levar ao login com essa mensagem;
  - o refresh negado para inativo cai no mesmo caminho.

#### A5. Expor a inativação

- `AlunoResponseDto` ganha:
  - `InativadoEm`;
  - `InativadoPorNome` (nome de quem inativou, ou vazio);
  - `MotivoInativacao`.
- Esses campos só são preenchidos quando quem pede é Admin. Para o Coordenador, ficam vazios.

### Parte B — Web (`SecaoAlunos.jsx`, só Admin)

#### B1. Modal "Detalhes do aluno"

- **Rodapé**, no lugar do "Fechar" vermelho de hoje:
  - **"Editar dados"** (secundário);
  - **"Inativar acesso"** (perigo) **ou** **"Reativar acesso"** (sucesso), conforme o status;
  - **"Fechar"** neutro.
- Para o **Coordenador**: só "Fechar", e nenhum dos botões novos.
- **Aluno inativo:** abaixo do perfil, um aviso vermelho suave: "Acesso inativado em DD/MM/AAAA por {nome}. Motivo: {motivo}".
- **RA:** passa a aparecer nos dados, como "RA".

#### B2. Editar dados (o mesmo modal em modo de edição, ou um modal próprio)

- **Campos editáveis:** Nome, E-mail, Telefone (com máscara) e RA.
- **Abaixo, só leitura:** CPF mascarado e Cidade/UF, com cadeado e a nota "Dados pessoais protegidos: não editáveis pela administração." Rua, número, bairro e CEP **não aparecem**.
- **Ao trocar o e-mail:** aviso inline antes de salvar, "O aluno será desconectado e receberá um aviso no e-mail antigo e no novo."
- **Salvar:**
  - chama `PUT /Alunos/{id}`;
  - erros 409 aparecem no campo certo;
  - sucesso dá toast "Dados do aluno atualizados." e atualiza a lista;
  - se `avisoEmailEnviado === false`, acrescenta "Não foi possível enviar o aviso por e-mail."

#### B3. Inativar e reativar

- **"Inativar acesso"** abre a confirmação:
  - título "Inativar acesso de {nome}?";
  - texto: "O aluno sai da plataforma imediatamente e não consegue entrar até ser reativado. Matrículas, progresso e certificados ficam guardados.";
  - campo **Motivo** obrigatório (5–300, com contador);
  - botões "Cancelar" e **"Inativar"** (perigo, desabilitado sem motivo válido).
- **"Reativar acesso"** abre a confirmação simples "Reativar o acesso de {nome}? Ele volta a entrar com o mesmo e-mail e senha."
- **Depois:** toast, insígnia Ativo/Inativo atualizada na tabela, e o filtro Ativos/Inativos de hoje continua funcionando.

**Não alterar:**
- o cadastro de aluno;
- o `AlunoResponseDto` para o Coordenador, além de A5;
- as matrículas, pagamentos, progresso e certificados do aluno inativado (nada é apagado);
- as telas de Professor e Coordenador;
- o celular, exceto o tratamento de `USUARIO_INATIVO` no `shared/apiClient.js`.

## Testes

### xUnit (backend)

- **`PUT /Alunos/{id}`:**
  - o Admin atualiza nome, e-mail, telefone e RA;
  - CPF e endereço **não mudam**, mesmo que venham no JSON;
  - Coordenador/Professor/Aluno recebem 403;
  - e-mail e RA duplicados dão 409;
  - trocar o e-mail revoga os refresh tokens e chama `EmailService` duas vezes (antigo e novo);
  - falha no envio mantém a edição e devolve `avisoEmailEnviado: false`.
- **Inativar:**
  - sem motivo ou com motivo curto dá 400;
  - com motivo, grava `InativadoEm`, `InativadoPorId` e `MotivoInativacao`, deixa `Ativo = false` e revoga os refresh tokens;
  - repetir dá 409.
- **Reativar:** limpa os três campos e deixa `Ativo = true`.
- **Corte na hora:** com um token de acesso ainda válido, depois de inativar, a próxima requisição recebe 401 com `USUARIO_INATIVO`.
- **Login:**
  - inativado recebe "Seu acesso foi inativado…";
  - nunca ativado continua recebendo "pendente de liberação".

### Vitest (web) e jest (celular)

- **`SecaoAlunos`:**
  - o Admin vê "Editar dados" e "Inativar acesso"; o Coordenador não vê;
  - "Inativar" fica desabilitado sem motivo;
  - o aluno inativo mostra o aviso com data, quem inativou e o motivo, e o botão "Reativar acesso";
  - a edição não mostra campos de endereço e mostra o CPF só leitura.
- **`shared/apiClient`:** 401 `USUARIO_INATIVO` não tenta o refresh e chama o fluxo de sessão expirada com a mensagem.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173), sem modo demo:

1. **Editar:**
   - Admin › Alunos › Detalhes de um aluno de teste › "Editar dados";
   - mudar o telefone e o RA e salvar: a lista atualiza;
   - o CPF aparece só leitura e o endereço não aparece.
2. **Trocar o e-mail** do aluno de teste:
   - aparece o aviso de desconexão;
   - depois de salvar, o aluno, logado em outra aba ou no celular, é desconectado ao renovar a sessão;
   - entra com o **e-mail novo** e a mesma senha;
   - o aviso por e-mail foi enviado (ou o toast avisa que não foi, quando não há SMTP configurado).
3. **Inativar** com um motivo:
   - na outra aba ou no celular, o aluno é desconectado **no próximo clique**;
   - ao tentar entrar, vê "Seu acesso foi inativado. Entre em contato com a administração.";
   - nos detalhes aparecem a data, quem inativou e o motivo.
4. **Reativar:** o aluno entra de novo e encontra os cursos, o progresso e os certificados intactos.
5. **Coordenador:** logado como Coordenador, vê os detalhes do aluno **sem** os botões de editar e inativar.
6. **Testes:** `dotnet test`, `npm test` (web e mobile) e os lints sem falhas novas.
