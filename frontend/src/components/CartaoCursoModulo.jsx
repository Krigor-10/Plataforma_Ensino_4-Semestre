import { TbCode } from "react-icons/tb";
import BarraProgresso from "./BarraProgresso.jsx";
import Insignia from "./Insignia.jsx";
import { resolverUrlArquivo } from "../lib/api.js";

/* Cartao do curso, topo da tela do modulo (Professor/Coordenador/Admin) -
   docs/TelaConteudosProfessor/PROMPT-agente-tela-modulo-lista-e-janela.md,
   item 1. Icone: a imagem de capa de verdade quando o curso tem uma
   (curso.imagemUrl, upload do Admin) - senao o quadrado roxo em degrade com
   um icone generico, igual a referencia aprovada (nunca o fallback estatico
   por titulo de lib/courseImage.js, que sempre devolve alguma imagem e
   esconderia esse 2o estado). `selo` e `percentual` mudam por perfil
   (Professor: barra = % publicado, selo = "N rascunhos"; Coordenador/Admin:
   situacao do curso, barra = progresso medio dos alunos) - quem chama
   decide, este componente so exibe.

   `variante="medio"` (docs/TelaConteudosProfessor/PROMPT-agente-tela-
   modulo-hierarquia-curso-kpis.md) substitui a antiga `compacto` (correcoes-
   1.md, item 8): o curso volta a ser o bloco mais forte da tela do modulo -
   rotulo "CURSO", titulo grande (1.45rem) e descricao numa linha so, barra
   com `legendaProgresso` ao lado (texto livre por perfil: "64% publicado",
   "30% de progresso dos alunos") em vez do "N%" generico de BarraProgresso.
   `kpis` (so Coordenador/Admin) entra como bloco compacto a direita, dentro
   do proprio cartao - quando presente, o `selo` desce pra linha da barra
   (sem brigar de espaco com os KPIs); sem `kpis`, o selo fica no canto
   superior direito (Professor).

   `extra` (so variante grande, docs/TelaConteudosAlunos/PROMPT-agente-
   trilha-aluno-modulo-em-tela-propria.md) e um no React opcional, ao lado
   do selo - o botao "▶ Continuar: {proximo item}" do aluno. */
export default function CartaoCursoModulo({ curso, extra, kpis, legendaProgresso, percentual, selo, seloVariante, variante }) {
  const temImagemPropria = Boolean(String(curso.imagemUrl || "").trim());
  const medio = variante === "medio";
  const icone = temImagemPropria ? (
    <img alt="" src={resolverUrlArquivo(curso.imagemUrl)} />
  ) : (
    <TbCode aria-hidden="true" size={medio ? 26 : 32} />
  );

  if (medio) {
    return (
      <div className="cartao-curso-modulo cartao-curso-modulo--medio">
        <div className="cartao-curso-modulo__icone">{icone}</div>
        <div className="cartao-curso-modulo__corpo">
          <span className="cartao-curso-modulo__rotulo">Curso</span>
          <h3 className="cartao-curso-modulo__titulo" title={curso.titulo}>{curso.titulo}</h3>
          {curso.descricao ? <p className="cartao-curso-modulo__descricao" title={curso.descricao}>{curso.descricao}</p> : null}
          <div className="cartao-curso-modulo__linha-progresso">
            <BarraProgresso mostrarTexto={false} percentual={percentual} rotuloAria={`${percentual}% concluído`} />
            {legendaProgresso ? <span className="cartao-curso-modulo__legenda-progresso">{legendaProgresso}</span> : null}
            {!kpis && selo ? <Insignia className="cartao-curso-modulo__selo-inline" texto={selo} variante={seloVariante} /> : null}
          </div>
        </div>
        {kpis ? (
          <div className="cartao-curso-modulo__kpis">
            {kpis.map((kpi) => (
              <span className="cartao-curso-modulo__kpi" key={kpi.id}>
                <span aria-hidden="true" className="cartao-curso-modulo__kpi-icone">{kpi.icone}</span>
                <span className="cartao-curso-modulo__kpi-texto">
                  <strong>{kpi.valor}</strong>
                  <span>{kpi.rotulo}</span>
                </span>
              </span>
            ))}
          </div>
        ) : selo ? (
          <Insignia className="cartao-curso-modulo__selo" texto={selo} variante={seloVariante} />
        ) : null}
      </div>
    );
  }

  return (
    <div className="cartao-curso-modulo">
      <div className="cartao-curso-modulo__icone">{icone}</div>
      <div className="cartao-curso-modulo__corpo">
        <h3 className="cartao-curso-modulo__titulo">{curso.titulo}</h3>
        {curso.descricao ? <p className="cartao-curso-modulo__descricao">{curso.descricao}</p> : null}
        <BarraProgresso percentual={percentual} rotuloAria={`${percentual}% concluído`} />
      </div>
      {selo || extra ? (
        <div className="cartao-curso-modulo__selo-e-extra">
          {selo ? <Insignia className="cartao-curso-modulo__selo" texto={selo} variante={seloVariante} /> : null}
          {extra}
        </div>
      ) : null}
    </div>
  );
}
