# Etapa 6 — Índice de Consolidação do Material

A Etapa 6 (Arquitetura de Software) acumulou material em 5 lugares diferentes ao longo do PIM III e do PIM IV. Nenhum deles se contradiz, mas colar todos no documento final geraria repetição. Este índice diz o papel de cada um na hora de montar o capítulo — não é um arquivo novo de conteúdo, é o mapa de onde cada coisa entra.

## Texto principal do capítulo (corpo do documento ABNT)

O corpo do capítulo "Arquitetura de Software" deve ser montado combinando, nesta ordem:

1. **Visão geral e camadas** — adaptar de `arquiteturaSistema.html` (seções 1 "Visão Geral" e 2 "Arquitetura em Camadas do Backend"). É o texto mais bem escrito como prosa corrida, já cobre a "organização em camadas" pedida pelo manual.
2. **Orientação a objetos** — adaptar de `resumoTecnicoPOO.html` (Abstração, Herança, Polimorfismo, Encapsulamento, todos exemplificados com a hierarquia `Usuario`). É o texto mais direto pra cobrir literalmente o item "orientação a objetos" do manual.
3. **Modularização e alinhamento Web/Mobile** — adaptar de `arquiteturaSistema.html` seção 3 "Modelo Multiplataforma", complementado pelo diagrama de componentes da seção 6 de `especificacaoUML-Desktop-CSharp.md` (Web/Mobile/Desktop → Gateway → API → Banco).

## Diagramas (figuras do capítulo)

Fonte única: `especificacaoUML-Desktop-CSharp.md` — é o mais completo e o único pensado pra virar diagrama de verdade no Astah (7 diagramas: hierarquia de usuários, cursos, avaliação, progresso, camadas, componentes, casos de uso). Depois de desenhados no Astah, os diagramas exportados (imagem) entram como figuras numeradas no capítulo, citando esse `.md` como origem da especificação.

**Não usar** `diagramaClasses.html` pra essa etapa — apesar do nome, é um diagrama de **schema de banco** (título "PlataformaEnsinoDB"), pertence à Etapa 7, não à Etapa 6. Cruzar com `PIM 4°SEM/etapa7-banco-dados.md`.

## Material de apoio (referência, não precisa entrar inteiro no corpo do texto)

- `arquiteturaSistema.html` (seções 4-7: Autenticação e Sessão, Modelo de Dados, Stack Tecnológica, Boas Práticas) — detalhe de apoio, útil se o professor pedir mais profundidade, mas redundante como corpo principal.
- `resumoTecnicoPOO.html` — mantém como anexo/referência técnica, já que o texto principal (item 2 acima) é extraído dele.

## Apresentação de 27/10 (separado do documento escrito)

`Blueprint UML` (slides) e `Painel UML` (pôster, tudo numa página) são artefatos de **apresentação**, não substituem o capítulo escrito nem os diagramas do Astah — são o material visual pra falar ao vivo no dia da banca.
