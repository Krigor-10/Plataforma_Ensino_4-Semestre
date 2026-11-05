# CodeRyse — Auditoria, Correções e Evolução da Interface por Perfil

## 1. Objetivo

Realize uma auditoria técnica e visual completa no projeto CodeRyse, seguida da implementação dos ajustes descritos neste documento.

O CodeRyse possui três aplicações:
- **Web:** aplicação principal, com interfaces específicas para cada perfil.
- **Mobile:** aplicação desenvolvida em React Native com Expo.
- **Desktop:** aplicação destinada ao uso em computadores.

As solicitações foram identificadas principalmente durante uma revisão visual da aplicação Web, mas algumas alterações devem ser replicadas nos demais aplicativos.

O objetivo não é redesenhar o sistema nem realizar uma refatoração generalizada. É corrigir os problemas identificados, melhorar a consistência da interface e adequar as funcionalidades às responsabilidades de cada perfil, preservando integralmente o funcionamento existente.

**Execute as alterações diretamente no código-fonte do projeto disponibilizado. Não se limite a apresentar sugestões, exemplos ou instruções de implementação.**

---

## 2. Protocolo obrigatório antes de qualquer alteração

Antes de modificar arquivos, realize uma análise técnica do projeto.

### 2.1. Mapeamento da arquitetura

Identifique:
- Estrutura completa dos três aplicativos.
- Tecnologias, frameworks e bibliotecas utilizadas.
- Componentes compartilhados.
- Sistemas de estilos, tokens, temas e variantes.
- Rotas, páginas, modais e componentes de navegação.
- Controllers, services, repositories, DTOs e models.
- Endpoints disponíveis e seus respectivos contratos.
- Middleware, políticas de autorização e permissões por perfil.
- Relacionamentos e dependências entre entidades.

Identifique também se Web, Mobile e Desktop compartilham componentes, serviços, estilos ou regras de negócio.

### 2.2. Análise de dependências

Antes de remover qualquer funcionalidade:
1. Localize todas as referências ao recurso.
2. Identifique quem consome suas rotas, métodos, componentes e dados.
3. Verifique dependências indiretas.
4. Diferencie funcionalidades obsoletas de funcionalidades ainda utilizadas.
5. Defina quais arquivos podem ser modificados ou removidos com segurança.

Não exclua código simplesmente porque ele não aparece na interface.

### 2.3. Estratégia de implementação

Organize a execução por etapas:

1. Auditoria e diagnóstico.
2. Correção de causas compartilhadas.
3. Ajustes visuais e funcionais por perfil.
4. Adequações no back-end e nas permissões.
5. Revisão dos fluxos de turma e matrícula.
6. Padronização de textos e acentuação.
7. Testes e regressão.

Não interrompa a execução após apresentar o diagnóstico. Prossiga com as implementações que não dependam de decisões pendentes.

---

## 3. Regras técnicas obrigatórias

### 3.1. Consistência visual

- Reutilize componentes existentes.
- Utilize os tokens de cor, tipografia, espaçamento, bordas e sombras já adotados.
- Respeite a identidade visual do CodeRyse.
- Não crie sistemas de estilos paralelos.
- Não introduza bibliotecas desnecessárias.
- Utilize os ícones já disponíveis no projeto.
- Preserve a hierarquia visual entre ações primárias, secundárias e destrutivas.
- Mantenha a responsividade em diferentes resoluções.

### 3.2. Preservação da arquitetura

- Não altere contratos de API sem necessidade comprovada.
- Não renomeie propriedades utilizadas pela serialização ou pela lógica de negócio.
- Não modifique nomes de tabelas, campos ou entidades sem justificativa técnica.
- Não duplique regras de negócio entre Controller, Service e Repository.
- Preserve a separação de responsabilidades da arquitetura atual.
- Antes de criar endpoints, verifique se os existentes já disponibilizam os dados necessários.

### 3.3. Segurança e autorização

Toda restrição de perfil deve existir no servidor.

Não considere suficiente:
- Esconder botões.
- Remover itens do menu.
- Desabilitar campos.
- Bloquear ações apenas pelo JavaScript.

Implemente ou ajuste a autorização nos endpoints e serviços correspondentes, impedindo que usuários utilizem chamadas diretas à API para executar operações não permitidas.

### 3.4. Prevenção de regressões

- Alterações Mobile devem respeitar os breakpoints e não modificar indevidamente Desktop e Web.
- Alterações Desktop não devem prejudicar Mobile.
- Alterações compartilhadas devem ser testadas em todas as plataformas.
- Não remova comportamentos existentes sem mapear suas dependências.
- Preserve autenticação, navegação, carregamento de dados e persistência.
- Não introduza dados fictícios para mascarar inconsistências reais.

**Critério de aceitação: nenhuma funcionalidade não relacionada às solicitações deve apresentar regressão.**

---

# 4. Perfil ALUNO

### Item 1 — Botão CONTINUAR CURSO

Local: Conteúdos → Grade de cursos.

Quando o curso já tiver sido iniciado, substituir o botão REVISAR CURSO por CONTINUAR CURSO.

Requisitos:
- Aplicar a variante visual adequada.
- Utilizar a cor correspondente às ações positivas/primárias já existentes.
- Garantir que o botão não apresente aparência opaca ou desabilitada.
- Preservar o comportamento de navegação para o conteúdo do curso.

### Item 2 — Modal de revisão detalhada

Local: Modal REVISÃO DETALHADA.

Corrigir o botão FECHAR:
- Aplicar cor adequada.
- Adicionar ícone X.
- Preservar o padrão de fechamento dos demais modais.
- Garantir funcionamento em diferentes resoluções.

### Item 3 — Tela final do Quiz

Local: Tela de resultados após a conclusão do Quiz.

Analisar a função de cada botão e estabelecer uma hierarquia visual coerente.

Requisitos:
- Identificar corretamente as ações disponíveis.
- Definir ação primária, secundária e de saída quando aplicável.
- Aplicar cores adequadas a cada ação.
- Adicionar ícones semanticamente correspondentes.
- Preservar todos os comportamentos atuais.
- Não transformar Quiz em Avaliação formal.

Não atribua cores aleatórias. Utilize os padrões visuais já existentes.

### Item 4 — Badge DISPONÍVEL

Local: Avaliações → Grade de cursos.

Corrigir o badge DISPONÍVEL, removendo sua aparência opaca e aplicando a variante de cor correspondente ao estado de disponibilidade.

### Item 6 — Título TRILHA DE CONTEÚDOS

Reduzir o tamanho do título TRILHA DE CONTEÚDOS.

Requisitos:
- Preservar a hierarquia tipográfica.
- Utilizar proporções compatíveis com títulos de outras telas.
- Evitar excesso de destaque em relação ao conteúdo principal.
- Preservar a responsividade.

---

# 5. Perfil PROFESSOR

### Item 7 — Botões de Quiz

Local: Conteúdos.

Corrigir:
- + ADICIONAR QUIZ.
- GERAR QUIZ COM IA.

Os dois botões apresentam aparência opaca e sem cor.

Aplicar variantes, cores e ícones compatíveis com suas funções, seguindo os componentes já utilizados no sistema.

Preservar integralmente os fluxos de criação manual e geração por IA.

### Item 8 — Modal NOVA AVALIAÇÃO

Local: Avaliações → Pop-up NOVA AVALIAÇÃO.

Problema: ao selecionar ou passar o mouse nos cards CRIAR MANUALMENTE e GERAR COM IA, o card se desloca para cima e perde parte da borda superior.

Investigar:
- `overflow` do contêiner.
- Transformações CSS.
- Escala aplicada ao hover.
- Margens e espaçamentos.
- Altura e posicionamento do modal.
- Contexto de empilhamento e clipping.

Corrigir a causa real.

O card deve permanecer totalmente visível, inclusive durante hover, foco e seleção.

Não simplesmente desabilite a animação se for possível corrigir o comportamento sem prejudicar a experiência.

### Item 9 — Seção AVALIAÇÕES recolhível

Local: Progresso.

Permitir recolher e expandir a seção AVALIAÇÕES clicando no cabeçalho.

Utilizar o mesmo padrão de interação e apresentação dos módulos.

Requisitos:
- Indicador visual de expansão.
- Área clicável adequada.
- Acessibilidade por teclado.
- Preservar os dados e o estado de conclusão.
- Não alterar as regras de cálculo de desempenho.

---

# 6. Perfil COORDENADOR

### Item 10 — Botão CADASTRAR PROFESSOR

Adicionar o ícone de + ao botão CADASTRAR PROFESSOR.

Reutilizar o ícone e o padrão de espaçamento utilizados em outras ações de cadastro.

### Item 11 — Modal de detalhes do professor

Local: Gestão → Professores.

Remover:
- Menções a turmas.
- Card TURMAS.
- Informações que dependam exclusivamente da antiga organização por turmas.

Após a remoção, reorganizar os demais indicadores para evitar espaços vazios e desequilíbrio visual.

Não remover informações relevantes sobre cursos, módulos ou desempenho do professor.

### Item 12 — Filtros da gestão de professores

Atualmente existe uma busca e um botão LIMPAR FILTROS, mas não há filtros funcionais.

Primeiro, analise os dados efetivamente disponíveis na API.

Implemente filtros coerentes com o modelo atual.

Filtros a avaliar:
- Status do professor.
- Especialidade.
- Curso associado.
- Outros atributos relevantes, desde que existam dados confiáveis para utilizá-los.

Requisitos:
- Filtros combináveis.
- Atualização dos resultados conforme os critérios selecionados.
- Integração com a busca textual.
- Botão LIMPAR FILTROS funcional.
- Indicação visual dos filtros ativos.
- Tratamento adequado para listas vazias.
- Não criar categorias ou informações que não existam na base de dados.

Registre no relatório os filtros efetivamente adotados e os campos utilizados.

### Item 13 — Restrição de criação de módulos

A criação de módulos deve pertencer exclusivamente ao professor.

No perfil Coordenador:
- Remover o botão NOVO MÓDULO.
- Remover outras entradas de criação de módulos.
- Bloquear a operação no back-end.
- Impedir a execução por chamadas diretas à API.

Investigar também o menu de contexto ⋮ de cada módulo.

Mapear todas as opções disponíveis ao coordenador e identificar:
- Quais são somente de consulta.
- Quais alteram dados.
- Quais criam ou removem informações.
- Quais são incompatíveis com as responsabilidades do perfil.

Não remover automaticamente as opções sem analisar sua finalidade.

Registrar no relatório o comportamento encontrado e as decisões adotadas.

### Item 14 — Auditoria geral do Coordenador

Realizar uma revisão das telas do coordenador, com prioridade na área CURSOS.

#### 14.1. Botão VER PROFESSORES

Atualmente direciona para Progresso.

Ajustar o destino para a nova aba Professores do detalhe do curso, implementada no item 16.

#### 14.2. Imagem preta no curso Desenvolvimento Web Full Stack

Investigar a origem do problema.

Verificar:
- Caminho do arquivo.
- Existência física da imagem.
- Importação e resolução do asset.
- Formato e compatibilidade.
- Tratamento de erro de carregamento.
- Componente responsável pela renderização.

Verificar se existe uma imagem padrão para falhas.

Se não existir, implementar um fallback seguindo a identidade visual e os assets já disponíveis.

Não substituir a imagem por outra sem verificar a causa.

#### 14.3. Divergências entre Módulos e Progresso

Investigar três inconsistências.

**A. Ordem dos módulos**

Em Módulos:
1. Fundamentos da Web Moderna.
2. APIs e Integração.

Em Progresso, a ordem aparece invertida.

Investigar se as telas utilizam critérios diferentes, como:
- Data de criação.
- ID.
- Ordem de cadastro.
- Campo de ordenação.
- Ordem retornada pela API.

Adotar um critério único e consistente, preferencialmente o campo de ordenação já existente.

**B. Quantidade de alunos**

O mesmo curso apresenta:
- 4 alunos matriculados no detalhe.
- 6 alunos no total em Progresso.

Investigar se os indicadores consideram conjuntos diferentes, como matrículas ativas, canceladas, pendentes ou históricos.

Definir a regra a partir do modelo de negócio atual e utilizar o mesmo critério nas telas.

Não somar alunos duplicados nem misturar status sem justificativa.

**C. Quantidade de conteúdos**

O módulo Fundamentos da Web Moderna apresenta:
- 4 conteúdos em Módulos.
- 3 materiais em Progresso.

Investigar a diferença entre conteúdos, materiais, quizzes e avaliações.

Verificar quais tipos de registros são contabilizados em cada tela.

Padronizar a nomenclatura e os critérios, preservando a distinção entre:
- Conteúdos.
- Materiais.
- Quizzes.
- Avaliações formais.

Não contabilizar elementos diferentes como se fossem a mesma categoria.

Para cada divergência, registrar:
1. Origem técnica.
2. Regra de negócio envolvida.
3. Arquivos ou métodos responsáveis.
4. Correção implementada.

#### 14.4. Navegação Acadêmico

Avaliar a barra:

ACADÊMICO: CURSOS > MÓDULOS > PROGRESSO.

Atualmente ela repete o menu lateral e transmite a ideia de uma sequência obrigatória de etapas.

Verificar se:
- Deve ser removida.
- Deve ser substituída por breadcrumb contextual.
- Deve ser mantida como navegação hierárquica.

Escolher a solução mais coerente com o restante do sistema e justificar no relatório.

#### 14.5. Revisão das demais telas

Revisar todas as telas acessíveis ao coordenador.

Verificar:
- Hierarquia visual.
- Espaçamento.
- Alinhamento.
- Botões e variantes.
- Cores.
- Badges.
- Ícones.
- Modais.
- Estados vazios.
- Responsividade.
- Consistência de navegação.

Corrigir problemas pontuais e comprovados.

Não realizar redesenhos ou alterações estruturais amplas sem necessidade. Registrar no relatório problemas encontrados que exijam aprovação.

### Item 16 — Transformar o detalhe do curso em painel completo

Local: Coordenador → Cursos → Detalhe do curso.

Atualmente a tela funciona principalmente como uma página de encaminhamento para outras áreas, com pouco conteúdo próprio.

Transformá-la em um painel de acompanhamento do curso.

**Antes de desenvolver novos endpoints, auditar os endpoints existentes e verificar quais dados já podem ser utilizados.**

Reaproveitar serviços, repositories e DTOs existentes sempre que possível.

Criar novos endpoints somente quando houver necessidade comprovada.

#### 16.1. Cabeçalho fixo

Criar uma área superior persistente durante a navegação pelo painel, contendo:

- Imagem de capa.
- Título do curso.
- Código.
- Modelo: Pago ou Grátis.
- Botão EDITAR CURSO em destaque.

Exibir também indicadores:
- Alunos matriculados.
- Quantidade de módulos.
- Professores associados.

Requisitos:
- Não cortar textos.
- Não utilizar larguras rígidas que provoquem quebra inadequada.
- Tratar cursos com mais de um professor.
- Utilizar apresentação adequada para nomes extensos.
- Manter a área responsiva.

#### 16.2. Aba VISÃO GERAL

Apresentar:

**Descrição**
- Descrição completa do curso.

**Indicadores acadêmicos**
- Progresso médio.
- Percentual de conclusão.
- Média geral.
- Quantidade de aprovados.

Os indicadores devem utilizar regras consistentes com as telas de Progresso.

Não confundir progresso de conteúdo com aprovação em avaliação.

**Pontos de atenção**

Criar uma seção que identifique:
- Módulos sem conteúdo.
- Avaliações com zero participantes.
- Cursos com média geral baixa.

Para média geral baixa:
- Verificar se já existe um limite definido no projeto.
- Se existir, reutilizar.
- Se não existir, não inventar silenciosamente um limite.
- Propor um valor no relatório e identificar a necessidade de aprovação.

**Navegação complementar**

Adicionar o link VER PROGRESSO COMPLETO, direcionando para a tela atual de Progresso.

A tela de Progresso deve continuar existindo e mantendo suas funcionalidades.

#### 16.3. Aba MÓDULOS

Exibir uma lista recolhível dos módulos do curso.

Ao expandir um módulo, apresentar:
- Conteúdos.
- Materiais.
- Quizzes, quando aplicável.
- Avaliações formais associadas.

A aba deve ser exclusivamente de consulta para o coordenador.

Não permitir:
- Criar módulos.
- Editar conteúdos.
- Criar ou excluir avaliações por meio dessa área.

Respeitar as permissões já estabelecidas no sistema.

#### 16.4. Aba PROFESSORES

Exibir os professores associados ao curso.

Para cada professor, apresentar:
- Foto ou iniciais.
- Nome.
- Especialidade.
- E-mail.
- Quantidade ou relação de módulos associados.
- Status.

Tratar corretamente a associação de múltiplos professores ao mesmo curso.

Não apresentar dados de turmas.

#### 16.5. Aba ALUNOS

Exibir os alunos matriculados no curso.

Para cada aluno:
- Nome e identificação visual.
- Progresso.
- Média.
- Status.

Disponibilizar:
- Busca por aluno.
- Filtro por status.
- Indicadores de resultados encontrados.
- Estado vazio quando não houver registros.

Utilizar a mesma regra de matrícula e desempenho adotada nas demais telas.

Não criar um segundo sistema de cálculo de progresso.

### Item 17 — Ocultar valores financeiros do Coordenador

O valor do curso deve ser acessível exclusivamente ao perfil Admin.

No perfil Coordenador:
- Remover valores financeiros do painel.
- Remover preços de todas as demais telas acessíveis.
- Remover o campo PREÇO do modal EDITAR CURSO.
- Remover o aviso sobre administradores desse modal, pois não haverá mais campo financeiro nessa interface.

No back-end:
- Não retornar propriedades financeiras desnecessárias para o coordenador.
- Impedir que o coordenador altere o preço por chamadas diretas à API.
- Validar o perfil em todas as operações que envolvam alteração financeira.
- Preservar integralmente as operações administrativas.

Não basta esconder o campo no frontend.

---

# 7. Todos os perfis e aplicativos

### Item 5 — Remover referências a TURMA da interface

Aplicação obrigatória em:
- Web.
- Mobile.
- Desktop.

Realizar uma busca completa por referências a:
- Turma.
- Turmas.
- NomeTurma.
- Turma online.
- Turmas ativas.
- Demais nomenclaturas equivalentes exibidas ao usuário.

Verificar especialmente:

**Dashboard do Coordenador**
- Card TURMAS ATIVAS.
- Subtítulo Acompanhe turmas, cursos e indicadores.
- Linhas TURMA ONLINE - ...

Substituir por indicadores úteis quando houver informação equivalente disponível.

Caso não exista informação relevante para substituir, remover o elemento.

**Modal de detalhes do Professor**
- Aplicar a remoção descrita no item 11.

**Rota /app/turmas**
- Investigar a finalidade da rota.
- Identificar seu uso na tela de Progresso.
- Renomear para uma rota semanticamente adequada à funcionalidade atual.
- Atualizar todos os pontos de navegação e referências.
- Preservar o comportamento de Progresso.

Antes de renomear, verificar deep links, bookmarks internos, navegação e chamadas de API.

**Limite importante:**

Este item trata exclusivamente da interface e navegação.

Não remover entidades, tabelas, propriedades ou relacionamentos do back-end apenas por conterem o termo turma.

Esses elementos serão analisados no item 18.

### Item 15 — Correção geral de acentuação

Aplicação obrigatória em:
- Web.
- Mobile.
- Desktop.

Realizar uma revisão de todos os textos visíveis ao usuário.

Exemplos:
- Nova avaliacao → Nova avaliação.
- voce → você.
- questoes → questões.
- Modulos → Módulos.
- Coordenacao → Coordenação.
- Ola → Olá.
- Media → Média.
- avaliacoes → avaliações.
- aplicacoes → aplicações.

Verificar também:
- Menus.
- Botões.
- Labels.
- Placeholders.
- Tooltips.
- Mensagens de erro.
- Notificações.
- Estados vazios.
- Modais.
- Textos de confirmação.
- Descrições e indicadores.

**Restrição absoluta:**

Alterar exclusivamente textos exibidos.

Não alterar:
- Nomes de variáveis.
- Chaves JSON.
- Propriedades da API.
- Nomes de campos do banco.
- Rotas.
- Identificadores.
- Valores utilizados em condicionais.
- Enumerações.
- Parâmetros de métodos.
- Constantes que participem da lógica.

Preservar codificação UTF-8 e evitar corrupção de caracteres.

---

# 8. Perfil ADMIN

### Item 18 — Auditoria e remoção do fluxo de TURMAS

O menu TURMAS e o botão de vinculação ainda aparecem no perfil Admin, embora o conceito tenha sido removido do fluxo atual.

Antes de remover qualquer funcionalidade, realizar um mapeamento completo.

Investigar:
- Menu e navegação.
- Rotas.
- Páginas e componentes.
- Botões de criação e vinculação.
- Chamadas de API.
- Controllers.
- Services.
- Repositories.
- DTOs.
- Entidades e relacionamentos.
- Permissões.
- Consultas e relatórios.
- Dependências de matrículas, avaliações e tentativas.

Classificar cada elemento em:

**A. Sobra do fluxo antigo**
Elementos sem utilidade no fluxo atual e que podem ser removidos com segurança.

**B. Dependência ainda necessária**
Elementos que continuam sendo utilizados por outras funcionalidades, mesmo que o conceito de turma tenha deixado de aparecer na interface.

Remover somente os elementos classificados como obsoletos.

Preservar o que for necessário para:
- Matrículas.
- Avaliações.
- Tentativas.
- Histórico acadêmico.
- Desempenho.
- Certificação.
- Relacionamentos ainda utilizados.

Não excluir tabelas ou realizar migrations destrutivas sem comprovação de que não existem dependências.

Registrar no relatório:
- O que foi removido.
- O que foi mantido.
- O motivo técnico de cada decisão.
- Os impactos identificados.

### Item 19 — Auditoria e remoção do fluxo manual de MATRÍCULAS

O menu MATRÍCULAS ainda aparece na sidebar do Admin, mas o fluxo atual utiliza matrícula automática.

Investigar:
- Menu.
- Rotas.
- Telas.
- Aprovação manual.
- Rejeição manual.
- Vinculação.
- Chamadas de API.
- Controllers e serviços.
- Relacionamentos e consultas.

Remover exclusivamente o fluxo manual obsoleto.

**Preservação obrigatória:**

A compra de cursos deve continuar funcionando.

Preservar:
- POST /Matriculas/comprar.
- Validação de pagamento.
- Criação automática de matrícula.
- Liberação de acesso de acordo com a modalidade do curso.
- Histórico de matrículas.
- Consultas utilizadas pelas demais áreas.

Verificar se a retirada do menu faz o administrador perder uma consulta importante, como visualizar os alunos matriculados em cada curso.

Caso essa informação seja necessária, avaliar sua apresentação no painel do curso do Admin ou em outra área existente.

Não criar uma nova tela administrativa sem antes avaliar as telas e endpoints disponíveis.

Registrar no relatório o que saiu, o que permaneceu e o motivo.

---

# 9. Diagnóstico obrigatório dos botões e badges opacos

Antes de corrigir individualmente os itens 1, 2, 3, 4 e 7, investigar se existe uma causa compartilhada.

Analisar:
- Componentes reutilizáveis de botão.
- Variantes.
- Classes CSS.
- Tokens de cor.
- Estados `disabled`.
- Estados `hover`, `focus` e `active`.
- Opacidade herdada.
- Regras CSS sobrescritas.
- Condicionais de renderização.
- Propriedades recebidas pelos componentes.

Identificar se os elementos estão sendo renderizados como desabilitados indevidamente ou se existe uma falha na configuração das variantes.

Se houver causa comum:
1. Corrigir a origem.
2. Identificar todas as telas que utilizam o componente.
3. Verificar se a correção afeta outras interfaces.
4. Preservar estados realmente desabilitados.
5. Testar novamente os itens 1, 2, 3, 4 e 7.

Não aplicar correções isoladas que apenas escondam o problema original.

---

# 10. Regras de negócio que devem ser preservadas

Durante toda a implementação, respeitar as seguintes distinções:

### Conteúdo
Material disponibilizado para estudo.

### Quiz
Exercício simples dentro dos conteúdos. Não deve ser confundido com avaliação formal e não deve gerar aprovação ou certificado.

### Avaliação
Instrumento formal de desempenho, utilizado para aprovação e certificação conforme as regras existentes.

### Matrícula
Criada automaticamente conforme o fluxo de aquisição e liberação do curso.

### Certificado
Liberado automaticamente de acordo com as regras de conclusão e desempenho existentes.

Não reintroduzir conceitos ou fluxos que já foram removidos do produto.

---

# 11. Testes obrigatórios

Executar os testes possíveis com o ambiente disponibilizado.

### 11.1. Backend

- Compilação da solução.
- Validação de dependências.
- Testes de autorização por perfil.
- Tentativas de acesso direto a endpoints restritos.
- Consulta e alteração de preço.
- Criação de módulos.
- Compra e matrícula automática.
- Consultas de alunos, módulos e professores.
- Integridade dos relacionamentos preservados.

### 11.2. Web

Testar:
- Aluno.
- Professor.
- Coordenador.
- Admin.

Verificar navegação, botões, badges, modais, filtros, abas, carregamento de dados e estados vazios.

### 11.3. Mobile

Verificar:
- Textos e acentuação.
- Referências a turmas.
- Navegação.
- Responsividade.
- Componentes compartilhados.
- Ausência de regressões.

### 11.4. Desktop

Verificar:
- Textos e acentuação.
- Referências a turmas.
- Navegação.
- Menus por perfil.
- Botões e modais.
- Preservação dos fluxos existentes.

### 11.5. Consistência de dados

Comparar os mesmos cursos nas diferentes telas.

Garantir consistência em:
- Quantidade de alunos.
- Quantidade de módulos.
- Quantidade de conteúdos.
- Ordem dos módulos.
- Indicadores de progresso.
- Média e aprovados.

Não validar apenas a aparência. Os dados apresentados devem corresponder às consultas e regras de negócio.

---

# 12. Relatório final obrigatório

Ao concluir, produzir um relatório técnico organizado com a numeração original dos itens.

Para cada item, informar:

1. Problema identificado.
2. Diagnóstico técnico.
3. Solução implementada.
4. Arquivos alterados.
5. Aplicativos afetados: Web, Mobile e/ou Desktop.
6. Testes realizados.
7. Resultado dos testes.

Além disso, apresentar obrigatoriamente:

### A. Causa dos botões e badges opacos
Identificar a causa raiz e os componentes ou estilos envolvidos.

### B. Filtros do item 12
Listar os filtros implementados, seus campos de origem e sua combinação.

### C. Divergências do item 14
Explicar a origem de cada divergência e como a consistência foi restabelecida.

### D. Turmas — item 18
Listar separadamente o que foi removido e o que foi mantido, com justificativa técnica.

### E. Matrículas — item 19
Listar o que foi removido e o que foi preservado, demonstrando que a compra automática continua funcionando.

### F. Cobertura multiplataforma
Informar exatamente em quais aplicativos cada alteração foi aplicada.

### G. Testes
Separar:
- Testes executados e aprovados.
- Testes executados e reprovados.
- Testes não executados.
- Testes impossíveis de validar por limitações do ambiente.

Não declarar um teste como aprovado sem executá-lo.

### H. Pendências e decisões
Listar regras de negócio sem definição, limites que dependem de aprovação e decisões estruturais que não puderam ser tomadas com segurança.

---

# 13. Critérios finais de aceitação

A implementação será considerada concluída somente quando:

- Os 19 itens tiverem sido analisados e classificados.
- As alterações autorizadas tiverem sido efetivamente implementadas.
- As restrições de perfil estiverem protegidas no back-end.
- Os três aplicativos tiverem sido revisados.
- Os itens 5 e 15 tiverem cobertura obrigatória nos três aplicativos.
- A compra automática continuar funcionando.
- As dependências necessárias de turma permanecerem preservadas.
- Os dados das telas de Módulos, Progresso e detalhe do curso estiverem consistentes.
- Não houver regressões identificadas nos fluxos não relacionados.
- O relatório final estiver completo.

**Diretriz final:** priorize correções de causa raiz, reaproveitamento da arquitetura e segurança dos dados. Não faça alterações cosméticas para mascarar problemas de lógica. Não invente regras de negócio. Quando uma decisão depender de definição do produto, registre a dúvida e prossiga com as demais atividades independentes.
