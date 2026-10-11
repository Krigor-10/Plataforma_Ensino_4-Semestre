import { useEffect, useMemo, useState } from "react";
import { TbChevronDown, TbChevronUp, TbLoader2, TbSparkles, TbX } from "react-icons/tb";
import { MdDelete, MdSave } from "react-icons/md";
import Botao from "../../components/Botao.jsx";
import Modal from "../../components/Modal.jsx";
import { InlineMessage, StatusPill } from "../../components/Primitives.jsx";
import { ApiError, apiRequest } from "../../lib/api.js";

const OPCOES_TIPO_QUESTAO = [
  { value: "1", label: "Multipla escolha" },
  { value: "2", label: "Verdadeiro/Falso" },
  { value: "3", label: "Dissertativa" },
  { value: "4", label: "Afirmativas combinadas" }
];

function normalizeQuestionType(type) {
  const labels = { 1: "Multipla escolha", 2: "Verdadeiro/Falso", 3: "Dissertativa", 4: "Afirmativas combinadas" };
  return labels[Number(type)] || "Desconhecido";
}

function formatDecimal(value) {
  return Number(value || 0).toFixed(2).replace(".", ",");
}

function nomeArquivoSemExtensao(nomeArquivo) {
  const indice = nomeArquivo.lastIndexOf(".");
  return indice > 0 ? nomeArquivo.slice(0, indice) : nomeArquivo;
}

function gerarChaveLocal() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `questao-ia-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mapearQuestaoGerada(questao) {
  return { ...questao, _chaveLocal: gerarChaveLocal() };
}

function montarMensagemErro(err, mensagemPadrao) {
  if (err instanceof ApiError && err.status === 429) {
    return "Limite de geracoes por IA atingido (10 por hora). Aguarde um pouco e tente novamente.";
  }

  return err?.message || mensagemPadrao;
}

/* Fluxo "Gerar com IA" pra criacao de Prova/Exercicio, alternativo ao
   assistente manual (AssistenteQuizAvaliacao.jsx). Nada aqui e persistido
   ate o professor confirmar na etapa de revisao (POST .../questoes/lote)
   — a avaliacao-casca criada no passo de configuracao nasce em Rascunho e
   so vira uma avaliacao "normal" (editavel pelo assistente manual) depois
   que esse POST acontece. Ver proposta_criacao_manual_e_ia_avaliacoes na
   memoria do projeto pro desenho completo decidido com o usuario. */
export function AssistenteGeracaoIA({ cursoAtivo, onFechar, onRefresh, onSessionExpired }) {
  const [etapa, setEtapa] = useState("selecao");
  const [arquivo, setArquivo] = useState(null);
  const [titulo, setTitulo] = useState("");
  const [quantidadeQuestoes, setQuantidadeQuestoes] = useState("5");
  const [dificuldade, setDificuldade] = useState("3");
  const [tiposSelecionados, setTiposSelecionados] = useState(["1"]);
  const [assunto, setAssunto] = useState("");
  const [gerando, setGerando] = useState(false);
  const [salvandoRascunho, setSalvandoRascunho] = useState(false);
  const [mensagem, setMensagem] = useState({ tone: "", message: "" });
  const [avisosGeracao, setAvisosGeracao] = useState([]);
  const [limitacaoDetectada, setLimitacaoDetectada] = useState(false);
  const [questoesGeradas, setQuestoesGeradas] = useState([]);
  const [avaliacaoGeradaId, setAvaliacaoGeradaId] = useState(null);
  const [indiceRegenerando, setIndiceRegenerando] = useState(null);

  const urlArquivoEnviado = useMemo(() => (arquivo ? URL.createObjectURL(arquivo) : null), [arquivo]);

  useEffect(() => {
    return () => {
      if (urlArquivoEnviado) {
        URL.revokeObjectURL(urlArquivoEnviado);
      }
    };
  }, [urlArquivoEnviado]);

  function fecharAssistente() {
    if (gerando || salvandoRascunho) {
      return;
    }

    onFechar?.();
  }

  function selecionarArquivo(event) {
    const arquivoEscolhido = event.target.files?.[0];
    if (!arquivoEscolhido) {
      return;
    }

    setArquivo(arquivoEscolhido);
    setTitulo((atual) => atual || nomeArquivoSemExtensao(arquivoEscolhido.name));
    setMensagem({ tone: "", message: "" });
  }

  function removerArquivoSelecionado() {
    setArquivo(null);
  }

  function avancarParaConfiguracao() {
    if (!arquivo) {
      setMensagem({ tone: "error", message: "Selecione um arquivo PDF ou DOCX antes de continuar." });
      return;
    }

    setMensagem({ tone: "", message: "" });
    setEtapa("configuracao");
  }

  function alternarTipoSelecionado(valor) {
    setTiposSelecionados((atual) => (atual.includes(valor) ? atual.filter((item) => item !== valor) : [...atual, valor]));
  }

  async function gerarQuestoes() {
    const tituloTratado = titulo.trim();
    if (!tituloTratado) {
      setMensagem({ tone: "error", message: "Informe um titulo para a avaliacao." });
      return;
    }

    if (!tiposSelecionados.length) {
      setMensagem({ tone: "error", message: "Selecione pelo menos um tipo de questao." });
      return;
    }

    setGerando(true);
    setMensagem({ tone: "", message: "" });

    try {
      let idAvaliacao = avaliacaoGeradaId;

      if (!idAvaliacao) {
        const avaliacaoCriada = await apiRequest("/Avaliacoes", {
          method: "POST",
          body: JSON.stringify({
            titulo: tituloTratado,
            descricao: "",
            turmaId: Number(cursoAtivo.turma.id),
            moduloId: null,
            conteudoDidaticoId: null,
            tipoAvaliacao: 2,
            statusPublicacao: 1,
            dataAbertura: null,
            dataFechamento: null,
            tentativasPermitidas: 1,
            tempoLimiteMinutos: null,
            notaMaxima: 10,
            pesoNota: 1,
            pesoProgresso: 1
          })
        });

        idAvaliacao = avaliacaoCriada.id;
        setAvaliacaoGeradaId(idAvaliacao);
      }

      const formData = new FormData();
      formData.append("arquivo", arquivo);
      formData.append("quantidadeQuestoes", quantidadeQuestoes);
      formData.append("dificuldade", dificuldade);
      formData.append("tiposPermitidos", tiposSelecionados.join(","));
      formData.append("assunto", assunto.trim());

      const resultado = await apiRequest(`/Avaliacoes/${idAvaliacao}/ia/gerar-questoes`, { method: "POST", body: formData });

      setQuestoesGeradas((resultado.questoes || []).map(mapearQuestaoGerada));
      setAvisosGeracao(resultado.avisos || []);
      setLimitacaoDetectada(Boolean(resultado.limitacaoDetectada));
      setEtapa("revisao");
      onRefresh?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagem({ tone: "error", message: montarMensagemErro(err, "Nao foi possivel gerar as questoes agora.") });
    } finally {
      setGerando(false);
    }
  }

  async function regenerarQuestao(indice) {
    const questaoAtual = questoesGeradas[indice];
    if (!questaoAtual || !avaliacaoGeradaId || !arquivo || indiceRegenerando !== null) {
      return;
    }

    setIndiceRegenerando(indice);
    setMensagem({ tone: "", message: "" });

    try {
      const formData = new FormData();
      formData.append("arquivo", arquivo);
      formData.append("quantidadeQuestoes", "1");
      formData.append("dificuldade", String(questaoAtual.dificuldade || dificuldade));
      formData.append("tiposPermitidos", String(questaoAtual.tipoQuestao));
      formData.append("assunto", assunto.trim());

      const resultado = await apiRequest(`/Avaliacoes/${avaliacaoGeradaId}/ia/gerar-questoes`, { method: "POST", body: formData });
      const [questaoNova] = (resultado.questoes || []).map(mapearQuestaoGerada);

      if (!questaoNova) {
        setMensagem({ tone: "error", message: "A IA nao devolveu uma questao nova para substituir esta. Tente novamente." });
        return;
      }

      setQuestoesGeradas((atual) => atual.map((questao, posicao) => (posicao === indice ? questaoNova : questao)));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagem({ tone: "error", message: montarMensagemErro(err, "Nao foi possivel regenerar esta questao agora.") });
    } finally {
      setIndiceRegenerando(null);
    }
  }

  function removerQuestaoGerada(indice) {
    setQuestoesGeradas((atual) => atual.filter((_, posicao) => posicao !== indice));
  }

  function moverQuestaoGerada(indice, direcao) {
    const destino = indice + direcao;
    if (destino < 0 || destino >= questoesGeradas.length) {
      return;
    }

    setQuestoesGeradas((atual) => {
      const nova = [...atual];
      [nova[indice], nova[destino]] = [nova[destino], nova[indice]];
      return nova;
    });
  }

  function atualizarCampoQuestaoGerada(indice, campo, valor) {
    setQuestoesGeradas((atual) => atual.map((questao, posicao) => (posicao === indice ? { ...questao, [campo]: valor } : questao)));
  }

  function atualizarAlternativaGerada(indiceQuestao, indiceAlternativa, campo, valor) {
    setQuestoesGeradas((atual) =>
      atual.map((questao, posicaoQuestao) => {
        if (posicaoQuestao !== indiceQuestao) {
          return questao;
        }

        return {
          ...questao,
          alternativas: questao.alternativas.map((alternativa, posicaoAlternativa) =>
            posicaoAlternativa === indiceAlternativa ? { ...alternativa, [campo]: valor } : alternativa
          )
        };
      })
    );
  }

  function selecionarAlternativaCorretaGerada(indiceQuestao, indiceAlternativa) {
    setQuestoesGeradas((atual) =>
      atual.map((questao, posicaoQuestao) => {
        if (posicaoQuestao !== indiceQuestao) {
          return questao;
        }

        return {
          ...questao,
          // Resolve o alerta de "gabarito incerto" assim que o professor marca uma
          // alternativa manualmente - sem isso o aviso ficaria preso na tela mesmo
          // depois de corrigido.
          gabaritoIncerto: false,
          alternativas: questao.alternativas.map((alternativa, posicaoAlternativa) => ({
            ...alternativa,
            ehCorreta: posicaoAlternativa === indiceAlternativa
          }))
        };
      })
    );
  }

  function atualizarAfirmativaGerada(indiceQuestao, indiceAfirmativa, campo, valor) {
    setQuestoesGeradas((atual) =>
      atual.map((questao, posicaoQuestao) => {
        if (posicaoQuestao !== indiceQuestao) {
          return questao;
        }

        return {
          ...questao,
          afirmativas: questao.afirmativas.map((afirmativa, posicaoAfirmativa) =>
            posicaoAfirmativa === indiceAfirmativa ? { ...afirmativa, [campo]: valor } : afirmativa
          )
        };
      })
    );
  }

  function validarQuestoesGeradas() {
    if (!questoesGeradas.length) {
      return "Nenhuma questao para salvar - remova menos questoes ou gere novamente.";
    }

    for (let indice = 0; indice < questoesGeradas.length; indice += 1) {
      const questao = questoesGeradas[indice];
      const numeroExibicao = indice + 1;
      const tipo = Number(questao.tipoQuestao);

      if (!questao.tituloInterno?.trim()) {
        return `Questao ${numeroExibicao}: informe um titulo interno.`;
      }

      if (!questao.enunciado?.trim()) {
        return `Questao ${numeroExibicao}: informe o enunciado.`;
      }

      if (!Number.isFinite(Number(questao.pontos)) || Number(questao.pontos) <= 0) {
        return `Questao ${numeroExibicao}: a pontuacao deve ser maior que zero.`;
      }

      if (tipo !== 3) {
        if (questao.alternativas.some((alternativa) => !alternativa.texto?.trim())) {
          return `Questao ${numeroExibicao}: preencha o texto de todas as alternativas.`;
        }

        if (questao.alternativas.filter((alternativa) => alternativa.ehCorreta).length !== 1) {
          return `Questao ${numeroExibicao}: marque exatamente uma alternativa correta.`;
        }
      }

      if (tipo === 4) {
        if (questao.afirmativas.length < 2) {
          return `Questao ${numeroExibicao}: informe pelo menos duas afirmativas.`;
        }

        if (questao.afirmativas.some((afirmativa) => !afirmativa.numero?.trim() || !afirmativa.texto?.trim())) {
          return `Questao ${numeroExibicao}: preencha numero e texto de todas as afirmativas.`;
        }
      }
    }

    return null;
  }

  async function confirmarRascunho() {
    const erro = validarQuestoesGeradas();
    if (erro) {
      setMensagem({ tone: "error", message: erro });
      return;
    }

    setSalvandoRascunho(true);
    setMensagem({ tone: "", message: "" });

    try {
      const payload = {
        questoes: questoesGeradas.map((questao) => {
          const tipo = Number(questao.tipoQuestao);

          return {
            tituloInterno: questao.tituloInterno.trim(),
            contexto: (questao.contexto || "").trim(),
            enunciado: questao.enunciado.trim(),
            tipoQuestao: tipo,
            tema: questao.tema || "",
            subtema: questao.subtema || "",
            dificuldade: Number(questao.dificuldade),
            explicacaoPosResposta: (questao.explicacaoPosResposta || "").trim(),
            referenciasBibliograficas: questao.referenciasBibliograficas || "",
            pontos: Number(questao.pontos),
            alternativas:
              tipo === 3
                ? []
                : questao.alternativas.map((alternativa) => ({
                    letra: alternativa.letra,
                    texto: alternativa.texto.trim(),
                    ehCorreta: alternativa.ehCorreta,
                    justificativa: (alternativa.justificativa || "").trim()
                  })),
            afirmativas:
              tipo === 4
                ? questao.afirmativas.map((afirmativa) => ({
                    numero: afirmativa.numero.trim(),
                    texto: afirmativa.texto.trim(),
                    ehCorreta: afirmativa.ehCorreta,
                    justificativa: (afirmativa.justificativa || "").trim()
                  }))
                : []
          };
        })
      };

      await apiRequest(`/Avaliacoes/${avaliacaoGeradaId}/questoes/lote`, { method: "POST", body: JSON.stringify(payload) });

      // A avaliacao-casca nasce com notaMaxima fixa em 10 (etapa de configuracao,
      // antes de saber quantas questoes/pontos a IA ia devolver) - sem este ajuste,
      // a soma dos "pontos" das questoes confirmadas quase nunca bate com 10, e a
      // nota do aluno sai errada (ex.: acertar tudo e tirar 30% em vez de 100%).
      // Recalcula pelo valor de "pontos" de verdade usado em cada questao, incluindo
      // edicoes feitas na revisao.
      const notaMaximaFinal = payload.questoes.reduce((soma, questao) => soma + questao.pontos, 0);
      await apiRequest(`/Avaliacoes/${avaliacaoGeradaId}`, {
        method: "PUT",
        body: JSON.stringify({
          titulo: titulo.trim(),
          descricao: "",
          turmaId: Number(cursoAtivo.turma.id),
          moduloId: null,
          conteudoDidaticoId: null,
          tipoAvaliacao: 2,
          statusPublicacao: 1,
          dataAbertura: null,
          dataFechamento: null,
          tentativasPermitidas: 1,
          tempoLimiteMinutos: null,
          notaMaxima: notaMaximaFinal > 0 ? notaMaximaFinal : 10,
          pesoNota: 1,
          pesoProgresso: 1
        })
      });

      onRefresh?.();
      onFechar?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagem({ tone: "error", message: err.message || "Nao foi possivel salvar as questoes agora." });
    } finally {
      setSalvandoRascunho(false);
    }
  }

  return (
    <Modal
      className="modal-caixa--avaliacao"
      onFechar={fecharAssistente}
      titulo="Gerar avaliacao com IA"
      rodape={
        etapa === "selecao" ? (
          <footer className="criar-avaliacao__rodape">
            <Botao onClick={fecharAssistente} type="button" variante="perigo">
              <TbX aria-hidden="true" size={15} /> Cancelar
            </Botao>
            <Botao onClick={avancarParaConfiguracao} type="button" variante="primario">
              Avancar
            </Botao>
          </footer>
        ) : etapa === "configuracao" ? (
          <footer className="criar-avaliacao__rodape">
            <Botao disabled={gerando} onClick={() => setEtapa("selecao")} type="button" variante="perigo">
              <TbX aria-hidden="true" size={15} /> Voltar
            </Botao>
            <Botao disabled={gerando} onClick={() => gerarQuestoes()} type="button" variante="primario">
              <TbSparkles aria-hidden="true" size={16} /> {gerando ? "Gerando..." : "Gerar questoes"}
            </Botao>
          </footer>
        ) : (
          <footer className="criar-avaliacao__rodape">
            <Botao disabled={gerando || salvandoRascunho} onClick={() => setEtapa("configuracao")} type="button" variante="perigo">
              <TbX aria-hidden="true" size={15} /> Reconfigurar
            </Botao>
            <Botao disabled={salvandoRascunho || !questoesGeradas.length} onClick={confirmarRascunho} type="button" variante="primario">
              <MdSave aria-hidden="true" size={17} /> {salvandoRascunho ? "Salvando..." : "Confirmar e salvar como rascunho"}
            </Botao>
          </footer>
        )
      }
    >
      <div className="criar-avaliacao__layout">
        <aside className="criar-avaliacao__steps">
          <button className={`criar-avaliacao__step${etapa === "selecao" ? " criar-avaliacao__step--ativo" : ""}`} onClick={() => setEtapa("selecao")} type="button">
            <span aria-hidden="true" className="criar-avaliacao__step-icone">{etapa === "selecao" ? "●" : "○"}</span>
            Enviar material
          </button>
          <button
            className={`criar-avaliacao__step${etapa === "configuracao" ? " criar-avaliacao__step--ativo" : ""}`}
            disabled={!arquivo}
            onClick={() => arquivo && setEtapa("configuracao")}
            type="button"
          >
            <span aria-hidden="true" className="criar-avaliacao__step-icone">{etapa === "configuracao" ? "●" : "○"}</span>
            Configurar geracao
          </button>
          <button
            className={`criar-avaliacao__step${etapa === "revisao" ? " criar-avaliacao__step--ativo" : ""}`}
            disabled={!questoesGeradas.length}
            onClick={() => questoesGeradas.length && setEtapa("revisao")}
            type="button"
          >
            <span aria-hidden="true" className="criar-avaliacao__step-icone">{etapa === "revisao" ? "●" : "○"}</span>
            Revisar questoes
          </button>
        </aside>

        <div className="criar-avaliacao__painel">
          {etapa === "selecao" ? (
            <section className="criar-avaliacao__secao">
              <h3 className="criar-avaliacao__secao-titulo">Material de origem</h3>
              <div className="criar-avaliacao__secao-corpo">
                <p className="campo__ajuda" style={{ marginTop: 0 }}>
                  Envie um PDF ou DOCX com o conteudo que a IA vai usar como base para gerar as questoes. O arquivo fica
                  so nesta sessao - nada e salvo antes da revisao final.
                </p>
                <div className="campo">
                  <label className="campo__rotulo" htmlFor="gerar-ia-arquivo">Arquivo (PDF ou DOCX) *</label>
                  <input accept=".pdf,.docx" className="campo__entrada" id="gerar-ia-arquivo" onChange={selecionarArquivo} type="file" />
                  {arquivo ? (
                    <p className="campo__ajuda">
                      Selecionado: <strong>{arquivo.name}</strong>{" "}
                      <button className="link-botao" onClick={removerArquivoSelecionado} type="button">
                        Remover
                      </button>
                    </p>
                  ) : null}
                </div>
                {mensagem.message ? <InlineMessage tone={mensagem.tone}>{mensagem.message}</InlineMessage> : null}
              </div>
            </section>
          ) : null}

          {etapa === "configuracao" ? (
            <section className="criar-avaliacao__secao">
              <h3 className="criar-avaliacao__secao-titulo">Configurar geracao</h3>
              <form
                className="criar-avaliacao__secao-corpo"
                id="form-gerar-ia-configuracao"
                onKeyDown={(event) => {
                  // Defesa extra: o botao "Gerar questoes" nao e mais type="submit"
                  // associado a este form (ver rodape), entao o navegador nao tem
                  // mais um botao padrao pra ativar com Enter - isso sozinho ja
                  // evita o envio prematuro. Mesmo assim, bloqueia Enter explicitamente
                  // nos campos de texto/numero (titulo, quantidade, assunto) por
                  // seguranca, caso algum navegador se comporte diferente.
                  if (event.key === "Enter" && event.target.tagName !== "TEXTAREA") {
                    event.preventDefault();
                  }
                }}
                onSubmit={(event) => {
                  event.preventDefault();
                  gerarQuestoes();
                }}
              >
                <p className="campo__ajuda" style={{ marginTop: 0 }}>
                  Material enviado: <strong>{arquivo?.name}</strong>
                </p>

                <div className="campo">
                  <label className="campo__rotulo" htmlFor="gerar-ia-titulo">Titulo da avaliacao *</label>
                  <input
                    className="campo__entrada"
                    disabled={gerando}
                    id="gerar-ia-titulo"
                    maxLength={180}
                    onChange={(event) => setTitulo(event.target.value)}
                    placeholder="Ex.: Avaliacao final do modulo"
                    type="text"
                    value={titulo}
                  />
                </div>

                <div className="grade-3">
                  <div className="campo">
                    <label className="campo__rotulo" htmlFor="gerar-ia-quantidade">Quantidade de questoes *</label>
                    <input
                      className="campo__entrada"
                      disabled={gerando}
                      id="gerar-ia-quantidade"
                      max="20"
                      min="1"
                      onChange={(event) => setQuantidadeQuestoes(event.target.value)}
                      type="number"
                      value={quantidadeQuestoes}
                    />
                  </div>
                  <div className="campo">
                    <label className="campo__rotulo" htmlFor="gerar-ia-dificuldade">Dificuldade *</label>
                    <select className="campo__entrada" disabled={gerando} id="gerar-ia-dificuldade" onChange={(event) => setDificuldade(event.target.value)} value={dificuldade}>
                      {[1, 2, 3, 4, 5].map((nivel) => (
                        <option key={nivel} value={nivel}>
                          {nivel}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="campo">
                    <label className="campo__rotulo" htmlFor="gerar-ia-assunto">Assunto (opcional)</label>
                    <input
                      className="campo__entrada"
                      disabled={gerando}
                      id="gerar-ia-assunto"
                      maxLength={200}
                      onChange={(event) => setAssunto(event.target.value)}
                      placeholder="Ex.: Capitulo 3 - Estruturas de repeticao"
                      type="text"
                      value={assunto}
                    />
                  </div>
                </div>

                <fieldset className="campo">
                  <legend className="campo__rotulo">Tipos de questao permitidos *</legend>
                  <div className="gerar-ia__tipos-grid">
                    {OPCOES_TIPO_QUESTAO.map((opcao) => (
                      <label className="gerar-ia__tipo-opcao" key={opcao.value}>
                        <input
                          checked={tiposSelecionados.includes(opcao.value)}
                          disabled={gerando}
                          onChange={() => alternarTipoSelecionado(opcao.value)}
                          type="checkbox"
                        />
                        {opcao.label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                {gerando ? (
                  <div className="gerar-ia__spinner-bloco" role="status">
                    <TbLoader2 aria-hidden="true" className="gerar-ia__spinner-icone" size={32} />
                    <p style={{ margin: 0 }}>Gerando questoes com IA - isso pode levar até um minuto...</p>
                  </div>
                ) : null}

                {mensagem.message ? <InlineMessage tone={mensagem.tone}>{mensagem.message}</InlineMessage> : null}
              </form>
            </section>
          ) : null}

          {etapa === "revisao" ? (
            <section className="criar-avaliacao__secao">
              <h3 className="criar-avaliacao__secao-titulo">Revisar questoes geradas</h3>
              <div className="criar-avaliacao__secao-corpo">
                <p className="campo__ajuda" style={{ marginTop: 0 }}>
                  {questoesGeradas.length} questao(oes) geradas a partir de{" "}
                  {urlArquivoEnviado ? (
                    <a href={urlArquivoEnviado} rel="noreferrer" target="_blank">
                      {arquivo?.name}
                    </a>
                  ) : (
                    <strong>{arquivo?.name}</strong>
                  )}
                  . Revise, edite, reordene, regenere ou remova antes de confirmar.
                </p>

                {limitacaoDetectada ? (
                  <InlineMessage tone="info">
                    O material enviado tem limitacoes (ex.: paginas digitalizadas) que podem ter reduzido a qualidade de
                    algumas questoes - revise com atencao.
                  </InlineMessage>
                ) : null}

                {avisosGeracao.length ? (
                  <InlineMessage tone="info">
                    {avisosGeracao.join(" ")}
                  </InlineMessage>
                ) : null}

                <div className="gerar-ia__lista-questoes">
                  {questoesGeradas.map((questao, indice) => {
                    const tipo = Number(questao.tipoQuestao);
                    const regenerandoEstaQuestao = indiceRegenerando === indice;

                    return (
                      <article className="gerar-ia__questao" key={questao._chaveLocal}>
                        <header className="gerar-ia__questao-cabecalho">
                          <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                            <strong>
                              Questao {indice + 1} - {normalizeQuestionType(tipo)}
                            </strong>
                            {questao.origem === "extraida" ? (
                              <StatusPill tone="success">Extraida do material</StatusPill>
                            ) : questao.origem === "gerada" ? (
                              <StatusPill tone="info">Composta pela IA</StatusPill>
                            ) : null}
                            {questao.gabaritoIncerto ? <StatusPill tone="warning">Gabarito nao identificado</StatusPill> : null}
                          </div>
                          <div className="gerar-ia__questao-acoes">
                            <Botao
                              aria-label={`Mover questao ${indice + 1} para cima`}
                              disabled={indice === 0 || indiceRegenerando !== null}
                              onClick={() => moverQuestaoGerada(indice, -1)}
                              tamanho="pequeno"
                              type="button"
                              variante="secundario"
                            >
                              <TbChevronUp aria-hidden="true" size={15} />
                            </Botao>
                            <Botao
                              aria-label={`Mover questao ${indice + 1} para baixo`}
                              disabled={indice === questoesGeradas.length - 1 || indiceRegenerando !== null}
                              onClick={() => moverQuestaoGerada(indice, 1)}
                              tamanho="pequeno"
                              type="button"
                              variante="secundario"
                            >
                              <TbChevronDown aria-hidden="true" size={15} />
                            </Botao>
                            <Botao
                              disabled={indiceRegenerando !== null}
                              onClick={() => regenerarQuestao(indice)}
                              tamanho="pequeno"
                              type="button"
                              variante="secundario"
                            >
                              <TbSparkles aria-hidden="true" size={15} className={regenerandoEstaQuestao ? "gerar-ia__spinner-icone" : ""} />{" "}
                              {regenerandoEstaQuestao ? "Regenerando..." : "Regenerar"}
                            </Botao>
                            <Botao
                              aria-label={`Remover questao ${indice + 1}`}
                              disabled={indiceRegenerando !== null}
                              onClick={() => removerQuestaoGerada(indice)}
                              tamanho="pequeno"
                              type="button"
                              variante="perigo"
                            >
                              <MdDelete aria-hidden="true" size={15} />
                            </Botao>
                          </div>
                        </header>

                        {questao.gabaritoIncerto ? (
                          <InlineMessage tone="info">
                            A IA nao conseguiu identificar o gabarito desta questao com seguranca - marque manualmente a
                            alternativa{tipo === 4 ? "/combinacao" : ""} correta abaixo antes de confirmar.
                          </InlineMessage>
                        ) : null}

                        {questao.aviso ? <p className="gerar-ia__questao-aviso">{questao.aviso}</p> : null}

                        <div className="campo">
                          <label className="campo__rotulo" htmlFor={`gerar-ia-titulo-interno-${indice}`}>Titulo interno *</label>
                          <input
                            className="campo__entrada"
                            id={`gerar-ia-titulo-interno-${indice}`}
                            onChange={(event) => atualizarCampoQuestaoGerada(indice, "tituloInterno", event.target.value)}
                            type="text"
                            value={questao.tituloInterno || ""}
                          />
                        </div>

                        <div className="campo">
                          <label className="campo__rotulo" htmlFor={`gerar-ia-contexto-${indice}`}>Contexto</label>
                          <textarea
                            className="campo__entrada"
                            id={`gerar-ia-contexto-${indice}`}
                            onChange={(event) => atualizarCampoQuestaoGerada(indice, "contexto", event.target.value)}
                            value={questao.contexto || ""}
                          />
                        </div>

                        <div className="campo">
                          <label className="campo__rotulo" htmlFor={`gerar-ia-enunciado-${indice}`}>Enunciado *</label>
                          <textarea
                            className="campo__entrada"
                            id={`gerar-ia-enunciado-${indice}`}
                            onChange={(event) => atualizarCampoQuestaoGerada(indice, "enunciado", event.target.value)}
                            value={questao.enunciado || ""}
                          />
                        </div>

                        <div className="grade-3">
                          <div className="campo">
                            <label className="campo__rotulo" htmlFor={`gerar-ia-pontos-${indice}`}>Pontos</label>
                            <input
                              className="campo__entrada"
                              id={`gerar-ia-pontos-${indice}`}
                              min="0.01"
                              onChange={(event) => atualizarCampoQuestaoGerada(indice, "pontos", event.target.value)}
                              step="0.01"
                              type="number"
                              value={questao.pontos ?? ""}
                            />
                          </div>
                          <div className="campo">
                            <label className="campo__rotulo" htmlFor={`gerar-ia-dificuldade-${indice}`}>Dificuldade</label>
                            <select
                              className="campo__entrada"
                              id={`gerar-ia-dificuldade-${indice}`}
                              onChange={(event) => atualizarCampoQuestaoGerada(indice, "dificuldade", event.target.value)}
                              value={String(questao.dificuldade ?? 1)}
                            >
                              {[1, 2, 3, 4, 5].map((nivel) => (
                                <option key={nivel} value={nivel}>
                                  {nivel}
                                </option>
                              ))}
                            </select>
                          </div>
                          {questao.paginaReferencia ? (
                            <div className="campo">
                              <span className="campo__rotulo">Pagina de referencia</span>
                              <p className="campo__ajuda" style={{ marginTop: 0 }}>{questao.paginaReferencia}</p>
                            </div>
                          ) : null}
                        </div>

                        {questao.trechoReferencia ? (
                          <p className="gerar-ia__questao-aviso">Trecho de origem: &ldquo;{questao.trechoReferencia}&rdquo;</p>
                        ) : null}

                        {tipo === 4 ? (
                          <div className="campo">
                            <span className="campo__rotulo">Afirmativas</span>
                            <ul className="detalhe-usuario__lista" role="list">
                              {(questao.afirmativas || []).map((afirmativa, indiceAfirmativa) => (
                                <li
                                  className="detalhe-usuario__item"
                                  key={indiceAfirmativa}
                                  style={{ alignItems: "stretch", flexDirection: "column", fontWeight: 400, gap: "0.5rem" }}
                                >
                                  <div style={{ alignItems: "center", display: "flex", gap: "0.5rem" }}>
                                    <input
                                      aria-label={`Numero da afirmativa ${indiceAfirmativa + 1}`}
                                      className="campo__entrada"
                                      onChange={(event) => atualizarAfirmativaGerada(indice, indiceAfirmativa, "numero", event.target.value)}
                                      style={{ width: "4rem" }}
                                      type="text"
                                      value={afirmativa.numero || ""}
                                    />
                                    <input
                                      aria-label={`Texto da afirmativa ${indiceAfirmativa + 1}`}
                                      className="campo__entrada"
                                      onChange={(event) => atualizarAfirmativaGerada(indice, indiceAfirmativa, "texto", event.target.value)}
                                      style={{ flex: 1 }}
                                      type="text"
                                      value={afirmativa.texto || ""}
                                    />
                                    <label style={{ alignItems: "center", display: "flex", gap: "0.3rem", whiteSpace: "nowrap" }}>
                                      <input
                                        checked={Boolean(afirmativa.ehCorreta)}
                                        onChange={(event) => atualizarAfirmativaGerada(indice, indiceAfirmativa, "ehCorreta", event.target.checked)}
                                        type="checkbox"
                                      />
                                      Correta
                                    </label>
                                  </div>
                                  <textarea
                                    aria-label={`Justificativa da afirmativa ${indiceAfirmativa + 1}`}
                                    className="campo__entrada"
                                    onChange={(event) => atualizarAfirmativaGerada(indice, indiceAfirmativa, "justificativa", event.target.value)}
                                    value={afirmativa.justificativa || ""}
                                  />
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {tipo !== 3 ? (
                          <div className="campo">
                            <span className="campo__rotulo">Alternativas</span>
                            <ul className="detalhe-usuario__lista" role="list">
                              {(questao.alternativas || []).map((alternativa, indiceAlternativa) => (
                                <li
                                  className="detalhe-usuario__item"
                                  key={alternativa.letra}
                                  style={{ alignItems: "stretch", flexDirection: "column", fontWeight: 400, gap: "0.5rem" }}
                                >
                                  <div style={{ alignItems: "center", display: "flex", gap: "0.5rem" }}>
                                    <strong>{alternativa.letra}</strong>
                                    <input
                                      className="campo__entrada"
                                      disabled={tipo === 2}
                                      onChange={(event) => atualizarAlternativaGerada(indice, indiceAlternativa, "texto", event.target.value)}
                                      style={{ flex: 1 }}
                                      type="text"
                                      value={alternativa.texto || ""}
                                    />
                                    <input
                                      aria-label={`Marcar alternativa ${alternativa.letra} da questao ${indice + 1} como correta`}
                                      checked={Boolean(alternativa.ehCorreta)}
                                      name={`gerar-ia-correta-${indice}`}
                                      onChange={() => selecionarAlternativaCorretaGerada(indice, indiceAlternativa)}
                                      type="radio"
                                    />
                                  </div>
                                  <textarea
                                    aria-label={`Justificativa da alternativa ${alternativa.letra} da questao ${indice + 1}`}
                                    className="campo__entrada"
                                    onChange={(event) => atualizarAlternativaGerada(indice, indiceAlternativa, "justificativa", event.target.value)}
                                    placeholder="Justificativa (opcional)"
                                    value={alternativa.justificativa || ""}
                                  />
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        <div className="campo">
                          <label className="campo__rotulo" htmlFor={`gerar-ia-explicacao-${indice}`}>Explicacao pos-resposta</label>
                          <textarea
                            className="campo__entrada"
                            id={`gerar-ia-explicacao-${indice}`}
                            onChange={(event) => atualizarCampoQuestaoGerada(indice, "explicacaoPosResposta", event.target.value)}
                            value={questao.explicacaoPosResposta || ""}
                          />
                        </div>
                      </article>
                    );
                  })}
                </div>

                {mensagem.message ? <InlineMessage tone={mensagem.tone}>{mensagem.message}</InlineMessage> : null}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
