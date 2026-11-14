# Assistente CodeRyse (chatbot de suporte) — ordem de execução

Todas as decisões foram fechadas com o usuário em 2026-11-14. Ver `../ANALISE-viabilidade-chatbot.md`.

## Arquivos de apoio (em `docs/chatbot/`)

| Arquivo | O que é |
|---|---|
| `ANALISE-viabilidade-chatbot.md` | Análise e todas as decisões |
| `BASE-conhecimento-suporte.md` | Base de conhecimento **aprovada** (v1), que vai para o modelo |
| `TESTE-perguntas-suporte.md` | 27 casos de teste e o critério de liberação |
| `chat-parte1/2/3-*.png` | Telas aprovadas (aluno no computador, aluno no celular, Chamados) |

## Ordem

| # | Prompt | O que entrega | Depende de |
|---|---|---|---|
| 1 | `FASE-1-backend-chatbot-e-chamados.md` | Assistente (Haiku 5.5, base em cache, ferramentas só de leitura, streaming), limites, chamados, guarda de 90 dias, teto de gasto | — |
| 2 | `FASE-2-web-chat-aluno-e-chamados.md` | Botão "?" e painel do aluno, Meus chamados, atalhos "Por quê?", tela de Chamados e cartão "Assistente" do Admin | Fase 1 |
| 3 | `FASE-3-mobile-chat-aluno.md` | Chat e Meus chamados no app mobile | Fases 1 e 2, com o chat validado no web |
| 4 | `FASE-4-painel-admin-e-base-editavel.md` | Base editável pelo Admin, painel de dúvidas, sugestões vindas dos chamados | Fases 1 e 2 em uso, com dados reais |

## Regras para todas as fases

- Cada fase começa com o **passo 0** de viabilidade: linha de base dos testes, conferir o código citado e **parar e relatar** se houver conflito com as decisões.
- **Liberar o chat aos alunos** só depois de passar no conjunto de teste: 100% nos grupos D e E e ≥ 90% no total.
- **A base de conhecimento aprovada não é alterada sem avisar o agente de arquitetura** (até a fase 4, quando o Admin passa a editar pela plataforma).
- Depois de cada fase, avisar o agente de arquitetura, para revisar e atualizar a planilha de permissões e os diagramas.

## Mensagem sugerida para o agente, fase a fase

```
Leia docs/chatbot/fases/LEIA-ME-ordem.md e aplique a Fase 1 (docs/chatbot/fases/FASE-1-backend-chatbot-e-chamados.md). Comece pelo passo 0 e me mostre o plano antes de implementar.
```
