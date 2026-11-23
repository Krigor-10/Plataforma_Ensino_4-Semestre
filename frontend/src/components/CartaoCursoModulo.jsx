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
   (Professor: "N% publicado · N rascunhos", barra = % publicado;
   Coordenador/Admin: situacao do curso, barra = progresso medio dos
   alunos) - quem chama decide, este componente so exibe.

   `compacto` (docs/TelaConteudosProfessor/PROMPT-agente-tela-modulo-
   correcoes-1.md, item 8) e uma variante em linha unica (~60px): mesmo
   icone/titulo/barra/selo, so que lado a lado e sem a descricao - pra telas
   que ja repetem o cabecalho do curso em algum lugar acima (ex.: a tela do
   modulo, logo depois de "Acadêmico › Conteúdos › curso"). */
export default function CartaoCursoModulo({ compacto = false, curso, percentual, selo }) {
  const temImagemPropria = Boolean(String(curso.imagemUrl || "").trim());
  const icone = temImagemPropria ? (
    <img alt="" src={resolverUrlArquivo(curso.imagemUrl)} />
  ) : (
    <TbCode aria-hidden="true" size={compacto ? 18 : 32} />
  );

  if (compacto) {
    return (
      <div className="cartao-curso-modulo cartao-curso-modulo--compacto">
        <div className="cartao-curso-modulo__icone">{icone}</div>
        <div className="cartao-curso-modulo__corpo">
          <h3 className="cartao-curso-modulo__titulo" title={curso.titulo}>{curso.titulo}</h3>
          <BarraProgresso mostrarTexto={false} percentual={percentual} rotuloAria={`${percentual}% concluído`} />
        </div>
        {selo ? <Insignia className="cartao-curso-modulo__selo" texto={selo} /> : null}
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
      {selo ? <Insignia className="cartao-curso-modulo__selo" texto={selo} /> : null}
    </div>
  );
}
