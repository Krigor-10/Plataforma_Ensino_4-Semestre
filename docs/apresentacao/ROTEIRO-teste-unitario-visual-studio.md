# Roteiro: mostrar um teste unitário no Visual Studio

## Antes da apresentação (uma vez)

1. Instalar o **Visual Studio 2026 Community** (gratuito), que é a versão com suporte ao .NET 10.
   - No instalador, marcar a carga de trabalho **"Desenvolvimento para ASP.NET e Web"**.
2. Abrir `E:\Projetos\Projetos\Projetos\Edtech\ConsoleApp3\Sistema Academico Integrado.sln`.
   - A solução tem 2 projetos: a API (`Sistema Academico Integrado`) e os testes (`PlataformaEnsino.Tests`).
3. Menu **Compilação › Compilar Solução** (Ctrl+Shift+B). Deve terminar sem erro.
4. Menu **Teste › Gerenciador de Testes** (Ctrl+E, T). Clicar em **Executar Todos** uma vez para conferir:
   todos ficam verdes (580 testes, cerca de 20 segundos).

## Na apresentação (cerca de 3 minutos)

### 1. Mostrar que o projeto tem testes
- No **Gerenciador de Soluções**, abrir `PlataformaEnsino.Tests`.
- Explicar: são testes com **xUnit**. Cada classe testa um serviço da API, como
  `AvaliacaoServiceTests` e `CursoServiceTests`. O banco é em memória (EF Core InMemory), então o teste
  não depende do SQL Server.

### 2. Abrir um teste fácil de explicar
- No Gerenciador de Testes, buscar: `CorrigeAutomaticamenteComNotaCheia`.
- Dar duplo clique para abrir o código (`AvaliacaoServiceTests.cs`). O teste é:
  `EnviarRespostasAlunoAsync_SoObjetivasComRespostaCorreta_CorrigeAutomaticamenteComNotaCheia`.
- Explicar as 3 partes (padrão **AAA**):
  - **Arrange (preparar):** cria professor, aluno, curso, matrícula e uma avaliação publicada; adiciona
    uma questão objetiva de 7 pontos com a alternativa A correta.
  - **Act (agir):** o aluno envia a resposta A (`EnviarRespostasAlunoAsync`).
  - **Assert (verificar):** a tentativa fica **Corrigida** e a nota é **10**, porque acertou tudo
    (a nota é a proporção de acertos na escala de 0 a 10).

### 3. Rodar o teste
- Clicar com o botão direito no teste › **Executar**. Fica verde (aprovado), com o tempo de execução.

### 4. Provar que o teste realmente testa (o que mais convence o professor)
- No código, trocar `Assert.Equal(10m, resultado.NotaBruta);` por `Assert.Equal(9m, resultado.NotaBruta);`.
- Executar de novo: fica **vermelho**. O painel mostra `Expected: 9  Actual: 10`.
- Desfazer (Ctrl+Z) e executar: volta a ficar verde.

### 5. (Opcional) Depurar o teste
- Pôr um ponto de interrupção (F9) na linha `var resultado = await service.EnviarRespostasAlunoAsync(...)`.
- Botão direito no teste › **Depurar**. O Visual Studio para na linha; com F10 se avança e passando
  o mouse em `resultado` se vê a nota e o status.

### 6. Fechar com o conjunto todo
- **Executar Todos** no Gerenciador de Testes: os 580 testes passam.
- Dizer que os mesmos testes rodam sozinhos no GitHub a cada envio de código (CI), e o deploy no Azure
  só acontece se todos passarem.

## Outros testes bons para mostrar
- `AtualizarAvaliacaoAsync_PublicarSemQuestoes_LancaInvalidOperationException`: regra de negócio
  "não dá para publicar quiz sem questão" (`Assert.ThrowsAsync`).
- `AdicionarQuestaoAsync_Dissertativa_EhRecusada`: a decisão de aceitar só questões objetivas.

## Se o Visual Studio não estiver disponível
No terminal, dentro da pasta do projeto:

```
dotnet test PlataformaEnsino.Tests --filter "FullyQualifiedName~CorrigeAutomaticamenteComNotaCheia" --logger "console;verbosity=detailed"
```

Ou abrir a pasta no VS Code com a extensão **C# Dev Kit** e usar o painel **Testing** (ícone de
frasco), que tem os mesmos botões de executar e depurar.
