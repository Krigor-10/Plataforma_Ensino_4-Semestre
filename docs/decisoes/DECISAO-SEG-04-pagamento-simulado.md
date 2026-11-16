# Decisão SEG-04: pagamento simulado é definitivo

**Data:** 2026-11-16
**Situação:** DECIDIDO pelo dono do projeto.

## Contexto

Na auditoria de produção (20 e 21/10), o item SEG-04 apontou que a confirmação de pagamento é feita pelo próprio aluno:
- `POST /Pagamentos/{matriculaId}/confirmar` (`PagamentosController.ConfirmarPagamento` → `PagamentoService.ConfirmarPagamentoAsync`, que confere se a matrícula é do aluno);
- não há gateway de pagamento real por trás.

Na auditoria, isso foi aceito como simulação acadêmica, mas a decisão ficou em aberto: manter assim de vez ou integrar um gateway real.

## Decisão

**O pagamento simulado é a solução definitiva do CodeRyse Academy.** O projeto é acadêmico (PIM, UNIP) e não processa dinheiro real. **Nenhum gateway será integrado.**

## Consequências

- O SEG-04 deixa de ser pendência e passa a ser **risco aceito**, documentado aqui.
- A tela de compra **precisa continuar** deixando claro que é simulação. Hoje, `frontend/src/components/ConfirmacaoCompraModal.jsx` mostra "Pagamento simulado — ambiente acadêmico, nenhuma cobrança real é feita." Essa frase não deve ser removida.
- Nenhum dado de cartão, conta ou documento de pagamento é pedido ou guardado. Isso deve continuar assim.
- **Se um dia o sistema for usado com dinheiro real**, esta decisão precisa ser revista antes, com:
  - gateway com confirmação pelo servidor (webhook), nunca pelo aluno;
  - revisão de segurança do fluxo de compra.
