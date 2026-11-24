# Coordenador — ordem de execução dos prompts

O prompt `../PROMPT-agente-coordenador-situacao-e-revisao-conteudo.md` foi **dividido em 3 partes independentes**, a pedido do usuário. Cada parte cabe num commit e pode ser validada sozinha. As imagens aprovadas ficam em `../coordenador-parte1/2/3-*.png`.

## Ordem recomendada

| # | Prompt | O que faz | Tamanho |
|---|---|---|---|
| 0 | `../../fluxo-venda-cursos/PROMPT-agente-confirmacao-encerrar-curso.md` | Janela de confirmação com aviso ao Encerrar e Reabrir | Pequeno (só web) |
| 1 | `PARTE-1-grade-situacao-coordenador.md` | Grade do Coordenador: abas Ativos/Encerrados, "Aguardando você", cadeado, sem Média e sem "Coordenado" | Pequeno (só web) |
| 2 | `PARTE-2-edicao-curso-so-admin.md` | Editar título e descrição só pelo Admin | Pequeno (backend + web) |
| 3 | `PARTE-3-revisao-conteudo-coordenador.md` | "Ver conteúdo", só leitura com gabarito, para o Coordenador | Grande (backend + web) |

- **Partes 1 e 2:** são independentes; podem ir em qualquer ordem.
- **Parte 3:** deve vir **depois do item 0**, porque acrescenta o link "Revisar conteúdo antes de encerrar" na janela de confirmação.
- **Validação:** depois de cada parte, rodar os testes e conferir no app real antes de mandar a próxima.
- **Ao final das três:** avisar o agente de arquitetura para atualizar a planilha de permissões e os casos de uso do Coordenador.
