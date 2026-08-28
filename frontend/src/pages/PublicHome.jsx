import { useEffect, useState } from "react";
import { TbChevronDown, TbSend, TbX } from "react-icons/tb";
import { MdPersonAdd } from "react-icons/md";
import GlobalHeader from "../components/GlobalHeader.jsx";
import Botao from "../components/Botao.jsx";
import Modal from "../components/Modal.jsx";
import { InlineMessage } from "../components/Primitives.jsx";
import { CURATED_COURSES, PUBLIC_PILLARS, isCursoVisivelNoCatalogoPublico } from "../data/appConfig.js";
import { getCourseCover } from "../data/courseCovers.js";
import { formatMoney } from "../lib/format.js";
import homeBannerImage from "../assets/home-publica-banner.png";
import { apiRequest } from "../lib/api.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";

export default function PublicHome({ hasSession, isDemoMode, onNavigate }) {
  useDocumentTitle("EdTech Academy | Cursos digitais");

  const [courses, setCourses] = useState(() => filterPublicCourses(CURATED_COURSES));
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [cursoModal, setCursoModal] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function loadCourses() {
      try {
        const response = await apiRequest("/Cursos");
        if (ignore) {
          return;
        }

        const publicCourses = filterPublicCourses(response);
        if (publicCourses.length > 0) {
          setCourses(publicCourses);
        }

        setStatus("ready");
      } catch (err) {
        if (ignore) {
          return;
        }

        setError(err.message || "Nao foi possivel carregar o catalogo agora.");
        setStatus("ready");
      }
    }

    loadCourses();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <>
      <a href="#conteudo-principal" className="pular-para-conteudo">
        Pular para o conteudo principal
      </a>

      <GlobalHeader hasSession={hasSession} isDemoMode={isDemoMode} onNavigate={onNavigate} />

      <main id="conteudo-principal">
        <section className="secao-hero" aria-labelledby="titulo-hero">
          <img className="secao-hero__banner" src={homeBannerImage} alt="" aria-hidden="true" />

          <div className="secao-hero__conteudo">
            <p className="secao-hero__tag">Cursos digitais com acompanhamento academico</p>
            <h1 className="secao-hero__titulo" id="titulo-hero">
              EdTech
              <br />
              <span className="secao-hero__titulo--destaque">Academy</span>
            </h1>
            <p className="secao-hero__descricao">
              Escolha uma trilha, solicite sua matricula e acompanhe tudo em um painel academico integrado.
            </p>

            {isDemoMode ? (
              <InlineMessage tone="info">
                Modo apresentacao ativo: a experiencia roda localmente para demonstracao.
              </InlineMessage>
            ) : null}

            <div className="secao-hero__acoes">
              <Botao
                variante="sucesso"
                tamanho="grande"
                onClick={() => onNavigate("/cadastro")}
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <TbSend size={18} aria-hidden="true" /> Solicitar matricula
              </Botao>
              <a href="#cursos" className="botao botao--fantasma botao--grande" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                Ver cursos <TbChevronDown size={18} aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        <section className="secao-pilares" id="sobre" aria-labelledby="titulo-pilares">
          <div className="secao-pilares__inner">
            <h2 className="visualmente-oculto" id="titulo-pilares">Diferenciais da plataforma</h2>
            <ul className="grade-pilares grade-pilares--publica" role="list">
              {PUBLIC_PILLARS.map((pilar) => (
                <li key={pilar.title} className="cartao-pilar">
                  <h3 className="cartao-pilar__titulo">{pilar.title}</h3>
                  <p className="cartao-pilar__descricao">{pilar.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="secao-cursos" id="cursos" aria-labelledby="titulo-cursos">
          <div className="secao-cursos__inner">
            <header className="secao-cabecalho">
              <div>
                <p className="secao-cabecalho__etiqueta">Catalogo de cursos ativos</p>
                <h2 className="secao-cabecalho__titulo" id="titulo-cursos">
                  Escolha uma trilha e comece pela matricula
                </h2>
              </div>
              <p className="secao-cabecalho__subtitulo">
                {status === "loading"
                  ? "Lendo os cursos publicados..."
                  : `${courses.length} curso(s) disponivel(is) para matricula.`}
              </p>
            </header>

            {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}

            <ul className="grade-cursos" role="list" aria-label="Cursos disponiveis">
              {courses.map((curso) => (
                <li key={curso.id}>
                  <article className="cartao-curso">
                    <button
                      type="button"
                      className="cartao-curso__acionador"
                      aria-labelledby={`curso-titulo-${curso.id}`}
                      onClick={() => setCursoModal(curso)}
                    >
                      <div className="cartao-curso__topo" aria-hidden="true">
                        <img
                          alt=""
                          aria-hidden="true"
                          className="cartao-curso__imagem"
                          loading="lazy"
                          src={getCourseCover(curso)}
                        />
                      </div>

                      <div className="cartao-curso__corpo">
                        <h3 className="cartao-curso__titulo" id={`curso-titulo-${curso.id}`}>
                          {curso.titulo}
                        </h3>
                        <p className="cartao-curso__descricao">{curso.descricao}</p>
                      </div>
                    </button>

                    <footer className="cartao-curso__rodape">
                      <strong className="cartao-curso__preco">{formatMoney(curso.preco)}</strong>
                      <Botao
                        variante="primario"
                        tamanho="pequeno"
                        onClick={() => onNavigate("/cadastro")}
                        aria-label={`Cadastrar-se em ${curso.titulo}`}
                        style={{ display: "flex", alignItems: "center", gap: "6px" }}
                      >
                        <MdPersonAdd size={18} aria-hidden="true" /> Cadastrar-se
                      </Botao>
                    </footer>
                  </article>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      {cursoModal ? (
        <Modal titulo={cursoModal.titulo} onFechar={() => setCursoModal(null)}>
          <dl className="lista-detalhes">
            <div className="lista-detalhes__item">
              <dt>Investimento</dt>
              <dd>{formatMoney(cursoModal.preco)}</dd>
            </div>
            <div className="lista-detalhes__item">
              <dt>Descricao</dt>
              <dd>{cursoModal.descricao}</dd>
            </div>
          </dl>
          <footer className="modal-rodape">
            <Botao variante="perigo" onClick={() => setCursoModal(null)} style={{ display: "flex", alignItems: "center", gap: "6px", marginRight: "auto" }}>
              <TbX size={15} aria-hidden="true" /> Fechar
            </Botao>
            <Botao variante="primario" onClick={() => { setCursoModal(null); onNavigate("/cadastro"); }} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <MdPersonAdd size={18} aria-hidden="true" /> Cadastrar-se
            </Botao>
          </footer>
        </Modal>
      ) : null}

      <footer className="rodape-publico" role="contentinfo">
        <div className="rodape-publico__inner">
          <div className="rodape-publico__marca-bloco">
            <p className="rodape-publico__marca">EdTech Academy</p>
            <p className="rodape-publico__direitos">
              Cursos digitais e gestao academica em uma unica plataforma.
            </p>
          </div>

          <nav className="rodape-publico__nav" aria-label="Links do rodape">
            <p className="rodape-publico__nav-titulo">Plataforma</p>
            <ul className="rodape-publico__nav-lista">
              <li>
                <a className="rodape-publico__nav-link" href="#cursos">Cursos</a>
              </li>
              <li>
                <button className="rodape-publico__nav-link" onClick={() => onNavigate("/login")} type="button">
                  Entrar
                </button>
              </li>
              <li>
                <button className="rodape-publico__nav-link" onClick={() => onNavigate("/cadastro")} type="button">
                  Criar conta
                </button>
              </li>
            </ul>
          </nav>
        </div>

        <div className="rodape-publico__barra-inferior">
          <p className="rodape-publico__copyright">
            © {new Date().getFullYear()} EdTech Academy. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </>
  );
}

function filterPublicCourses(courses) {
  if (!Array.isArray(courses)) {
    return [];
  }

  return courses.filter(isCursoVisivelNoCatalogoPublico);
}
