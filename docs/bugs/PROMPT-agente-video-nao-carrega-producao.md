# Prompt: vídeo de conteúdo não carrega em produção (aluno e professor) + tirar o selo "Somente leitura" do vídeo

## Relato do usuário (2026-11-25, testando **em produção**, Azure)

1. O professor postou um **vídeo** como conteúdo. Ao abrir a janela do item, **como aluno e também como professor**, o player aparece em **0:00** e o vídeo **não carrega**.
2. "Remover essa tag para conteúdo de vídeo": é o selo **"Somente leitura"** no cabeçalho da janela.

## Diagnóstico (verificado pelo agente de arquitetura)

### Causa do vídeo: o servidor não entrega o arquivo em pedaços (sem `Range`) e sem tamanho

**Teste feito em produção** com um arquivo **público** (capa de curso, `/uploads/cursos/...jpg`):

```
GET  (sem Range)            → HTTP/1.1 200 OK, Content-Type: image/jpeg   (sem Content-Length, sem Accept-Ranges)
GET  Range: bytes=0-99      → HTTP/1.1 200 OK                              (ignora o Range; deveria ser 206 Partial Content)
```

O mesmo endpoint serve os vídeos (`/uploads/conteudos/...`). O player de vídeo do navegador e o `expo-video` do celular dependem de **`Range` / 206 + `Content-Length`** para:
- ler a duração e os metadados (no MP4, o bloco `moov` costuma ficar no **fim** do arquivo);
- avançar e voltar no vídeo.

Sem isso, o player fica parado em 0:00. No Safari/iPhone, ele **sempre** falha.

**Onde está no código:**
- `Program.cs` ≈ linha 452: `app.MapGet("/uploads/{subpasta}/{nomeArquivo}", ...)` termina em `Results.Stream(arquivo.Conteudo, arquivo.ContentType)`, **sem `enableRangeProcessing`**, sem tamanho, sem `lastModified`/`ETag`.
- **Produção usa Blob** (`AzureStorage:ConnectionString`, `Program.cs` ≈ linha 131). `Services/ArmazenamentoArquivoBlobService.cs` ≈ linha 51 usa `blobCliente.DownloadStreamingAsync()`. Isso devolve um stream de rede **não navegável (não seekable)** com o arquivo inteiro, então mesmo ligando o range não funcionaria.
- `Services/ArmazenamentoArquivoLocalService.cs` ≈ linha 44 (desenvolvimento) devolve um `FileStream` (navegável), mas também sem range no `Results.Stream`.
- `ArquivoArmazenado` só tem `(Conteudo, ContentType)`.
- **Front:**
  - web: `components/JanelaPreviaItem.jsx` ≈ linha 39, `<video src={linkArquivo}>`, com `linkArquivo` montado por `resolverUrlArquivo` (`lib/api.js` ≈ linha 72, que põe `?access_token=` na URL). Isso está certo e não precisa mudar;
  - celular: `mobile/src/components/VisualizadorConteudo.jsx`, com `useVideoPlayer` / `VideoView` do `expo-video`, usa a mesma URL.

### Selo "Somente leitura"

- `components/JanelaPreviaItem.jsx` ≈ linha 198: `<Insignia texto={somenteLeitura ? "Somente leitura" : publicado ? "Publicado" : "Rascunho"} />`, que aparece para todos os tipos de material.

## Tarefa

### 1. Suporte a `Range` (206) no endpoint de uploads, para Blob e disco local

- **`ArquivoArmazenado`** ganha `Tamanho` (`long?`), `UltimaModificacao` (`DateTimeOffset?`) e `ETag` (`string?`).
- **Blob:** trocar `DownloadStreamingAsync()` por **`blobCliente.OpenReadAsync()`**, que é navegável e tem `Length`. Ler as propriedades do blob (`GetPropertiesAsync`: `ContentLength`, `LastModified`, `ETag`, `ContentType`) e preencher o `ArquivoArmazenado`.
  - Se `OpenReadAsync` tiver custo alto para imagens pequenas, pode usar só para tipos de mídia. Mas o mais simples e correto é usar sempre.
- **Local:** o `FileStream` já é navegável. Preencher o tamanho e a data a partir do `FileInfo`.
- **`Program.cs`, no `MapGet` de uploads:**
  - `Results.Stream(arquivo.Conteudo, arquivo.ContentType, lastModified: arquivo.UltimaModificacao, entityTag: ETag, enableRangeProcessing: true)`;
  - com isso, o ASP.NET responde `Accept-Ranges: bytes`, `Content-Length` e **206** com `Content-Range` quando há `Range`.
  - **Manter** as checagens de autorização de Aluno e Coordenador, que vêm antes, sem mudança.
- **`Content-Type` do vídeo:** confirmar que `.mp4` sai como `video/mp4`, `.webm` como `video/webm` e `.mov` como `video/quicktime`. O `ResolverContentType` já usa o `FileExtensionContentTypeProvider`. Conferir também os blobs já enviados (o upload grava o `ContentType`).

### 2. Token de acesso expirando no meio do vídeo

- O vídeo usa `?access_token=` (token de 20 min). Com range, cada avanço ou volta faz uma nova requisição com a **mesma URL**. Depois de 20 min com a janela aberta, as próximas partes dariam 401.
- **Correção mínima:**
  - recalcular a URL (`resolverUrlArquivo`) quando o player der erro de carregamento e tentar **uma vez** de novo, mantendo a posição (`currentTime`), no `<video>` da `JanelaPreviaItem`;
  - no celular, fazer o mesmo no `VisualizadorConteudo`.
- **Não** aumentar a validade do token.

### 3. Formato do vídeo (orientação ao professor)

- O `.mov` de iPhone costuma vir em **HEVC**, que o Chrome e o Android não tocam.
- No **upload de vídeo** (formulário do professor), acrescentar a dica "Use MP4 (H.264) para tocar em todos os navegadores e celulares."
- **Não** bloquear `.mov` agora. Só orientar.

### 4. Tirar o selo "Somente leitura" do vídeo

- Na `JanelaPreviaItem`, **não** renderizar a `Insignia` "Somente leitura" quando o item for **vídeo** (`tipoConteudo === 3`).
- Os outros tipos e os selos "Publicado" / "Rascunho" (professor editando) continuam como hoje. O teste do `PainelCursoGestao` que espera "Somente leitura" num material que não é vídeo continua passando.

**Não alterar:**
- as regras de quem pode baixar cada arquivo (`IUploadAutorizacaoService`);
- `/uploads/cursos` público;
- o upload (limites de tamanho, extensões);
- o resto da janela.

## Testes

### xUnit / integração (backend)

- **Local:**
  - `GET /uploads/conteudos/{video}.mp4` com `Range: bytes=0-99` → **206**, `Content-Range: bytes 0-99/{tamanho}`, `Content-Length: 100`, `Accept-Ranges: bytes`;
  - sem `Range` → 200 com `Content-Length`.
- **Blob:** com um fake ou Azurite, se o projeto já tiver; senão, um teste de unidade do `ArmazenamentoArquivoBlobService` garantindo que devolve um stream navegável (`CanSeek == true`) e o `Tamanho` preenchido.
- **Autorização:** a de Aluno e a de Coordenador continuam passando, sem mudança.

### Vitest

- A `JanelaPreviaItem` com um vídeo e `somenteLeitura` **não** mostra "Somente leitura"; com um PDF ou imagem, mostra.

## Critérios de aceite

1. **Antes do deploy, em desenvolvimento:**
   - `curl -I -H "Range: bytes=0-99" http://127.0.0.1:5000/uploads/cursos/<arquivo>` responde **206** com `Content-Range`;
   - um vídeo MP4 enviado como conteúdo toca, avança e volta na janela (professor e aluno).
2. **Depois do deploy, em produção:**
   - o mesmo `curl` contra `https://app-coderyse-academy.azurewebsites.net/uploads/cursos/<capa>.jpg` responde **206**;
   - o vídeo que o professor postou **toca** para o professor e para um aluno matriculado, no navegador **e** no app do celular (Android e iPhone).
3. **Tempo:** com a janela do vídeo aberta por mais de 20 min, avançar o vídeo continua funcionando, porque a URL é renovada depois do erro.
4. **Selo:** a janela do vídeo não mostra mais "Somente leitura"; PDF e imagem continuam mostrando.
5. **Testes:** `dotnet test` e `npm test` (web e mobile) sem falhas novas.

**Se o vídeo continuar sem tocar depois disso:** verificar o arquivo (extensão e codec). Um `.mov` HEVC não toca no Chrome nem no Android. Reenviar em MP4/H.264 confirma.
