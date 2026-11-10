RETOMAR NA SEGUNDA-FEIRA

# CodeRyse — Auditoria urgente, correções funcionais e padronização UX/UI (WEB)

## OBJETIVO

Executar uma revisão prioritária dos itens abaixo no ambiente WEB do CodeRyse, contemplando os acessos de Professor, Coordenador e Administrador.

**IMPORTANTE:** Não iniciar alterações diretamente. Primeiro, analisar a implementação atual, identificar os componentes envolvidos, compreender o comportamento existente e verificar possíveis impactos.

O objetivo é corrigir os problemas identificados sem introduzir regressões, preservar funcionalidades existentes e manter a identidade visual da plataforma.

---

# 1. ACESSO DO PROFESSOR

## 1.1. Verificar EXCLUIR SELECIONADAS e ARQUIVAR SELECIONADAS

Investigar as duas funcionalidades disponíveis na tela de CONTEÚDOS do Professor.

- EXCLUIR SELECIONADAS.
- ARQUIVAR SELECIONADAS.

Verificar:
- Se ambas executam exatamente a mesma operação.
- Se existe diferença entre exclusão lógica, exclusão definitiva e arquivamento.
- Se o arquivamento permite restaurar o conteúdo posteriormente.
- Se ambas alteram corretamente o status do conteúdo no banco de dados.
- Se existem diferenças de comportamento entre frontend, backend, services e repositories.

**Decisão necessária:**
Caso as funcionalidades tenham comportamentos diferentes e complementares, preservar ambas e deixar suas finalidades claramente identificadas na interface.

Caso executem a mesma operação, identificar a duplicidade e propor a solução mais adequada antes de remover qualquer funcionalidade.

Não alterar regras de negócio sem verificar suas dependências.

## 1.2. Lista de avaliações

Remover a borda branca inferior que aparece na lista de avaliações do Professor.

Verificar a origem dessa borda no CSS e corrigir o elemento responsável, sem remover bordas ou divisores de outros componentes que tenham finalidade visual.

## 1.3. Hierarquia do título QUIZZES DO MÓDULO

Dentro de cada módulo, no final da estrutura de conteúdos, melhorar a apresentação do título QUIZZES DO MÓDULO.

Objetivos:
- Aumentar a distinção visual em relação aos itens de conteúdo.
- Melhorar peso tipográfico e hierarquia.
- Ajustar espaçamento e alinhamento.
- Diferenciar visualmente essa seção sem criar excesso de destaque.

Manter coerência com a identidade visual da tela de Conteúdos do Professor.

## 1.4. Tela de PROGRESSO do Professor

Atualmente, a lista de módulos é recolhível, mas a seção AVALIAÇÕES DO CURSO não possui o mesmo comportamento.

Implementar comportamento expansível/recolhível para AVALIAÇÕES DO CURSO.

Requisitos:
- Permitir expandir e recolher ao clicar no cabeçalho.
- Utilizar indicador visual de expansão, como chevron.
- Manter o estado visual coerente com os módulos.
- Garantir que o conteúdo interno não seja perdido ao recolher.
- Preservar os dados e funcionalidades existentes.

### Melhorar destaque visual dos cards de progresso

Atualmente, os cards possuem fundos muito transparentes e acabam se confundindo com o background da página.

Quero aplicar o mesmo princípio visual utilizado na tela de Conteúdos do Professor:

- Cada módulo de progresso deve possuir um fundo próprio.
- Criar distinção clara entre o background principal e os cards.
- Melhorar contraste e separação entre os módulos.
- Utilizar bordas discretas, quando necessário.
- Manter hierarquia entre título, informações, indicadores e avaliações.

**Referência visual:** utilizar a organização dos módulos na tela de Conteúdos do Professor como referência de identidade visual.

Não copiar indiscriminadamente os componentes. Reaproveitar tokens, estilos e padrões existentes sempre que possível.

---

# 2. ACESSO DO COORDENADOR

## 2.1. Dashboard — KPIs horizontais

Atualmente, alguns KPIs apresentam o conteúdo textual alinhado à margem esquerda, deixando o card visualmente desequilibrado.

Ajustar os KPIs que possuem dimensões horizontais maiores:

- Centralizar horizontalmente o conteúdo textual.
- Manter o ícone posicionado à esquerda.
- Preservar a proporção e o alinhamento do conjunto.
- Evitar que o texto fique desalinhado em relação ao ícone.
- Garantir responsividade em diferentes resoluções.

Aplicar o padrão aos KPIs horizontais que apresentem esse mesmo problema, sem alterar desnecessariamente os KPIs compactos.

## 2.2. Navegação entre páginas

Revisar os componentes de paginação existentes.

Atualmente, alguns elementos possuem bordas e contornos excessivos, deixando a interface visualmente carregada.

Objetivo:
- Tornar a paginação mais minimalista.
- Reduzir bordas desnecessárias.
- Utilizar estados visuais discretos para página ativa, hover e desabilitado.
- Melhorar espaçamento e alinhamento.
- Preservar a identificação clara da página selecionada.

Verificar se existe um componente de paginação compartilhado para aplicar a melhoria de maneira consistente, sem causar alterações inesperadas em outras telas.

## 2.3. Botão CADASTRAR PROFESSOR

O botão está sendo apresentado sem ícone.

Corrigir a implementação para exibir o ícone de adição (+), mantendo:
- Ícone à esquerda do texto.
- Alinhamento vertical correto.
- Espaçamento consistente.
- Mesmo padrão visual dos demais botões de cadastro.

## 2.4. Gestão de PROFESSORES — Implementar filtros

Atualmente, a tela Gestão > Professores possui somente uma barra de pesquisa.

Analisar a implementação e identificar filtros úteis para facilitar a gestão.

Avaliar a viabilidade de:
- Filtro por status.
- Filtro por situação do cadastro.
- Filtro por outros atributos realmente disponíveis na estrutura de dados.

Preferencialmente, utilizar filtros de seleção (select) ou opções compactas.

Definir a melhor localização dos filtros, considerando a barra de pesquisa, o cabeçalho e a área de listagem.

Não criar filtros que dependam de informações inexistentes no backend.

## 2.5. Tela de CURSOS — Implementar filtros

Atualmente, o Coordenador também possui somente a barra de pesquisa na tela de Cursos.

Analisar a viabilidade de adicionar filtros complementares.

Avaliar:
- Selects.
- Checkboxes, quando fizerem sentido.
- Filtro por status ou situação do curso.
- Outros critérios disponíveis nos dados atuais.

Apresentar uma proposta de organização visual antes da implementação, evitando excesso de controles e mantendo a interface limpa.

---

# 3. ACESSO DO ADMINISTRADOR

## 3.1. Revisão da Sidebar — TURMAS e MATRÍCULAS

Foi definido anteriormente que o conceito de TURMAS não será mais utilizado na experiência de gestão da plataforma.

Também foi identificado que o processo de matrícula do aluno passou a ser automático, não justificando a manutenção de uma tela operacional de gestão de matrículas como anteriormente.

Revisar a Sidebar do Administrador:

- Remover o menu TURMAS.
- Avaliar a remoção do menu MATRÍCULAS.

**ATENÇÃO: antes de remover MATRÍCULAS, analisar o fluxo de negócio e as informações que precisam continuar disponíveis.**

Embora a matrícula seja automática, o Administrador ainda precisa acompanhar:

- Volume de novos alunos cadastrados.
- Quantidade de alunos adquirindo cursos.
- Evolução de novos cadastros.
- Volume de compras e aquisições.
- Relação entre cadastro, aquisição e matrícula.
- Indicadores de conversão, quando houver dados suficientes.

### Solução esperada

Analisar a possibilidade de concentrar essas informações em uma área de métricas, relatórios ou indicadores administrativos.

O objetivo é eliminar menus operacionais desnecessários sem perder a capacidade de acompanhar o crescimento e a movimentação comercial da plataforma.

Não excluir entidades, relacionamentos, tabelas ou regras de negócio apenas pela remoção dos menus.

Verificar dependências em:
- Controllers.
- Services.
- Repositories.
- DTOs.
- Models.
- Relacionamentos do Entity Framework Core.
- Dashboard e relatórios.

## 3.2. Tela CURSOS — Filtros

Na tela de Cursos do Administrador, remover a borda externa que envolve o conjunto de filtros.

Objetivo:
- Deixar os filtros visualmente mais leves.
- Eliminar o contorno desnecessário.
- Preservar os campos, funcionalidades e estados atuais.
- Manter a separação visual entre filtros e listagem sem criar novos contêineres desnecessários.

---

# 4. CORREÇÃO CRÍTICA — BOTÕES CADASTRAR PROFESSOR E CADASTRAR COORDENADOR

Este item possui prioridade especial porque já foram solicitadas várias correções anteriores e o resultado não foi implementado corretamente.

Verificar especificamente os botões:

- CADASTRAR PROFESSOR.
- CADASTRAR COORDENADOR.

**Os dois botões precisam apresentar o ícone de adição (+).**

Requisitos obrigatórios:
- Ícone de adição visível à esquerda do texto.
- Espaçamento adequado entre ícone e texto.
- Alinhamento vertical centralizado.
- Mesmo padrão visual nos dois botões.
- Preservar cores, dimensões, tipografia e comportamento existentes.

### Investigação obrigatória

Não realizar apenas uma alteração superficial no CSS.

Investigar:
1. Qual componente realmente renderiza cada botão.
2. Se existem componentes duplicados para os mesmos botões.
3. Se existe alguma condição de renderização que remove o ícone.
4. Se o ícone está sendo sobrescrito por alguma regra CSS.
5. Se existe diferença entre os componentes utilizados nos acessos de Professor e Coordenador.
6. Se a correção anterior foi aplicada em um componente que não corresponde à tela atualmente utilizada.

**Critério de aceite:** acessar efetivamente as telas de cadastro e confirmar visualmente que ambos os botões apresentam o ícone +. Não considerar a tarefa concluída apenas porque o código contém uma referência ao ícone.

---

# 5. REGRAS GERAIS DE IMPLEMENTAÇÃO

1. Escopo restrito ao ambiente WEB, salvo quando uma dependência compartilhada exigir análise de impacto.
2. Não alterar funcionalidades fora dos itens solicitados.
3. Priorizar reutilização de componentes e tokens visuais existentes.
4. Preservar a identidade visual do CodeRyse.
5. Evitar excesso de bordas, contornos e elementos decorativos.
6. Utilizar hierarquia tipográfica consistente.
7. Manter responsividade em desktop, tablet e mobile.
8. Não criar dados fictícios para alimentar filtros ou indicadores.
9. Não remover funcionalidades sem verificar suas dependências.
10. Não modificar regras de negócio sem justificativa técnica.
11. Evitar duplicação de CSS e componentes.
12. Preservar compatibilidade com backend e banco de dados.
13. Não realizar alterações estruturais desnecessárias.

# 6. VALIDAÇÃO OBRIGATÓRIA

Após implementar, executar uma validação individual de cada item.

### Validação funcional
- [ ] Excluir e arquivar conteúdos possuem comportamentos corretamente identificados.
- [ ] A lista de avaliações não apresenta a borda branca inferior indesejada.
- [ ] QUIZZES DO MÓDULO apresenta hierarquia visual adequada.
- [ ] AVALIAÇÕES DO CURSO pode ser expandida e recolhida.
- [ ] Os cards de progresso apresentam destaque visual adequado.
- [ ] Os KPIs horizontais possuem textos centralizados e ícones à esquerda.
- [ ] A paginação apresenta visual minimalista e mantém sua funcionalidade.
- [ ] CADASTRAR PROFESSOR apresenta o ícone +.
- [ ] A gestão de professores possui filtros funcionais, se aprovados na análise de viabilidade.
- [ ] A gestão de cursos possui filtros funcionais, se aprovados na análise de viabilidade.
- [ ] A Sidebar do Administrador não apresenta TURMAS.
- [ ] A remoção de MATRÍCULAS preserva os indicadores e informações administrativas necessários.
- [ ] Os filtros de Cursos do Administrador não possuem a borda externa indesejada.
- [ ] CADASTRAR PROFESSOR e CADASTRAR COORDENADOR apresentam corretamente o ícone +.

### Validação técnica
- Verificar erros no console do navegador.
- Verificar erros de requisições HTTP.
- Verificar funcionamento dos filtros e paginação.
- Verificar comportamento dos componentes expansíveis.
- Verificar se os dados continuam sendo carregados corretamente.
- Verificar se não houve duplicação de eventos ou requisições.
- Verificar se as alterações não afetaram outras telas que utilizam componentes compartilhados.

### Regressão visual
Testar os três perfis:
- Professor.
- Coordenador.
- Administrador.

Validar em diferentes resoluções, especialmente desktop e mobile.

---

# 7. RELATÓRIO FINAL OBRIGATÓRIO

Ao terminar, apresentar:

1. Lista dos itens efetivamente corrigidos.
2. Lista dos itens que precisaram de investigação adicional.
3. Funcionalidades que apresentavam duplicidade ou comportamento equivalente.
4. Filtros considerados viáveis e os respectivos critérios.
5. Arquivos alterados, informando os caminhos completos.
6. Componentes reutilizados ou modificados.
7. Testes funcionais executados e seus resultados.
8. Problemas encontrados que não puderam ser resolvidos.
9. Possíveis riscos ou dependências que precisam de atenção.

**Não declarar uma correção como concluída sem validar seu funcionamento real na interface.**

A prioridade é entregar correções efetivas, consistentes e verificadas, e não apenas alterações de código que aparentemente resolvam os problemas.

-------------------------------------------------------------------------------
SEGURANÇA

# SEGURANÇA — Revisão de persistência da autenticação e encerramento de sessão

## 1. PROBLEMA IDENTIFICADO

Atualmente, ocorre o seguinte comportamento:

1. O usuário realiza login na plataforma.
2. Navega normalmente entre as telas.
3. Fecha o navegador sem realizar logout.
4. Abre novamente o navegador e acessa o CodeRyse.
5. A plataforma continua autenticada, permitindo acesso sem solicitar novas credenciais.

Esse comportamento precisa ser investigado e revisado.

## 2. COMPORTAMENTO DESEJADO

Quero implementar uma política de encerramento de sessão quando o usuário fechar o navegador.

Ao fechar o navegador e iniciar uma nova sessão de navegação, o usuário deverá precisar realizar um novo login.

**Importante:** não confundir fechamento do navegador com navegação entre páginas ou atualização da página.

A autenticação deve continuar funcionando normalmente enquanto o usuário estiver utilizando a plataforma.

## 3. INVESTIGAÇÃO TÉCNICA OBRIGATÓRIA

Antes de modificar qualquer código, identificar como a autenticação está implementada atualmente.

Verificar:

- Onde o JWT é armazenado.
- Se utiliza localStorage, sessionStorage ou cookies.
- Se existem Refresh Tokens.
- Se o sistema restaura automaticamente a autenticação ao inicializar.
- Como o frontend verifica se o usuário já está autenticado.
- Como funciona o middleware de autenticação no backend.
- Se existe persistência de sessão independente do navegador.
- Como os três ambientes (Web, Desktop e Mobile) compartilham ou gerenciam a autenticação.

Identificar exatamente qual mecanismo permite que o usuário permaneça autenticado após fechar e reabrir o navegador.

## 4. IMPLEMENTAÇÃO

Para o ambiente WEB, avaliar a utilização de uma sessão vinculada à vida útil da sessão do navegador.

Preferencialmente:
- Evitar persistência de JWT em localStorage.
- Avaliar cookies de sessão com HttpOnly, Secure e SameSite adequados.
- Caso existam Refresh Tokens, revisar sua persistência e renovação.
- Garantir que o fechamento do navegador encerre a sessão conforme a política definida.
- Evitar que mecanismos de restauração de abas restaurem uma sessão que deveria ter sido encerrada.

Não implementar apenas um redirecionamento para login. É necessário garantir que as credenciais de autenticação não continuem válidas e acessíveis indevidamente.

## 5. CUIDADOS COM OS AMBIENTES

A alteração deve ser restrita ao ambiente WEB, caso a investigação confirme que o comportamento é exclusivo dele.

Não comprometer:
- Aplicativo Mobile (Expo / React Native).
- Aplicação Desktop.
- Renovação de tokens durante a utilização normal.
- Navegação entre páginas.
- Atualização da página (F5).
- Acesso a rotas protegidas.

Cada ambiente deve preservar sua própria estratégia de gerenciamento de sessão.

## 6. TESTES OBRIGATÓRIOS

Executar os seguintes cenários:

1. Login → navegar entre páginas → atualizar a página: deve continuar autenticado.
2. Login → fechar uma aba, mantendo outra aba da mesma sessão aberta: não deve encerrar indevidamente a sessão compartilhada.
3. Login → fechar todas as janelas do navegador → abrir novamente: deve solicitar novo login.
4. Login → realizar logout manual: deve encerrar a autenticação imediatamente.
5. Tentar acessar uma rota protegida após o encerramento da sessão: deve redirecionar para login.
6. Tentar reutilizar um token cuja sessão foi encerrada: deve ser rejeitado conforme a estratégia de revogação implementada.
7. Verificar se a restauração automática de abas não recupera uma autenticação encerrada.

## 7. RELATÓRIO FINAL

Informar:
- Qual era a causa do problema.
- Onde o token estava sendo armazenado.
- Quais arquivos foram modificados.
- Qual estratégia de sessão foi implementada.
- Como foi garantido o encerramento da autenticação.
- Resultados dos testes nos ambientes afetados.

Não considerar a correção concluída apenas porque o usuário foi redirecionado para a tela de login. Validar também a proteção das rotas e a validade das credenciais.

-------------------------------------------------------------------------------
# CodeRyse — Refinamento UX/UI | Tela de Conteúdos do Professor

## 1. OBJETIVO

Realizar melhorias visuais na tela de CONTEÚDOS do acesso do PROFESSOR, priorizando hierarquia visual, contraste entre elementos, organização dos conteúdos e consistência da identidade visual.

As alterações devem contemplar:

1. Alterar a cor do botão NOVO MÓDULO para verde.
2. Melhorar o destaque visual dos cards individuais de conteúdos.
3. Diferenciar melhor o fundo da página, os módulos e os conteúdos.
4. Preservar a identidade visual dos diferentes tipos de conteúdo.
5. Melhorar a experiência de navegação e identificação dos elementos.

## 2. IMAGEM DE REFERÊNCIA — CONSULTA OBRIGATÓRIA

Utilizar a seguinte imagem como referência visual para orientar a implementação:

**Caminho completo:**

`E:\Projetos\Projetos\Projetos\Edtech\ConsoleApp3\docs\TelaConteudosProfessor\Painel de Conteúdos Full Stack.png`

A imagem representa a direção visual desejada para a tela.

Antes de implementar:
- Abrir e analisar a imagem.
- Observar a hierarquia entre background, módulos e conteúdos.
- Analisar o contraste dos cards individuais.
- Observar a utilização das cores nos ícones.
- Analisar a proporção dos elementos, espaçamentos e organização.
- Utilizar a imagem como referência de design, não como substituição da interface atual.

**Importante:** a imagem é uma referência de direção visual. Não reproduzir cegamente suas dimensões, espaçamentos ou estrutura. Adaptar o conceito aos componentes, estilos e responsividade já existentes no CodeRyse.

## 3. BOTÃO NOVO MÓDULO — ALTERAÇÃO PARA VERDE

Atualmente, o botão NOVO MÓDULO utiliza uma aparência roxa.

Quero alterar sua identidade visual para VERDE, seguindo o padrão dos botões de adição utilizados na plataforma.

Requisitos:
- Fundo verde.
- Ícone de adição (+) à esquerda.
- Texto NOVO MÓDULO.
- Ícone e texto alinhados verticalmente.
- Espaçamento adequado.
- Mesmo peso visual dos demais botões principais de criação.
- Hover e feedback visual coerentes com o restante da plataforma.
- Manter dimensões e proporções equilibradas.

Não utilizar um verde excessivamente fluorescente ou diferente dos tokens de cor existentes.

Antes de criar uma nova tonalidade, verificar se já existe um verde utilizado nos botões de ação positiva e criação.

**Objetivo:** deixar claro visualmente que NOVO MÓDULO é uma ação de criação, seguindo a mesma linguagem visual dos outros botões de adição.

## 4. CARDS DOS CONTEÚDOS — MELHORAR CONTRASTE E DESTAQUE

### Problema atual

Na tela de Conteúdos do Professor, os itens da lista possuem fundos muito transparentes e acabam se confundindo com o background principal da página.

Isso prejudica:
- Identificação individual dos conteúdos.
- Separação visual entre os itens.
- Leitura e navegação.
- Hierarquia entre os diferentes elementos da interface.

### Solução desejada

Implementar cards individuais para os conteúdos, utilizando fundos próprios e mais sólidos.

Cada conteúdo deve apresentar uma separação visual perceptível em relação ao background principal.

Diretrizes:

- Aplicar um background próprio em cada item de conteúdo.
- Utilizar uma tonalidade ligeiramente diferente do fundo da página.
- Criar contraste suficiente para identificar os limites de cada item.
- Utilizar bordas discretas, somente quando necessário.
- Aplicar espaçamentos consistentes entre os cards.
- Manter alinhamento dos checkboxes, ícones, títulos, subtítulos, status e menus de ações.
- Evitar sombras excessivas.
- Não utilizar cores muito claras que prejudiquem a identidade dark da plataforma.

**Referência:** observar a imagem indicada no item 2, principalmente a separação entre os cards individuais e o background principal.

## 5. HIERARQUIA VISUAL DOS MÓDULOS

Preservar o destaque visual que os módulos já possuem.

A hierarquia desejada deve seguir esta estrutura:

1. Background principal da página.
2. Cabeçalho do módulo, com fundo próprio e destaque intermediário.
3. Área de organização e seleção dos conteúdos.
4. Cards individuais de conteúdos, com fundo próprio.
5. Ícones, status e ações como elementos complementares.

O módulo deve continuar sendo o agrupador principal dos conteúdos.

Os cards individuais não devem competir visualmente com o cabeçalho do módulo.

Manter os módulos recolhíveis e expansíveis, preservando o comportamento atual.

## 6. IDENTIDADE VISUAL DOS TIPOS DE CONTEÚDO

Preservar a diferenciação por cores já utilizada na plataforma.

- Textos e PDFs: manter identificação visual verde.
- Imagens: manter identificação visual verde.
- Quizzes: manter identificação visual roxa.
- Status PUBLICADO: manter identificação verde.
- Outros tipos: respeitar as cores e tokens já estabelecidos.

Não alterar indiscriminadamente as cores dos ícones.

O objetivo é melhorar o contraste dos cards sem perder a identificação visual dos diferentes tipos de conteúdo.

## 7. PRESERVAR FUNCIONALIDADES EXISTENTES

A alteração é predominantemente visual.

Não modificar:
- Cadastro de módulos.
- Cadastro de conteúdos.
- Edição de conteúdos.
- Exclusão e arquivamento.
- Seleção individual e múltipla.
- Menu Mais ações.
- Publicação e despublicação.
- Associação de quizzes aos conteúdos.
- Quizzes do módulo.
- Geração de quiz com IA.
- Expansão e recolhimento dos módulos.
- Visualização como aluno.

Preservar todos os eventos, estados, requisições e regras de negócio existentes.

## 8. RESPONSIVIDADE

A implementação precisa funcionar em:
- Desktop.
- Tablet.
- Mobile.

Não utilizar dimensões fixas desnecessárias.

Preferir unidades relativas, especialmente rem, e aproveitar os breakpoints já existentes.

Garantir que:
- Os títulos não sejam cortados.
- Os ícones não sejam desalinhados.
- Os status continuem visíveis.
- Os menus de ações permaneçam acessíveis.
- Os cards não provoquem rolagem horizontal indevida.

## 9. INVESTIGAÇÃO TÉCNICA ANTES DA IMPLEMENTAÇÃO

Antes de alterar o código:

1. Identificar o componente responsável pela tela de Conteúdos do Professor.
2. Identificar os componentes que renderizam os módulos e os itens individuais.
3. Localizar os estilos responsáveis pelo background e pelas bordas.
4. Verificar se existem componentes compartilhados com outras telas.
5. Identificar os tokens de cores já utilizados.
6. Verificar se existem estilos duplicados ou sobrescritos.
7. Identificar o componente real que renderiza o botão NOVO MÓDULO.

Não aplicar alterações genéricas em seletores CSS que possam atingir outras telas.

Não criar componentes ou estilos duplicados quando já existir uma implementação reutilizável.

## 10. VALIDAÇÃO OBRIGATÓRIA

Após implementar, comparar a tela atualizada com a imagem de referência.

### Validação visual
- [ ] NOVO MÓDULO apresenta fundo verde.
- [ ] Ícone + aparece à esquerda do texto.
- [ ] Botão possui o mesmo peso visual dos demais botões de adição.
- [ ] Cards individuais possuem fundos próprios.
- [ ] Existe distinção clara entre página, módulo e conteúdo.
- [ ] Os conteúdos não se confundem mais com o background.
- [ ] Os ícones mantêm as cores por tipo de conteúdo.
- [ ] Os status continuam visualmente identificáveis.
- [ ] Não existe excesso de bordas ou sombras.
- [ ] A hierarquia visual está consistente.

### Validação funcional
- [ ] Cadastro de módulo funciona.
- [ ] Cadastro de conteúdo funciona.
- [ ] Edição e exclusão continuam funcionando.
- [ ] Arquivamento continua funcionando.
- [ ] Seleção individual e múltipla funciona.
- [ ] Menus de ações funcionam.
- [ ] Módulos continuam recolhíveis.
- [ ] Quizzes continuam corretamente associados.
- [ ] Geração de quiz com IA continua funcionando.

### Validação responsiva
Testar em desktop, tablet e mobile, verificando alinhamento, espaçamento e acessibilidade dos elementos.

## 11. RELATÓRIO FINAL

Ao concluir, apresentar:

1. Arquivos modificados com caminhos completos.
2. Componentes alterados.
3. Tokens de cores reutilizados.
4. Alterações realizadas no botão NOVO MÓDULO.
5. Alterações realizadas nos cards de conteúdos.
6. Resultado da comparação visual com a referência.
7. Testes funcionais executados.
8. Resultado dos testes responsivos.
9. Eventuais problemas identificados.

**CRITÉRIO FINAL DE ACEITE:**

A tela deve apresentar uma separação visual clara entre background, módulos e conteúdos individuais, seguindo a direção visual da imagem de referência.

O botão NOVO MÓDULO deve estar verde, com ícone de adição visível e alinhado.

Não considerar a tarefa concluída apenas pela alteração do CSS. Validar a interface efetivamente renderizada e garantir que nenhuma funcionalidade existente tenha sido comprometida.

Prioridade: consistência visual, legibilidade, usabilidade e regressão zero.
------------------------------------------------------------------------------
# CodeRyse — Padronização visual dos cards de conteúdos | Professor e Aluno (WEB)

## 1. OBJETIVO

Realizar uma melhoria visual na tela de CONTEÚDOS do ALUNO, utilizando o mesmo padrão de cards individuais definido para a tela de CONTEÚDOS do PROFESSOR.

Atualmente, os conteúdos do aluno possuem fundos muito transparentes, fazendo com que os itens se confundam com o background principal da página.

Quero aplicar o mesmo conceito visual da última imagem ilustrativa apresentada, criando uma hierarquia mais clara entre:

1. Background principal da página.
2. Cabeçalho dos módulos.
3. Área interna de conteúdos.
4. Cards individuais de cada conteúdo.
5. Ícones, status e ações.

**IMPORTANTE:** essa melhoria deve estabelecer um padrão visual compartilhado entre Professor e Aluno. Não quero duas implementações visuais diferentes para representar a mesma estrutura de conteúdos.

## 2. REFERÊNCIA VISUAL

Utilizar como referência a última imagem ilustrativa apresentada na conversa, que demonstra:

- Cards individuais com fundo próprio.
- Contraste moderado em relação ao background.
- Cantos levemente arredondados.
- Separação discreta entre os conteúdos.
- Ícones destacados conforme o tipo de conteúdo.
- Identificação de status sem excesso de elementos.
- Hierarquia visual equilibrada entre módulos e conteúdos.

A imagem enviada nesta solicitação representa a tela atual do ALUNO e deve ser utilizada como referência do estado original.

Não alterar a estrutura funcional da tela apenas para reproduzir a imagem ilustrativa.

## 3. TELA DE CONTEÚDOS DO ALUNO

### Problema atual

Os conteúdos são apresentados praticamente diretamente sobre o background principal.

Isso dificulta a identificação individual dos itens e deixa a interface visualmente pouco organizada.

### Alteração desejada

Transformar cada item de conteúdo em um card visualmente individualizado.

Aplicar:
- Fundo próprio, mais sólido e contrastante.
- Cantos discretamente arredondados.
- Espaçamento consistente entre os cards.
- Separação visual sem excesso de bordas.
- Alinhamento adequado dos ícones e textos.
- Melhor distinção entre título e subtítulo.
- Preservação da identidade dark da plataforma.

O card deve se destacar do background, mas sem parecer um botão ou elemento independente de navegação.

### Elementos que devem permanecer

Preservar integralmente:

- Ícones dos tipos de conteúdo.
- Títulos e subtítulos.
- Indicadores de conclusão.
- Status CONCLUÍDO.
- Botão VER IMAGEM.
- Botão VER REVISÃO.
- Indicadores de questões dos quizzes.
- Associação dos quizzes aos respectivos conteúdos.
- Linhas e conectores que representam a hierarquia entre conteúdo e quiz.

Não remover informações existentes.

## 4. PADRONIZAÇÃO COM A TELA DO PROFESSOR

A tela do Professor já possui uma proposta de melhoria visual para utilizar cards individuais com fundos próprios.

Quero que o mesmo conceito seja aplicado ao Aluno.

### Padrão compartilhado

As duas telas devem utilizar:
- Mesma tonalidade de fundo dos cards.
- Mesmo nível de contraste.
- Mesmo padrão de arredondamento.
- Mesma linguagem de bordas.
- Mesma hierarquia de espaçamento.
- Mesma identidade visual para os tipos de conteúdo.

### Particularidades por perfil

A padronização é visual, não funcional.

**Professor:**
- Mantém checkboxes.
- Mantém menus de ações.
- Mantém status de publicação.
- Mantém ações de edição, arquivamento e exclusão.

**Aluno:**
- Mantém indicadores de conclusão.
- Mantém acesso aos materiais.
- Mantém visualização de imagens.
- Mantém revisão de quizzes e avaliações.
- Mantém seus próprios indicadores de progresso.

Não transformar a interface do Aluno em uma cópia da interface do Professor.

## 5. IDENTIDADE VISUAL DOS TIPOS DE CONTEÚDO

Preservar a diferenciação por cores já existente.

- Texto e PDF: identificação verde.
- Imagem: identificação verde.
- Quiz: identificação roxa.
- Concluído: identificação verde.
- Outros estados: respeitar as cores já estabelecidas no projeto.

Não alterar cores de maneira indiscriminada.

## 6. HIERARQUIA VISUAL DOS MÓDULOS

Manter os cabeçalhos dos módulos com seu destaque atual.

Os cards individuais devem possuir um destaque visual intermediário, sem competir com os cabeçalhos.

A composição deve seguir:

- Background principal: camada de fundo.
- Cabeçalho do módulo: destaque principal do agrupamento.
- Cards individuais: destaque secundário.
- Ícones e indicadores: identificação complementar.

Preservar o comportamento expansível e recolhível dos módulos.

## 7. REUTILIZAÇÃO E ORGANIZAÇÃO DO CÓDIGO

Antes de implementar:

1. Localizar os componentes da tela de Conteúdos do Aluno.
2. Localizar os componentes da tela de Conteúdos do Professor.
3. Identificar se já existe algum componente compartilhado para os itens de conteúdo.
4. Verificar os tokens de cores, backgrounds, bordas e espaçamentos.
5. Avaliar a possibilidade de reutilizar um mesmo padrão visual ou componente de card.
6. Evitar duplicação de CSS.

Se for tecnicamente viável, centralizar os estilos compartilhados em componentes ou tokens reutilizáveis, mantendo as particularidades de cada perfil.

Não realizar uma refatoração estrutural desnecessária apenas para compartilhar estilos.

## 8. REGRAS DE RESPONSIVIDADE

Validar em:
- Desktop.
- Tablet.
- Mobile.

Garantir:
- Títulos sem cortes.
- Ícones alinhados.
- Indicadores de conclusão visíveis.
- Botões acessíveis.
- Cards adaptáveis à largura disponível.
- Ausência de rolagem horizontal indevida.

Preservar o comportamento atual de cada ambiente.

## 9. PRESERVAÇÃO FUNCIONAL — REGRESSÃO ZERO

Esta solicitação é predominantemente visual.

Não alterar:
- Regras de conclusão de conteúdos.
- Cálculo de progresso.
- Conclusão automática de materiais.
- Regras de liberação de quizzes.
- Regras de avaliação.
- Associação entre conteúdos e quizzes.
- Liberação de certificados.
- Navegação do aluno.
- Permissões do Professor.

Não modificar backend, banco de dados, DTOs, services ou repositories sem necessidade técnica comprovada.

## 10. VALIDAÇÃO OBRIGATÓRIA

Após a implementação, comparar as duas telas lado a lado.

### Professor
- [ ] Cards individuais possuem fundo próprio.
- [ ] Existe contraste adequado com o background.
- [ ] Ícones mantêm suas cores.
- [ ] Menus e checkboxes continuam funcionando.
- [ ] Status de publicação permanece correto.

### Aluno
- [ ] Cards individuais possuem fundo próprio.
- [ ] Existe contraste adequado com o background.
- [ ] Ícones mantêm suas cores.
- [ ] Indicadores de conclusão permanecem corretos.
- [ ] Botões de visualização e revisão continuam funcionando.
- [ ] Conectores entre conteúdos e quizzes permanecem alinhados.

### Padronização
- [ ] Professor e Aluno utilizam o mesmo padrão visual.
- [ ] Os fundos dos cards possuem tonalidades equivalentes.
- [ ] Os arredondamentos são consistentes.
- [ ] Os espaçamentos seguem a mesma identidade.
- [ ] A hierarquia entre background, módulos e conteúdos está preservada.

### Regressão
- [ ] Navegação funcional.
- [ ] Progresso preservado.
- [ ] Conclusão dos conteúdos preservada.
- [ ] Quizzes funcionando.
- [ ] Avaliações funcionando.
- [ ] Responsividade preservada.

## 11. RELATÓRIO FINAL

Apresentar:
1. Arquivos modificados e caminhos completos.
2. Componentes compartilhados ou reutilizados.
3. Tokens visuais utilizados.
4. Alterações realizadas na tela do Aluno.
5. Alterações realizadas na tela do Professor.
6. Comparação visual entre as duas telas.
7. Testes funcionais e responsivos executados.
8. Eventuais problemas encontrados.

**CRITÉRIO FINAL DE ACEITE:**

As telas de Conteúdos do Professor e do Aluno devem apresentar a mesma identidade visual nos cards individuais.

Os conteúdos precisam ser claramente diferenciados do background principal, mantendo uma aparência organizada, moderna e consistente.

Não considerar a tarefa concluída apenas pela alteração do CSS. Validar a interface efetivamente renderizada nos dois perfis.

Prioridade: consistência visual, legibilidade, usabilidade e regressão zero.
