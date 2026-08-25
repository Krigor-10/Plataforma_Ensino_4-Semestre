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

const ROTULO_MOBILE = {
  pessoas: "Usuários",
  academico: "Acadêmico",
};

function obterItensNavMobile(sections) {
  const gruposVisiveis = {};
  for (const [chave, def] of Object.entries(GRUPOS_DEF)) {
    const filhos = def.filhos
      .map((f) => sections.find((s) => s.key === f))
      .filter(Boolean);
    if (filhos.length >= 2) {
      gruposVisiveis[chave] = { ...def, filhos, navegarPara: filhos[0].key };
    }
  }

  const emGrupo = new Set(
    Object.values(gruposVisiveis).flatMap((g) => g.filhos.map((f) => f.key))
  );

  const itens = [];
  const gruposAdicionados = new Set();

  for (const secao of sections) {
    if (itens.length >= 5) break;

    const grupoKey = FILHO_PARA_GRUPO[secao.key];
    if (grupoKey && emGrupo.has(secao.key) && gruposVisiveis[grupoKey]) {
      if (!gruposAdicionados.has(grupoKey)) {
        gruposAdicionados.add(grupoKey);
        const grupo = gruposVisiveis[grupoKey];
        itens.push({
          chave: grupoKey,
          tipo: "grupo",
          rotulo: ROTULO_MOBILE[grupoKey] ?? grupo.rotulo,
          Icone: grupo.Icone,
          navegarPara: grupo.navegarPara,
          filhosChaves: grupo.filhos.map((f) => f.key),
        });
      }
    } else if (!emGrupo.has(secao.key)) {
      itens.push({
        chave: secao.key,
        tipo: "secao",
        rotulo: secao.label,
        navegarPara: secao.key,
        filhosChaves: [secao.key],
      });
    }
  }

  return itens;
}

export default function BarraNavMobile({ sections, secaoAtual, onNavigate }) {
  const itens = obterItensNavMobile(sections);

  function estaAtivo(item) {
    return item.filhosChaves.includes(secaoAtual) || secaoAtual === item.chave;
  }

  return (
    <nav className="nav-mobile" aria-label="Navegação principal">
      {itens.map((item) => {
        const ativo = estaAtivo(item);
        const Ic = item.tipo === "grupo" ? item.Icone : ICONE_COMP[item.chave];

        return (
          <button
            key={item.chave}
            className={`nav-mobile__item${ativo ? " nav-mobile__item--ativo" : ""}`}
            onClick={() => onNavigate(item.navegarPara === "dashboard" ? "/app" : `/app/${item.navegarPara}`)}
            aria-current={ativo ? "page" : undefined}
            type="button"
          >
            <span className="nav-mobile__icone" aria-hidden="true">
              {Ic && <Ic size={22} />}
            </span>
            <span className="nav-mobile__rotulo">{item.rotulo}</span>
          </button>
        );
      })}
    </nav>
  );
}
