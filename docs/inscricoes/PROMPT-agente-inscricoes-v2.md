# Prompt: tela Inscrições do Admin, versão 2 (KPI de total de cursos, visual da sugestão, colunas separadas, paginação)

## Contexto e decisões do usuário (2026-11-17)

A primeira versão da tela foi aplicada no commit `ca9cf05`. Depois disso, o usuário pediu:
- ajustar detalhes, espaçamentos e bordas;
- um KPI de **total de cursos na plataforma** que **se destaque** dos demais;
- seguir a sugestão de tela que ele mandou (`docs/inscricoes/sugestao-usuario-inscricoes.webp`).

**Imagem aprovada:** `docs/inscricoes/inscricoes-v2-proposta.png`. Para comparação, existem também `aplicada-2026-11-16.png` (como está hoje) e `opcoes-kpi-total-cursos.png` (as opções de lugar do KPI).

**Decisões, uma a uma:**
1. As colunas **Preço** e **Pendentes** ficam, mesmo não estando na sugestão.
2. As colunas **Modalidade** e **Situação** da sugestão **não** entram: essa informação fica só nos selos embaixo do nome do curso.
3. O funil vira **colunas separadas**: Iniciaram, Concluíram e Certificados. A barra única de 4 cores e a legenda saem.
4. O KPI **Total de cursos** fica no **canto direito do cabeçalho**, em roxo cheio (opção A).
5. **Paginação de 10 cursos por página.**

**Decisões do agente de arquitetura, aceitas na aprovação da imagem:**
- O botão extra de filtros da sugestão (ícone de ajustes) **não** entra, porque não há outros filtros para ele abrir.
- Os KPIs desta tela ficam no tamanho **maior** da sugestão. **Não** usar o modificador compacto do Dashboard.

## Onde está (verificado pelo agente de arquitetura)

- **Tela:** `frontend/src/pages/workspace/SecaoMatriculas.jsx`, em `VistaGestorMatriculas` (≈ linha 506).
  - Os KPIs hoje usam `grade-estatisticas grade-estatisticas--compacta-5` (≈ linha 588).
  - Funções da barra do funil: `textoFunilInscricoes`, `BarraFunilInscricoes` e `LegendaFunilInscricoes` (≈ linhas 436–486).
  - Selos: `BadgesCursoInscricoes` (≈ linha 489).
  - Estilos `.tela-inscricoes` / `.inscricoes-*` em `styles/workspace.css`.
- **Backend:**
  - `Services/CursoInscricoesService.cs` já devolve **todos** os cursos (`_context.Cursos`, ≈ linha 26). O período só filtra os números, não a lista.
  - `DTOs/CursoInscricoesResponseDto.cs` **não tem a imagem do curso**.
- **Capa do curso:**
  - `Curso.ImagemUrl` está preenchida em 6 dos 26 cursos.
  - `frontend/src/lib/courseImage.js` → `resolverImagemCurso(curso)` usa `imagemUrl` e, quando não há, a imagem padrão por título (`data/courseCovers.js`). É a mesma lógica do catálogo e da Home pública.
- **Números no banco hoje:** 26 cursos (4 Gratuitos, 20 Pagos e 2 Acompanhados).

## Tarefa

### Backend

1. Acrescentar `ImagemUrl` (string, pode ser null) em `CursoInscricoesResponseDto` e preenchê-lo no serviço. **Nada mais muda no endpoint.** Ajustar o teste que confere os campos.

### Frontend web (`VistaGestorMatriculas`)

2. **Cabeçalho** (imagem, pino 1):
   - à esquerda, um ícone de grupo (≈ 40px, cor da marca) e uma linha vertical de 2px em degradê roxo (≈ 52px de altura);
   - ao lado, o título "Inscrições" e o subtítulo **"Acompanhe inscrições, desempenho acadêmico, certificados e receita dos cursos."**
3. **KPI "Total de cursos"** (pino 2), à direita do cabeçalho, na mesma linha do título, com ≈ 430px de largura:
   - **Número:** a quantidade de cursos da lista **sem nenhum filtro**, ou seja, o total da plataforma. Não muda com os chips nem com o período.
   - **Rótulo:** "cursos na plataforma".
   - **Embaixo**, 3 pílulas com a divisão por modelo: "N gratuitos", "N pagos" e "N acompanhados", no singular quando for 1.
   - **Destaque:**
     - fundo roxo cheio em degradê (`#7b2ff7 → #9d4dff → #c084fc`), texto branco e sombra roxa;
     - ícone de livro num quadrado branco translúcido;
     - número com ≈ 2.1rem.
   - Os outros KPIs têm fundo escuro só tingido, então este se destaca sozinho.
   - **Até 1200px:** o cartão desce para baixo do título e ocupa a largura toda.
4. **5 KPIs** (pino 3), com o visual da sugestão, numa grade de 5 colunas com 16px de espaço. Até 1200px, 3 colunas; até 768px, 2.
   - **Cada cartão:**
     - ícone de 24px num quadrado de 46px com fundo da cor do KPI a ≈ 18%;
     - fundo do cartão em degradê leve dessa cor;
     - borda de 1px na cor a ≈ 45%;
     - cantos de 14px, padding de 16px 18px e altura mínima de 84px;
     - valor com ≈ 1.55rem e rótulo com 0.84rem.
   - **Os cartões** (cores e ícones da imagem):
     - **Inscrições**, roxo;
     - **Começaram**, azul, com a linha colorida "N% das inscrições" embaixo;
     - **Concluíram**, verde, com "N% das inscrições";
     - **Certificados emitidos**, âmbar;
     - **Receita estimada**, lilás, com o selo **"Simulada"** ao lado do rótulo e a linha colorida "N pendente(s)" embaixo.
   - O valor e o rótulo **não** quebram linha.
   - Esses 5 respeitam os filtros, como hoje.
   - Usar classes novas desta tela (por exemplo `inscricoes-kpis` / `inscricoes-kpi`). **Não** mexer em `.cartao-estatistica` nem nos modificadores do Dashboard.
5. **Filtros** (pino 4), numa linha separada dos KPIs por uma divisória fina:
   - rótulo **"Modalidade"** com ícone de funil;
   - os chips de hoje (Todos, Gratuito, Pago e Acompanhado);
   - um campo **"Buscar curso…"** com lupa, que ocupa o espaço do meio e filtra pelo título no navegador, sem diferenciar maiúsculas nem acentos;
   - o seletor de período de hoje, agora com ícone de calendário.
6. **Tabela dentro de um cartão** (pino 5):
   - **Cabeçalho do cartão:** ícone de livro, o título **"Cursos e Desempenho"** e, à direita, "N cursos encontrados". O N é a quantidade depois do chip e da busca.
   - **Colunas** (pino 6):
     - **Curso:**
       - a capa (`resolverImagemCurso`, ≈ 84 × 48px, cantos de 9px, `object-fit: cover`, `alt=""`);
       - o nome;
       - embaixo do nome, os selos de modelo e situação que já existem.
     - **Preço:** como hoje, com "Grátis" para curso gratuito.
     - **Inscritos.**
     - **Iniciaram:** o número, o % em relação aos inscritos e uma mini barra **azul** (≈ 90px × 5px).
     - **Concluíram:** o mesmo, com barra **roxa**.
     - **Certificados.**
     - **Pendentes:** como hoje, em amarelo e negrito quando > 0, e "—" no gratuito.
     - **Receita:** como hoje, com "—" no gratuito.
     - Um botão **"Ver detalhes ›"** (contorno roxo) que abre `/app/cursos/:id`. O clique na linha e o Enter continuam funcionando.
   - Com 0 inscritos, os % ficam 0% e as barras vazias.
   - **Remover** a barra única do funil, o texto "N começaram › …" e a legenda de 4 cores (`BarraFunilInscricoes`, `LegendaFunilInscricoes`, `textoFunilInscricoes` e o CSS delas, se não forem usados em outro lugar).
   - Linhas com ≈ 72px de altura e divisórias finas.
7. **Linha de total** (pino 7):
   - fica no fim da tabela, com fundo roxo bem leve: "Total · N cursos", inscritos, iniciaram com "· N%", concluíram com "· N%", certificados, pendentes em amarelo e receita;
   - soma **todos** os cursos do filtro, **não** só os da página.
8. **Paginação** (pino 7):
   - **10 cursos por página**, feita no navegador;
   - no rodapé do cartão: "Mostrando A–B de N cursos" à esquerda e, à direita, os botões ‹, os números das páginas e ›;
   - página atual em roxo cheio; ‹ e › desativados nas pontas;
   - trocar o chip, a busca ou o período volta para a página 1;
   - com 10 cursos ou menos, a paginação não aparece.
9. **Celular (≤ 768px):** manter os cartões de hoje, com estes acréscimos:
   - a capa no topo do cartão;
   - Iniciaram e Concluíram com número e %;
   - o botão "Ver detalhes".
   - O KPI "Total de cursos" fica em cima dos outros, na largura toda. A paginação continua no fim.

**Não alterar:**
- as regras e números do endpoint (só entra `ImagemUrl`);
- o Dashboard e o KPI "Taxa de conclusão";
- as telas do aluno, do Coordenador e do Professor;
- o nome "Inscrições" só para o Admin.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), **sem modo demo**, logado como Admin, comparando com `inscricoes-v2-proposta.png`:

- **Total de cursos:**
  - o cartão roxo no canto do cabeçalho mostra **26** e "4 gratuitos · 20 pagos · 2 acompanhados";
  - continua 26 com o chip "Gratuito" e com "Este mês".
- **5 KPIs:** no visual novo, sem quebrar linha. "Receita estimada" tem o selo "Simulada" e "3 pendentes".
- **Busca:** "devops" mostra só "DevOps e Cloud Foundations", e "N cursos encontrados" atualiza.
- **Tabela:**
  - cada linha tem a capa (os cursos sem `ImagemUrl` usam a imagem padrão);
  - não aparecem colunas Modalidade/Situação nem a barra única do funil;
  - Iniciaram e Concluíram têm número, % e mini barra.
- **Paginação:**
  - 3 páginas;
  - a linha de total soma os 26 (17 inscritos, R$ 10.235,00), e não só a página;
  - trocar o filtro volta para a página 1.
- **Clique:** "Ver detalhes" e o clique na linha abrem o curso.
- **Larguras:**
  - **≈ 1100px:** o Total desce para baixo do título e os KPIs ficam em 3 colunas;
  - **≈ 390px:** os cursos aparecem em cartões com capa, sem rolagem lateral.
- **Testes:**
  - vitest: total de cursos ignora os filtros, contagem por modelo (singular e plural), busca sem acento, paginação (10 por página, total da lista inteira, volta à página 1), % de iniciaram e concluíram com 0 inscritos;
  - backend: `ImagemUrl` no DTO.
- `dotnet test`, `npm run lint` e `npm test` sem erros novos.
