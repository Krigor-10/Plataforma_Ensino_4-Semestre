import { useEffect, useState } from "react";
import { TbCheck, TbMessageChatbot } from "react-icons/tb";
import Botao from "../Botao.jsx";
import Switch from "../Switch.jsx";
import { InlineMessage } from "../Primitives.jsx";
import { useToast } from "../../hooks/useToast.jsx";
import { ApiError } from "../../lib/api.js";
import { atualizarConfiguracaoChatbot, obterConfiguracaoChatbot, obterUsoChatbot } from "../../lib/chatbotApi.js";

// Gasto/teto do Assistente CodeRyse sao sempre em USD (custo direto da API
// da IA) - formatMoney (lib/format.js) e BRL, por isso o formatador proprio
// aqui em vez de reaproveitar aquele.
function formatUsd(valor) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(valor || 0));
}

// Roxo (padrao) ate 80% do teto, ambar dos 80% aos 99%, vermelho a partir de
// 100% - mesmo criterio de "esta acabando o orcamento" que ChatbotService ja
// usa no backend pra bloquear o chat do aluno quando o teto estoura.
function corDaBarraUso(percentual) {
  if (percentual >= 100) return "critico";
  if (percentual >= 80) return "aviso";
  return "normal";
}

/**
 * Configuracao do Assistente CodeRyse (liga/desliga, teto mensal de gasto e
 * o gasto/perguntas do mes atual) - antes um cartao no topo de Chamados,
 * agora uma secao em Meu perfil > Configuracoes, so pro Admin (docs/chatbot/
 * PROMPT-agente-assistente-config-no-perfil.md): o teto e o liga/desliga sao
 * o controle de custo do Admin, nao pertencem a fila de atendimento. Mesmo
 * par de endpoints usados pelo ChatbotService pra decidir se o chat do
 * aluno fica disponivel (ver CODIGOS_INDISPONIBILIDADE em PainelAssistente.jsx).
 */
export default function SecaoAssistenteConfiguracoes({ onSessionExpired }) {
  const { mostrarToast } = useToast();
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [tetoMensalTexto, setTetoMensalTexto] = useState("");
  const [uso, setUso] = useState(null);
  const [salvandoAtivo, setSalvandoAtivo] = useState(false);
  const [salvandoTeto, setSalvandoTeto] = useState(false);

  useEffect(() => {
    let efeitoAtivo = true;

    Promise.all([obterConfiguracaoChatbot(), obterUsoChatbot()])
      .then(([configuracao, usoDoMes]) => {
        if (!efeitoAtivo) return;
        setAtivo(configuracao.ativo);
        setTetoMensalTexto(String(configuracao.tetoMensalUsd));
        setUso(usoDoMes);
      })
      .catch((err) => {
        if (!efeitoAtivo) return;

        if (err instanceof ApiError && err.status === 401) {
          onSessionExpired?.();
          return;
        }

        setErro(err.message || "Nao foi possivel carregar a configuracao do assistente agora.");
      })
      .finally(() => {
        if (efeitoAtivo) setCarregando(false);
      });

    return () => {
      efeitoAtivo = false;
    };
  }, [onSessionExpired]);

  async function alternarAtivo() {
    const novoValor = !ativo;
    setSalvandoAtivo(true);

    try {
      await atualizarConfiguracaoChatbot({ ativo: novoValor, tetoMensalUsd: Number(tetoMensalTexto) || 0.01 });
      setAtivo(novoValor);
      mostrarToast(novoValor ? "Assistente ligado." : "Assistente desligado.", "sucesso");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      mostrarToast(err.message || "Nao foi possivel atualizar o assistente agora.", "erro");
    } finally {
      setSalvandoAtivo(false);
    }
  }

  async function salvarTeto(evento) {
    evento.preventDefault();
    const novoTeto = Number(tetoMensalTexto);

    if (!novoTeto || novoTeto <= 0) {
      mostrarToast("Informe um teto mensal maior que zero.", "erro");
      return;
    }

    setSalvandoTeto(true);

    try {
      await atualizarConfiguracaoChatbot({ ativo, tetoMensalUsd: novoTeto });
      setUso((atual) => (atual ? { ...atual, tetoMensalUsd: novoTeto } : atual));
      mostrarToast("Teto mensal atualizado.", "sucesso");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      mostrarToast(err.message || "Nao foi possivel atualizar o teto mensal agora.", "erro");
    } finally {
      setSalvandoTeto(false);
    }
  }

  if (carregando) {
    return (
      <div className="perfil-seguranca-item">
        <p className="texto-vazio">Carregando configuração do assistente...</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="perfil-seguranca-item">
        <InlineMessage tone="error">{erro}</InlineMessage>
      </div>
    );
  }

  const percentualUso = uso?.tetoMensalUsd ? Math.min(100, (Number(uso.gastoMesUsd || 0) / Number(uso.tetoMensalUsd)) * 100) : 0;

  return (
    <div className="perfil-seguranca-item perfil-seguranca-item--formulario">
      <div className="perfil-seguranca-item__cabecalho">
        <div className="perfil-seguranca-item__info">
          <TbMessageChatbot aria-hidden="true" size={22} />
          <div>
            <strong>Assistente CodeRyse</strong>
            <p>Controle de uso e custo do assistente dos alunos.</p>
          </div>
        </div>
        <Switch
          ativo={ativo}
          desabilitado={salvandoAtivo}
          onAlternar={alternarAtivo}
          rotulo={ativo ? "Desligar assistente" : "Ligar assistente"}
        >
          <span aria-hidden="true" className="switch-tema__thumb" />
        </Switch>
      </div>

      <form className="assistente-config__teto" onSubmit={salvarTeto}>
        <label htmlFor="assistente-teto-mensal">Teto mensal (US$)</label>
        <div className="assistente-config__teto-campo">
          <input
            id="assistente-teto-mensal"
            type="number"
            min="0.01"
            step="0.01"
            value={tetoMensalTexto}
            onChange={(evento) => setTetoMensalTexto(evento.target.value)}
            disabled={salvandoTeto}
          />
          <Botao type="submit" tamanho="pequeno" variante="secundario" disabled={salvandoTeto}>
            <TbCheck aria-hidden="true" size={15} /> {salvandoTeto ? "Salvando..." : "Salvar teto"}
          </Botao>
        </div>
      </form>

      <dl className="assistente-config__estatisticas">
        <div>
          <dt>Gasto do mês</dt>
          <dd>{formatUsd(uso?.gastoMesUsd)} de {formatUsd(uso?.tetoMensalUsd)}</dd>
        </div>
        <div>
          <dt>Perguntas do mês</dt>
          <dd>{uso?.quantidadePerguntasMes ?? 0}</dd>
        </div>
      </dl>

      <div
        aria-label={`${Math.round(percentualUso)}% do teto mensal usado`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Math.round(percentualUso)}
        className="assistente-config__barra-uso"
        role="progressbar"
      >
        <div
          className={`assistente-config__barra-uso-preenchimento assistente-config__barra-uso-preenchimento--${corDaBarraUso(percentualUso)}`}
          style={{ width: `${percentualUso}%` }}
        />
      </div>
    </div>
  );
}
