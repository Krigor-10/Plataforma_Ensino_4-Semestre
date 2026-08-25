import React from "react";
import {
  TbLayoutDashboard,
  TbSchool,
  TbChalkboard,
  TbUserCog,
  TbBook,
  TbStack2,
  TbUsersGroup,
  TbClipboardList,
  TbClipboardCheck,
  TbFileText,
  TbCertificate,
} from "react-icons/tb";
import { GRUPOS_DEF, FILHO_PARA_GRUPO } from "./BarraLateral.jsx";

export const ALTURA_NAV_GRUPO = 44;

const ICONE_COMP = {
  dashboard: TbLayoutDashboard,
  alunos: TbSchool,
  professores: TbChalkboard,
  coordenadores: TbUserCog,
  cursos: TbBook,
  modulos: TbStack2,
  turmas: TbUsersGroup,
  matriculas: TbClipboardList,
  avaliacoes: TbClipboardCheck,
  conteudos: TbFileText,
  certificados: TbCertificate,
};

export function temNavGrupo(sections, secaoAtual) {
  const grupoKey = FILHO_PARA_GRUPO[secaoAtual];
  if (!grupoKey) return false;
  const grupo = GRUPOS_DEF[grupoKey];
  return grupo.filhos.filter((f) => sections.some((s) => s.key === f)).length >= 2;
}

function obterFilhosVisiveis(sections, secaoAtual) {
  const grupoKey = FILHO_PARA_GRUPO[secaoAtual];
  if (!grupoKey) return null;
  const grupo = GRUPOS_DEF[grupoKey];
  const filhos = grupo.filhos
    .map((f) => sections.find((s) => s.key === f))
    .filter(Boolean);
  return filhos.length >= 2 ? { grupo, filhos } : null;
}

export default function NavGrupo({ sections, secaoAtual, onNavigate }) {
  const resultado = obterFilhosVisiveis(sections, secaoAtual);

  if (!resultado) return null;

  const { grupo, filhos } = resultado;
  const { Icone, rotulo } = grupo;

  return (
    <nav className="nav-grupo" aria-label={`Subnavegação de ${rotulo}`}>
      <div className="nav-grupo__label" aria-hidden="true">
        <Icone size={13} />
        <span>{rotulo}</span>
      </div>

      <div className="nav-grupo__divisor" aria-hidden="true" />

      <div className="nav-grupo__tabs" role="tablist" aria-label={rotulo}>
        {filhos.map((filho, idx) => {
          const Ic = ICONE_COMP[filho.key];
          const ativo = secaoAtual === filho.key;
          return (
            <React.Fragment key={filho.key}>
              {idx > 0 && (
                <span className="nav-grupo__sep" aria-hidden="true">›</span>
              )}
              <button
                role="tab"
                aria-selected={ativo}
                className={`nav-grupo__tab${ativo ? " nav-grupo__tab--ativo" : ""}`}
                onClick={() => onNavigate(`/app/${filho.key}`)}
                type="button"
              >
                {Ic && <Ic size={15} />}
                <span>{filho.label}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
}
