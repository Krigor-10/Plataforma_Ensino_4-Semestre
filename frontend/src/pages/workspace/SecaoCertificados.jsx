import { useMemo, useState } from "react";
import { TbCertificate, TbDownload, TbX } from "react-icons/tb";
import { EmptyState, PanelCard, StatusPill } from "../../components/Primitives.jsx";
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
    <div className="content-section">
      <PanelCard
        description={`${certificadosDesbloqueados.length} conquistado(s) de ${certificados.length} curso(s) matriculado(s).`}
        title="Meus certificados"
      >
        {certificados.length === 0 ? (
          <EmptyState message="Assim que uma matricula for aprovada e o curso concluido, o certificado aparece aqui." />
        ) : (
          <ul className="certificate-list" role="list">
            {certificados.map((certificado) => (
              <li className={`certificate-card${certificado.desbloqueado ? " certificate-card--unlocked" : ""}`} key={certificado.id}>
                <div className="certificate-card__icon" aria-hidden="true">
                  <TbCertificate size={28} />
                </div>
                <div className="certificate-card__info">
                  <strong>{certificado.curso}</strong>
                  <p>{certificado.turma}</p>
                </div>
                <div className="certificate-card__status">
                  <StatusPill tone={certificado.desbloqueado ? "success" : "info"}>
                    {certificado.desbloqueado ? "Concluido" : `${Math.round(certificado.percentual)}% concluido`}
                  </StatusPill>
                  {certificado.desbloqueado ? (
                    <button
                      className="table-action"
                      onClick={() => setCertificadoAberto(certificado)}
                      type="button"
                    >
                      Ver certificado
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>

      <PanelCard description="Marcos desbloqueados conforme voce avanca nos conteudos e modulos." title="Conquistas">
        <ul className="achievement-grid" role="list">
          {conquistas.map((conquista) => (
            <li
              className={`achievement-badge${conquista.desbloqueada ? " achievement-badge--unlocked" : ""}`}
              key={conquista.id}
            >
              <strong>{conquista.titulo}</strong>
              <p>{conquista.descricao}</p>
              <span aria-hidden="true">{conquista.desbloqueada ? "✓" : "⊘"}</span>
            </li>
          ))}
        </ul>
      </PanelCard>

      {certificadoAberto ? (
        <div
          className="content-form-modal certificate-modal"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setCertificadoAberto(null);
            }
          }}
        >
          <div aria-label="Certificado de conclusao" aria-modal="true" className="content-form-modal__card certificate-modal__card" role="dialog">
            <button className="content-form-modal__close" onClick={() => setCertificadoAberto(null)} type="button">
              <TbX size={16} aria-hidden="true" /> Fechar
            </button>

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
              <button className="solid-button" onClick={imprimirCertificado} type="button">
                <TbDownload size={16} aria-hidden="true" /> Baixar / Imprimir
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
