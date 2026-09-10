/* Bloco de 5 indicadores de desempenho de um curso — compartilhado entre
   Progresso do Professor (SecaoTurmasProfessor) e Progresso do Coordenador
   (SecaoDesempenhoCoordenador), que antes duplicavam o mesmo JSX. Rotulos
   escritos pra diferenciar "total de alunos" (todas as matriculas, qualquer
   status) de "alunos aprovados" (so matriculas aprovadas), e "progresso
   medio" (media continua de conclusao entre os alunos) de "concluiram o
   curso" (taxa de quem bateu 100%). */
import { TbAward, TbChartBar, TbCircleCheck, TbUserCheck, TbUsers } from "react-icons/tb";
import CartaoEstatistica from "./CartaoEstatistica.jsx";
import { formatGrade, formatPercent } from "../lib/format.js";

export default function IndicadoresDesempenhoCurso({ curso }) {
  return (
    <div className="grade-estatisticas">
      <CartaoEstatistica icone={<TbUsers size={22} />} rotulo="Total de alunos" valor={curso.totalAlunos} />
      <CartaoEstatistica corBorda="var(--cor-sucesso)" icone={<TbUserCheck size={22} />} rotulo="Alunos aprovados" valor={curso.alunosAtivos} />
      <CartaoEstatistica corBorda="var(--cor-info)" icone={<TbChartBar size={22} />} rotulo="Progresso medio dos alunos" valor={formatPercent(curso.progressoMedio)} />
      <CartaoEstatistica corBorda="var(--cor-marca)" icone={<TbCircleCheck size={22} />} rotulo="Concluiram o curso" valor={formatPercent(curso.percentualConclusao)} />
      <CartaoEstatistica icone={<TbAward size={22} />} rotulo="Desempenho medio" valor={formatGrade(curso.desempenhoMedio)} />
    </div>
  );
}
