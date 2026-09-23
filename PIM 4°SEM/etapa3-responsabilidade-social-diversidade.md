# Responsabilidade Social e Diversidade

Etapa 3 do PIM IV (disciplina EAD — Relações étnico-raciais e afrodescendência). Conteúdo redigido a partir de características reais do PlataformaEnsino/CodeRyse Academy (backend, frontend e regras de negócio já implementadas) — não são recursos hipotéticos.

## 3.1 Combate à Discriminação

O modelo de dados da CodeRyse Academy não coleta nem armazena atributos sensíveis de raça, etnia, gênero ou orientação — a entidade `Usuario` (base de Aluno, Professor, Coordenador e Admin) registra apenas nome, e-mail, CPF, telefone e endereço, os dados estritamente necessários à identificação acadêmica. Não há, portanto, nenhum campo no sistema capaz de alimentar discriminação algorítmica ou curadoria de conteúdo baseada em perfil demográfico.

O acesso da plataforma é hierarquizado por papel funcional (Aluno, Professor, Coordenador, Admin), nunca por atributo pessoal: qualquer estudante matriculado enxerga o mesmo catálogo de cursos, os mesmos critérios de avaliação e o mesmo caminho até a certificação, independentemente de quem seja.

## 3.2 Valorização da Diversidade

A proposta de negócio da CodeRyse Academy nasce de uma lacuna educacional concreta: conteúdos técnicos fundamentais (Git, terminal, lógica de programação, redes) que os currículos tradicionais pressupõem como conhecimento prévio, mas que nem todo estudante chega à graduação já dominando — o que penaliza desproporcionalmente quem teve menos acesso prévio a tecnologia, historicamente um recorte que atravessa desigualdade racial e socioeconômica no setor de TI brasileiro. Ao oferecer esse conteúdo gratuitamente, a plataforma reduz uma barreira de entrada que hoje afeta de forma mais dura estudantes negros e de baixa renda, sub-representados na área de tecnologia.

O modelo de matrícula automática (ver `Matricula.Aprovar()` em `Models/Matricula.cs`) elimina também barreiras de julgamento subjetivo no ingresso: a aprovação não depende de análise discricionária de um gestor, apenas da adesão ao curso.

## 3.3 Recursos Tecnológicos Inclusivos

- **Catálogo gratuito por padrão**: `Curso.EhGratuito` é derivado do preço (`Preco <= 0`), e a maior parte do catálogo pedagógico da CodeRyse Academy é oferecida sem custo — o pagamento só existe para cursos pagos específicos, nunca como pré-requisito geral de acesso à plataforma.
- **Multiplataforma**: a mesma conta e o mesmo progresso acadêmico funcionam em Web, Mobile (Android/iOS via Expo) e Desktop (Electron), servidos pelo mesmo backend via Gateway — um estudante sem computador próprio consegue estudar pelo celular sem perder histórico ou certificados.
- **Responsividade mobile-first**: toda a interface (regra 5 do `CLAUDE.md` do projeto) é construída para funcionar em telas pequenas sem cortar conteúdo nem exigir rolagem horizontal, o que é decisivo para quem só acessa a internet pelo smartphone.

## 3.4 Ações Voltadas à Acessibilidade

O frontend aplica marcação de acessibilidade de forma consistente e verificável no código: **138 ocorrências de `aria-label`, `alt` e `role="img"` em 33 arquivos** da interface (`frontend/src/`), cobrindo desde ícones de navegação até gráficos de progresso, para que leitores de tela consigam descrever elementos que, de outra forma, seriam apenas visuais.

Formulários usam `label` associado a cada campo, estados de foco por teclado são visíveis nos componentes interativos, e o contraste de cor é considerado tanto no tema claro quanto no escuro da plataforma (regra 7 do `CLAUDE.md`).

**Limitação reconhecida:** o projeto ainda não oferece legendas em LIBRAS nem intérprete para conteúdo em vídeo — fica registrado como oportunidade de evolução futura, não como algo já implementado, para manter a seção fiel ao estado real do sistema.

## 3.5 Utilização da Tecnologia para Promoção da Cidadania

O propósito declarado da CodeRyse Academy — preencher, gratuitamente, a lacuna entre o que a graduação em TI ensina e o que o mercado de trabalho já exige no primeiro emprego — é, em si, uma aplicação de tecnologia para mobilidade social: reduz o tempo (e o custo) que um estudante leva para se tornar empregável, sem depender de cursos particulares pagos.

O sistema de certificação com verificação pública (`GET /verificar/:codigo`, único endpoint `AllowAnonymous` da API) devolve ao estudante um comprovante de qualificação que qualquer recrutador pode validar sem precisar confiar apenas na palavra do candidato — um recurso de cidadania digital: prova de competência que não depende da rede de contatos ou do prestígio da instituição de origem do estudante.
