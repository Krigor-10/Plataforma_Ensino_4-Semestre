# PENDENTE para segunda-feira, 23/11/2026: auditoria e modernização de UX/UI do app mobile

**Pedido do usuário (19/11/2026):** anotar este prompt para fazer na segunda, junto com as imagens de referência em `E:\Mobile`.

**Objetivo esclarecido pelo usuário:** na segunda, **verificar a viabilidade** de dar **mais vida e estilo** ao app. Ou seja, fazer a avaliação (o que dá para melhorar, com que esforço e risco até 27/11), mostrar imagens e decidir com ele. **Não é para implementar tudo direto.** A implementação só vem depois da aprovação, item por item.

**Entrega esperada na segunda:**
- uma lista curta do que dá "vida e estilo" com pouco risco: cores semânticas, ícones padronizados, barra inferior, cards, estados de carregamento e vazio, microanimações leves, feedback tátil;
- o esforço e o risco de cada item, e se ele exige biblioteca nova compatível com o Expo 57;
- imagens de antes e depois das telas principais;
- recomendação do que cabe antes da apresentação e do que fica para depois.

## Imagens de referência (pasta `E:\Mobile`, conferida em 19/11)

| Arquivo | Tamanho |
|---|---|
| `E:\Mobile\Navegacao mobile.jpg` | 31 KB |
| `E:\Mobile\Showcase do app CodeRyse Academy.png` | 1,7 MB |
| `E:\Mobile\padronizacao icones.png` | 23 KB |

**Atenção:** o prompt cita um **"vídeo de navegação mobile"**, mas a pasta só tem imagens. Na segunda, perguntar ao usuário onde está o vídeo, ou se as imagens o substituem.

## O que levar em conta na segunda (o agente de arquitetura já sabe)

- **Projeto:**
  - `mobile/` usa Expo SDK 57, React Native 0.86 e React 19.2, em **JavaScript** (não TypeScript), com `@react-navigation` (tabs + native-stack);
  - já tem `@expo/vector-icons` (Ionicons);
  - tema em `mobile/src/lib/theme.js` (`#111319`, `#1d1f26`, `#7b2ff7`…);
  - só tem testes de `src/lib` (85), nenhum de tela.
- **Histórico de redesign:** existem rodadas anteriores em `docs/redesign-mobile/` (Stitch + 3 rodadas; rodada 3 aplicada em `a91a017`, falta validar) e as imagens `1_inicio.png` … `8_meu_perfil.png`. A nova auditoria deve partir delas, sem descartar o que foi aprovado: 5 abas, quiz sem nota, manter o troféu para a gamificação futura.
- **Prompts do mobile ainda não aplicados**, que tocam as mesmas telas:
  - `docs/certificados-mobile/PROMPT-agente-certificados-mobile.md`: certificado automático + tela de certificados;
  - revisão de quiz/avaliação sem imagens (achado da auditoria de 18/11; o backend não envia os anexos).

  Decidir a ordem para não dar retrabalho. O mais seguro é aplicar a correção de certificados antes da modernização visual.
- **Decisões abertas do mobile:** chamados e chatbot no celular (antes ou depois de 27/11). Também não há tempo limite nas chamadas à API.
- **O prompt pede duas fases.** A Fase 1 (auditoria e plano) deve voltar para o usuário aprovar **antes** de qualquer mudança. Seguir: uma decisão por vez e imagem antes de cada escolha de layout.
- **Prazo da apresentação:** 27/11/2026. Avaliar o risco das dependências novas (`lucide-react-native`, Reanimated, Gesture Handler, Haptics) com o SDK 57 antes de instalar.

---

## Prompt do usuário (texto original, sem alterações)

# CODE RYSE MOBILE — AUDITORIA E MODERNIZAÇÃO COMPLETA DE UX/UI

## 1. Objetivo

Realize uma auditoria completa da interface e da experiência de utilização do aplicativo mobile CodeRyse Academy, propondo e implementando melhorias de UX/UI para elevar a qualidade visual, usabilidade, consistência e percepção profissional da plataforma.

Utilize o vídeo de navegação mobile fornecido como referência da interface atual.

O objetivo não é reconstruir o aplicativo nem alterar sua arquitetura funcional. É modernizar a experiência visual, preservar as funcionalidades existentes e estabelecer uma identidade visual consistente em todas as telas.

A plataforma deve transmitir a experiência de um produto educacional moderno, tecnológico, intuitivo e profissional.

## 2. Contexto técnico

O projeto mobile utiliza:
- React Native.
- Expo SDK 57.
- TypeScript/JavaScript, conforme a estrutura existente.
- Navegação e componentes já implementados no projeto.
- Integração com a API .NET existente.

Antes de qualquer alteração:

1. Analise a estrutura completa da pasta mobile.
2. Identifique as telas, componentes, estilos, navegação e bibliotecas existentes.
3. Identifique os componentes compartilhados e os específicos de cada tela.
4. Verifique quais bibliotecas já estão instaladas.
5. Analise o vídeo de referência para compreender os fluxos e a apresentação atual.
6. Identifique oportunidades de reutilização e padronização.

Não presuma que determinado componente ou biblioteca está instalado. Verifique os arquivos do projeto.

## 3. Direção visual

Adote uma identidade visual denominada:

**CodeRyse Mobile — Dark Tech Education**

A proposta deve preservar a identidade visual atual, especialmente o tema escuro e o roxo característico da plataforma.

### Paleta de cores de referência

| Elemento | Cor |
|---|---|
| Background principal | #10111A |
| Superfície dos cards | #1B1D2B |
| Superfície elevada | #242638 |
| Roxo principal | #7928F5 |
| Roxo secundário | #A78BFA |
| Azul/ciano | #38BDF8 |
| Verde sucesso | #22C55E |
| Amarelo atenção | #FBBF24 |
| Vermelho erro | #F87171 |
| Texto principal | #F5F5FA |
| Texto secundário | #A1A1B5 |

Essas cores são referências iniciais. Analise a paleta já existente e adapte os valores quando necessário para manter a identidade visual e o contraste.

### Regras visuais

- Evitar excesso de elementos roxos.
- Utilizar cores semânticas para representar estados.
- Criar hierarquia clara entre background, cards e superfícies elevadas.
- Evitar bordas excessivamente destacadas.
- Utilizar gradientes com moderação.
- Padronizar bordas, espaçamentos e arredondamentos.
- Manter consistência tipográfica.
- Evitar excesso de informações dentro dos cards.
- Não utilizar sombras pesadas ou efeitos exagerados.

## 4. Iconografia

Avalie a substituição ou padronização dos ícones atuais utilizando Lucide React Native (`lucide-react-native`).

Antes de instalar, verifique se já existe uma biblioteca de ícones adequada.

Padronize:
- Tamanho.
- Espessura dos traços.
- Alinhamento.
- Cores.
- Estados ativos e inativos.
- Espaçamento em relação aos textos.

Utilize ícones semanticamente adequados para:
- Início.
- Cursos.
- Conteúdos.
- Avaliações.
- Progresso.
- Certificados.
- Notificações.
- Perfil.
- Configurações.
- Vídeos.
- Materiais e PDFs.
- Quizzes.
- Conclusão de atividades.

Não misture indiscriminadamente ícones preenchidos, contornados e emojis.

## 5. Auditoria e melhorias por tela

Analise individualmente todas as telas existentes.

### Início
- Melhorar a hierarquia das informações.
- Dar destaque ao curso em andamento.
- Apresentar o progresso do aluno de maneira visual.
- Evitar repetição de cards.
- Melhorar a distribuição dos elementos.

### Cursos
- Melhorar os cards de cursos.
- Utilizar imagens com proporções consistentes.
- Destacar nome, categoria e progresso.
- Utilizar indicadores de conclusão.
- Diferenciar cursos em andamento e concluídos.
- Melhorar as ações de iniciar e continuar curso.

### Conteúdos
- Diferenciar visualmente materiais, vídeos e quizzes.
- Utilizar ícones e cores semânticas.
- Melhorar a organização dos conteúdos.
- Tornar os cards mais intuitivos.
- Melhorar os estados de conclusão e pendência.
- Preservar a navegação entre módulos e conteúdos.

### Avaliações
- Diferenciar avaliações disponíveis, em andamento, concluídas e indisponíveis.
- Melhorar os indicadores de status.
- Organizar duração, quantidade de questões e nota mínima.
- Destacar a ação principal de iniciar ou continuar.

### Execução de avaliações
- Melhorar o cabeçalho da avaliação.
- Destacar o número da questão.
- Apresentar o progresso da prova.
- Melhorar a visualização do temporizador.
- Aumentar a clareza das alternativas.
- Destacar visualmente a alternativa selecionada.
- Melhorar os botões anterior e próximo.
- Apresentar confirmação antes da finalização.
- Melhorar a visualização das questões respondidas e pendentes.

### Progresso
- Avaliar a utilização de indicadores circulares.
- Destacar cursos concluídos e em andamento.
- Apresentar avaliações realizadas.
- Melhorar a visualização da evolução do aluno.

### Certificados
- Valorizar visualmente os certificados conquistados.
- Melhorar a apresentação das informações.
- Facilitar a visualização e o compartilhamento.

### Notificações
- Diferenciar notificações lidas e não lidas.
- Utilizar indicadores de novas notificações.
- Melhorar a organização por data.
- Evitar excesso de elementos visuais.

### Perfil
- Melhorar a organização dos dados.
- Separar informações pessoais e configurações.
- Melhorar os campos e ações de edição.
- Manter uma experiência simples e intuitiva.

Não crie telas ou funcionalidades inexistentes apenas para preencher essas categorias. Primeiro identifique o que realmente existe no projeto.

## 6. Navegação e componentes

Avalie a barra de navegação inferior.

Preservar as áreas principais atualmente definidas no aplicativo.

Melhorias desejadas:
- Fundo com superfície diferenciada.
- Borda superior discreta.
- Ícone ativo em roxo.
- Indicador visual da seção selecionada.
- Texto de identificação abaixo dos ícones.
- Transições suaves.
- Respeito às Safe Areas do Android e iOS.

Avalie também a utilização de:
- Bottom Sheets para ações secundárias.
- Skeleton Loading para carregamentos.
- Badges para estados.
- Progress Bars para evolução.
- Cards reutilizáveis.
- Modais padronizados.
- Empty States para listas vazias.
- Feedback visual para ações.

Não transforme todas as interações em modais. Utilize o componente adequado para cada situação.

## 7. Interações e microanimações

Avalie a utilização de:
- React Native Reanimated.
- React Native Gesture Handler.
- Feedback tátil com Expo Haptics.

Verifique a compatibilidade com o SDK atual antes de adicionar ou atualizar dependências.

Implemente interações discretas:
- Feedback ao pressionar botões.
- Transições entre telas.
- Animação de progresso.
- Seleção de alternativas.
- Feedback de conclusão.
- Animação de abertura de menus.
- Skeleton Loading.
- Feedback tátil em ações relevantes.

As animações não podem prejudicar o desempenho ou dificultar a acessibilidade.

## 8. Design System Mobile

Crie ou aperfeiçoe um sistema visual centralizado e reutilizável.

Organize:
- Cores.
- Tipografia.
- Espaçamentos.
- Border Radius.
- Tamanhos de ícones.
- Botões.
- Cards.
- Badges.
- Indicadores de progresso.
- Estados de carregamento.
- Estados de erro.
- Estados vazios.

Evite estilos duplicados e componentes com aparência divergente.

Utilize os componentes compartilhados sempre que possível.

## 9. Responsividade e acessibilidade

A interface deve funcionar corretamente em:
- Smartphones Android.
- Smartphones iOS.
- Diferentes tamanhos de tela.
- Diferentes resoluções.
- Diferentes densidades de pixels.

Requisitos:
- Respeitar Safe Areas.
- Evitar conteúdo cortado.
- Evitar dimensões fixas desnecessárias.
- Garantir áreas de toque adequadas.
- Melhorar contraste.
- Respeitar ampliação de fontes.
- Utilizar labels acessíveis.
- Suportar leitores de tela.
- Garantir que informações não dependam exclusivamente de cores.

## 10. Restrições obrigatórias — NÃO REGREDIR

Este trabalho é uma modernização de UX/UI, não uma reescrita funcional.

Preserve rigorosamente:

1. Toda a lógica de negócio existente.
2. Autenticação e autorização.
3. Integração com a API .NET.
4. Rotas e parâmetros de navegação.
5. Regras de matrícula e acesso aos cursos.
6. Regras de progresso.
7. Regras de conclusão de conteúdos.
8. Regras de quizzes e avaliações.
9. Cálculo de notas e tentativas.
10. Emissão automática de certificados.
11. Persistência de dados.
12. Funcionamento de notificações.
13. Funcionalidades específicas de cada perfil.

Não altere endpoints, DTOs, contratos da API, banco de dados ou regras de negócio sem necessidade comprovada e autorização.

Não remova funcionalidades existentes para simplificar a interface.

Não altere a experiência mobile com base em suposições sobre o funcionamento do backend.

## 11. Estratégia de execução

Execute o trabalho em duas fases.

### FASE 1 — Auditoria e planejamento

Antes de modificar arquivos, apresente:

- Inventário das telas existentes.
- Componentes compartilhados identificados.
- Problemas visuais encontrados.
- Problemas de usabilidade.
- Bibliotecas existentes.
- Bibliotecas adicionais recomendadas.
- Proposta de Design System.
- Alterações recomendadas por tela.
- Arquivos que provavelmente precisarão ser modificados.
- Riscos de regressão.

Separe as recomendações em prioridade alta, média e baixa.

Não comece alterações estruturais antes de apresentar essa análise.

### FASE 2 — Implementação

Após a auditoria:

- Implemente as melhorias visuais aprovadas.
- Reutilize componentes existentes.
- Centralize os estilos compartilhados.
- Evite duplicações.
- Preserve a lógica funcional.
- Execute verificações de TypeScript e build.
- Teste os fluxos principais.
- Verifique Android e iOS.
- Corrija eventuais regressões.

Não faça alterações fora do escopo.

## 12. Critérios de aceitação

O trabalho será considerado concluído quando:

- Todas as telas principais apresentarem identidade visual consistente.
- A navegação estiver funcional.
- Os componentes compartilhados estiverem padronizados.
- Os ícones apresentarem o mesmo padrão visual.
- A interface funcionar em diferentes tamanhos de tela.
- As interações apresentarem feedback adequado.
- As regras de negócio permanecerem intactas.
- A integração com a API continuar funcionando.
- Não existirem erros de compilação introduzidos pelas alterações.
- Os fluxos principais estiverem validados.

## 13. Relatório final

Ao finalizar, apresente:

1. Telas analisadas.
2. Melhorias implementadas.
3. Componentes criados ou reutilizados.
4. Bibliotecas adicionadas ou aproveitadas.
5. Arquivos modificados.
6. Verificações executadas.
7. Testes realizados.
8. Problemas encontrados.
9. Pendências.
10. Riscos ou limitações.

**Diretriz final:** priorize qualidade visual, usabilidade, consistência e estabilidade. O CodeRyse deve parecer um único produto bem projetado, e não um conjunto de telas desenvolvidas separadamente.

Não considere uma tela modernizada apenas por possuir novas cores ou efeitos. Cada alteração deve melhorar efetivamente a compreensão, a navegação ou a experiência do aluno.
