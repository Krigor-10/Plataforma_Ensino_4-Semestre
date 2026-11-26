import { useState } from "react";
import { ApiError, apiRequest } from "../lib/api.js";

const ESTADO_INICIAL_FORMULARIO = { cursoId: "", titulo: "" };

/* Estado + chamadas de API dos modais de criar/editar/excluir modulo,
   compartilhado entre SecaoConteudosProfessor.jsx (Professor, curso ja fixo)
   e PainelCursoGestao.jsx (Admin/Coordenador, curso ja fixo) - so a
   apresentacao (ModaisModulo.jsx) difere entre os dois. `cursoFixoId`: quando
   informado, todo modulo novo nasce vinculado a esse curso. */
export function useModaisModulo({ cursoFixoId = null, mostrarToast, onSalvo, onSessionExpired }) {
  const [dadosFormulario, setDadosFormulario] = useState(ESTADO_INICIAL_FORMULARIO);
  const [moduloEmEdicaoId, setModuloEmEdicaoId] = useState(null);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [mensagemFormulario, setMensagemFormulario] = useState({ tone: "", message: "" });
  const [salvando, setSalvando] = useState(false);
  const [moduloParaExcluir, setModuloParaExcluir] = useState(null);
  const [mensagemExclusao, setMensagemExclusao] = useState("");
  // null enquanto a pre-checagem ainda nao respondeu (ou falhou em silencio -
  // nesse caso a janela segue como antes, a tentativa de confirmar e que
  // acaba revelando o motivo via erro do DELETE). Uma vez respondida, guarda
  // { podeExcluir, temItemArquivado } pra decidir esconder "Confirmar
  // exclusao" e mostrar o link "Ver arquivados" (docs/TelaConteudosProfessor/
  // PROMPT-agente-excluir-modulo-vazio.md).
  const [bloqueioExclusao, setBloqueioExclusao] = useState(null);

  function abrirFormularioNovoModulo(cursoIdPadrao) {
    setModuloEmEdicaoId(null);
    setDadosFormulario({ cursoId: String(cursoFixoId ?? cursoIdPadrao ?? ""), titulo: "" });
    setMensagemFormulario({ tone: "", message: "" });
    setFormularioAberto(true);
  }

  function abrirEdicaoModulo(modulo) {
    setModuloEmEdicaoId(modulo.id);
    setDadosFormulario({ cursoId: String(modulo.cursoId), titulo: modulo.titulo });
    setMensagemFormulario({ tone: "", message: "" });
    setFormularioAberto(true);
  }

  function fecharFormulario() {
    if (salvando) {
      return;
    }

    setFormularioAberto(false);
    setModuloEmEdicaoId(null);
    setDadosFormulario(ESTADO_INICIAL_FORMULARIO);
    setMensagemFormulario({ tone: "", message: "" });
  }

  async function salvarModulo(event) {
    event.preventDefault();

    const tituloNormalizado = dadosFormulario.titulo.trim();

    if (!tituloNormalizado) {
      setMensagemFormulario({ tone: "error", message: "Informe o titulo do modulo antes de salvar." });
      return;
    }

    if (!dadosFormulario.cursoId) {
      setMensagemFormulario({ tone: "error", message: "Selecione um curso para vincular o modulo." });
      return;
    }

    setSalvando(true);
    setMensagemFormulario({ tone: "", message: "" });

    try {
      if (moduloEmEdicaoId) {
        await apiRequest(`/Modulos/${moduloEmEdicaoId}`, {
          method: "PUT",
          body: JSON.stringify({ titulo: tituloNormalizado })
        });
      } else {
        await apiRequest("/Modulos", {
          method: "POST",
          body: JSON.stringify({ titulo: tituloNormalizado, cursoId: Number(dadosFormulario.cursoId) })
        });
      }

      mostrarToast(moduloEmEdicaoId ? "Modulo atualizado com sucesso." : "Modulo criado com sucesso.", "sucesso");
      fecharFormulario();
      onSalvo?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      setMensagemFormulario({ tone: "error", message: err.message || "Nao foi possivel salvar o modulo agora." });
    } finally {
      setSalvando(false);
    }
  }

  async function abrirExclusaoModulo(modulo) {
    setModuloParaExcluir(modulo);
    setMensagemExclusao("");
    setBloqueioExclusao(null);

    try {
      const resultado = await apiRequest(`/Modulos/${modulo.id}/bloqueios-exclusao`);
      setBloqueioExclusao({ podeExcluir: resultado.podeExcluir, temItemArquivado: resultado.temItemArquivado });
      if (!resultado.podeExcluir) {
        setMensagemExclusao(resultado.motivo || "Nao e possivel excluir este modulo agora.");
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }
      // Pre-checagem falhou (ex.: rede) - a janela segue como se nada tivesse
      // sido checado ainda; "Confirmar exclusao" continua visivel e, se de
      // fato houver bloqueio, o DELETE abaixo revela o motivo do mesmo jeito.
    }
  }

  function fecharExclusaoModulo() {
    if (salvando) {
      return;
    }

    setModuloParaExcluir(null);
    setBloqueioExclusao(null);
  }

  async function confirmarExclusao() {
    if (!moduloParaExcluir) {
      return;
    }

    setSalvando(true);
    setMensagemExclusao("");

    try {
      await apiRequest(`/Modulos/${moduloParaExcluir.id}`, { method: "DELETE" });
      setModuloParaExcluir(null);
      mostrarToast("Modulo excluido com sucesso.", "sucesso");
      onSalvo?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired?.();
        return;
      }

      const motivo = err.message || "Nao foi possivel excluir o modulo agora.";
      setMensagemExclusao(motivo);
      setBloqueioExclusao({ podeExcluir: false, temItemArquivado: /arquivad/i.test(motivo) });
    } finally {
      setSalvando(false);
    }
  }

  return {
    abrirEdicaoModulo,
    abrirExclusaoModulo,
    abrirFormularioNovoModulo,
    bloqueioExclusao,
    confirmarExclusao,
    dadosFormulario,
    fecharExclusaoModulo,
    fecharFormulario,
    formularioAberto,
    mensagemExclusao,
    mensagemFormulario,
    moduloEmEdicaoId,
    moduloParaExcluir,
    salvando,
    salvarModulo,
    setDadosFormulario
  };
}
