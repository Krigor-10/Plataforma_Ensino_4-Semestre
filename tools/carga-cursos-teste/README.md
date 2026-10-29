# Carga dos cursos de teste

Script que lê `docs/teste-usabilidade/cursos/cursos.json` e cria os 3 cursos de teste pela API pública (`/api/v1/...`), como Admin (curso/capa/turma) e Professor (aulas/quizzes/avaliação final). Veja `docs/teste-usabilidade/PROMPT-agente-carga-cursos-teste.md` para o contexto completo.

Node puro, sem dependência nova (usa `fetch`/`FormData` nativos do Node 20+).

## Como rodar

### 1. Pegar os tokens

Faça login como Admin e como Professor e pegue o `token` de cada resposta:

```bash
curl -X POST <API_URL>/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"<email-admin>","senha":"<senha>"}'
curl -X POST <API_URL>/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"<email-professor>","senha":"<senha>"}'
```

O `CARGA_PROFESSOR_ID` é o campo `usuario.id` da resposta de login do professor.

### 2. Definir as variáveis de ambiente

```bash
export CARGA_API_URL="http://127.0.0.1:5000"        # ou a URL de produção
export CARGA_TOKEN_ADMIN="<token do admin>"
export CARGA_TOKEN_PROFESSOR="<token do professor>"
export CARGA_PROFESSOR_ID="<id do professor>"
```

No PowerShell: `$env:CARGA_API_URL = "..."` (idem para as outras).

**Nunca** coloque os tokens em arquivo versionado — só variável de ambiente, na sessão do terminal.

### 3. Rodar

```bash
cd tools/carga-cursos-teste

# So lista o que faria, sem criar nada (padrao)
node carregar.js

# Cria de verdade
node carregar.js --aplicar

# So um curso (chaves: gratis-ia, pago-eng-software, acompanhado-redes)
node carregar.js --aplicar --curso gratis-ia
```

É **idempotente**: rodar de novo (mesmo com `--aplicar`) reaproveita tudo que já existe (por título) e só completa o que faltou. Se a carga cair no meio, é seguro rodar de novo.

## Rodando em produção

1. Crie a conta do Professor em produção (ou use uma já existente) e pegue o id dela.
2. Faça login como Admin e como esse Professor em produção pra pegar os tokens (passo 1 acima, trocando `<API_URL>` pela URL de produção).
3. Exporte as variáveis de ambiente (passo 2) apontando `CARGA_API_URL` pra produção.
4. Rode primeiro **sem** `--aplicar` (dry-run) pra conferir o que seria criado.
5. Rode com `--aplicar`.

**Nunca rode isso contra produção sem antes validar no ambiente local.**

## Observação sobre turma

O backend (`TurmaService.CriarTurmaAsync`) só permite **uma turma por curso** ("turma padrão") e **sempre gera o próprio nome da turma** a partir do título do curso — o campo `turma.nomeTurma` do `cursos.json` é só documentação, não é o nome que a turma efetivamente recebe.
