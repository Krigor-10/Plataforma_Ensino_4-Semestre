# Prompt: certificado automático + tela de Certificados do celular (backend + app mobile + ajuste pequeno na web)

## Revisão de 2026-11-18 (vale sobre o resto do texto)

Na auditoria final (`docs/auditorias/AUDITORIA-DIAGNOSTICA-FINAL-2026-11-18.md`), o usuário tomou duas decisões que mudam este prompt:
1. **O certificado passa a ser emitido automaticamente pelo servidor**, no momento em que o aluno cumpre o último critério, com **notificação** ao aluno.
   - Hoje, em Gratuito e Pacote, ele só é gravado quando o aluno **abre** o certificado: na web, ao clicar; no celular, ao abrir a aba. Por isso os números de "certificados emitidos" do Admin ficam abaixo do real.
2. **Sem emissão retroativa.** Quem já cumpriu os critérios antes da mudança **não** recebe tudo de uma vez. Recebe na próxima ação no curso ou quando abrir a aba ou tela de certificados, porque o `POST …/emitir` continua existindo como **reserva**.

**Também mudou desde 16/11:** a v3 das Inscrições (`6f12a94`) criou o **cancelamento de pagamento**: o aluno desiste, ou o pagamento vence em 3 dias. Matrícula com pagamento **cancelado**, sem pendente e sem pago, **não aparece** na tela de certificados.

As mudanças estão marcadas com **[18/11]** abaixo.

## Contexto e decisão do usuário (2026-11-16)

O usuário aprovou a imagem `docs/certificados-mobile/certificados-proposta.png`. Ela mostra três celulares:
- como a tela está hoje;
- a proposta;
- a tela que abre ao tocar em "Ver certificado".

Na primeira versão, os cartões "Em andamento" tinham uma lista de requisitos. **O usuário pediu para tirá-la:** o cartão fica só com o nome, o selo de situação, a barra e "Abrir curso ›".

**Problemas de hoje** (verificados com o Aluno Demo no banco local):
1. **Bug: certificado já emitido some da tela.**
   - A matrícula 1 ("Desenvolvimento Web Full Stack") tem `CertificadoEmitidoEm` = 28/08/2026.
   - Mesmo assim, ela aparece trancada em "Em andamento" com "Ha avaliacoes … pendentes de correcao".
   - A causa: a tela só olha `certificadoDisponivel` do `GET /Certificados/status`, que recalcula as pendências agora. Quando entra uma prova nova no curso, o certificado já emitido desaparece.
   - **Regra decidida pelo usuário:** certificado já emitido continua valendo.
2. **"Cursos em trilha: 10" conta cursos que o aluno não pagou.** Desses 10, 8 aparecem como "0% concluído" com "O pagamento deste curso ainda nao foi confirmado". Há também matrículas repetidas do mesmo curso.
3. **O aviso fixo do topo não vale para todo curso.** Ele diz "liberado automaticamente quando você conclui 100% com média ≥ 7,00". Mas:
   - a média só vale para curso com prova ou exercício formal;
   - no Acompanhado, o certificado só sai depois que o coordenador encerra o curso;
   - todo cartão repete "Média ≥ 7,0", até nos cursos sem nota.
4. **O cartão com barra 100% e cadeado parece erro.**
5. **O certificado inteiro ocupa a tela toda.** Com vários certificados, vira uma rolagem enorme.
6. **As mensagens do servidor vêm sem acento.**

## Onde está (verificado pelo agente de arquitetura)

- **Tela do celular:** `mobile/src/screens/aluno/CertificadosScreen.jsx`.
  - Ela usa `GET /Certificados/status` e chama `POST /Certificados/matricula/{id}/emitir` para cada matrícula liberada, para pegar os dados do certificado.
  - Helper: `mobile/src/lib/certificados.js`.
- **Backend:** `Services/CertificadoService.cs`.
  - `ObterPendenciasAsync` (≈ linha 158) tem as mensagens de pendência, nesta ordem: matrícula não aprovada, pagamento, curso não concluído, prova pendente de correção, nota < 7 (só com avaliação formal publicada) e Acompanhado não encerrado.
  - `ListarCertificadosDoAlunoAsync` (≈ linha 250) já lista as matrículas com `CertificadoEmitidoEm` preenchido, mais recentes primeiro. É o `GET /Certificados/meus`, que devolve `CertificadoResponseDto` com código, nome do aluno, curso, turma, nota e data.
  - `EmitirCertificadoAsync` lança a primeira pendência **antes** de olhar se o certificado já foi emitido. Por isso o POST falha para quem já tem certificado e ganhou uma pendência nova.
- **DTO:** `DTOs/StatusCertificadoMatriculaDto.cs`, com `MatriculaId`, `CursoId`, `CertificadoDisponivel` e `PendenciasCertificado`.
- **Navegação do celular:**
  - abrir um curso em outra aba: `navigation.navigate(ROUTES.ALUNO_TABS, { screen: ROUTES.CONTEUDOS, params: { cursoId } })`, o mesmo de `CatalogoScreen.jsx` ≈ linha 70 e `BuscaScreen.jsx` ≈ linha 65;
  - a compra fica em `ConfirmacaoCompraSheet.jsx`, aberta pelo Catálogo.
- **Verificação na web:** a rota `/verificar/:codigo` (`frontend/src/lib/router.js` ≈ linha 27) abre `VerificarCertificadoScreen.jsx`.
- **O app não tem `expo-clipboard`** e não tem nenhuma variável com o endereço da web.
- **Web:** `frontend/src/pages/workspace/SecaoCertificados.jsx` ≈ linha 138 decide "desbloqueado" do mesmo jeito, só pelo `certificadoDisponivel`, e por isso tem o mesmo bug 1.

## Tarefa

### Backend

0. **[18/11] Emissão automática no servidor.**
   - **Criar um método único e idempotente** em `CertificadoService`, por exemplo `TentarEmitirAutomaticamenteAsync(int matriculaId)`.
     - Se o certificado já foi emitido, ou se há alguma pendência (`ObterPendenciasAsync`), não faz nada.
     - Se não houver pendência, grava `CertificadoEmitidoEm` (como `EmitirCertificadoAsync`) e notifica o aluno com `INotificacaoService.NotificarAsync`. A mensagem: "Seu certificado de {curso} foi emitido", com link para a tela de certificados.
     - Nunca lança erro para quem chamou: registra no log e segue.
   - **Chamar o método** logo depois de salvar, nos pontos em que o último critério pode ser cumprido:
     - `ProgressoAlunoService.MarcarConteudoConcluidoAsync` (≈ linha 70), quando o aluno conclui conteúdo;
     - `ProgressoAlunoService.RecalcularProgressoQuizAsync` (≈ linha 268), quando o aluno conclui quiz;
     - `ProgressoAlunoService.RecalcularNotaAvaliacaoAsync` (≈ linha 124), na correção ou lançamento de nota de prova ou exercício;
     - `ProgressoAlunoService.RecalcularProgressoDoCursoAsync` (≈ linha 200), quando o professor muda o curso (ex.: tirou o item que faltava), para cada matrícula recalculada;
     - na confirmação de pagamento (`PagamentoService.ConfirmarPagamentoAsync` e o caminho de confirmação em `MatriculaService.ComprarCursoAsync`);
     - no encerramento do Acompanhado já existe `EmitirCertificadosDoCursoAsync`. Passar a notificar também ali, se ainda não notifica.
   - **Dependências:** `ProgressoAlunoService` pode receber `ICertificadoService`; hoje `CertificadoService` não depende de progresso, então não há ciclo. **Não** criar dependência de `CertificadoService` para `ProgressoAlunoService`.
   - **Sem retroativo:** não criar migração de dados nem job para emitir os antigos.
   - **Aprovação simulada de Development** (`RecursosTeste:AprovacaoCertificadoSimulada`): a emissão automática respeita a mesma regra que existe hoje. Em Production ela já é bloqueada.
   - **Testes:**
     - concluir o último conteúdo emite e notifica;
     - com pendência, não emite;
     - chamar duas vezes não duplica a emissão nem a notificação;
     - a nota lançada que atinge 7 emite;
     - o professor remove o item que faltava e o certificado é emitido;
     - pagamento confirmado com o curso já 100% emite.
1. **`GET /Certificados/status`:** acrescentar dois campos em `StatusCertificadoMatriculaDto`.
   - `certificadoEmitidoEm` (data ou null).
   - `situacao` (string), calculada no servidor. Vale a primeira regra que bater:
     1. `Emitido`: `CertificadoEmitidoEm` preenchido. Nesse caso, as pendências novas **não** tiram o certificado.
     2. `AguardandoPagamento`: sem acesso liberado (pagamento não pago).
     3. `EmAndamento`: progresso < 100%.
     4. `AguardandoCorrecao`: há prova ou exercício publicado sem nota lançada.
     5. `NotaAbaixoDoMinimo`: a pendência de nota < 7 continua (respeitar a aprovação simulada que já existe).
     6. `AguardandoEncerramento`: Acompanhado ainda não encerrado.
     7. `Disponivel`: nenhuma pendência e certificado ainda não emitido.
   - Para `Emitido`, `certificadoDisponivel` passa a ser `true`.
2. **`EmitirCertificadoAsync`:** se `CertificadoEmitidoEm` já está preenchido, devolver o certificado **sem** checar as pendências. O POST continua idempotente.
3. **Mensagens de pendência com acento:**
   - "A matrícula ainda não foi aprovada."
   - "O pagamento deste curso ainda não foi confirmado."
   - "O curso ainda não foi concluído."
   - "Há avaliações (prova/exercício) pendentes de correção para concluir o curso."
   - "A nota final do curso precisa ser igual ou superior a 7,00 para emitir o certificado."
   - "Este curso ainda não foi encerrado pelo coordenador."
   - Atualizar os testes que comparam esses textos.
4. **Testes:**
   - cada `situacao`, incluindo a ordem;
   - **certificado emitido + prova nova publicada** → `situacao = Emitido`, `certificadoDisponivel = true`, e o POST devolve o certificado em vez de dar erro.

### App mobile (`CertificadosScreen.jsx`)

5. **Dados:**
   - **Conquistados** vêm de `GET /Certificados/meus`. Assim o certificado já emitido sempre aparece, sem depender do POST.
   - **[18/11]** O POST de emissão vira só **reserva**. Quando `situacao = Disponivel` (caso dos antigos, já que não há retroativo), a tela chama `POST /Certificados/matricula/{id}/emitir` uma vez e recarrega `meus`. Nos casos novos, o servidor já emitiu antes.
   - **Em andamento** = matrículas com `situacao` igual a `EmAndamento`, `AguardandoCorrecao`, `NotaAbaixoDoMinimo` ou `AguardandoEncerramento`.
   - **Aguardando pagamento** = `situacao = AguardandoPagamento`, ou seja, só pagamento **Pendente**. Mostrar **um item por curso**, sem repetir matrículas do mesmo curso, e "Pague até DD/MM" (`venceEm`, que já existe desde a v3).
   - **[18/11]** Matrícula sem acesso e sem pagamento pendente (pagamento **cancelado** ou vencido) **não aparece** em nenhum grupo.
6. **Topo:**
   - 2 números: **Conquistados** (total de `meus`) e **Em andamento** (total do grupo Em andamento). Os não pagos ficam fora das contas.
   - **Remover** o aviso fixo "O certificado é liberado automaticamente…" e o subtítulo "Suas certificações acadêmicas…".
7. **Seção "Conquistados":** um cartão compacto por certificado.
   - Ícone de medalha verde, nome do curso, "Emitido em DD/MM/AAAA · Nota X,X" e o código de verificação embaixo, em fonte menor.
   - Quando `notaFinal` for 0 (curso sem avaliação formal), esconder "· Nota".
   - Uma linha de botões:
     - **Ver certificado** (primário, ocupa o espaço que sobra);
     - **Compartilhar** (só ícone);
     - **Copiar link** (só ícone).
   - Sai o selo "Autêntico" e o título "Certificado Conquistado" repetido para cada certificado.
8. **Seção "Em andamento":** um cartão por curso, **sem lista de requisitos e sem "Média ≥ 7,0"**.
   - **Linha 1:** o nome do curso e, à direita, um selo:
     - `AguardandoCorrecao` → "Aguardando correção", em amarelo (`cores.aviso` / `cores.avisoFundo`);
     - `AguardandoEncerramento` → "Aguardando encerramento", em azul (`cores.informativo` / `cores.informativoFundo`);
     - `NotaAbaixoDoMinimo` → "Nota abaixo de 7,0", em vermelho (`cores.erro` / `cores.erroFundo`);
     - `EmAndamento` → "Em andamento", neutro.
   - **Linha 2:** "N% concluído" à esquerda e, à direita, o link "Abrir curso ›" (ou "Continuar ›" quando < 100%).
   - Embaixo, a barra de progresso.
   - **Sem cadeado.** O cartão inteiro é tocável e abre o curso na aba Cursos (ver "Navegação" acima).
9. **Grupo "Aguardando pagamento · N"**, no fim da tela.
   - Começa recolhido, com a frase "Cursos que você começou a comprar e ainda não pagou. Toque para ver e concluir a compra."
   - Ao abrir, lista os cursos, cada um com o botão **"Concluir compra"**. O botão abre o curso no Catálogo, onde já existe o fluxo de compra. Se o Catálogo não aceitar abrir um curso direto, abrir o Catálogo.
   - Se N = 0, o grupo não aparece.
10. **Tela "Certificado"** (nova tela de pilha, com botão voltar), aberta por "Ver certificado".
    - O certificado inteiro, igual ao de hoje (marca, "CERTIFICADO DE CONCLUSÃO", "Outorgado a", nome, texto, emitido em e instituição). Esconder "com nota final" quando a nota for 0.
    - Embaixo, um cartão com o código de verificação e o link `{EXPO_PUBLIC_WEB_URL}/verificar/{codigo}`.
    - Botões **Compartilhar** (primário) e **Copiar link de verificação** (secundário).
    - O texto compartilhado passa a incluir o link.
11. **Copiar link:**
    - instalar `expo-clipboard` com `npx expo install expo-clipboard`;
    - criar `EXPO_PUBLIC_WEB_URL` em `mobile/src/lib/config.js`, com um padrão seguro para desenvolvimento, e colocá-la nos perfis do `eas.json`;
    - mostrar um aviso curto "Link copiado".
12. **Estado vazio:** se não houver nada em nenhum grupo, a mensagem de hoje continua.

### Web (só o bug 1)

13. Em `SecaoCertificados.jsx`, tratar `situacao === "Emitido"` como desbloqueado, para o certificado já emitido não sumir. **Não mudar o visual da web.**
14. **[18/11]** Na web, abrir o certificado (`abrirCertificado`, ≈ linha 165) continua chamando o POST, agora como reserva: ele é idempotente e devolve os dados. Para o já emitido, ele não checa pendência (item 2). Nada mais muda na web neste prompt. O troféu em Meus Cursos fica para outro prompt.

**Não alterar:**
- as regras de quando o certificado pode ser emitido (só a ordem e a situação passam a vir do servidor);
- a aprovação simulada de Development;
- `GET /Certificados/verificar/{codigo}`;
- as outras abas do celular.

## Critérios de aceite

Verificar no app real (backend em 127.0.0.1:5000), **sem modo demo**, logado como Aluno Demo:

- **[18/11] Emissão automática:**
  - um aluno de teste conclui o último conteúdo de um curso Gratuito sem prova;
  - o certificado aparece em **Conquistados** e chega a notificação "Seu certificado de … foi emitido", **sem** que o aluno tenha aberto a aba antes;
  - no banco, `CertificadoEmitidoEm` fica preenchido logo após concluir.
- **[18/11] Sem retroativo:** um aluno antigo que já tinha 100% e nunca abriu continua sem data gravada até abrir a aba (reserva) ou fazer alguma ação no curso.
- **[18/11] Pagamento cancelado:** um curso com pagamento cancelado ou vencido não aparece em nenhum grupo da tela.
- **"Desenvolvimento Web Full Stack"** aparece em **Conquistados** com a data 28/08/2026, mesmo com a prova pendente. Na web, o certificado também aparece.
- **Topo:** mostra Conquistados = 2 e Em andamento = só os cursos com acesso. Os não pagos não contam.
- **Sem aviso fixo:** os cartões Em andamento não mostram cadeado, lista de requisitos nem "Média ≥ 7,0".
- **Selos:** curso com prova sem correção → "Aguardando correção". Acompanhado 100% não encerrado → "Aguardando encerramento".
- **Toques:** tocar num cartão Em andamento abre o curso na aba Cursos.
- **Aguardando pagamento:**
  - começa recolhido;
  - ao abrir, mostra um item por curso, sem repetir "Ciência de Dados Aplicada";
  - "Concluir compra" leva ao fluxo de compra.
- **Ver certificado:** abre a tela própria. Compartilhar envia o texto com o link, e Copiar link coloca `…/verificar/{codigo}` na área de transferência. Esse link abre a verificação na web.
- **Acentos:** as mensagens aparecem acentuadas.
- **Testes:**
  - backend: situações, emitido + prova nova, POST idempotente e **emissão automática** (item 0);
  - mobile: agrupamento, contagens, deduplicação, selo por situação, esconder nota 0.
- `dotnet test`, `npm run lint` e `npm test` (web e mobile) sem erros novos.
