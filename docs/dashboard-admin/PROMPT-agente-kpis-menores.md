# Prompt: Dashboard do Admin: KPIs menores, os 6 numa linha só (só frontend web)

## Pedido do usuário (print de 2026-11-16)

Diminuir os KPIs do Dashboard do Admin. Hoje:
- os cartões são grandes, com ≈ 230 × 106px;
- a grade `auto-fit, minmax(230px, 1fr)` cabe 5 por linha, e o 6º ("Cursos encerrados aguardando você") **cai sozinho numa segunda linha**, com um vão vazio ao lado.

A imagem aprovada pelo usuário está em `docs/dashboard-admin/kpis-menores.png`.

## Onde está (verificado pelo agente de arquitetura)

- `pages/workspace/DashboardAdmin.jsx` ≈ linha 124: `<div className="grade-estatisticas">` com 6 `CartaoEstatistica`.
- `styles/layout.css`:
  - ≈ linha 314: `.grade-estatisticas`;
  - ≈ linhas 320–398: `.cartao-estatistica`, `__icone svg` com 30px, `__valor` com `clamp(1rem, 1.6vw, 1.75rem)` e `__rotulo` com 0.82rem;
  - ≈ linha 684: `@media (max-width: 768px)`, que já põe 2 por linha no celular.
- Já existe uma versão compacta só para outra tela, em `styles/workspace.css` ≈ linha 4092 (`.atividades-curso__kpis-compactos`). O tamanho é o mesmo que deve ser usado aqui.

## Tarefa

1. **Só no Dashboard do Admin**, adicionar um modificador na grade, por exemplo `grade-estatisticas grade-estatisticas--compacta-6`. **Não mudar** `.grade-estatisticas` nem `.cartao-estatistica` base: o componente é usado em várias outras telas.
2. CSS do modificador:
   - **Grade:** `grid-template-columns: repeat(6, minmax(0, 1fr))` e `gap: 0.875rem`;
   - **até 1200px:** `repeat(3, minmax(0, 1fr))`, ou seja, 2 linhas de 3;
   - **até 768px:** 2 por linha, como já acontece hoje.
   - **Cartão:** `padding: 0.75rem 1rem`, `gap: 0.75rem` e `border-top-width: 2px`;
   - **Ícone:** svg com 22px;
   - **Valor:** `font-size: 1.35rem`;
   - **Rótulo:** `font-size: 0.75rem` e `line-height: 1.3`. Pode quebrar em 2 linhas, e "Cursos encerrados aguardando você" quebra mesmo, sem cortar com reticências;
   - todos os cartões da linha ficam com a **mesma altura**, porque o grid já faz stretch. Altura alvo ≈ 80px.
3. O cartão clicável ("Cursos encerrados aguardando você", `cartao-estatistica--acionavel`) continua clicável, com o mesmo foco e hover.

**Não alterar:**
- os números, os rótulos, as cores e os ícones;
- a ordem dos cartões;
- o Acesso rápido e os gráficos;
- os KPIs das outras telas (Coordenador, Professor, Aluno, Progresso e Módulos).

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), **sem modo demo**, logado como **Admin**:

- **1920px:** os 6 cartões ficam numa linha só, com a mesma altura (≈ 80px) e sem texto cortado. "Cursos encerrados aguardando você" aparece em 2 linhas.
- **≈ 1100px:** 2 linhas de 3.
- **≈ 390px:** 2 por linha, como hoje.
- Clicar em "Cursos encerrados aguardando você" continua indo para Cursos.
- Os Dashboards do Coordenador e do Professor e a tela de Progresso ficam **idênticos** ao que são hoje.
- `npm run lint` e `npm test` sem erros novos.
