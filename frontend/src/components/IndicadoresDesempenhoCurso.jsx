/* Bloco de indicadores de desempenho de um curso, usado por Progresso do
   Professor (SecaoTurmasProfessor). O Coordenador tem seus proprios 4
   cartoes na tela unica do curso (PainelCursoGestao.jsx), que ja conta
   so matriculas aprovadas no backend (CursoDesempenhoService) — por isso
   "Total de alunos" e "Alunos aprovados" eram o mesmo numero ali e esse
   cartao foi removido, ficando so aqui no Professor. "Progresso medio"
   (media continua de conclusao entre os alunos) e diferente de "concluiram
   o curso" (taxa de quem bateu 100%). */
import { TbAward, TbChartBar, TbCircleCheck, TbUsers } from "react-icons/tb";
import CartaoEstatistica from "./CartaoEstatistica.jsx";
import { formatGrade, formatPercent } from "../lib/format.js";

export default function IndicadoresDesempenhoCurso({ curso }) {
  return (
    <div className="grade-estatisticas">
      <CartaoEstatistica icone={<TbUsers size={22} />} rotulo="Total de alunos" valor={curso.totalAlunos} />
      <CartaoEstatistica corBorda="var(--cor-info)" icone={<TbChartBar size={22} />} rotulo="Progresso medio dos alunos" valor={formatPercent(curso.progressoMedio)} />
      <CartaoEstatistica corBorda="var(--cor-marca)" icone={<TbCircleCheck size={22} />} rotulo="Concluiram o curso" valor={formatPercent(curso.percentualConclusao)} />
      <CartaoEstatistica icone={<TbAward size={22} />} rotulo="Desempenho medio" valor={formatGrade(curso.desempenhoMedio)} />
    </div>
  );
}
