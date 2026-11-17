# Prompt: Inscrições v3 — abas Alunos/Vendas, pagamento cancelado (desistência + vencimento em 3 dias), clique só no botão

## Contexto e decisões do usuário (2026-11-17)

A v2 e as correções da v2 já foram aplicadas (working tree, ainda **sem commit**). Revisando a tela no app, o usuário pediu:

1. **Clique:** hoje qualquer área da linha da tabela abre o curso. Ele quer **só o botão "Ver curso"** clicável.
2. **Seta:** o botão "Ver curso" continua **sem a seta**.
   - Causa verificada pelo agente de arquitetura no app real: o `TbArrowRight` existe no DOM, mas fica com **0,8px de largura**. A última coluna é estreita e o svg encolhe (flex-shrink) dentro do botão.
3. **Vendas:** como gestor, o Admin precisa de números de vendas. O usuário escolheu, uma decisão por vez:
   - **Recebido**, **A receber** (com quantos alunos), **Cancelados** e **Conversão**;
   - **não** quer ticket médio;
   - **não** quer lista de pendentes;
   - lugar: **opção B, abas "Alunos" e "Vendas"** (imagem `docs/inscricoes/opcoes-vendas.png`). As abas trocam **só os 4 números do topo**; **a tabela continua igual** nas duas abas.
4. **Linha de total:** **sair** a linha "Total · N cursos" do fim da tabela, porque repete os números do topo.
5. **Cancelados:** hoje **nenhum pagamento é cancelado**. `Pagamento.Cancelar()` existe (`Models/Pagamento.cs` ≈ linha 61), mas **nada o chama**, e quem não paga fica pendente para sempre. O usuário decidiu **os dois caminhos**:
   - **o aluno pode desistir** da compra;
   - **um pagamento pendente há mais de 3 dias vence sozinho** e vira Cancelado.

## Onde está (verificado pelo agente de arquitetura)

- **Tela do Admin:** `frontend/src/pages/workspace/SecaoMatriculas.jsx`, `VistaGestorMatriculas`.
  - Tabela: `<tr>` com `onClick={() => abrirCurso(...)}`, `onKeyDown={aoPressionarTeclaNaLinha}` e `tabIndex={0}` (≈ linhas 784–787). Cartões do celular: o mesmo (≈ linhas 872–874). O `tr` tem `cursor: pointer`.
  - Botão: `Botao` com `className="inscricoes-botao-ver-curso"` e `TbArrowRight` (≈ linhas 814–820 e 918–924). CSS em `styles/workspace.css` ≈ linha 6000.
  - KPIs: 5 cartões (`inscricoes-kpis` / `inscricoes-kpi`). O 5º é a receita com o selo "Simulada" e pendentes.
- **Backend da tela:** `Services/CursoInscricoesService.cs` e `DTOs/CursoInscricoesResponseDto.cs`.
  - As matrículas são filtradas por `Status == Aprovada` e pelo período em `DataSolicitacao`; a receita, por `PagoEm`.
  - Hoje o DTO tem `Pendentes` (quantidade) e `Receita`. Não tem valor a receber, cancelados nem dados para a conversão.
- **Compra:** `Services/MatriculaService.cs` → `ComprarCursoAsync` (≈ linha 71).
  - Se já existe matrícula Aprovada: pega o pagamento **Pendente** e confirma. **Se não houver Pendente, lança "Você já tem este curso."**
  - Com a mudança, uma matrícula Aprovada pode ter só pagamentos Cancelados, e então o aluno precisa poder comprar de novo.
- **Confirmar pagamento:** `PagamentoService.ConfirmarPagamentoAsync` e `POST /Pagamentos/{matriculaId}/confirmar`.
- **Acesso ao curso:** `IAcessoAcademicoService.TemAcessoLiberadoAsync` (acesso = gratuito ou pagamento Pago).
- **Serviços em segundo plano:** já existem `RefreshTokenCleanupService` e `ChatbotExpurgoService` (`BackgroundService`, registrados em `Program.cs` ≈ linha 157). Seguir o mesmo padrão, incluindo um executor testável separado, como `ChatbotExpurgoExecutor`.
- **"Concluir compra" para o aluno:**
  - web: `CartaoCursoMatricula` em `SecaoMatriculas.jsx` (`onConcluirCompra`);
  - celular: `mobile/src/components/ConfirmacaoCompraSheet.jsx` e as telas que o abrem (`CatalogoScreen.jsx` e `ConteudosScreen.jsx`).

## Tarefa

### Backend

1. **O aluno desiste da compra:** `POST /Pagamentos/{matriculaId}/cancelar`, só para o perfil **Aluno**.
   - Só vale para a matrícula do próprio aluno e só se houver pagamento **Pendente**. Nos outros casos: 404 para matrícula de outro aluno; 409 se não houver pendente.
   - Chama `Pagamento.Cancelar()`. A matrícula continua como está.
2. **Vencimento automático:** criar `PagamentoVencimentoService` (`BackgroundService`, roda a cada 1 hora) com um executor testável.
   - Cancela todo pagamento **Pendente** com `CriadoEm` há mais de **3 dias**.
   - O prazo vem da configuração `Pagamentos:DiasParaVencer`, com padrão **3**, em `appsettings.json` / `appsettings.example.json`.
   - Registrar no log quantos pagamentos venceram.
3. **Comprar de novo depois de cancelado:** em `ComprarCursoAsync`, se a matrícula Aprovada não tem pagamento Pago nem Pendente (só Cancelados), criar um **novo** `Pagamento.CriarPendente(matricula.Id, preçoAtual)` e seguir o fluxo normal.
   - "Você já tem este curso." continua só para quem tem pagamento **Pago**.
   - O acesso continua liberado só com pagamento Pago.
4. **Prazo para pagar:** em `GET /Pagamentos/aluno` (e onde o aluno vê o pagamento pendente), devolver `venceEm` = `CriadoEm + DiasParaVencer`, para a tela mostrar "Pague até DD/MM".
5. **`GET /Cursos/inscricoes`:** acrescentar por curso:
   - `aReceber`: soma de `Valor` dos pagamentos **Pendentes**;
   - `cancelados` e `valorCancelado`: quantidade e soma dos pagamentos **Cancelados**;
   - `tentativasCompra`: matrículas de curso pago com pelo menos um pagamento, de qualquer status;
   - `compraram`: dessas, as que têm pagamento **Pago**.
   - **Período:** igual a `Pendentes`, ou seja, pela `DataSolicitacao` da matrícula. A receita continua por `PagoEm`.
   - Calcular nas mesmas consultas agrupadas, sem N+1.
6. **Testes:**
   - cancelar (dono, outro aluno, sem pendente);
   - vencimento (2 dias não vence, 4 dias vence, Pago não é tocado);
   - comprar de novo depois de cancelado;
   - os campos novos de `inscricoes`, com período.

### Frontend web — tela Inscrições (Admin)

7. **Clique só no botão:**
   - tirar `onClick`, `onKeyDown`, `tabIndex` e `cursor: pointer` das linhas da tabela e dos cartões do celular, e remover `aoPressionarTeclaNaLinha` se ficar sem uso;
   - o hover da linha pode continuar só como destaque visual, sem cursor de mão;
   - **só "Ver curso"** abre `/app/cursos/:id`.
8. **Seta visível:**
   - `.inscricoes-botao-ver-curso`: `white-space: nowrap` e `width: max-content`;
   - o svg: `flex-shrink: 0`;
   - a última coluna: `width: 1%` com `white-space: nowrap`, ou `min-width` suficiente para o botão inteiro;
   - conferir que o svg fica com **16px** de largura na tabela e no celular.
9. **Tirar a linha de total** do fim da tabela (e o CSS dela). A paginação continua.
10. **Abas "Alunos" e "Vendas"**, logo abaixo do cabeçalho (o cartão roxo "26 cursos" não muda), acima dos KPIs, como na opção B da imagem:
    - `role="tablist"`, `aria-selected`, setas do teclado e sublinhado roxo na aba ativa;
    - começa em **Alunos**;
    - a aba Vendas mostra um contador "N pendentes" quando N > 0.
    - A grade de KPIs passa a ter **4 colunas** (3 até 1200px; 2 até 768px). As abas trocam **só os 4 KPIs**; a tabela, os filtros e a paginação não mudam.
    - **Alunos:** Inscrições, Começaram ("N% das inscrições"), Concluíram ("N% das inscrições") e Certificados emitidos, como hoje.
    - **Vendas** (selo "Simulado" ao lado do nome da aba):
      - **Recebido**, em verde: soma de `receita`; embaixo, "N pagamentos" (soma de `compraram`);
      - **A receber**, em âmbar: soma de `aReceber`; embaixo, "N alunos pendentes" (soma de `pendentes`), no singular quando for 1;
      - **Cancelados**, em vermelho: soma de `cancelados`; embaixo, a soma de `valorCancelado` em R$;
      - **Conversão**, em roxo: `compraram ÷ tentativasCompra` em %; embaixo, "N de M pagaram". Sem tentativas, mostrar "—".
    - O antigo 5º KPI (receita com "Simulada" e pendentes) **sai**, porque virou Recebido e A receber.
    - Os números das duas abas respeitam o chip de modalidade e o período, como os de hoje.

### Aluno — desistir e prazo (web e celular)

11. Onde aparece **"Concluir compra"** (web: `CartaoCursoMatricula`; celular: `ConfirmacaoCompraSheet` e os cartões que a abrem):
    - mostrar **"Pague até DD/MM"** (de `venceEm`);
    - acrescentar o botão secundário **"Desistir da compra"**. Ele pede confirmação na própria tela ("Desistir da compra de {curso}? Você pode comprar de novo depois.") e chama `POST /Pagamentos/{matriculaId}/cancelar`;
    - depois de desistir ou de vencer, o curso volta a mostrar **"Comprar"**, e a compra funciona de novo (item 3).

**Não alterar:**
- o cartão roxo "Total de cursos";
- os filtros em relevo;
- as colunas da tabela (Pendentes e Receita continuam);
- o Dashboard;
- as regras de acesso, além do que está acima.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), **sem modo demo**:

- **Admin, clique:** clicar no nome, no preço ou em qualquer célula **não** abre o curso; só "Ver curso" abre. A linha não mostra cursor de mão.
- **Admin, seta:** "Ver curso →" mostra a seta inteira (16px) na tabela e no celular.
- **Admin, total:** a linha "Total · 26 cursos" não aparece mais.
- **Admin, abas:**
  - "Alunos" mostra os 4 números acadêmicos;
  - "Vendas" mostra Recebido (R$ 10.235,00 hoje), A receber, Cancelados e Conversão;
  - a tabela é a mesma nas duas;
  - o chip "Gratuito" zera Vendas, e a Conversão fica "—".
- **Aluno, desistir:**
  - um aluno clica em comprar e não confirma → vê "Pague até DD/MM" e "Desistir da compra";
  - ao desistir, o curso volta a mostrar "Comprar";
  - no Admin, "Cancelados" sobe 1, "A receber" desce, e a coluna Pendentes da tabela desce.
- **Comprar de novo:** o mesmo aluno compra outra vez e confirma → ganha acesso, e no Admin "Recebido" sobe.
- **Vencimento:** um pagamento pendente com `CriadoEm` de 4 dias atrás vira Cancelado na próxima rodada do serviço (testar pelo executor ou ajustando a data no banco de desenvolvimento).
- **Testes:**
  - backend: itens 1 a 5;
  - vitest: sem clique na linha, abas (troca, teclado, contador), KPIs de Vendas (conversão "—", singular e plural), sem linha de total, botão "Desistir da compra" com confirmação;
  - mobile: desistir e "Pague até".
- `dotnet test`, `npm run lint` e `npm test` (web e mobile) sem erros novos.
