export { isCursoVisivelNoCatalogoPublico } from "../../../shared/catalogoVisibilidade.js";

export const MANAGER_ROLES = new Set(["Admin", "Coordenador"]);

export const APP_SECTIONS = [
  { key: "dashboard", label: "Dashboard", roles: ["Admin", "Coordenador", "Professor", "Aluno"] },
  { key: "alunos", label: "Alunos", roles: ["Admin"] },
  { key: "professores", label: "Professores", roles: ["Admin"] },
  { key: "coordenadores", label: "Coordenadores", roles: ["Admin"] },
  { key: "cursos", label: "Cursos", roles: ["Admin", "Coordenador"] },
  { key: "chamados", label: "Chamados", roles: ["Admin", "Coordenador"] },
  { key: "conteudos", label: "Conteudos", roles: ["Professor", "Aluno"] },
  { key: "avaliacoes", label: "Avaliacoes", roles: ["Professor", "Aluno"] },
  { key: "matriculas", label: "Matriculas", roles: ["Admin", "Aluno"] },
  { key: "turmas", label: "Turmas", roles: ["Professor"] },
  { key: "meus-cursos", label: "Progresso", roles: ["Aluno"] },
  { key: "cursos-matriculados", label: "Meus Cursos", roles: ["Aluno"], showInSidebar: false },
  { key: "certificados", label: "Certificados", roles: ["Aluno"], showInSidebar: false }
];

export const PUBLIC_PILLARS = [
  {
    title: "Cursos orientados a projeto",
    text: "Trilhas praticas com materiais e progresso por turma."
  },
  {
    title: "Matricula acompanhada",
    text: "Solicitacao online com status visivel no painel."
  },
  {
    title: "Sala digital por perfil",
    text: "Aluno, professor e coordenacao com acessos proprios."
  }
];

export const PUBLIC_NAV_LINKS = [
  { href: "#cursos", label: "Cursos" }
];

export const CURATED_COURSES = [
  {
    id: "programacao",
    titulo: "Programacao Aplicada",
    descricao: "Projetos guiados, fundamentos solidos e pratica com problemas reais.",
    preco: 189.9
  },
  {
    id: "dados",
    titulo: "Banco de Dados",
    descricao: "Modelagem, SQL e estruturacao de consultas para produtos de verdade.",
    preco: 169.9
  },
  {
    id: "analytics",
    titulo: "Analise de Dados",
    descricao: "Indicadores, leitura de cenarios e decisao apoiada por evidencias.",
    preco: 209.9
  }
];

export const SIGNUP_INITIAL_STATE = {
  nome: "",
  email: "",
  cpf: "",
  telefone: "",
  cep: "",
  rua: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
  cursoId: "",
  senha: "",
  confirmarSenha: ""
};

export const EMPTY_SNAPSHOT = {
  cursos: [],
  modulos: [],
  conteudos: [],
  avaliacoes: [],
  alunos: [],
  coordenadores: [],
  professores: [],
  turmas: [],
  matriculas: [],
  pagamentos: [],
  progressos: {
    conteudos: [],
    modulos: [],
    cursos: []
  }
};

export function getSectionMeta(section, role) {
  const bySection = {
    dashboard: {
      title: `Panorama de ${role}`,
      description: "Resumo central do workspace React com dados reais do backend."
    },
    "meus-cursos": {
      title: "Progresso",
      description: "Acompanhe o andamento dos seus cursos ativos, modulo a modulo."
    },
    "cursos-matriculados": {
      title: "Meus Cursos",
      description: "Cursos em que voce esta efetivamente matriculado."
    },
    alunos: {
      title: "Gestao de alunos",
      description: "Consulta rapida da base academica para operacao e apoio."
    },
    professores: {
      title: "Corpo docente",
      description: "Visao dos professores disponiveis para o ecossistema de cursos e turmas."
    },
    coordenadores: {
      title: "Coordenadores",
      description: "Consulta dos coordenadores responsaveis pela supervisao academica dos cursos."
    },
    cursos: {
      title: role === "Coordenador" || role === "Admin" ? "Cursos" : "Catalogo academico",
      description:
        role === "Coordenador"
          ? "Cursos ativos sob sua coordenacao - escolha um pra ver modulos, avaliacoes e professores."
          : role === "Admin"
            ? "Escolha um curso pra ver modulos, avaliacoes, professores e coordenador."
            : "A mesma base de cursos alimenta a home, o cadastro e o painel."
    },
    conteudos: {
      title: "Trilha de conteudos",
      description:
        role === "Professor"
          ? "Escolha um curso para estruturar e gerenciar materiais por modulo."
          : "Materiais, quizzes e progresso organizados por curso."
    },
    avaliacoes: {
      title: role === "Aluno" ? "Realizar avaliacao" : "Avaliacoes",
      description:
        role === "Aluno"
          ? "Avaliacoes publicadas pelos professores para os seus cursos aprovados."
          : "Escolha um curso para preparar provas, quizzes e exercicios."
    },
    matriculas: {
      // PROMPT-agente-tela-inscricoes.md: "Matriculas" vira "Inscricoes" so
      // pra quem o Admin ve - aluno continua igual.
      title: role === "Aluno" ? "Catalogo de Cursos" : "Inscrições",
      description:
        role === "Aluno"
          ? "Cursos disponiveis para matricula, ainda nao cursados por voce."
          : "O aluno entra no curso sozinho, de graca ou comprando. Acompanhe quem entrou, quem terminou e o que foi vendido."
    },
    turmas: {
      title: "Progresso",
      description: "Acompanhe o desempenho dos seus cursos e avaliacoes."
    },
    chamados: {
      title: "Chamados de suporte",
      description:
        role === "Coordenador"
          ? "Chamados do Assistente CodeRyse encaminhados para os cursos que voce coordena."
          : "Todos os chamados abertos pelos alunos pelo Assistente CodeRyse."
    },
    certificados: {
      title: "Meus certificados",
      description: "Diplomas digitais e conquistas desbloqueadas pelo seu progresso nos cursos."
    }
  };

  return bySection[section] || bySection.dashboard;
}
