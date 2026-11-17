> **RESOLVIDO em 2026-11-17:** as decisões foram tomadas com o usuário e o prompt está em `PROMPT-agente-inscricoes-v2.md` (imagem aprovada: `inscricoes-v2-proposta.png`). Esta nota fica só como histórico.

# Inscrições (Admin): ajustes pedidos pelo usuário — verificar na próxima sessão

**Registrado em 2026-11-16.** A tela foi aplicada no commit `ca9cf05` ("Dashboard: KPIs menores numa linha so + tela Inscricoes substitui Matriculas").

Ainda não há prompt para estes ajustes. Na próxima sessão:
1. olhar a tela no app real (127.0.0.1:5173, como Admin, sem modo demo);
2. comparar com a sugestão do usuário;
3. decidir com ele, uma coisa por vez, e só então escrever o prompt.

## Imagens salvas nesta pasta

| Arquivo | O que é |
|---|---|
| `antes-matriculas.png` | A tela antiga "Matriculas". O usuário circulou o rodapé "8 matriculas aprovadas no total, em 4 cursos": era o único lugar que mostrava quantos cursos existem. |
| `aplicada-2026-11-16.png` | A tela "Inscrições" como ficou depois do `ca9cf05`. O usuário circulou o espaço vazio no canto superior direito, ao lado do título: é ali que ele quer o KPI novo. |
| `sugestao-usuario-inscricoes.webp` | A sugestão de tela que o usuário encaminhou. É a referência visual dos ajustes. |
| `inscricoes-proposta.png` | A imagem que o usuário aprovou antes de aplicar (referência do prompt original). |

## Pedidos do usuário (palavras dele, resumidas)

1. **Ajustar detalhes, espaçamentos e bordas.**
2. **Falta um KPI com o total de cursos na plataforma**, e ele precisa **se destacar dos demais**. O lugar indicado no print é o canto superior direito, na altura do título.
3. **Usar a sugestão de tela que ele encaminhou** (`sugestao-usuario-inscricoes.webp`).

## O que a sugestão do usuário tem de diferente da tela aplicada (levantado pelo agente de arquitetura)

**Cabeçalho**
- Um ícone grande à esquerda e uma linha vertical separando-o do título "Inscrições".
- O subtítulo fica mais curto: "Acompanhe inscrições, desempenho acadêmico, certificados e receita dos cursos."

**KPIs**
- São maiores: ícone grande num quadrado com fundo da cor do KPI e fundo do cartão em degradê dessa cor.
- O percentual vira uma linha colorida embaixo do rótulo, por exemplo "50% das inscrições".
- O rótulo da receita é "Receita estimada", com o selo "Simulada" no lugar de "(simulada)".
- Na tela aplicada, o rótulo "Receita (simulada) · 3 pendentes" quebra em 2 linhas.

**Filtros**
- Antes dos chips aparece o rótulo "Modalidade", com ícone de funil.
- Há uma busca "Buscar curso…" no meio.
- O seletor de período ganha um ícone de calendário.
- Aparece um botão extra de filtros (ícone de ajustes).

**Tabela**
- Fica dentro de um cartão com título "Cursos e Desempenho", ícone e "N cursos encontrados" à direita.
- Cada curso tem uma **miniatura** (imagem do curso) à esquerda, com os selos de modalidade e situação embaixo do nome.
- No lugar da barra única do funil, há colunas separadas:
  - **Iniciaram**: número + % + mini barra azul;
  - **Concluíram**: número + % + mini barra roxa;
  - **Certificados**;
  - **Receita**: "R$ 0,00 / Receita".
- Cada linha tem o botão **"Ver detalhes ›"** no lugar da seta.
- O rodapé mostra "Total geral: N cursos" e a **paginação**.

**Pontos a discutir com o usuário antes do prompt**
- **Colunas vazias:** na sugestão, as colunas "Modalidade" e "Situação" aparecem vazias ("-"), porque a informação já está nos selos. Provavelmente devem sair.
- **Colunas que somem:** a sugestão não tem **Preço** nem **Pendentes**. A coluna Pendentes, em amarelo, foi uma decisão anterior. Perguntar se fica.
- **Miniatura:** verificar se o curso tem imagem de capa no banco e o que mostrar quando não tiver.
- **Destaque do KPI "Total de cursos":** decidir onde ele fica (canto superior direito, no lugar circulado, ou como 6º cartão) e como se destaca (maior, outra cor, borda).
- **Paginação e busca:** quantos cursos por página, e se a busca é feita no cliente.
- **KPIs grandes:** os KPIs da sugestão são bem maiores que os compactos aprovados para o Dashboard (`docs/dashboard-admin`). Confirmar se a tela Inscrições pode ter um tamanho diferente do Dashboard.
