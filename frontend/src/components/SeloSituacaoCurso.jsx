import { TbLock } from "react-icons/tb";
import Insignia from "./Insignia.jsx";
import { rotuloSituacaoCurso, SITUACAO_CURSO, situacaoDoCurso, varianteSituacaoCurso } from "../lib/situacaoCurso.js";

/* Selo de situacao do curso (decisao D10 da auditoria de 26/11): o mesmo
   texto e cor em todas as telas (grades do Admin, coordenador e professor,
   painel do curso). A situacao vem do servidor (curso.situacao). */
export default function SeloSituacaoCurso({ className, curso }) {
  const situacao = situacaoDoCurso(curso);
  const rotulo = rotuloSituacaoCurso(situacao);

  return (
    <Insignia
      className={className}
      texto={
        situacao === SITUACAO_CURSO.ENCERRADO ? (
          <>
            <TbLock aria-hidden="true" size={12} /> {rotulo}
          </>
        ) : (
          rotulo
        )
      }
      variante={varianteSituacaoCurso(situacao)}
    />
  );
}
