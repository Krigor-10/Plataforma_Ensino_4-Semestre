# Projeto do Banco de Dados

Etapa 7 do PIM IV (disciplina Programação de banco de dados). Pede: modelo lógico, modelo físico, MER, procedures, triggers, script completo do banco usado por APIs/Web/Mobile.

## 7.1 Modelo Conceitual / MER

Já existente: `PIM 4°SEM/diagramaMER.html` e `PIM 4°SEM/diagramaConceitualAtualizado.html` (entidades, relacionamentos, cardinalidade).

## 7.2 Dicionário de Dados

Já existente: `PIM 4°SEM/dicionarioDados.html`.

## 7.3 Modelo Lógico / Físico

Já existente (visão lógica): `PIM 4°SEM/diagramaER.html`.

**Novo — modelo físico real**, gerado direto das migrations do EF Core (`dotnet ef migrations script --idempotent`), não digitado à mão — garante que reflete exatamente o schema que a API já usa, sem risco de divergência:

`PIM 4°SEM/script-banco-dados-completo.sql` — 28 tabelas, todas as constraints de chave primária/estrangeira e todo o histórico de alterações de coluna (idempotente: pode rodar em qualquer banco, em qualquer estado, sem duplicar nada).

## 7.4 Procedures e Triggers

**Novo:** `PIM 4°SEM/procedures-triggers.sql` — roda depois do script acima. Duas procedures e dois triggers, cada um com uma justificativa técnica real (não são "procedures de vitrine" — cada um resolve algo que faria sentido pedir numa banca):

| Objeto | O que faz | Por que no banco, não só em C# |
|---|---|---|
| `TR_Matricula_HistoricoStatus` (trigger) | Audita toda mudança de `Status` em `Matriculas` numa tabela nova, `HistoricoStatusMatricula` | Vale pra qualquer escrita na tabela, mesmo as que não passam pelo `MatriculaService` (correção manual, migração de dados) |
| `TR_Curso_ImpedeExclusaoComMatriculasAtivas` (trigger) | Bloqueia `DELETE` num `Curso` que ainda tem matrícula aprovada | Última linha de defesa contra perda de histórico acadêmico, mesmo se a camada de serviço tiver um bug |
| `sp_DesempenhoPorTurma` (procedure) | Agregação de desempenho (total de matrículas, aprovados, média, % de aprovação) por turma | Evita puxar linha a linha via EF Core só pra agregar — usado pelos dashboards de Coordenador/Professor |
| `sp_RegistrarTentativaAvaliacao` (procedure) | Inicia uma nova tentativa de avaliação de forma atômica (transação com `UPDLOCK`/`HOLDLOCK`) | Fecha uma corrida real: dois cliques quase simultâneos (web + mobile abertos ao mesmo tempo) podem passar os dois pela checagem de "tentativas restantes" em C# antes que qualquer um grave — o lock no banco impede isso, checagem em C# sozinha não impede |

**Nota de arquitetura:** o projeto deliberadamente mantém a regra de negócio principal em C# (`Services/`), não em SQL — é assim que o `CLAUDE.md` descreve a arquitetura em camadas, e é o que sustenta a Etapa 6. As procedures/triggers acima não duplicam essa lógica; cobrem só os dois casos onde o banco resolve algo que a aplicação sozinha não resolve bem: auditoria à prova de escrita direta, e concorrência.

## 7.5 Script Completo do Banco de Dados

Ordem de execução, do zero:
1. `PIM 4°SEM/script-banco-dados-completo.sql` — cria as 28 tabelas
2. `PIM 4°SEM/procedures-triggers.sql` — cria a tabela de auditoria, os 2 triggers e as 2 procedures

Esse é o mesmo schema usado pela API (.NET), que serve Web, Mobile e Desktop — não é uma cópia paralela, é gerado da mesma fonte (`Migrations/`) que roda em produção.

**Testado de ponta a ponta em 2026-09-23** contra uma instância real do LocalDB (banco descartável, apagado depois do teste):
- `script-banco-dados-completo.sql` criou as 27 tabelas do domínio sem nenhum erro.
- `procedures-triggers.sql` aplicou a tabela de auditoria, os 2 triggers e as 2 procedures sem erro.
- Teste funcional: `UPDATE` de status de matrícula gerou registro correto em `HistoricoStatusMatricula`; `DELETE` de curso com matrícula aprovada foi bloqueado pelo trigger com a mensagem esperada; `sp_DesempenhoPorTurma` retornou os números certos (1 matrícula, 1 aprovada, média 8.5, 100% de aprovação); `sp_RegistrarTentativaAvaliacao` criou as 2 tentativas permitidas e bloqueou corretamente a 3ª.

(Nota técnica: a primeira versão gerada com `dotnet ef migrations script --idempotent` tinha um erro de "Invalid column name" — bug conhecido do gerador idempotente do EF Core, que agrupa múltiplos comandos no mesmo batch sem `GO` entre eles, causando resolução de nome adiada incorreta no SQL Server. Confirmei que as migrations em si estão corretas rodando `dotnet ef database update` direto, depois regerei o script sem `--idempotent` e inseri `GO` entre cada statement — aí sim rodou limpo.)
