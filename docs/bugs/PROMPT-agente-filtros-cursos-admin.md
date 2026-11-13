# Prompt — Ajuste: filtros da tela Cursos do Admin (só frontend web)

## Contexto

Projeto CodeRyse Academy, frontend web (`frontend/`, React + Vite).

**Relato do usuário (print, Admin › Cursos, aba "Em andamento"):** a linha de filtros embaixo das abas ("Todos os coordenadore", "Todos os modelos", "Limpar filtros") ocupa uma linha inteira, tem texto cortado e mostra filtros que nem sempre fazem sentido. O usuário aprovou as sugestões abaixo e pediu o prompt.

## O que o agente de arquitetura já verificou (não repetir)

Tudo em `frontend/src/pages/workspace/SecaoCursos.jsx`:
- **Abas do Admin** (Em andamento / Encerrados / À venda / Fora da venda): `.linha-abas-status` ≈ linha 787, estado `abaCurso` (≈ 106). Filtragem por `categoriaCicloCurso` (≈ 198).
- **Linha de filtros do Admin**, `<div className="barra-filtros">` ≈ linhas 864–896, com:
  - `select#filtro-coordenador`: opções "Todos os coordenadores", "Aguardando coordenador" e o nome de cada coordenador; estado `filtroCoordenador`, aplicado ≈ 210–214;
  - `select#filtro-modelo-curso`: "Todos os modelos", "Gratuito", "Pago" e "Acompanhado"; estado `filtroModelo`, aplicado ≈ 200–203;
  - botão "Limpar filtros", sempre visível e desabilitado quando `!temFiltroAtivo` (≈ 237). `limparFiltros` (≈ 275) também limpa a busca.
- **Selo do card do Admin** (≈ 939): `"Coordenado"` ou `"Pendente"`. "Pendente" quer dizer **sem coordenador** e pode ser confundido com pagamento ou aprovação.
- As abas À venda e Fora da venda só têm cursos **Pagos**, então ali o filtro de modelo não muda nada. Em Em andamento e Encerrados ele separa Grátis de Acompanhado.
- A grade do Coordenador (abas Ativos/Encerrados, Parte 1 já aplicada em `dab504c`) **não usa** esses filtros e não muda.
- A tela real logada **não** foi conferida, porque o navegador estava na tela de login.

## Tarefa (só na visão do Admin)

1. **Filtros na mesma linha das abas.** Levar os selects para dentro da `.linha-abas-status`, alinhados à direita das abas (`margin-left: auto` num grupo próprio). Remover a linha separada de filtros. Em tela estreita, o grupo da direita quebra para baixo das abas.
2. **Rótulos curtos, sem corte:**
   - coordenador: primeira opção **"Coordenador: Todos"**, depois **"Sem coordenador"** (no lugar de "Aguardando coordenador") e os nomes;
   - modelo: primeira opção **"Modelo: Todos"**, depois "Grátis" e "Acompanhado".
   - A largura de cada select acompanha o texto, sem cortar a opção escolhida. Quando escolhido, aparece por exemplo "Modelo: Grátis" ou "Coordenador: Maria Souza". Pode ser via o texto das opções ou um rótulo visível antes do select, o que for mais simples e acessível.
3. **Filtro de modelo só nas abas Em andamento e Encerrados.** Nas abas À venda e Fora da venda ele não aparece.
   - Ao trocar para uma dessas abas, `filtroModelo` volta para "todos", para não ficar um filtro invisível aplicado.
   - Tirar a opção "Pago" do select, porque os Pagos já estão separados nas abas de venda.
4. **"Limpar filtros" só quando houver um filtro ativo** (coordenador, modelo ou busca), como botão de texto discreto no fim do grupo. Sem filtro, o botão não aparece.
5. **Atalho "N sem coordenador"**: chip clicável no grupo da direita, mostrando quantos cursos **da aba aberta** estão sem coordenador.
   - Clicar aplica o filtro "Sem coordenador"; clicar de novo desfaz. Usar `aria-pressed`.
   - Só aparece quando N > 0. Estilo âmbar discreto, coerente com "6 sem curso" da tela Coordenadores.
6. **Selo do card:** trocar **"Pendente" por "Sem coordenador"**, mantendo a cor âmbar. "Coordenado" continua.
7. Acessibilidade: manter os `<label>` (visíveis ou `visualmente-oculto`) ligados aos selects. O chip e o "Limpar filtros" são `button`.

**Não alterar:** as regras das abas, as contagens, a busca no topo, o botão "Novo curso", a grade do Coordenador nem a janela "Preparar para venda".

## Critérios de aceite

Verificar no app real (127.0.0.1:5173, backend em 127.0.0.1:5000), sem modo demo, como Admin:

- Abas e filtros na **mesma linha**, sem a linha extra, e os cursos começam logo abaixo.
- Os selects mostram "Coordenador: Todos" e "Modelo: Todos" sem texto cortado.
- Na aba **À venda**, o filtro de modelo não aparece. Um filtro "Grátis" escolhido antes não fica aplicado escondido.
- "Limpar filtros" só aparece com filtro ou busca ativa e limpa tudo.
- Com cursos sem coordenador na aba, aparece "N sem coordenador". O clique filtra; o segundo clique volta.
- Os cards mostram "Sem coordenador" no lugar de "Pendente".
- Em ≈ 400px, o grupo de filtros quebra para baixo das abas sem cortar.
- Como Coordenador, a grade continua igual.
- Testes (vitest): o filtro de modelo escondido e resetado nas abas de venda, o chip "sem coordenador" e o "Limpar filtros" condicional. `npm run lint` e `npm test` sem erros novos.
