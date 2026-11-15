import { useEffect, useState } from "react";
import Botao from "../Botao.jsx";
import { apiRequest } from "../../lib/api.js";
import { abrirChamado } from "../../lib/chamadosApi.js";

const LIMITE_CARACTERES_TEXTO = 1000;

/**
 * Formulario "Falar com o suporte" (rodape da aba Conversa). Busca o titulo
 * do curso aberto so se o contexto trouxe o cursoId mas nao o titulo (App.jsx
 * ainda nao preenche cursoTitulo no contexto do assistente) - GET /Cursos/{id}
 * nao exige papel especifico, qualquer aluno autenticado pode consultar.
 */
export default function FormularioChamado({ contexto, conversaId, textoInicial = "", onCancelar, onCriado }) {
  const cursoId = contexto?.cursoId || null;
  const [texto, setTexto] = useState(textoInicial);
  const [cursoTitulo, setCursoTitulo] = useState(contexto?.cursoTitulo || null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!cursoId || cursoTitulo) return;

    let efeitoAtivo = true;
    apiRequest(`/Cursos/${cursoId}`)
      .then((curso) => {
        if (efeitoAtivo) setCursoTitulo(curso?.titulo || null);
      })
      .catch(() => {});

    return () => {
      efeitoAtivo = false;
    };
  }, [cursoId, cursoTitulo]);

  async function enviar(evento) {
    evento.preventDefault();
    const textoLimpo = texto.trim();
    if (!textoLimpo || enviando) return;

    setErro(null);
    setEnviando(true);

    try {
      const chamado = await abrirChamado({ texto: textoLimpo, cursoId, conversaId });
      onCriado(chamado);
    } catch {
      setErro("Nao foi possivel abrir o chamado agora. Tente de novo em alguns instantes.");
      setEnviando(false);
    }
  }

  const restamCaracteres = LIMITE_CARACTERES_TEXTO - texto.length;

  return (
    <form className="formulario-chamado" onSubmit={enviar}>
      <p className="formulario-chamado__intro">
        Conte pra nossa equipe o que está acontecendo. A resposta chega em até 2 dias úteis.
      </p>

      {cursoId ? (
        <p className="formulario-chamado__curso">
          <strong>Curso:</strong> {cursoTitulo || "Carregando..."}
        </p>
      ) : null}

      <label htmlFor="formulario-chamado-texto">Descreva sua dúvida ou problema</label>
      <textarea
        id="formulario-chamado-texto"
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        maxLength={LIMITE_CARACTERES_TEXTO}
        rows={6}
        disabled={enviando}
        autoFocus
      />
      <span
        className={`formulario-chamado__contador${restamCaracteres <= 50 ? " formulario-chamado__contador--limite" : ""}`}
      >
        {restamCaracteres}
      </span>

      {erro ? (
        <p className="formulario-chamado__erro" role="alert">{erro}</p>
      ) : null}

      <div className="formulario-chamado__acoes">
        <Botao type="button" variante="secundario" tamanho="pequeno" onClick={onCancelar} disabled={enviando}>
          Voltar
        </Botao>
        <Botao type="submit" variante="primario" tamanho="pequeno" disabled={enviando || !texto.trim()}>
          {enviando ? "Enviando..." : "Abrir chamado"}
        </Botao>
      </div>
    </form>
  );
}
