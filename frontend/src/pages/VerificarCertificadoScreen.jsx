import { useEffect, useState } from "react";
import { TbCircleCheck, TbCircleX } from "react-icons/tb";
import Botao from "../components/Botao.jsx";
import { apiRequest } from "../lib/api.js";
import { formatDate, formatGrade } from "../lib/format.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";

const TITULOS_POR_STATUS = {
  loading: "Verificando certificado | CodeRyse Academy",
  invalido: "Codigo nao encontrado | CodeRyse Academy"
};

export default function VerificarCertificadoScreen({ codigo, onNavigate }) {
  const [status, setStatus] = useState("loading");
  const [certificado, setCertificado] = useState(null);

  useDocumentTitle(
    status === "valido" && certificado
      ? `Certificado autentico — ${certificado.cursoTitulo} | CodeRyse Academy`
      : TITULOS_POR_STATUS[status] || TITULOS_POR_STATUS.loading
  );

  useEffect(() => {
    let ignore = false;

    async function verificar() {
      if (!codigo) {
        setStatus("invalido");
        return;
      }

      try {
        const resposta = await apiRequest(`/Certificados/verificar/${encodeURIComponent(codigo)}`);
        if (!ignore) {
          setCertificado(resposta);
          setStatus("valido");
        }
      } catch {
        if (!ignore) {
          setStatus("invalido");
        }
      }
    }

    verificar();
    return () => {
      ignore = true;
    };
  }, [codigo]);

  return (
    <main className="route-gate">
      <div className="marketing-backdrop" />
      <section className="route-gate__card verificar-certificado">
        <span className="eyebrow">Verificação de certificado</span>

        {status === "loading" ? (
          <>
            <h1>Verificando...</h1>
            <p>Consultando o código {codigo}.</p>
          </>
        ) : status === "valido" ? (
          <>
            <TbCircleCheck aria-hidden="true" className="verificar-certificado__icone verificar-certificado__icone--ok" size={48} />
            <h1>Certificado autêntico</h1>
            <dl className="verificar-certificado__dados">
              <div>
                <dt>Aluno</dt>
                <dd>{certificado.alunoNome}</dd>
              </div>
              <div>
                <dt>Curso</dt>
                <dd>{certificado.cursoTitulo}</dd>
              </div>
              {certificado.turmaNome ? (
                <div>
                  <dt>Turma</dt>
                  <dd>{certificado.turmaNome}</dd>
                </div>
              ) : null}
              <div>
                <dt>Nota final</dt>
                <dd>{formatGrade(certificado.notaFinal)} de 10,0</dd>
              </div>
              <div>
                <dt>Emitido em</dt>
                <dd>{formatDate(certificado.emitidoEm)}</dd>
              </div>
              <div>
                <dt>Código</dt>
                <dd>{certificado.codigoVerificacao}</dd>
              </div>
            </dl>
          </>
        ) : (
          <>
            <TbCircleX aria-hidden="true" className="verificar-certificado__icone verificar-certificado__icone--erro" size={48} />
            <h1>Código não encontrado</h1>
            <p>Não encontramos nenhum certificado válido com o código informado.</p>
          </>
        )}

        <Botao onClick={() => onNavigate("/")} variante="fantasma">
          Voltar para o início
        </Botao>
      </section>
    </main>
  );
}
