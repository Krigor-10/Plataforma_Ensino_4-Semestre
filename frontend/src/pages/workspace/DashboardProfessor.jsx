/* ============================================================
   DASHBOARD PROFESSOR — Painel inicial do professor (Etapa 2)
   Replica TelaDashboardProfessor do protótipo com dados reais:
   turmas do professor (ja filtradas em WorkspaceScreen) e
   avaliacoes das turmas dele.
   ============================================================ */
import { TbArrowUpRight, TbCirclePlus, TbStar } from "react-icons/tb";
import { MdAssignmentTurnedIn, MdGroups, MdSchool } from "react-icons/md";
import Botao from "../../components/Botao.jsx";
import CartaoEstatistica from "../../components/CartaoEstatistica.jsx";
import Insignia from "../../components/Insignia.jsx";
import { formatDate, normalizePublicationStatus } from "../../lib/format.js";

export function DashboardProfessor({ avaliacoes = [], cursos = [], onMudarSecao, turmas = [], usuario }) {
  const cursoPorId = new Map(cursos.map((curso) => [Number(curso.id), curso]));
  const minhasTurmas = turmas.slice(0, 4);
  const minhasAvaliacoes = [...avaliacoes]
    .sort((a, b) => new Date(b.criadoEm || 0).getTime() - new Date(a.criadoEm || 0).getTime())
    .slice(0, 4);

  const avaliacoesPublicadas = avaliacoes.filter(
    (avaliacao) => normalizePublicationStatus(avaliacao.statusPublicacao) === "Publicado"
  ).length;
  const notasValidas = avaliacoes
    .map((avaliacao) => Number(avaliacao.notaMaxima || 0))
    .filter((nota) => nota > 0);
  const mediaNotaMaxima = notasValidas.length
    ? (notasValidas.reduce((total, nota) => total + nota, 0) / notasValidas.length).toFixed(1)
    : "-";

  return (
    <main className="dashboard-professor">
      <header className="cabecalho-pagina">
        <div>
          <h1 className="cabecalho-pagina__titulo">Ola, Prof. {(usuario.nome ?? "").split(" ")[0]}</h1>
          <p className="cabecalho-pagina__subtitulo">Gerencie suas turmas, avaliacoes e conteudos didaticos.</p>
        </div>
      </header>

      <section aria-labelledby="titulo-stats-prof">
        <h2 className="visualmente-oculto" id="titulo-stats-prof">Resumo do professor</h2>
        <div className="grade-estatisticas">
          <CartaoEstatistica icone={<MdGroups size={22} />} rotulo="Turmas vinculadas" valor={turmas.length} />
          <CartaoEstatistica
            corBorda="var(--cor-info)"
            icone={<MdSchool size={22} />}
            rotulo="Cursos acompanhados"
            valor={cursos.length}
          />
          <CartaoEstatistica
            corBorda="var(--cor-sucesso)"
            icone={<MdAssignmentTurnedIn size={22} />}
            rotulo="Avaliacoes publicadas"
            valor={avaliacoesPublicadas}
          />
          <CartaoEstatistica corBorda="var(--cor-aviso)" icone={<TbStar size={22} />} rotulo="Nota maxima media" valor={mediaNotaMaxima} />
        </div>
      </section>

      <div className="grade-2" style={{ marginTop: "var(--espaco-xl)" }}>
        <section aria-labelledby="titulo-minhas-turmas" className="painel-secao">
          <header className="painel-secao__cabecalho">
            <h2 className="painel-secao__titulo" id="titulo-minhas-turmas">Minhas turmas</h2>
            <Botao onClick={() => onMudarSecao("turmas")} tamanho="pequeno" variante="fantasma">
              Ver todas <TbArrowUpRight aria-hidden="true" size={14} />
            </Botao>
          </header>
          <div className="painel-secao__conteudo">
            {minhasTurmas.length > 0 ? (
              <ul className="lista-turmas" role="list">
                {minhasTurmas.map((turma) => (
                  <li className="item-turma" key={turma.id}>
                    <div className="item-turma__info">
                      <strong className="item-turma__nome">{turma.nomeTurma}</strong>
                      <span className="item-turma__curso">{cursoPorId.get(Number(turma.cursoId))?.titulo || `Curso #${turma.cursoId}`}</span>
                    </div>
                    <div className="item-turma__meta">
                      <span>Desde {formatDate(turma.dataCriacao)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="texto-vazio">Nenhuma turma vinculada ao seu perfil ainda.</p>
            )}
          </div>
        </section>

        <section aria-labelledby="titulo-minhas-avaliacoes" className="painel-secao">
          <header className="painel-secao__cabecalho">
            <h2 className="painel-secao__titulo" id="titulo-minhas-avaliacoes">Avaliacoes</h2>
            <Botao onClick={() => onMudarSecao("avaliacoes")} tamanho="pequeno" variante="primario">
              <TbCirclePlus size={18} /> Nova
            </Botao>
          </header>
          <div className="painel-secao__conteudo">
            {minhasAvaliacoes.length > 0 ? (
              <ul className="lista-avaliacoes" role="list">
                {minhasAvaliacoes.map((avaliacao) => (
                  <li className="item-avaliacao" key={avaliacao.id}>
                    <div className="item-avaliacao__info">
                      <span className="item-avaliacao__titulo">{avaliacao.titulo}</span>
                      <span className="item-avaliacao__meta">
                        {avaliacao.totalQuestoes} questoes
                        {avaliacao.tempoLimiteMinutos ? ` - ${avaliacao.tempoLimiteMinutos} min` : ""}
                      </span>
                    </div>
                    <Insignia texto={normalizePublicationStatus(avaliacao.statusPublicacao)} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="texto-vazio">Nenhuma avaliacao criada ainda.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
