import { useEffect, useState } from "react";
import FeaturedCoursesCarousel from "../components/FeaturedCoursesCarousel.jsx";
import GlobalHeader from "../components/GlobalHeader.jsx";
import { InlineMessage } from "../components/Primitives.jsx";
import { CURATED_COURSES, PUBLIC_PILLARS } from "../data/appConfig.js";
import homeBannerImage from "../assets/home-publica-banner.png";
import { apiRequest } from "../lib/api.js";

const HIDDEN_PUBLIC_COURSE_TITLES = new Set(["product analytics para edtech"]);

export default function PublicHome({ hasSession, isDemoMode, onNavigate }) {
  const [courses, setCourses] = useState(() => filterPublicCourses(CURATED_COURSES));
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

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
    <div className="marketing-shell">
      <div className="marketing-backdrop" />
      <GlobalHeader hasSession={hasSession} isDemoMode={isDemoMode} onNavigate={onNavigate} />

      <main className="marketing-main">
        <section className="public-hero" aria-labelledby="public-hero-title">
          <img className="public-hero__banner" src={homeBannerImage} alt="" aria-hidden="true" />
          <div className="public-hero__scene" aria-hidden="true" />

          <article className="public-hero__content">
            <span className="eyebrow">Cursos digitais com acompanhamento academico</span>
            <h1 id="public-hero-title">CodeRyse Academy</h1>
            <p>
              Escolha uma trilha, solicite sua matricula e acompanhe tudo em um painel academico integrado.
            </p>

            {isDemoMode ? (
              <InlineMessage tone="info">
                Modo apresentacao ativo: a experiencia roda localmente para demonstracao.
              </InlineMessage>
            ) : null}

            <div className="hero-actions">
              <button
                className="solid-button"
                type="button"
                onClick={() => onNavigate("/cadastro")}
              >
                Solicitar matricula
              </button>

              <button className="button button--secondary" type="button" onClick={() => onNavigate(hasSession ? "/app" : "/login")}>
                {hasSession ? "Ir para o painel" : "Entrar"}
              </button>
            </div>
          </article>
        </section>

        <section className="public-proof" aria-label="Diferenciais da plataforma">
          <div className="signal-grid">
            {PUBLIC_PILLARS.map((pillar) => (
              <article className="signal-card signal-card--quiet" key={pillar.title}>
                <strong>{pillar.title}</strong>
                <p>{pillar.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="content-section" id="catalogo">
          <div className="section-head">
            <div>
              <span className="eyebrow">Catalogo conectado</span>
              <h2>Escolha uma trilha e comece pela matricula</h2>
            </div>
            <p>
              {status === "loading"
                ? "Lendo os cursos publicados..."
                : "Percorra as opcoes disponiveis."}
            </p>
          </div>

          {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}

          <FeaturedCoursesCarousel courses={courses} onNavigate={onNavigate} />
        </section>
      </main>

      <footer className="footer-bar">
        <div className="footer-brand">
          <span className="footer-brand__copy">
            <span className="footer-brand__wordmark" aria-label="CodeRyse">
              <span className="footer-brand__wordmark-code">Code</span>
              <span className="footer-brand__wordmark-rise">Ryse</span>
            </span>
            <span className="footer-brand__subtitle">Academy</span>
          </span>
        </div>
        <span>Cursos digitais e gestao academica em uma unica plataforma</span>
      </footer>
    </div>
  );
}

function filterPublicCourses(courses) {
  if (!Array.isArray(courses)) {
    return [];
  }

  return courses.filter((course) => {
    const title = String(course.titulo || "").trim().toLowerCase();
    return !HIDDEN_PUBLIC_COURSE_TITLES.has(title);
  });
}
