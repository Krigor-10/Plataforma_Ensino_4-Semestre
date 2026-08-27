import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TbCertificate, TbDownload, TbTrophy } from "react-icons/tb";
import { LuEye, LuDownload } from "react-icons/lu";
import { EmptyState } from "../../components/Primitives.jsx";
import { formatDate, formatGrade } from "../../lib/format.js";

function estaConcluido(progresso) {
  return Boolean(progresso && Number(progresso.percentualConclusao || 0) >= 100);
}

function buildAchievements({ modulosConcluidos, percentualGeral, totalCertificados, totalConteudosConcluidos }) {
  return [
    {
      id: "primeiro-passo",
      titulo: "Primeiro passo",
      descricao: "Concluiu o 1o conteudo de uma turma.",
      desbloqueada: totalConteudosConcluidos >= 1
    },
    {
      id: "em-ritmo",
      titulo: "Em ritmo",
      descricao: "5 conteudos concluidos.",
      desbloqueada: totalConteudosConcluidos >= 5
    },
    {
      id: "modulo-completo",
      titulo: "Modulo completo",
      descricao: "Finalizou um modulo inteiro.",
      desbloqueada: modulosConcluidos >= 1
    },
    {
      id: "metade-caminho",
      titulo: "Metade do caminho",
      descricao: "50% de progresso medio nos seus cursos.",
      desbloqueada: percentualGeral >= 50
    },
    {
      id: "primeiro-diploma",
      titulo: "Primeiro diploma",
      descricao: "Conquistou o primeiro certificado de conclusao.",
      desbloqueada: totalCertificados >= 1
    }
  ];
}

export function SecaoCertificados({ avaliacoes = [], matriculaRows = [], progressos = {}, usuario }) {
  const [certificadoAberto, setCertificadoAberto] = useState(null);

  const progressoCursoPorMatricula = useMemo(
    () => new Map((progressos.cursos || []).map((progresso) => [Number(progresso.matriculaId), progresso])),
    [progressos.cursos]
  );

  const avaliacoesPorCurso = useMemo(() => {
    const mapa = new Map();

    avaliacoes.forEach((avaliacao) => {
      const cursoId = Number(avaliacao.cursoId);
      if (!cursoId || avaliacao.ultimaNota === null || typeof avaliacao.ultimaNota === "undefined") {
        return;
      }

      const notas = mapa.get(cursoId) || [];
      notas.push(Number(avaliacao.ultimaNota));
      mapa.set(cursoId, notas);
    });

    return mapa;
  }, [avaliacoes]);

  const matriculasAprovadas = useMemo(
    () => matriculaRows.filter((matricula) => matricula.status === "Aprovada"),
    [matriculaRows]
  );

  const certificados = useMemo(
    () =>
      matriculasAprovadas.map((matricula) => {
        const progressoCurso = progressoCursoPorMatricula.get(Number(matricula.id));
        const percentual = Number(progressoCurso?.percentualConclusao || 0);
        const notasAvaliacoes = avaliacoesPorCurso.get(Number(matricula.cursoId)) || [];
        const mediaAvaliacoes = notasAvaliacoes.length
          ? notasAvaliacoes.reduce((total, nota) => total + nota, 0) / notasAvaliacoes.length
          : null;
        const nota = matricula.notaFinal > 0 ? matricula.notaFinal : mediaAvaliacoes;

        return {
          id: matricula.id,
          curso: matricula.curso,
          turma: matricula.turma,
          percentual,
          nota,
          desbloqueado: percentual >= 100
        };
      }),
    [avaliacoesPorCurso, matriculasAprovadas, progressoCursoPorMatricula]
  );

  const certificadosDesbloqueados = certificados.filter((certificado) => certificado.desbloqueado);

  const percentualGeral = certificados.length
    ? certificados.reduce((total, certificado) => total + certificado.percentual, 0) / certificados.length
    : 0;

  const totalConteudosConcluidos = (progressos.conteudos || []).filter(estaConcluido).length;
  const modulosConcluidos = (progressos.modulos || []).filter(estaConcluido).length;

  const conquistas = buildAchievements({
    modulosConcluidos,
    percentualGeral,
    totalCertificados: certificadosDesbloqueados.length,
    totalConteudosConcluidos
  });

  function imprimirCertificado() {
    window.print();
  }

  return (
    <div className="tela-certificados">
      <header className="banner-certificados" aria-label="Resumo de certificados">
        <div className="banner-certificados__conteudo">
          <div className="banner-certificados__icone-area" aria-hidden="true">
            <TbCertificate size={44} />
          </div>

          <div className="banner-certificados__texto">
            <h2 className="banner-certificados__titulo">Meus Certificados</h2>
            <p className="banner-certificados__subtitulo">Conclua seus cursos e conquiste seus diplomas digitais.</p>
          </div>

          <div className="banner-certificados__stats" aria-label="Estatisticas de certificados">
            <div className="banner-certificados__stat">
              <span className="banner-certificados__stat-valor">{certificadosDesbloqueados.length}</span>
              <span className="banner-certificados__stat-rotulo">Conquistados</span>
            </div>
            <div className="banner-certificados__sep" aria-hidden="true" />
            <div className="banner-certificados__stat">
              <span className="banner-certificados__stat-valor">{certificados.length}</span>
              <span className="banner-certificados__stat-rotulo">Cursos</span>
            </div>
          </div>
        </div>
      </header>

      {certificados.length === 0 ? (
        <EmptyState message="Assim que uma matricula for aprovada e o curso concluido, o certificado aparece aqui." />
      ) : (
        <ul aria-label="Lista de certificados" className="lista-certificados" role="list">
          {certificados.map((certificado) => (
            <li className={`item-certificado${certificado.desbloqueado ? " item-certificado--desbloqueado" : ""}`} key={certificado.id}>
              <div aria-hidden="true" className="item-certificado__faixa" />

              <div className="item-certificado__curso">
                <h3 className="item-certificado__titulo">{certificado.curso}</h3>
                <p className="item-certificado__meta">{certificado.turma}</p>
              </div>

              {certificado.desbloqueado ? (
                <div className="item-certificado__status">
                  <span className="item-certificado__nota">Nota {formatGrade(certificado.nota)} / 10</span>
                </div>
              ) : (
                <div className="item-certificado__status">
                  <span className="item-certificado__nota" style={{ color: "var(--cor-texto-mudo)" }}>
                    {Math.round(certificado.percentual)}% concluido
                  </span>
                </div>
              )}

              <div className="item-certificado__acoes">
                <motion.button
                  aria-label={`Visualizar certificado de ${certificado.curso}`}
                  className="cert-btn-visualizar"
                  disabled={!certificado.desbloqueado}
                  onClick={() => certificado.desbloqueado && setCertificadoAberto(certificado)}
                  type="button"
                  whileHover={certificado.desbloqueado ? { scale: 1.18 } : {}}
                  whileTap={certificado.desbloqueado ? { scale: 0.9 } : {}}
                  transition={{ type: "spring", stiffness: 400, damping: 18 }}
                >
                  <LuEye aria-hidden="true" size={22} />
                </motion.button>
                <span aria-hidden="true" className="cert-separador" />
                <motion.button
                  aria-label={`Baixar certificado de ${certificado.curso}`}
                  className="cert-btn-baixar"
                  disabled={!certificado.desbloqueado}
                  onClick={() => {
                    if (!certificado.desbloqueado) {
                      return;
                    }
                    setCertificadoAberto(certificado);
                    setTimeout(imprimirCertificado, 300);
                  }}
                  type="button"
                  whileHover={certificado.desbloqueado ? { scale: 1.18 } : {}}
                  whileTap={certificado.desbloqueado ? { scale: 0.9 } : {}}
                  transition={{ type: "spring", stiffness: 400, damping: 18 }}
                >
                  <LuDownload aria-hidden="true" size={22} />
                </motion.button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section aria-labelledby="titulo-conquistas">
        <h3 className="secao-progresso__titulo" id="titulo-conquistas">Conquistas</h3>
        <ul aria-label="Conquistas" className="grade-conquistas" role="list">
          {conquistas.map((conquista) => (
            <li
              aria-label={`${conquista.titulo} - ${conquista.desbloqueada ? "desbloqueada" : "bloqueada"}`}
              className={`cartao-conquista${conquista.desbloqueada ? " cartao-conquista--desbloqueada" : ""}`}
              key={conquista.id}
            >
              <span aria-hidden="true" className="cartao-conquista__icone">
                <TbTrophy size={28} />
              </span>
              <strong className="cartao-conquista__titulo">{conquista.titulo}</strong>
              <p className="cartao-conquista__descricao">{conquista.descricao}</p>
              {conquista.desbloqueada ? (
                <span aria-hidden="true" className="cartao-conquista__check">✓</span>
              ) : (
                <span aria-hidden="true" className="cartao-conquista__cadeado">⊘</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {certificadoAberto ? (
        <div
          className="modal-fundo"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setCertificadoAberto(null);
            }
          }}
          role="presentation"
        >
          <article aria-label="Certificado de conclusao" aria-modal="true" className="modal-caixa" role="dialog">
            <header className="modal-cabecalho">
              <h2 className="modal-titulo">Certificado de Conclusao</h2>
              <button className="modal-fechar" onClick={() => setCertificadoAberto(null)} type="button" aria-label="Fechar modal">
                ✕
              </button>
            </header>

            <div className="certificate-print-area">
              <figure className="certificate-sheet">
                <span className="certificate-sheet__eyebrow">Certificado de conclusao</span>
                <p className="certificate-sheet__intro">Certificamos que</p>
                <strong className="certificate-sheet__name">{usuario?.nome}</strong>
                <p className="certificate-sheet__body">concluiu com aproveitamento o curso</p>
                <strong className="certificate-sheet__course">{certificadoAberto.curso}</strong>
                <p className="certificate-sheet__meta">
                  Turma {certificadoAberto.turma} - Nota {formatGrade(certificadoAberto.nota)} de 10,0 - Emitido em {formatDate(new Date())}
                </p>
              </figure>
            </div>

            <footer className="modal-rodape">
              <button className="botao botao--primario" onClick={imprimirCertificado} type="button">
                <TbDownload aria-hidden="true" size={16} /> Baixar / Imprimir
              </button>
            </footer>
          </article>
        </div>
      ) : null}
    </div>
  );
}
