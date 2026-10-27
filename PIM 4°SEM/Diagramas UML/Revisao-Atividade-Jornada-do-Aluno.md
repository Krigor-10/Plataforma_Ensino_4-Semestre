# Revisão do diagrama de atividade do Aluno — CodeRyse

Diagrama analisado: **Diagrama de Atividade › Atividade - Jornada do Aluno - CodeRyse Academy** (arquivo `CodeRyse-Diagramas-Sequencia.asta`), lido em 26/10/2026.
As regras foram conferidas no código (`ModeloCurso`, `AcessoAcademicoService`, `MatriculaService`, `AlunoService`, `ProgressoAlunoService`, `CertificadoService`, `SecaoCertificados.jsx`).

Este documento é um manual: o diagrama **não** foi alterado.

---

## 1. Diagnóstico do diagrama atual

### 1.1 Fluxo atual (raias Aluno | Sistema)

```
Início → Acessar a plataforma → Já tem conta?
  [não] Preencher cadastro e escolher curso → Dados válidos e e-mail/CPF livres?
          [não] Mostrar erro do cadastro → volta ao cadastro
          [sim] Criar conta com matrícula aprovada → (junção)
  [sim] → (junção)
→ Informar e-mail e senha → Login aceito?
  [não] Mostrar erro de login → volta
  [sim] Abrir painel do aluno → Já matriculado no curso?
          [não] Solicitar matrícula → Aprovar matrícula automaticamente → (junção)
          [sim] → (junção)
→ Curso pago com pagamento pendente?
  [sim] Confirmar pagamento → Liberar acesso ao curso → (junção)
  [não] → (junção)
→ Realizar Atividades e Quiz → Atualizar progresso → Fazer avaliações
→ Corrigir questões objetivas e lançar nota → Curso concluído e avaliações corrigidas?
  [não] volta para Realizar Atividades e Quiz
  [sim] Solicitar certificado → Emitir certificado → Imprimir ou compartilhar certificado → Fim
```

### 1.2 Problemas encontrados

| # | Elemento atual | Problema |
|---|---|---|
| P1 | Ação **Solicitar certificado** | O aluno não pede o certificado. A liberação deve ser automática. |
| P2 | Decisão **Curso concluído e avaliações corrigidas?** | Não fala em desempenho nem em nota mínima, e não deixa claro que o sistema faz a verificação sozinho. |
| P3 | Decisão **Já matriculado no curso?** (e a nota dela) | Passa a ideia de que o aluno usa a plataforma sem ter escolhido um curso. |
| P4 | **Acessar a plataforma** → **Já tem conta?** | O fluxo não começa pela escolha do curso no site. |
| P5 | **Preencher cadastro e escolher curso** | Na interface, o curso é escolhido **antes**, na página inicial e no popup de detalhes. O cadastro já vem com o curso marcado. |
| P6 | Decisão **Curso pago com pagamento pendente?** | Tem só dois caminhos. Faltam os três modelos de curso: Pago, Gratuito e Acompanhado. |
| P7 | **Confirmar pagamento** → **Liberar acesso ao curso** | Não há decisão "Pagamento confirmado?" nem caminho para quando o pagamento não acontece. |
| P8 | **Realizar Atividades e Quiz** | Junta conteúdo, estudo e quiz numa caixa só e não separa o quiz da avaliação formal. Também foge do padrão de letras: os demais nomes usam só a inicial maiúscula. |
| P9 | **Fazer avaliações** | Não indica que a avaliação só pode ser feita depois de liberada (data de abertura). |
| P10 | Volta [não] do certificado | Só manda o aluno de volta para as atividades. Falta "certificado indisponível" e a indicação das pendências. |
| P11 | Definition do diagrama | O texto diz "emite o certificado" e "cria a conta já matriculado", e não cita os três modelos de curso. |

### 1.3 Elementos válidos, que ficam

- Nó inicial e nó final.
- Raias **Aluno** e **Sistema** e o cabeçalho **Responsável**.
- **Já tem conta?**, que agora entra **depois** da escolha do curso.
- **Dados válidos e e-mail/CPF livres?**, **Mostrar erro do cadastro** e a volta para o cadastro.
- **Informar e-mail e senha**, **Login aceito?**, **Mostrar erro de login** e a volta.
- **Abrir painel do aluno**, que representa o acesso à plataforma.
- **Atualizar progresso**.
- **Corrigir questões objetivas e lançar nota**.
- **Imprimir ou compartilhar certificado**.

---

## 2. O que fazer em cada elemento

### 2.1 Remover

| Elemento | Motivo |
|---|---|
| Ação **Solicitar certificado** e a seta que sai dela | P1 |
| Decisão **Já matriculado no curso?**, a nota dela e as setas [sim] e [não] | P3 |
| Junção **Decision Node & Merge Node13** | Só existia para fechar a decisão acima |
| Ação **Solicitar matrícula** | Passa a ser a ação de sistema "Registrar matrícula no curso escolhido" (ver 2.2) |
| Decisão **Curso pago com pagamento pendente?** e a nota dela | Substituída pela decisão dos três modelos (P6) |
| Junção **Decision Node & Merge Node15** | Substituída pela junção dos três modelos |
| Seta **Solicitar certificado → Emitir certificado** | P1 |

### 2.2 Alterar

| Elemento atual | Novo nome / mudança | Raia |
|---|---|---|
| Acessar a plataforma | **Acessar o site** | Aluno |
| Preencher cadastro e escolher curso | **Preencher cadastro no curso** (o curso já vem escolhido) | Aluno |
| Criar conta com matrícula aprovada | **Criar conta do aluno** | Sistema |
| Aprovar matrícula automaticamente | **Registrar matrícula no curso escolhido** (ver nota N2) | Sistema |
| Confirmar pagamento | **Realizar pagamento** | Aluno |
| Liberar acesso ao curso | **Liberar todos os conteúdos do curso** (caminho Pago) | Sistema |
| Realizar Atividades e Quiz | Dividir em **Acessar os conteúdos disponíveis**, **Estudar os materiais** e **Realizar os quizzes de fixação** | Aluno |
| Fazer avaliações | **Realizar as avaliações formais liberadas** | Aluno |
| Curso concluído e avaliações corrigidas? | **Todos os requisitos de certificação foram atendidos?** | Sistema |
| Emitir certificado | **Liberar certificado automaticamente** | Sistema |

### 2.3 Adicionar

| Novo elemento | Tipo | Raia |
|---|---|---|
| Escolher um curso | Ação | Aluno |
| Qual o modelo do curso? | Decisão com 3 saídas | Sistema |
| Liberar todos os conteúdos do curso (Gratuito) | Ação | Sistema |
| Gerar cobrança pendente | Ação | Sistema |
| Pagamento confirmado? | Decisão | Sistema |
| Manter conteúdos bloqueados | Ação | Sistema |
| Verificar condições de acesso | Ação | Sistema |
| Acesso inicial autorizado? | Decisão | Sistema |
| Manter acesso pendente | Ação | Sistema |
| Realizar pagamento (Acompanhado) | Ação | Aluno |
| Liberar conteúdos já publicados | Ação | Sistema |
| Junção dos três modelos | Junção | Sistema |
| Verificar os resultados | Ação | Aluno |
| Verificar requisitos de certificação | Ação | Sistema |
| Manter certificado indisponível | Ação | Sistema |
| Consultar pendências e cumprir as atividades | Ação | Aluno |
| Visualizar o certificado | Ação | Aluno |
| Notas N1 a N6 (seção 4) | Nota | — |

---

## 3. Sequência correta do fluxo

Os rótulos entre colchetes são as **guardas** das setas.

### 3.1 Entrada: site, curso, cadastro e login

1. **Início**
2. *(Aluno)* **Acessar o site**
3. *(Aluno)* **Escolher um curso**: vê os detalhes no popup do curso e clica em "Cadastrar-se".
4. *(Aluno)* Decisão **Já tem conta?**
   - **[Não]** → *(Aluno)* **Preencher cadastro no curso** → *(Sistema)* Decisão **Dados válidos e e-mail/CPF livres?**
     - **[Não]** → *(Sistema)* **Mostrar erro do cadastro** → volta para **Preencher cadastro no curso**
     - **[Sim]** → *(Sistema)* **Criar conta do aluno** → junção
   - **[Sim]** → junção
5. *(Aluno)* **Informar e-mail e senha** → *(Sistema)* Decisão **Login aceito?**
   - **[Não]** → *(Sistema)* **Mostrar erro de login** → volta para **Informar e-mail e senha**
   - **[Sim]** → *(Sistema)* **Abrir painel do aluno**. É aqui que o aluno ganha **acesso à plataforma**, que é diferente do acesso aos conteúdos.
6. *(Sistema)* **Registrar matrícula no curso escolhido** (nota N2)

### 3.2 Decisão do modelo de curso

7. *(Sistema)* Decisão **Qual o modelo do curso?**, com três saídas: **[Gratuito]**, **[Pago]** e **[Acompanhado]**

**Caminho [Gratuito]** (sem pagamento)

8. *(Sistema)* **Liberar todos os conteúdos do curso** → junção dos modelos

**Caminho [Pago]**

8. *(Sistema)* **Gerar cobrança pendente**
9. *(Aluno)* **Realizar pagamento**
10. *(Sistema)* Decisão **Pagamento confirmado?**
    - **[Não]** → *(Sistema)* **Manter conteúdos bloqueados** → volta para **Realizar pagamento**
    - **[Sim]** → *(Sistema)* **Liberar todos os conteúdos do curso** → junção dos modelos

**Caminho [Acompanhado]**

8. *(Sistema)* **Verificar condições de acesso** (o curso tem valor? a cobrança foi paga?)
9. *(Sistema)* Decisão **Acesso inicial autorizado?**
   - **[Não]** → *(Sistema)* **Manter acesso pendente** → *(Aluno)* **Realizar pagamento** → volta para **Verificar condições de acesso**
   - **[Sim]** → *(Sistema)* **Liberar conteúdos já publicados** → junção dos modelos (nota N3)

### 3.3 Fluxo acadêmico (comum aos três modelos)

11. *(Aluno)* **Acessar os conteúdos disponíveis**
12. *(Aluno)* **Estudar os materiais**
13. *(Aluno)* **Realizar os quizzes de fixação**
14. *(Sistema)* **Atualizar progresso** (nota N4)
15. *(Aluno)* **Realizar as avaliações formais liberadas** (nota N4)
16. *(Sistema)* **Corrigir questões objetivas e lançar nota**
17. *(Aluno)* **Verificar os resultados**

### 3.4 Certificação (automática)

18. *(Sistema)* **Verificar requisitos de certificação**
19. *(Sistema)* Decisão **Todos os requisitos de certificação foram atendidos?** (nota N5)
    - **[Não]** → *(Sistema)* **Manter certificado indisponível** → *(Aluno)* **Consultar pendências e cumprir as atividades** → volta para **Acessar os conteúdos disponíveis**. A nova verificação acontece sozinha quando o fluxo passar de novo pelo passo 18; o aluno não pede nada.
    - **[Sim]** → *(Sistema)* **Liberar certificado automaticamente** → *(Aluno)* **Visualizar o certificado** → *(Aluno)* **Imprimir ou compartilhar certificado** → **Fim**

Não existe nenhuma ação do aluno para "solicitar", "requerer" ou "pedir reavaliação".

---

## 4. Notas sugeridas (colar ao lado do elemento)

| Nota | Ao lado de | Texto |
|---|---|---|
| N1 | Qual o modelo do curso? | Modelos definidos no cadastro do curso: Gratuito, Pago (pacote completo) e Acompanhado. |
| N2 | Registrar matrícula no curso escolhido | Conta nova: a matrícula é registrada junto com o cadastro. Conta existente: o aluno pede no catálogo "Matrículas" e a aprovação é automática. |
| N3 | Liberar conteúdos já publicados | No curso acompanhado, os conteúdos não ficam todos disponíveis no primeiro acesso: o professor publica aos poucos e cada novo conteúdo aparece para o aluno quando é publicado. |
| N4 | Realizar os quizzes / Realizar as avaliações formais | Quiz: exercício de fixação ligado ao conteúdo; conta para o progresso, mas não libera certificado sozinho. Avaliação formal (prova ou exercício): tem nota, só abre na data definida e terminar não significa ser aprovado. |
| N5 | Todos os requisitos de certificação foram atendidos? | 100% dos conteúdos e quizzes concluídos; todas as avaliações formais realizadas e corrigidas; nota final (média das avaliações formais) de pelo menos 7,00, quando o curso tem avaliação formal; pagamento confirmado (cursos com valor); curso acompanhado: concluído pelo professor e encerrado pelo coordenador. |
| N6 | Pagamento confirmado? / Acesso inicial autorizado? | Pagamento simulado, em cobrança única no valor do curso. Iniciar o pagamento não é confirmar o pagamento. |

Remova as notas antigas "Já matriculado no curso?", "Curso pago com pagamento pendente?" e "Curso concluído e avaliações corrigidas?". Atualize a Definition do diagrama (sugestão no item 7).

---

## 5. Pontos em que a regra pedida difere do código atual

Estes pontos não impedem o diagrama, mas precisam de uma decisão. Se o diagrama mostrar uma regra que o sistema não aplica, a apresentação pode ser questionada.

| # | Regra pedida | O que o código faz hoje | Sugestão |
|---|---|---|---|
| D1 | Nota mínima de **7,00** nas avaliações formais | **Resolvido** no commit `df90b58` (26/10/2026). `CertificadoService.EmitirCertificadoAsync` agora recusa o certificado quando a nota final (média ponderada das provas e exercícios, de 0 a 10) fica abaixo de 7,00. A regra só vale para curso que tem prova ou exercício publicado; curso só com conteúdos e quizzes não tem nota final. Os testes cobrem 6,99 (bloqueia), 7,00, 8,50 e 10,00 (liberam) e curso sem avaliação formal. | Nada a fazer no diagrama além da nota N5. O diagrama de sequência "Emissao de Certificado" já ganhou a mensagem `verificarNotaFinalMinima() : bool`. |
| D2 | Certificado liberado **automaticamente** | **Resolvido** nos commits `20c734f`, `d513b0e` e `3012d26` (26/10/2026). O servidor concentra a regra em `CertificadoService.ObterPendenciasAsync`, usada na emissão e na nova consulta `GET /certificados/status`, que devolve `certificadoDisponivel` e `pendenciasCertificado` sem gravar nada. Ao abrir, a tela de certificados faz essa consulta, libera só os certificados disponíveis e mostra a primeira pendência dos outros. O modo demonstração segue a mesma regra, com as mesmas mensagens. O registro da data de emissão continua acontecendo quando o aluno abre "Visualizar" ou "Baixar". | No diagrama de atividade, "Verificar requisitos de certificação" → "Liberar certificado automaticamente" corresponde a essa consulta. Os detalhes estão no diagrama de sequência "Status do Certificado". |
| D3 | Acompanhado: conteúdos "conforme o cronograma" | Não há agendamento automático de conteúdo. O conteúdo aparece quando o professor o **publica**. Só as avaliações têm data de abertura e de fechamento. | Usar "conforme o professor publica", como na nota N3, e não "cronograma". |
| D4 | Acompanhado: pagamento mensal ou à vista | Existe só **uma** cobrança, no valor do curso, para qualquer curso com preço maior que zero (Pago ou Acompanhado). Não há mensalidade. | Não desenhar mensalidade. A nota N6 já diz "cobrança única". |
| D5 | Certificado do curso acompanhado | Além dos requisitos acadêmicos, o curso precisa ser **concluído pelo professor e encerrado pelo coordenador**. | Já incluído na nota N5. |
| D6 | Aluno se cadastra "no curso" | Conta nova: cadastro e matrícula acontecem juntos, **antes** do login. No diagrama, "Registrar matrícula" aparece **depois** do login, para servir aos dois casos sem a decisão "Já matriculado?". | Manter a simplificação e explicá-la na nota N2. |

---

## 6. Organização no Astah

- **Raias:** manter Aluno | Sistema. Alargar a raia Sistema para caberem as três colunas dos modelos de curso.
- **Colunas dos modelos**, abaixo da decisão "Qual o modelo do curso?":
  - **Pago**, na coluna central. "Realizar pagamento" fica na raia Aluno, na mesma altura.
  - **Gratuito**, uma coluna à direita. Fica curto e sobe para a junção.
  - **Acompanhado**, a coluna mais à direita. O "Realizar pagamento" dele fica na raia Aluno, numa linha **abaixo** do pagamento do caminho Pago. A seta passa por baixo para não cruzar.
- **Junção dos modelos:** um único losango de junção, centralizado, antes de "Acessar os conteúdos disponíveis".
- **Guardas:** escrever exatamente `[Gratuito]`, `[Pago]`, `[Acompanhado]`, `[Sim]` e `[Não]`.
- **Setas de volta** (erro de cadastro, erro de login, pagamento não confirmado, acesso pendente, requisitos não atendidos): entrar pela lateral da ação de destino. A volta da certificação deve correr pela margem esquerda, como no layout aprovado.
- **Nomes** em português, com o verbo no infinitivo e só a inicial maiúscula. Por exemplo, "Realizar os quizzes de fixação", e não "Realizar Atividades e Quiz".
- **Sem detalhes técnicos** nos nomes: classes, métodos e endpoints ficam só nas Definitions ("No código: …"), como nos outros diagramas.

---

## 7. Definition sugerida para o diagrama

> Mostra a jornada do aluno na plataforma, do acesso ao site até o certificado.
>
> O aluno escolhe um curso no site, cria a conta (ou entra, se já tiver uma) e fica matriculado no curso escolhido. O que acontece depois depende do modelo do curso. No gratuito, os conteúdos são liberados na hora. No pago, os conteúdos só são liberados depois que o pagamento é confirmado. No acompanhado, o acesso inicial depende das condições do curso, e os conteúdos vão aparecendo conforme o professor publica.
>
> Com os conteúdos liberados, o aluno estuda, faz os quizzes de fixação e as avaliações formais. O sistema confere sozinho os requisitos de certificação: conteúdos e quizzes concluídos, avaliações corrigidas, nota mínima de 7,00 e, no curso acompanhado, o encerramento pelo coordenador. Quando tudo está cumprido, o certificado é liberado automaticamente; o aluno não precisa pedir.
>
> As raias separam o que o aluno faz (Aluno) do que a plataforma faz sozinha (Sistema). Os detalhes de cada etapa estão nos diagramas de sequência: Cadastro de Aluno, Login, Matrícula, Confirmação de Pagamento, Acesso aos Conteúdos, Avaliação e Emissão de Certificado.

---

## 8. Validação final

| # | Pergunta | Com a revisão |
|---|---|---|
| 1 | "Solicitar certificado" foi removida? | Sim (2.1) |
| 2 | A liberação automática do certificado está representada? | Sim: "Verificar requisitos de certificação" → decisão → "Liberar certificado automaticamente" |
| 3 | A decisão de certificação considera o desempenho? | Sim (nota N5) |
| 4 | A nota mínima de 7,00 está contemplada? | Sim, no diagrama (N5) e no código (D1, commit `df90b58`) |
| 5 | Só o quiz não libera certificado? | Sim (nota N4 e requisitos da N5) |
| 6 | "Já matriculado no curso?" saiu do início? | Sim (2.1) |
| 7 | O aluno começa acessando o site e escolhendo um curso? | Sim (passos 2 e 3) |
| 8 | O curso pago depende da confirmação do pagamento? | Sim: "Pagamento confirmado?" com [Não] → conteúdos bloqueados |
| 9 | O gratuito libera os conteúdos logo após o cadastro? | Sim, sem nenhuma etapa de pagamento |
| 10 | O acompanhado libera conforme as condições e a publicação? | Sim: "Acesso inicial autorizado?" + nota N3 (ver D3) |
| 11 | Os três caminhos convergem no fluxo acadêmico? | Sim, na junção antes de "Acessar os conteúdos disponíveis" |
| 12 | Tudo está em português? | Sim |
| 13 | O diagrama corresponde às regras aprovadas? | Sim. Ressalvas: D3 e D4 |

---

## 9. Atualizações já feitas no Astah (26/10/2026, depois do commit `df90b58`)

- **Emissao de Certificado** (sequência): nova mensagem 13, `verificarNotaFinalMinima() : bool` (certificadoService → certificadoService), entre `nenhuma` e `verificarCursoEncerrado`, com Definition na mensagem e na operação. A Definition do diagrama agora cita a nota mínima no texto da emissão e na lista de erros.
- **Jornada do Aluno** (atividade): só a Definition da ação "Emitir certificado" ganhou a nota mínima. A estrutura do diagrama continua a antiga, à espera da revisão deste manual.
- Backup antes das mudanças: `CodeRyse-Diagramas-Sequencia_backup_2026-10-26e.asta`.

**Depois dos commits `20c734f`, `d513b0e` e `3012d26`:**

- Novo diagrama de sequência **Status do Certificado - CodeRyse Academy**, na pasta "Diagrama de Sequencia". O fluxo: o aluno abre "Certificados" → `ListarStatus()` (`GET /certificados/status`) → `ListarStatusCertificadosDoAlunoAsync()` → busca as matrículas aprovadas → para cada matrícula, `VerificarRequisitosAsync()` e as seis verificações → monta `StatusCertificadoMatriculaDto` → a tela guarda o status e mostra os certificados disponíveis e as pendências. São 17 mensagens, com Definitions na mensagem, nas operações novas, nas lifelines e no diagrama.
- O diagrama **Emissao de Certificado** não foi alterado, para preservar as 37 notas criadas pelo usuário. O MCP não consegue criar nota presa a mensagem nem mover notas ou mensagens. Por isso, as Definitions das mensagens de verificação nesse diagrama ainda citam o trecho "dentro de CertificadoService.EmitirCertificadoAsync". No código atual, esse trecho fica em `ObterPendenciasAsync`, chamado por `EmitirCertificadoAsync`, então a descrição continua correta no efeito, mas não no nome do método.
- O diagrama novo não tem notas, porque o MCP não cria nota presa a mensagem. Se quiser o mesmo estilo do Emissão de Certificado, as notas precisam ser criadas à mão.
- Backup antes do diagrama novo: `CodeRyse-Diagramas-Sequencia_backup_2026-10-26f.asta`.
