# Planejamento da Solução Tecnológica

Etapa 2 do PIM IV (disciplina Empreendedorismo em TI) — continuação do plano de negócio da CodeRyse Academy já caracterizado no PIM III, agora detalhando a solução tecnológica em si (o PlataformaEnsino) que sustenta esse negócio.

## 2.1 Problema a Ser Resolvido

Estudantes de graduação em Tecnologia da Informação chegam ao mercado de trabalho com lacunas em conhecimentos que o currículo tradicional pressupõe como prévios, mas raramente ensina de forma estruturada: versionamento com Git, uso de terminal, lógica de programação aplicada, fundamentos de redes. Essa lacuna penaliza de forma desproporcional quem teve menos acesso prévio a tecnologia — recorte que, no Brasil, atravessa desigualdade racial e socioeconômica no setor de TI (aprofundado em `etapa3-responsabilidade-social-diversidade.md`). Cursos que cobrem essas lacunas existem no mercado, mas majoritariamente pagos, o que reproduz a mesma barreira de entrada que a CodeRyse Academy se propõe a remover.

## 2.2 Objetivos da Solução

- Oferecer um catálogo de cursos complementares gratuitos, organizados em módulos e conteúdos didáticos (texto, PDF, vídeo, link), com avaliações integradas.
- Acompanhar o progresso do estudante em três granularidades (conteúdo, módulo, curso), para que tanto o aluno quanto professores/coordenadores enxerguem onde há dificuldade real.
- Emitir certificação com verificação pública, sem depender da palavra do estudante ou do prestígio da instituição de origem.
- Estar disponível em qualquer dispositivo que o estudante já tenha — computador, celular ou desktop — sem duplicar cadastro, progresso ou histórico entre eles.

## 2.3 Público-Alvo

**Primário:** estudantes graduandos de cursos de TI (o mesmo público definido no PIM III), com maior peso em quem tem acesso limitado a formação complementar paga.

**Secundário:** professores que quer publicar conteúdo extracurricular e banco de questões reaproveitável entre turmas; coordenadores pedagógicos que precisam de visão consolidada de desempenho por curso/turma sem depender de planilha manual.

## 2.4 Proposta de Valor

| Para quem | O que a CodeRyse Academy entrega |
|---|---|
| Aluno | Acesso gratuito a conteúdo que o currículo formal não cobre, no dispositivo que ele já usa, com certificado verificável ao final |
| Professor | Banco de questões reaproveitável (publica a mesma questão em várias avaliações via snapshot), anexos de arquivo por questão, feedback direto ao aluno |
| Coordenador | Dashboard de desempenho por curso/turma sem depender de planilha, aprovação de matrícula centralizada |
| Mercado/recrutador | Certificado com código público de verificação (`GET /verificar/:codigo`) — comprova competência sem precisar confiar só na palavra do candidato |

## 2.5 Benefícios Esperados

- Redução do tempo até a empregabilidade do aluno, ao fechar lacunas técnicas antes do primeiro emprego.
- Retenção maior que um curso avulso, porque o progresso é granular e visível (o aluno vê exatamente quanto falta, não só "concluído/não concluído").
- Dado de desempenho estruturado (notas, tentativas, progresso) como insumo pra análise futura — é a ponte direta com o capítulo de Machine Learning e Análise de Dados que a CodeRyse Academy já trouxe do PIM III.
- Menor custo de suporte administrativo pra coordenação, porque matrícula, aprovação e emissão de certificado são automatizadas, não manuais.

## 2.6 Diferenciais Competitivos

- **Gratuito por padrão** — `Curso.EhGratuito` é a regra, não a exceção; concorrentes como cursos pagos genéricos cobram por qualquer conteúdo.
- **Foco em lacuna curricular específica**, não em catálogo genérico — a CodeRyse Academy não compete em quantidade de cursos, compete em cobrir exatamente o que a graduação deixa de fora.
- **Multiplataforma nativa desde a arquitetura**, não como retrofit: Web, Mobile (Expo/React Native) e Desktop (Electron) compartilham o mesmo backend C# via Gateway — um estudante troca de dispositivo sem perder nada, e a plataforma não precisa manter três implementações de regra de negócio.
- **Certificação com verificação pública** — dos endpoints da API, `/verificar/:codigo` é o único que não exige login, justamente porque seu público é um terceiro (recrutador) checando algo que o aluno reivindica, não o próprio aluno logado.
