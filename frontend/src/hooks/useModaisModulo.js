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

  function abrirExclusaoModulo(modulo) {
    setModuloParaExcluir(modulo);
    setMensagemExclusao("");
  }

  function fecharExclusaoModulo() {
    if (salvando) {
      return;
    }

    setModuloParaExcluir(null);
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

      setMensagemExclusao(err.message || "Nao foi possivel excluir o modulo agora.");
    } finally {
      setSalvando(false);
    }
  }

  return {
    abrirEdicaoModulo,
    abrirExclusaoModulo,
    abrirFormularioNovoModulo,
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
