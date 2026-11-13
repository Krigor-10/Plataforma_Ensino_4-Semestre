# Prompt — Ajuste: barras largas demais nos gráficos dos Dashboards (web)

## Contexto

Projeto CodeRyse Academy, frontend web (`frontend/`, React + Vite, gráficos com **Recharts**).

**Relato do usuário (print do Panorama do Coordenador):** no gráfico "Alunos aprovados por curso", com um curso só, a barra ocupa quase metade da largura do painel. Fica um bloco roxo enorme, e o nome do curso aparece cortado ("Desenvolviment…"). O usuário quer os gráficos menos largos.

## O que o agente de arquitetura já verificou (não repetir)

- **Causa:** nenhum `BarChart` do projeto define `maxBarSize`. No Recharts, a barra ocupa a fatia da categoria menos o `barCategoryGap` (30%). Com 1 ou 2 categorias, cada barra fica com centenas de pixels.
- Gráficos de barra existentes:
  - `pages/workspace/DashboardCoordenador.jsx` ≈ linhas 101–113: "Alunos aprovados por curso", **barras em pé**, eixo X com o nome do curso **cortado em 14 caracteres** em `dadosGrafico` (≈ linha 61), altura fixa de 220;
  - `pages/workspace/DashboardAdmin.jsx` ≈ linhas 161 e 182: matrículas por mês e novos alunos por mês, barras em pé com o mês no eixo X;
  - `components/GraficoTaxaAdesao.jsx` ≈ linha 251: ranking de cursos já **deitado** (`layout="vertical"`, `YAxis` de 160px com `cursoTituloCurto`, altura `Math.max(220, n * 36)`), que é o modelo a seguir para nomes de curso; e ≈ linha 278, barras por período.
- A tela real logada **não** foi conferida, porque o navegador estava na tela de login. O print mostra o problema.

## Tarefa

1. **Limitar a largura das barras em todos os gráficos de barra** com `maxBarSize`: cerca de **40px** nas barras em pé (meses e períodos) e **22px** de espessura nas barras deitadas. Definir os valores numa constante compartilhada (por exemplo, em `lib/` ou junto de `ChartTooltipStyle`), sem repetir números soltos.
2. **"Alunos aprovados por curso" (Coordenador) passa a usar barras deitadas**, igual ao ranking da Taxa de adesão:
   - `layout="vertical"`, nome do curso no eixo Y com largura fixa (≈ 160px) e o número de alunos no eixo X;
   - altura proporcional ao número de cursos (`Math.max(120, n * 40)`), para 1 curso não ocupar um painel alto vazio;
   - nome do curso cortado só se passar da largura do eixo, com o **nome completo no tooltip**. Hoje o tooltip mostra o nome já cortado. Guardar o título inteiro no dado e cortar só no tick;
   - mantém o destaque da barra maior (`--cor-marca-clara`) e as outras em roxo suave, como hoje.
3. O `cursor` do Tooltip (a faixa de destaque ao passar o mouse) continua, mas acompanha a barra limitada e não fica um bloco do tamanho da categoria inteira. Se o Recharts não permitir, manter como está.
4. **Não alterar** os dados, as cores, os títulos, os subtítulos nem a lógica de cálculo dos gráficos. Gráficos de linha ou área, se houver, ficam fora.

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo:

- **Panorama do Coordenador** com 1 curso: barra deitada e fina, nome do curso legível à esquerda e tooltip com o nome completo. Com vários cursos, uma barra por linha, sem cortar no meio.
- **Dashboard do Admin** (matrículas e novos alunos por mês) com poucos meses de dados: barras de no máximo ~40px, centralizadas na categoria. Com 12 meses, nada muda visualmente.
- **Taxa de adesão:** o ranking e as barras por período respeitam o limite.
- Em ≈ 400px, os gráficos continuam legíveis.
- `npm run lint` e `npm test` sem erros novos.
