import { useEffect, useState } from "react";
import { TbCheck } from "react-icons/tb";
import Botao from "../Botao.jsx";
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

/**
 * Cartao "Assistente" no topo da tela de Chamados - so pro Admin (liga/
 * desliga, teto mensal de gasto e o gasto/perguntas do mes atual). Mesmo
 * par de endpoints usados pelo ChatbotService pra decidir se o chat do
 * aluno fica disponivel (ver CODIGOS_INDISPONIBILIDADE em PainelAssistente.jsx).
 */
export default function CartaoAssistenteAdmin({ onSessionExpired }) {
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
      <div className="cartao-assistente-admin painel-secao">
        <p className="texto-vazio">Carregando configuracao do assistente...</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="cartao-assistente-admin painel-secao">
        <InlineMessage tone="error">{erro}</InlineMessage>
      </div>
    );
  }

  return (
    <div className="cartao-assistente-admin painel-secao">
      <header className="cartao-assistente-admin__cabecalho">
        <h3>Assistente CodeRyse</h3>
        <label className="cartao-assistente-admin__interruptor">
          <input type="checkbox" checked={ativo} disabled={salvandoAtivo} onChange={alternarAtivo} />
          {ativo ? "Ligado" : "Desligado"}
        </label>
      </header>

      <div className="cartao-assistente-admin__corpo">
        <form className="cartao-assistente-admin__teto" onSubmit={salvarTeto}>
          <label htmlFor="assistente-teto-mensal">Teto mensal (US$)</label>
          <div className="cartao-assistente-admin__teto-campo">
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
              <TbCheck aria-hidden="true" size={15} /> {salvandoTeto ? "Salvando..." : "Salvar"}
            </Botao>
          </div>
        </form>

        <dl className="cartao-assistente-admin__estatisticas">
          <div>
            <dt>Gasto do mês</dt>
            <dd>{formatUsd(uso?.gastoMesUsd)} de {formatUsd(uso?.tetoMensalUsd)}</dd>
          </div>
          <div>
            <dt>Perguntas do mês</dt>
            <dd>{uso?.quantidadePerguntasMes ?? 0}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
