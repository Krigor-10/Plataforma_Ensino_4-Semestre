import {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  getDemoAccountByEmail,
  sanitizeDemoUser
} from "./demoMode.js";

const DEMO_DB_KEY = "edtech.demoDb.v1";
const MANAGER_ROLES = new Set(["Admin", "Coordenador"]);

export class DemoApiError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "DemoApiError";
    this.status = status;
  }
}

export async function demoRequest(endpoint, options = {}) {
  await wait(120);

  const method = String(options.method || "GET").toUpperCase();
  const path = normalizePath(endpoint);
  const payload = parseBody(options.body);

  switch (true) {
    case path === "/Auth/login" && method === "POST":
      return handleLogin(payload);
    case path === "/Auth/esqueci-senha" && method === "POST":
      return handleEsqueciSenha();
    case path === "/Auth/redefinir-senha" && method === "POST":
      return handleRedefinirSenha();
    case path === "/Notificacoes" && method === "GET":
      return listNotifications();
    case path === "/Notificacoes/nao-lidas/contagem" && method === "GET":
      return countUnreadNotifications();
    case /^\/Notificacoes\/\d+\/lida$/.test(path) && method === "PUT":
      return markNotificationAsRead(getNotificacaoActionId(path));
    case path === "/Notificacoes/lidas" && method === "PUT":
      return markAllNotificationsAsRead();
    case path === "/Cursos" && method === "GET":
      return listCourses();
    case path === "/Cursos/desempenho" && method === "GET":
      return listCoordinatorCourseDesempenho();
    case path === "/Cursos/meus" && method === "GET":
      return listTeacherCourses();
    case /^\/Cursos\/\d+\/coordenador$/.test(path) && method === "PUT":
      return assignCourseCoordinator(getCourseCoordinatorActionId(path), payload);
    case /^\/Cursos\/\d+\/imagem$/.test(path) && method === "POST":
      return uploadCourseImage(getCourseImageActionId(path), payload);
    case path === "/Alunos/cadastro-completo" && method === "POST":
      return registerStudent(payload);
    case path === "/Alunos" && method === "GET":
      return listStudents();
    case path === "/Coordenadores" && method === "GET":
      return listCoordinators();
    case path === "/Coordenadores" && method === "POST":
      return createCoordinator(payload);
    case path === "/Professores" && method === "GET":
      return listProfessors();
    case path === "/Professores" && method === "POST":
      return createProfessor(payload);
    case path === "/Turmas" && method === "GET":
      return listClasses();
    case path === "/Turmas" && method === "POST":
      return createClass(payload);
    case path === "/Turmas/minhas" && method === "GET":
      return listTeacherClasses();
    case path === "/Turmas/desempenho" && method === "GET":
      return listTeacherTurmaDesempenho();
    case /^\/Turmas\/\d+\/professor$/.test(path) && method === "PUT":
      return assignClassProfessor(getClassProfessorActionId(path), payload);
    case path === "/Modulos" && method === "GET":
      return listModules();
    case path === "/Modulos/meus" && method === "GET":
      return listTeacherModules();
    case /^\/Modulos\/aluno\/\d+$/.test(path) && method === "GET":
      return listStudentModules(getNumericId(path));
    case path === "/Modulos" && method === "POST":
      return createModule(payload);
    case /^\/Modulos\/\d+$/.test(path) && method === "PUT":
      return updateModule(getNumericId(path), payload);
    case /^\/Modulos\/\d+$/.test(path) && method === "DELETE":
      return deleteModule(getNumericId(path));
    case path === "/Matriculas" && method === "GET":
      return listEnrollments();
    case path === "/Matriculas/pendentes" && method === "GET":
      return listPendingEnrollments();
    case /^\/Matriculas\/aluno\/\d+$/.test(path) && method === "GET":
      return listStudentEnrollments(getNumericId(path));
    case path === "/Matriculas/aprovar-lote" && method === "PUT":
      return approveEnrollmentsBatch(payload);
    case /^\/Matriculas\/\d+\/aprovar$/.test(path) && method === "PUT":
      return approveEnrollment(getEnrollmentActionId(path), payload);
    case /^\/Matriculas\/\d+\/rejeitar$/.test(path) && method === "PUT":
      return rejectEnrollment(getEnrollmentActionId(path));
    case path === "/Pagamentos/aluno" && method === "GET":
      return listStudentPayments();
    case /^\/Pagamentos\/\d+\/confirmar$/.test(path) && method === "POST":
      return confirmarPagamentoDemo(getPagamentoConfirmActionId(path));
    case /^\/Certificados\/matricula\/\d+\/emitir$/.test(path) && method === "POST":
      return emitirCertificadoDemo(getCertificadoMatriculaId(path));
    case path === "/Certificados/meus" && method === "GET":
      return listarCertificadosDemo();
    case /^\/Certificados\/verificar\/.+$/.test(path) && method === "GET":
      return verificarCertificadoDemo(getCertificadoVerificarCodigo(path));
    case path === "/ConteudosDidaticos" && method === "GET":
      return listTeacherContents();
    case path === "/ConteudosDidaticos" && method === "POST":
      return createContent(payload);
    case path === "/ConteudosDidaticos/arquivo" && method === "POST":
      return uploadContentFile(payload);
    case /^\/ConteudosDidaticos\/\d+$/.test(path) && method === "PUT":
      return updateContent(getNumericId(path), payload);
    case /^\/ConteudosDidaticos\/\d+$/.test(path) && method === "DELETE":
      return deleteContent(getNumericId(path));
    case /^\/ConteudosDidaticos\/aluno\/\d+$/.test(path) && method === "GET":
      return listStudentContents(getNumericId(path));
    case path === "/Avaliacoes" && method === "GET":
      return listTeacherEvaluations();
    case path === "/Avaliacoes" && method === "POST":
      return createEvaluation(payload);
    case /^\/Avaliacoes\/aluno\/\d+$/.test(path) && method === "GET":
      return listStudentEvaluations(getNumericId(path));
    case /^\/Avaliacoes\/\d+$/.test(path) && method === "PUT":
      return updateEvaluation(getNumericId(path), payload);
    case /^\/Avaliacoes\/\d+$/.test(path) && method === "DELETE":
      return deleteEvaluation(getNumericId(path));
    case /^\/Avaliacoes\/\d+\/questoes$/.test(path) && method === "GET":
      return listEvaluationQuestions(getEvaluationQuestionsActionId(path));
    case /^\/Avaliacoes\/\d+\/questoes$/.test(path) && method === "POST":
      return createEvaluationQuestion(getEvaluationQuestionsActionId(path), payload);
    case /^\/Avaliacoes\/\d+\/questoes\/\d+$/.test(path) && method === "DELETE":
      return deleteEvaluationQuestion(...getEvaluationQuestionActionIds(path));
    case /^\/Avaliacoes\/\d+\/aluno\/questoes$/.test(path) && method === "GET":
      return listStudentEvaluationQuestions(getStudentEvaluationActionId(path, "questoes"));
    case /^\/Avaliacoes\/\d+\/aluno\/respostas$/.test(path) && method === "POST":
      return submitStudentEvaluation(getStudentEvaluationActionId(path, "respostas"), payload);
    case /^\/Progressos\/aluno\/\d+$/.test(path) && method === "GET":
      return listStudentProgress(getNumericId(path));
    case /^\/Progressos\/conteudos\/\d+\/concluir$/.test(path) && method === "PUT":
      return completeStudentContent(getProgressContentActionId(path));
    default:
      throw new DemoApiError(`Endpoint demo nao mapeado: ${method} ${path}`, 404);
  }
}

function handleLogin(payload) {
  const email = String(payload.email || "").trim().toLowerCase();
  const senha = String(payload.senha || "");

  if (!email || !senha) {
    throw new DemoApiError("Informe e-mail e senha para entrar.", 400);
  }

  const fixedAccount = getDemoAccountByEmail(email);
  if (fixedAccount && fixedAccount.password === senha) {
    return {
      token: `demo-token-${fixedAccount.user.id}`,
      usuario: sanitizeDemoUser(fixedAccount.user)
    };
  }

  const db = readDemoDb();
  ensureCoordinatorCollection(db);
  const dynamicUser = [...db.alunos, ...db.professores, ...db.coordenadores].find(
    (item) => item.email.toLowerCase() === email && String(item.senha || "") === senha
  );

  if (!dynamicUser) {
    throw new DemoApiError("Credenciais demo invalidas.", 401);
  }

  return {
    token: `demo-token-${dynamicUser.id}`,
    usuario: sanitizeDemoUser(dynamicUser)
  };
}

function handleEsqueciSenha() {
  return {
    mensagem: "Se o e-mail informado estiver cadastrado, enviaremos as instrucoes de recuperacao."
  };
}

function handleRedefinirSenha() {
  throw new DemoApiError(
    "O modo demonstracao usa contas fixas e nao permite redefinir senha. Use uma das contas demo informadas no login.",
    422
  );
}

let demoNotificacoesState = null;

function getDemoNotificacoes() {
  if (!demoNotificacoesState) {
    const agora = Date.now();
    demoNotificacoesState = [
      {
        id: 1,
        titulo: "Matricula aprovada",
        mensagem: "Sua matricula no curso de demonstracao foi aprovada.",
        tipo: "MatriculaAprovada",
        link: "/app/cursos-matriculados",
        lida: false,
        criadoEm: new Date(agora - 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        titulo: "Avaliacao corrigida",
        mensagem: "Sua avaliacao foi corrigida. Nota: 8.5.",
        tipo: "AvaliacaoCorrigida",
        link: "/app/avaliacoes",
        lida: false,
        criadoEm: new Date(agora - 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 3,
        titulo: "Novo conteudo publicado",
        mensagem: "Um novo conteudo foi publicado na sua turma.",
        tipo: "ConteudoPublicado",
        link: "/app/conteudos",
        lida: true,
        criadoEm: new Date(agora - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }

  return demoNotificacoesState;
}

function listNotifications() {
  return [...getDemoNotificacoes()].sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function countUnreadNotifications() {
  return { total: getDemoNotificacoes().filter((notificacao) => !notificacao.lida).length };
}

function markNotificationAsRead(id) {
  const notificacao = getDemoNotificacoes().find((item) => item.id === id);
  if (notificacao) {
    notificacao.lida = true;
  }

  return {};
}

function markAllNotificationsAsRead() {
  getDemoNotificacoes().forEach((notificacao) => {
    notificacao.lida = true;
  });

  return {};
}

function getNotificacaoActionId(path) {
  const match = String(path).match(/^\/Notificacoes\/(\d+)\/lida$/);
  const id = Number(match?.[1]);

  if (!Number.isInteger(id)) {
    throw new DemoApiError("Identificador demo invalido.", 400);
  }

  return id;
}

function listCourses() {
  const db = readDemoDb();
  return clone(db.cursos)
    .map((curso) => ({ ...curso, ehGratuito: Number(curso.preco || 0) <= 0 }))
    .sort((left, right) => left.titulo.localeCompare(right.titulo, "pt-BR"));
}

function listTeacherCourses() {
  const user = requireProfessor();
  const db = readDemoDb();
  const allowedCourseIds = new Set(
    db.turmas.filter((turma) => turma.professorId === user.id).map((turma) => turma.cursoId)
  );

  return clone(db.cursos)
    .filter((curso) => allowedCourseIds.has(curso.id))
    .sort((left, right) => left.titulo.localeCompare(right.titulo, "pt-BR"));
}

function assignCourseCoordinator(courseId, coordinatorIdPayload) {
  requireAdmin();

  const coordenadorId = Number(coordinatorIdPayload);
  if (!Number.isInteger(coordenadorId) || coordenadorId < 0) {
    throw new DemoApiError("Selecione um coordenador demo valido.", 400);
  }

  const db = readDemoDb();
  ensureCoordinatorCollection(db);

  const curso = db.cursos.find((item) => item.id === courseId);
  if (!curso) {
    throw new DemoApiError("Curso demo nao encontrado.", 404);
  }

  if (coordenadorId === 0) {
    curso.coordenadorId = null;
    saveDemoDb(db);
    return { mensagem: "Curso demo marcado como aguardando coordenador." };
  }

  const coordenador = db.coordenadores.find((item) => item.id === coordenadorId);
  if (!coordenador) {
    throw new DemoApiError("Coordenador demo nao encontrado.", 404);
  }

  curso.coordenadorId = coordenador.id;
  saveDemoDb(db);
  return { mensagem: "Coordenador demo atribuido ao curso com sucesso." };
}

function uploadCourseImage(courseId, payload) {
  requireManager();

  const imagem = payload.imagem;
  if (!(imagem instanceof File) || imagem.size === 0) {
    throw new DemoApiError("Nenhuma imagem foi enviada.", 400);
  }

  const db = readDemoDb();
  const curso = db.cursos.find((item) => item.id === courseId);
  if (!curso) {
    throw new DemoApiError("Curso demo nao encontrado.", 404);
  }

  curso.imagemUrl = URL.createObjectURL(imagem);
  saveDemoDb(db);
  return clone(curso);
}

function registerStudent(payload) {
  const requiredFields = [
    "nome",
    "email",
    "cpf",
    "telefone",
    "cep",
    "rua",
    "numero",
    "bairro",
    "cidade",
    "estado",
    "cursoId",
    "senha"
  ];

  const missingField = requiredFields.find((field) => !String(payload[field] || "").trim());
  if (missingField) {
    throw new DemoApiError("Preencha todos os campos para simular o cadastro.", 400);
  }

  const db = readDemoDb();
  const normalizedEmail = String(payload.email || "").trim().toLowerCase();
  const normalizedCpf = onlyDigits(payload.cpf);

  const emailAlreadyUsed =
    DEMO_ACCOUNTS.some((account) => account.email.toLowerCase() === normalizedEmail) ||
    db.alunos.some((aluno) => aluno.email.toLowerCase() === normalizedEmail);
  if (emailAlreadyUsed) {
    throw new DemoApiError("Ja existe um usuario demo com esse e-mail.", 409);
  }

  if (db.alunos.some((aluno) => onlyDigits(aluno.cpf) === normalizedCpf)) {
    throw new DemoApiError("Ja existe um usuario demo com esse CPF.", 409);
  }

  const now = new Date().toISOString();
  const alunoId = nextId(db.alunos);
  const matriculaId = nextId(db.matriculas);
  const cursoId = Number(payload.cursoId);

  db.alunos.push({
    id: alunoId,
    nome: String(payload.nome || "").trim(),
    email: normalizedEmail,
    cpf: normalizedCpf,
    telefone: String(payload.telefone || "").trim(),
    cep: String(payload.cep || "").trim(),
    rua: String(payload.rua || "").trim(),
    numero: String(payload.numero || "").trim(),
    bairro: String(payload.bairro || "").trim(),
    cidade: String(payload.cidade || "").trim(),
    estado: String(payload.estado || "").trim().toUpperCase(),
    tipoUsuario: "Aluno",
    ativo: true,
    matricula: nextDemoStudentRegistrationCode(db),
    senha: String(payload.senha || "")
  });

  db.matriculas.push({
    id: matriculaId,
    codigoRegistro: nextDemoRegistrationCode(db.matriculas, "MAT"),
    alunoId,
    cursoId,
    turmaId: null,
    status: 0,
    notaFinal: 0,
    dataSolicitacao: now
  });

  // Espelha o backend real: cadastro publico ja aprova a matricula na turma
  // mais antiga do curso, reaproveitando a mesma funcao usada pela aprovacao
  // manual/em lote (approveEnrollmentInDb -> resolveDemoEnrollmentClass), que
  // tambem cria a cobranca pendente se o curso for pago. Se o curso demo nao
  // tiver turma cadastrada, approveEnrollmentInDb lanca DemoApiError(...,422)
  // e a funcao propaga sem chamar saveDemoDb — nada fica persistido no
  // localStorage, espelhando o rollback da transacao real.
  approveEnrollmentInDb(db, matriculaId);

  const cursoEhGratuito = Number(db.cursos.find((item) => item.id === cursoId)?.preco || 0) <= 0;

  saveDemoDb(db);

  return {
    mensagem: cursoEhGratuito
      ? "Cadastro realizado com sucesso. Sua matricula foi aprovada e seu acesso esta liberado."
      : "Cadastro realizado com sucesso. Sua matricula foi aprovada — confirme o pagamento pendente em \"Meus Cursos\" para liberar o acesso."
  };
}

function listStudents() {
  requireManager();
  const db = readDemoDb();
  return clone(db.alunos)
    .map((aluno) => sanitizeDemoUser(aluno))
    .sort((left, right) => left.nome.localeCompare(right.nome, "pt-BR"));
}

function listCoordinators() {
  requireAdmin();
  const db = readDemoDb();
  ensureCoordinatorCollection(db);
  return clone(db.coordenadores).sort((left, right) => left.nome.localeCompare(right.nome, "pt-BR"));
}

function createCoordinator(payload) {
  requireAdmin();

  const requiredFields = [
    "nome",
    "email",
    "cpf",
    "telefone",
    "cep",
    "rua",
    "numero",
    "bairro",
    "cidade",
    "estado",
    "senha"
  ];

  const missingField = requiredFields.find((field) => !String(payload[field] || "").trim());
  if (missingField) {
    throw new DemoApiError("Preencha todos os campos obrigatorios para cadastrar a coordenacao demo.", 400);
  }

  const db = readDemoDb();
  ensureCoordinatorCollection(db);

  const normalizedEmail = String(payload.email || "").trim().toLowerCase();
  const normalizedCpf = onlyDigits(payload.cpf);
  const usuariosDemo = [...db.alunos, ...db.professores, ...db.coordenadores];

  const emailAlreadyUsed =
    DEMO_ACCOUNTS.some((account) => account.email.toLowerCase() === normalizedEmail) ||
    usuariosDemo.some((usuario) => String(usuario.email || "").toLowerCase() === normalizedEmail);
  if (emailAlreadyUsed) {
    throw new DemoApiError("Ja existe um usuario demo com esse e-mail.", 409);
  }

  if (usuariosDemo.some((usuario) => onlyDigits(usuario.cpf) === normalizedCpf)) {
    throw new DemoApiError("Ja existe um usuario demo com esse CPF.", 409);
  }

  const coordenador = {
    id: nextId(db.coordenadores),
    codigoRegistro: nextDemoRegistrationCode(db.coordenadores, "COORD"),
    nome: String(payload.nome || "").trim(),
    email: normalizedEmail,
    cpf: normalizedCpf,
    telefone: String(payload.telefone || "").trim(),
    cep: String(payload.cep || "").trim(),
    rua: String(payload.rua || "").trim(),
    numero: String(payload.numero || "").trim(),
    bairro: String(payload.bairro || "").trim(),
    cidade: String(payload.cidade || "").trim(),
    estado: String(payload.estado || "").trim().toUpperCase(),
    tipoUsuario: "Coordenador",
    ativo: true,
    cursoResponsavel: String(payload.cursoResponsavel || "").trim() || null,
    senha: String(payload.senha || "")
  };

  db.coordenadores.push(coordenador);
  saveDemoDb(db);
  return sanitizeDemoUser(clone(coordenador));
}

function listProfessors() {
  requireManager();
  const db = readDemoDb();
  return clone(db.professores)
    .map((professor) => sanitizeDemoUser(professor))
    .sort((left, right) => left.nome.localeCompare(right.nome, "pt-BR"));
}

function createProfessor(payload) {
  requireManager();

  const requiredFields = [
    "nome",
    "email",
    "cpf",
    "telefone",
    "cep",
    "rua",
    "numero",
    "bairro",
    "cidade",
    "estado",
    "senha",
    "especialidade"
  ];

  const missingField = requiredFields.find((field) => !String(payload[field] || "").trim());
  if (missingField) {
    throw new DemoApiError("Preencha todos os campos para cadastrar o professor demo.", 400);
  }

  const db = readDemoDb();
  ensureCoordinatorCollection(db);

  const normalizedEmail = String(payload.email || "").trim().toLowerCase();
  const normalizedCpf = onlyDigits(payload.cpf);
  const usuariosDemo = [...db.alunos, ...db.professores, ...db.coordenadores];

  const emailAlreadyUsed =
    DEMO_ACCOUNTS.some((account) => account.email.toLowerCase() === normalizedEmail) ||
    usuariosDemo.some((usuario) => String(usuario.email || "").toLowerCase() === normalizedEmail);
  if (emailAlreadyUsed) {
    throw new DemoApiError("Ja existe um usuario demo com esse e-mail.", 409);
  }

  if (usuariosDemo.some((usuario) => onlyDigits(usuario.cpf) === normalizedCpf)) {
    throw new DemoApiError("Ja existe um usuario demo com esse CPF.", 409);
  }

  const professor = {
    id: nextId(db.professores),
    codigoRegistro: nextDemoRegistrationCode(db.professores, "PROF"),
    nome: String(payload.nome || "").trim(),
    email: normalizedEmail,
    cpf: normalizedCpf,
    telefone: String(payload.telefone || "").trim(),
    cep: String(payload.cep || "").trim(),
    rua: String(payload.rua || "").trim(),
    numero: String(payload.numero || "").trim(),
    bairro: String(payload.bairro || "").trim(),
    cidade: String(payload.cidade || "").trim(),
    estado: String(payload.estado || "").trim().toUpperCase(),
    tipoUsuario: "Professor",
    ativo: true,
    especialidade: String(payload.especialidade || "").trim(),
    senha: String(payload.senha || "")
  };

  db.professores.push(professor);
  saveDemoDb(db);
  return sanitizeDemoUser(clone(professor));
}

function listClasses() {
  requireAuthenticatedUser();
  const db = readDemoDb();
  return clone(db.turmas).sort((left, right) => left.nomeTurma.localeCompare(right.nomeTurma, "pt-BR"));
}

function listTeacherClasses() {
  const user = requireProfessor();
  const db = readDemoDb();
  return clone(db.turmas)
    .filter((turma) => turma.professorId === user.id)
    .sort((left, right) => left.nomeTurma.localeCompare(right.nomeTurma, "pt-BR"));
}

function buildDefaultClassName(curso) {
  const titulo = String(curso?.titulo || "").trim();
  const nome = titulo ? `Turma online - ${titulo}` : "Turma online";
  return nome.length <= 120 ? nome : nome.slice(0, 120).trimEnd();
}

function createClass(payload) {
  requireManager();

  const cursoId = Number(payload.cursoId);
  const professorId = Number(payload.professorId);

  if (!cursoId) {
    throw new DemoApiError("Selecione um curso demo para criar a turma padrao.", 400);
  }

  if (!professorId) {
    throw new DemoApiError("Selecione um professor demo para criar a turma padrao.", 400);
  }

  const db = readDemoDb();
  const curso = db.cursos.find((item) => item.id === cursoId);
  if (!curso) {
    throw new DemoApiError("Curso demo nao encontrado.", 404);
  }

  const professor = db.professores.find((item) => item.id === professorId);
  if (!professor) {
    throw new DemoApiError("Professor demo nao encontrado.", 404);
  }

  const turmaPadraoExistente = db.turmas.find((item) => item.cursoId === cursoId);
  if (turmaPadraoExistente) {
    throw new DemoApiError("Este curso demo ja possui uma turma padrao.", 409);
  }

  const nomeTurma = buildDefaultClassName(curso);
  const turma = {
    id: nextId(db.turmas),
    codigoRegistro: nextDemoRegistrationCode(db.turmas, "TUR"),
    nomeTurma,
    cursoId,
    professorId,
    dataCriacao: new Date().toISOString()
  };

  db.turmas.push(turma);
  saveDemoDb(db);
  return clone(turma);
}

function assignClassProfessor(classId, professorIdPayload) {
  requireManager();

  const professorId = Number(professorIdPayload);
  if (!Number.isInteger(professorId) || professorId <= 0) {
    throw new DemoApiError("Selecione um professor demo valido.", 400);
  }

  const db = readDemoDb();
  const turma = db.turmas.find((item) => item.id === classId);
  if (!turma) {
    throw new DemoApiError("Turma demo nao encontrada.", 404);
  }

  const professor = db.professores.find((item) => item.id === professorId);
  if (!professor) {
    throw new DemoApiError("Professor demo nao encontrado.", 404);
  }

  turma.professorId = professor.id;
  saveDemoDb(db);
  return { mensagem: "Professor demo atribuido a turma com sucesso." };
}

function listModules() {
  requireManager();
  const db = readDemoDb();

  return clone(db.modulos)
    .map((modulo) => ({
      ...modulo,
      totalConteudos: db.conteudos.filter((conteudo) => conteudo.moduloId === modulo.id).length,
      totalAvaliacoes: (db.avaliacoes || []).filter((avaliacao) => avaliacao.moduloId === modulo.id).length
    }))
    .sort((left, right) => left.titulo.localeCompare(right.titulo, "pt-BR"));
}

function listTeacherModules() {
  const user = requireProfessor();
  const db = readDemoDb();
  const teacherCourseIds = new Set(
    db.turmas.filter((turma) => turma.professorId === user.id).map((turma) => turma.cursoId)
  );

  return clone(db.modulos)
    .filter((modulo) => teacherCourseIds.has(modulo.cursoId))
    .sort((left, right) => left.titulo.localeCompare(right.titulo, "pt-BR"));
}

function listStudentModules(studentId) {
  const user = requireAuthenticatedUser();

  if (!MANAGER_ROLES.has(user.tipoUsuario) && user.id !== studentId) {
    throw new DemoApiError("Voce nao pode visualizar modulos demo de outro usuario.", 403);
  }

  const db = readDemoDb();
  const approvedCourseIds = new Set(
    db.matriculas
      .filter((matricula) => matricula.alunoId === studentId && cursoTemAcessoLiberadoDemo(db, matricula))
      .map((matricula) => matricula.cursoId)
  );

  return clone(db.modulos)
    .filter((modulo) => approvedCourseIds.has(modulo.cursoId))
    .sort((left, right) => {
      if (left.cursoId !== right.cursoId) {
        return left.cursoId - right.cursoId;
      }

      return left.titulo.localeCompare(right.titulo, "pt-BR");
    });
}

function createModule(payload) {
  requireManager();

  const titulo = String(payload.titulo || "").trim();
  const cursoId = Number(payload.cursoId);

  if (!titulo) {
    throw new DemoApiError("Informe um titulo para criar o modulo.", 400);
  }

  if (!cursoId) {
    throw new DemoApiError("Selecione um curso demo para criar o modulo.", 400);
  }

  const db = readDemoDb();
  const courseExists = db.cursos.some((curso) => curso.id === cursoId);
  if (!courseExists) {
    throw new DemoApiError("Curso demo nao encontrado.", 404);
  }

  const modulo = {
    id: nextId(db.modulos),
    codigoRegistro: nextDemoRegistrationCode(db.modulos, "MOD"),
    cursoId,
    titulo
  };

  db.modulos.push(modulo);
  saveDemoDb(db);
  return clone(modulo);
}

function updateModule(moduleId, payload) {
  requireManager();

  const titulo = String(payload.titulo || "").trim();
  if (!titulo) {
    throw new DemoApiError("Informe um titulo valido para o modulo.", 400);
  }

  const db = readDemoDb();
  const modulo = db.modulos.find((item) => item.id === moduleId);
  if (!modulo) {
    throw new DemoApiError("Modulo demo nao encontrado.", 404);
  }

  modulo.titulo = titulo;
  saveDemoDb(db);
  return clone(modulo);
}

function deleteModule(moduleId) {
  requireManager();

  const db = readDemoDb();
  const moduloIndex = db.modulos.findIndex((item) => item.id === moduleId);
  if (moduloIndex === -1) {
    throw new DemoApiError("Modulo demo nao encontrado.", 404);
  }

  db.modulos.splice(moduloIndex, 1);
  db.conteudos = db.conteudos.filter((conteudo) => conteudo.moduloId !== moduleId);
  db.avaliacoes = (db.avaliacoes || []).filter((avaliacao) => avaliacao.moduloId !== moduleId);
  saveDemoDb(db);
  return { mensagem: "Modulo demo removido." };
}

function listEnrollments() {
  requireManager();
  const db = readDemoDb();
  return hydrateEnrollments(db, db.matriculas);
}

function listPendingEnrollments() {
  requireManager();
  const db = readDemoDb();
  return buildPendingEnrollments(db);
}

function listStudentEnrollments(studentId) {
  const user = requireAuthenticatedUser();

  if (!MANAGER_ROLES.has(user.tipoUsuario) && user.id !== studentId) {
    throw new DemoApiError("Voce nao pode visualizar matriculas demo de outro usuario.", 403);
  }

  const db = readDemoDb();
  return hydrateEnrollments(
    db,
    db.matriculas.filter((matricula) => matricula.alunoId === studentId)
  );
}

function listStudentPayments() {
  const user = requireAuthenticatedUser();
  const db = readDemoDb();
  ensurePagamentosCollection(db);

  const matriculaIds = new Set(
    db.matriculas.filter((matricula) => matricula.alunoId === user.id).map((matricula) => matricula.id)
  );

  return db.pagamentos
    .filter((pagamento) => matriculaIds.has(pagamento.matriculaId))
    .map((pagamento) => hydratePayment(db, pagamento));
}

function confirmarPagamentoDemo(matriculaId) {
  const user = requireAuthenticatedUser();
  const db = readDemoDb();
  ensurePagamentosCollection(db);

  const matricula = db.matriculas.find((item) => item.id === matriculaId);
  if (!matricula || matricula.alunoId !== user.id) {
    throw new DemoApiError("Matricula demo nao encontrada para este aluno.", 404);
  }

  const pagamento = db.pagamentos.find((item) => item.matriculaId === matriculaId);
  if (!pagamento) {
    throw new DemoApiError("Nao ha cobranca pendente para esta matricula.", 404);
  }

  if (pagamento.status !== 1) {
    throw new DemoApiError("Este pagamento ja foi processado.", 422);
  }

  pagamento.status = 2; // Pago
  pagamento.pagoEm = new Date().toISOString();
  saveDemoDb(db);

  return hydratePayment(db, pagamento);
}

function hydratePayment(db, pagamento) {
  const matricula = db.matriculas.find((item) => item.id === pagamento.matriculaId);
  const curso = matricula ? db.cursos.find((item) => item.id === matricula.cursoId) : null;

  return {
    id: pagamento.id,
    matriculaId: pagamento.matriculaId,
    cursoId: curso?.id ?? null,
    cursoTitulo: curso?.titulo ?? "",
    valor: pagamento.valor,
    status: pagamento.status,
    criadoEm: pagamento.criadoEm,
    pagoEm: pagamento.pagoEm ?? null
  };
}

function approveEnrollment(enrollmentId, turmaIdPayload) {
  requireManager();

  const turmaId = Number(turmaIdPayload);
  if (!Number.isInteger(turmaId) || turmaId <= 0) {
    throw new DemoApiError("Selecione uma turma demo valida para aprovar a matricula.", 400);
  }

  const db = readDemoDb();
  approveEnrollmentInDb(db, enrollmentId, turmaId);
  saveDemoDb(db);
  return { mensagem: "Matricula demo aprovada com sucesso." };
}

function approveEnrollmentsBatch(payload) {
  requireManager();

  const db = readDemoDb();
  const ids = Array.isArray(payload?.matriculaIds)
    ? [...new Set(payload.matriculaIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))]
    : [];

  if (!ids.length) {
    throw new DemoApiError("Selecione ao menos uma matricula pendente para aprovacao em lote.", 400);
  }

  const resultado = {
    totalSolicitado: ids.length,
    aprovadas: [],
    erros: []
  };

  ids.forEach((id) => {
    try {
      resultado.aprovadas.push(approveEnrollmentInDb(db, id));
    } catch (error) {
      resultado.erros.push(buildEnrollmentApprovalError(db, id, error.message || "Nao foi possivel aprovar a matricula demo."));
    }
  });

  if (resultado.aprovadas.length) {
    saveDemoDb(db);
  }

  return {
    ...resultado,
    totalAprovado: resultado.aprovadas.length,
    totalComErro: resultado.erros.length
  };
}

function approveEnrollmentInDb(db, enrollmentId, turmaIdOverride = null) {
  const matricula = db.matriculas.find((item) => item.id === enrollmentId);
  if (!matricula) {
    throw new DemoApiError("Matricula demo nao encontrada.", 404);
  }

  if (Number(matricula.status) !== 0) {
    throw new DemoApiError("Apenas matriculas pendentes podem ser aprovadas.", 422);
  }

  const turma = resolveDemoEnrollmentClass(db, matricula, turmaIdOverride);
  const approvedEnrollment = db.matriculas.find(
    (item) =>
      item.id !== matricula.id &&
      item.alunoId === matricula.alunoId &&
      item.turmaId === turma.id &&
      Number(item.status) === 1
  );

  const aluno = db.alunos.find((item) => item.id === matricula.alunoId);

  if (approvedEnrollment) {
    matricula.status = 3;
    if (aluno) {
      ensureDemoStudentRegistrationCode(db, aluno);
      aluno.turmaAtual = turma.nomeTurma;
    }

    return {
      matriculaId: approvedEnrollment.id,
      codigoRegistro: approvedEnrollment.codigoRegistro || "",
      cursoId: approvedEnrollment.cursoId,
      turmaId: turma.id,
      nomeTurma: turma.nomeTurma || ""
    };
  }

  const duplicatedPendingEnrollment = db.matriculas.some(
    (item) =>
      item.id !== matricula.id &&
      item.alunoId === matricula.alunoId &&
      item.turmaId === turma.id &&
      Number(item.status) === 0
  );

  if (duplicatedPendingEnrollment) {
    throw new DemoApiError("O aluno ja possui outra matricula pendente nesta turma.", 422);
  }

  if (!matricula.codigoRegistro) {
    matricula.codigoRegistro = nextDemoRegistrationCode(db.matriculas, "MAT");
  }

  matricula.turmaId = turma.id;
  matricula.cursoId = turma.cursoId;
  matricula.status = 1;
  if (aluno) {
    ensureDemoStudentRegistrationCode(db, aluno);
    aluno.turmaAtual = turma.nomeTurma;
  }

  criarPagamentoPendenteDemoSeNecessario(db, matricula);

  return {
    matriculaId: matricula.id,
    codigoRegistro: matricula.codigoRegistro || "",
    cursoId: matricula.cursoId,
    turmaId: turma.id,
    nomeTurma: turma.nomeTurma || ""
  };
}

/* Espelha Services/AcessoAcademicoService.TemAcessoLiberadoAsync: matricula
   precisa estar Aprovada (status 1) e, se o curso for pago, precisa tambem
   ter um Pagamento com status 2 (Pago) vinculado. Curso gratuito (Preco <= 0)
   nunca gera Pagamento, entao a matricula aprovada ja basta. Reaproveitado
   por todas as listagens/acoes do aluno (modulos, conteudos, avaliacoes,
   progresso, certificado) em vez de duplicar a checagem em cada uma. */
function cursoTemAcessoLiberadoDemo(db, matricula) {
  if (!matricula || Number(matricula.status) !== 1) {
    return false;
  }

  const curso = db.cursos.find((item) => item.id === matricula.cursoId);
  if (Number(curso?.preco || 0) <= 0) {
    return true;
  }

  return (db.pagamentos || []).some(
    (pagamento) => pagamento.matriculaId === matricula.id && Number(pagamento.status) === 2
  );
}

/* Espelha Services/MatriculaService.CriarPagamentoPendenteSeNecessarioAsync:
   ao aprovar uma matricula (aqui ou no cadastro automatico), cria uma
   cobranca Pendente se o curso for pago. Curso gratuito (Preco <= 0) nunca
   gera Pagamento. */
function criarPagamentoPendenteDemoSeNecessario(db, matricula) {
  ensurePagamentosCollection(db);

  const jaTemPagamento = db.pagamentos.some((item) => item.matriculaId === matricula.id);
  if (jaTemPagamento) {
    return;
  }

  const curso = db.cursos.find((item) => item.id === matricula.cursoId);
  const precoCurso = Number(curso?.preco || 0);
  if (precoCurso <= 0) {
    return;
  }

  db.pagamentos.push({
    id: nextId(db.pagamentos),
    matriculaId: matricula.id,
    valor: precoCurso,
    status: 1, // Pendente
    criadoEm: new Date().toISOString(),
    pagoEm: null
  });
}

function resolveDemoEnrollmentClass(db, matricula, turmaIdOverride = null) {
  const turmaId = turmaIdOverride || matricula.turmaId || null;
  const turma = turmaId
    ? db.turmas.find((item) => item.id === Number(turmaId))
    : [...db.turmas]
        .filter((item) => item.cursoId === matricula.cursoId)
        .sort((left, right) => {
          const leftDate = new Date(left.dataCriacao || 0).getTime();
          const rightDate = new Date(right.dataCriacao || 0).getTime();
          return leftDate - rightDate || left.id - right.id;
        })[0] || null;

  if (!turma) {
    throw new DemoApiError("Nao ha turma padrao demo cadastrada para o curso solicitado.", 422);
  }

  if (matricula.cursoId !== turma.cursoId) {
    throw new DemoApiError("A turma demo selecionada nao pertence ao curso solicitado pelo aluno.", 422);
  }

  return turma;
}

function buildEnrollmentApprovalError(db, enrollmentId, motivo) {
  const matricula = db.matriculas.find((item) => item.id === enrollmentId);
  const aluno = matricula ? db.alunos.find((item) => item.id === matricula.alunoId) : null;

  return {
    matriculaId: enrollmentId,
    codigoRegistro: matricula?.codigoRegistro || "",
    nomeAluno: aluno?.nome || "",
    cursoId: matricula?.cursoId || 0,
    motivo
  };
}

function rejectEnrollment(enrollmentId) {
  requireManager();

  const db = readDemoDb();
  const matricula = db.matriculas.find((item) => item.id === enrollmentId);
  if (!matricula) {
    throw new DemoApiError("Matricula demo nao encontrada.", 404);
  }

  matricula.status = 2;
  saveDemoDb(db);
  return { mensagem: "Matricula demo rejeitada com sucesso." };
}

function emitirCertificadoDemo(matriculaId) {
  const user = requireRole("Aluno");
  const db = readDemoDb();
  ensureProgressCollections(db);

  const matricula = db.matriculas.find((item) => item.id === matriculaId);
  if (!matricula || matricula.alunoId !== user.id) {
    throw new DemoApiError("Matricula demo nao encontrada.", 404);
  }

  if (Number(matricula.status) !== 1) {
    throw new DemoApiError("A matricula ainda nao foi aprovada.", 400);
  }

  if (!cursoTemAcessoLiberadoDemo(db, matricula)) {
    throw new DemoApiError("O pagamento deste curso ainda nao foi confirmado.", 400);
  }

  const progresso = db.progressos.cursos.find((item) => item.matriculaId === matriculaId);
  if (!progresso || Number(progresso.percentualConclusao) < 100) {
    throw new DemoApiError("O curso ainda nao foi concluido.", 400);
  }

  if (!matricula.certificadoEmitidoEm) {
    matricula.certificadoEmitidoEm = new Date().toISOString();
    saveDemoDb(db);
  }

  return buildCertificadoDemoResponse(db, matricula);
}

function listarCertificadosDemo() {
  const user = requireRole("Aluno");
  const db = readDemoDb();

  return db.matriculas
    .filter((matricula) => matricula.alunoId === user.id && matricula.certificadoEmitidoEm)
    .sort((left, right) => new Date(right.certificadoEmitidoEm) - new Date(left.certificadoEmitidoEm))
    .map((matricula) => buildCertificadoDemoResponse(db, matricula));
}

function verificarCertificadoDemo(codigo) {
  const db = readDemoDb();
  const matricula = db.matriculas.find((item) => item.codigoRegistro === codigo);

  if (!matricula || !matricula.certificadoEmitidoEm) {
    throw new DemoApiError("Certificado demo nao encontrado.", 404);
  }

  return buildCertificadoDemoResponse(db, matricula);
}

function buildCertificadoDemoResponse(db, matricula) {
  const aluno = db.alunos.find((item) => item.id === matricula.alunoId);
  const curso = db.cursos.find((item) => item.id === matricula.cursoId);
  const turma = matricula.turmaId ? db.turmas.find((item) => item.id === matricula.turmaId) : null;

  return {
    codigoVerificacao: matricula.codigoRegistro,
    alunoNome: aluno?.nome || "",
    cursoTitulo: curso?.titulo || "",
    turmaNome: turma?.nomeTurma || null,
    notaFinal: Number(matricula.notaFinal || 0),
    emitidoEm: matricula.certificadoEmitidoEm
  };
}

function listTeacherContents() {
  const user = requireProfessor();
  const db = readDemoDb();
  const teacherTurmaIds = new Set(
    db.turmas.filter((turma) => turma.professorId === user.id).map((turma) => turma.id)
  );

  return hydrateContents(
    db,
    db.conteudos.filter((conteudo) => teacherTurmaIds.has(conteudo.turmaId))
  );
}

function listTeacherEvaluations() {
  const user = requireProfessor();
  const db = readDemoDb();
  ensureEvaluationCollections(db);

  const teacherTurmaIds = new Set(
    db.turmas.filter((turma) => turma.professorId === user.id).map((turma) => turma.id)
  );

  return hydrateEvaluations(
    db,
    db.avaliacoes.filter((avaliacao) => teacherTurmaIds.has(avaliacao.turmaId))
  );
}

function listTeacherTurmaDesempenho() {
  const user = requireProfessor();
  const db = readDemoDb();
  ensureEvaluationCollections(db);
  ensureAttemptCollections(db);
  ensureProgressCollections(db);

  const turmasDoProfessor = db.turmas.filter((turma) => turma.professorId === user.id);
  const cursoById = new Map(db.cursos.map((curso) => [curso.id, curso]));
  const alunoById = new Map(db.alunos.map((aluno) => [aluno.id, aluno]));
  const progressoCursoPorMatriculaId = new Map(
    db.progressos.cursos.map((progresso) => [progresso.matriculaId, progresso])
  );

  return turmasDoProfessor
    .map((turma) => montarTurmaDesempenhoDemo(db, turma, cursoById, alunoById, progressoCursoPorMatriculaId))
    .sort((left, right) => left.nomeTurma.localeCompare(right.nomeTurma, "pt-BR"));
}

function montarTurmaDesempenhoDemo(db, turma, cursoById, alunoById, progressoCursoPorMatriculaId) {
  const curso = cursoById.get(turma.cursoId);
  const matriculasDaTurma = db.matriculas.filter((matricula) => matricula.turmaId === turma.id);
  const totalAlunos = matriculasDaTurma.length;
  const alunosAtivos = matriculasDaTurma.filter((matricula) => Number(matricula.status) === 1).length;
  const alunosComNota = matriculasDaTurma.filter((matricula) => Number(matricula.notaFinal) > 0);

  const progressosPercentuais = matriculasDaTurma.map(
    (matricula) => Number(progressoCursoPorMatriculaId.get(matricula.id)?.percentualConclusao) || 0
  );
  const concluidos = progressosPercentuais.filter((percentual) => percentual >= 100).length;

  const alunosDto = matriculasDaTurma
    .map((matricula) => ({
      matriculaId: matricula.id,
      alunoId: matricula.alunoId,
      nome: alunoById.get(matricula.alunoId)?.nome || "Aluno",
      status: matricula.status,
      notaFinal: Number(matricula.notaFinal) || 0,
      percentualConclusao: Number(progressoCursoPorMatriculaId.get(matricula.id)?.percentualConclusao) || 0
    }))
    .sort((left, right) => left.nome.localeCompare(right.nome, "pt-BR"));

  const avaliacoesDaTurma = db.avaliacoes.filter((avaliacao) => avaliacao.turmaId === turma.id);
  const estatisticasPorAvaliacaoId = computeEstatisticasPorAvaliacaoDemo(
    db,
    avaliacoesDaTurma.map((avaliacao) => avaliacao.id)
  );

  const avaliacoesDto = avaliacoesDaTurma
    .map((avaliacao) => montarAvaliacaoDesempenhoDemo(avaliacao, totalAlunos, estatisticasPorAvaliacaoId))
    .sort((left, right) => left.titulo.localeCompare(right.titulo, "pt-BR"));

  return {
    turmaId: turma.id,
    nomeTurma: turma.nomeTurma,
    cursoId: turma.cursoId,
    cursoTitulo: curso?.titulo || "",
    totalAlunos,
    alunosAtivos,
    progressoMedio: totalAlunos > 0 ? roundDemoNumber(progressosPercentuais.reduce((soma, item) => soma + item, 0) / totalAlunos) : 0,
    percentualConclusao: totalAlunos > 0 ? calculateDemoPercent(concluidos, totalAlunos) : 0,
    desempenhoMedio: alunosComNota.length > 0
      ? roundDemoNumber(alunosComNota.reduce((soma, matricula) => soma + Number(matricula.notaFinal), 0) / alunosComNota.length)
      : 0,
    alunos: alunosDto,
    avaliacoes: avaliacoesDto
  };
}

function listCoordinatorCourseDesempenho() {
  const user = requireRole("Coordenador");
  const db = readDemoDb();
  ensureEvaluationCollections(db);
  ensureAttemptCollections(db);
  ensureProgressCollections(db);

  const cursosDoCoordenador = db.cursos.filter((curso) => curso.coordenadorId === user.id);
  const cursoIds = new Set(cursosDoCoordenador.map((curso) => curso.id));
  const turmasDosCursos = db.turmas.filter((turma) => cursoIds.has(turma.cursoId));
  const turmaIds = new Set(turmasDosCursos.map((turma) => turma.id));

  const professorNomePorCursoId = new Map(
    turmasDosCursos.map((turma) => [
      turma.cursoId,
      db.professores.find((professor) => professor.id === turma.professorId)?.nome || null
    ])
  );

  const avaliacoesRelevantes = db.avaliacoes.filter((avaliacao) => turmaIds.has(avaliacao.turmaId));
  const estatisticasPorAvaliacaoId = computeEstatisticasPorAvaliacaoDemo(
    db,
    avaliacoesRelevantes.map((avaliacao) => avaliacao.id)
  );

  const progressoCursoPorMatriculaId = new Map(
    db.progressos.cursos.map((progresso) => [progresso.matriculaId, progresso])
  );
  const progressoModuloPorChave = new Map(
    db.progressos.modulos.map((progresso) => [`${progresso.matriculaId}:${progresso.moduloId}`, progresso])
  );
  const progressoConteudoPorChave = new Map(
    db.progressos.conteudos.map((progresso) => [`${progresso.matriculaId}:${progresso.conteudoDidaticoId}`, progresso])
  );

  return cursosDoCoordenador
    .map((curso) =>
      montarCursoDesempenhoDemo(db, curso, {
        turmaIdsDoCurso: new Set(turmasDosCursos.filter((turma) => turma.cursoId === curso.id).map((turma) => turma.id)),
        professorNome: professorNomePorCursoId.get(curso.id) || null,
        estatisticasPorAvaliacaoId,
        progressoCursoPorMatriculaId,
        progressoModuloPorChave,
        progressoConteudoPorChave
      })
    )
    .sort((left, right) => left.cursoTitulo.localeCompare(right.cursoTitulo, "pt-BR"));
}

function montarCursoDesempenhoDemo(db, curso, contexto) {
  const {
    turmaIdsDoCurso,
    professorNome,
    estatisticasPorAvaliacaoId,
    progressoCursoPorMatriculaId,
    progressoModuloPorChave,
    progressoConteudoPorChave
  } = contexto;

  const matriculasDoCurso = db.matriculas.filter((matricula) => matricula.cursoId === curso.id);
  const totalAlunos = matriculasDoCurso.length;
  const alunosAtivos = matriculasDoCurso.filter((matricula) => Number(matricula.status) === 1).length;
  const alunosComNota = matriculasDoCurso.filter((matricula) => Number(matricula.notaFinal) > 0);

  const progressosCurso = matriculasDoCurso.map(
    (matricula) => Number(progressoCursoPorMatriculaId.get(matricula.id)?.percentualConclusao) || 0
  );
  const concluidosNoCurso = progressosCurso.filter((percentual) => percentual >= 100).length;

  const modulosDto = db.modulos
    .filter((modulo) => modulo.cursoId === curso.id)
    .map((modulo) =>
      montarModuloDesempenhoDemo(db, modulo, matriculasDoCurso, totalAlunos, {
        estatisticasPorAvaliacaoId,
        progressoModuloPorChave,
        progressoConteudoPorChave
      })
    )
    .sort((left, right) => left.titulo.localeCompare(right.titulo, "pt-BR"));

  const avaliacoesSemModulo = db.avaliacoes
    .filter((avaliacao) => turmaIdsDoCurso.has(avaliacao.turmaId) && !avaliacao.moduloId)
    .map((avaliacao) => montarAvaliacaoDesempenhoDemo(avaliacao, totalAlunos, estatisticasPorAvaliacaoId))
    .sort((left, right) => left.titulo.localeCompare(right.titulo, "pt-BR"));

  return {
    cursoId: curso.id,
    cursoTitulo: curso.titulo,
    professorNome,
    totalAlunos,
    alunosAtivos,
    progressoMedio: totalAlunos > 0 ? roundDemoNumber(progressosCurso.reduce((soma, item) => soma + item, 0) / totalAlunos) : 0,
    percentualConclusao: totalAlunos > 0 ? calculateDemoPercent(concluidosNoCurso, totalAlunos) : 0,
    desempenhoMedio: alunosComNota.length > 0
      ? roundDemoNumber(alunosComNota.reduce((soma, matricula) => soma + Number(matricula.notaFinal), 0) / alunosComNota.length)
      : 0,
    modulos: modulosDto,
    avaliacoesSemModulo
  };
}

function montarModuloDesempenhoDemo(db, modulo, matriculasDoCurso, totalAlunos, contexto) {
  const { estatisticasPorAvaliacaoId, progressoModuloPorChave, progressoConteudoPorChave } = contexto;

  const progressosModulo = matriculasDoCurso.map(
    (matricula) => Number(progressoModuloPorChave.get(`${matricula.id}:${modulo.id}`)?.percentualConclusao) || 0
  );
  const concluidosNoModulo = progressosModulo.filter((percentual) => percentual >= 100).length;
  const mediasModulo = matriculasDoCurso
    .map((matricula) => Number(progressoModuloPorChave.get(`${matricula.id}:${modulo.id}`)?.mediaModulo) || 0)
    .filter((media) => media > 0);

  const materiaisDto = db.conteudos
    .filter((material) => material.moduloId === modulo.id)
    .map((material) => {
      const progressosMaterial = matriculasDoCurso.map(
        (matricula) => progressoConteudoPorChave.get(`${matricula.id}:${material.id}`)
      );
      const alunosConcluiram = progressosMaterial.filter((progresso) => Number(progresso?.statusProgresso) === 3).length;
      const percentualConclusao = totalAlunos > 0
        ? roundDemoNumber(
            progressosMaterial.reduce((soma, progresso) => soma + (Number(progresso?.percentualConclusao) || 0), 0) / totalAlunos
          )
        : 0;

      return {
        conteudoDidaticoId: material.id,
        titulo: material.titulo,
        tipoConteudo: material.tipoConteudo,
        statusPublicacao: material.statusPublicacao,
        alunosConcluiram,
        percentualConclusao
      };
    })
    .sort((left, right) => left.titulo.localeCompare(right.titulo, "pt-BR"));

  const avaliacoesDto = db.avaliacoes
    .filter((avaliacao) => avaliacao.moduloId === modulo.id)
    .map((avaliacao) => montarAvaliacaoDesempenhoDemo(avaliacao, totalAlunos, estatisticasPorAvaliacaoId))
    .sort((left, right) => left.titulo.localeCompare(right.titulo, "pt-BR"));

  return {
    moduloId: modulo.id,
    titulo: modulo.titulo,
    totalMateriais: materiaisDto.length,
    progressoMedio: totalAlunos > 0 ? roundDemoNumber(progressosModulo.reduce((soma, item) => soma + item, 0) / totalAlunos) : 0,
    percentualConclusao: totalAlunos > 0 ? calculateDemoPercent(concluidosNoModulo, totalAlunos) : 0,
    desempenhoMedio: mediasModulo.length > 0 ? roundDemoNumber(mediasModulo.reduce((soma, item) => soma + item, 0) / mediasModulo.length) : 0,
    materiais: materiaisDto,
    avaliacoes: avaliacoesDto
  };
}

function computeEstatisticasPorAvaliacaoDemo(db, avaliacaoIds) {
  const idsRelevantes = new Set(avaliacaoIds);
  const melhorTentativaPorChave = new Map();

  for (const tentativa of db.tentativasAvaliacao) {
    if (!idsRelevantes.has(tentativa.avaliacaoId) || Number(tentativa.statusTentativa) !== 3) {
      continue;
    }

    const chave = `${tentativa.avaliacaoId}:${tentativa.matriculaId}`;
    const atual = melhorTentativaPorChave.get(chave);
    if (!atual || Number(tentativa.notaBruta) > Number(atual.notaBruta)) {
      melhorTentativaPorChave.set(chave, tentativa);
    }
  }

  const estatisticas = new Map();
  for (const tentativa of melhorTentativaPorChave.values()) {
    const atual = estatisticas.get(tentativa.avaliacaoId) || { participantes: 0, somaNotas: 0 };
    atual.participantes += 1;
    atual.somaNotas += Number(tentativa.notaBruta) || 0;
    estatisticas.set(tentativa.avaliacaoId, atual);
  }

  return estatisticas;
}

function montarAvaliacaoDesempenhoDemo(avaliacao, totalAlunos, estatisticasPorAvaliacaoId) {
  const estatistica = estatisticasPorAvaliacaoId.get(avaliacao.id) || { participantes: 0, somaNotas: 0 };
  const mediaNota = estatistica.participantes > 0 ? estatistica.somaNotas / estatistica.participantes : 0;
  const notaMaxima = Number(avaliacao.notaMaxima) || 10;

  return {
    avaliacaoId: avaliacao.id,
    titulo: avaliacao.titulo,
    tipoAvaliacao: avaliacao.tipoAvaliacao,
    statusPublicacao: avaliacao.statusPublicacao,
    totalParticipantes: estatistica.participantes,
    mediaNota: roundDemoNumber(mediaNota),
    notaMaxima,
    percentualConclusao: totalAlunos > 0 ? calculateDemoPercent(estatistica.participantes, totalAlunos) : 0,
    percentualAproveitamento: notaMaxima > 0 ? calculateDemoPercent(mediaNota, notaMaxima) : 0
  };
}

function listStudentContents(studentId) {
  const user = requireAuthenticatedUser();

  if (!MANAGER_ROLES.has(user.tipoUsuario) && user.id !== studentId) {
    throw new DemoApiError("Voce nao pode visualizar conteudos demo de outro usuario.", 403);
  }

  const db = readDemoDb();
  const approvedTurmaIds = new Set(
    db.matriculas
      .filter((matricula) => matricula.alunoId === studentId && matricula.turmaId && cursoTemAcessoLiberadoDemo(db, matricula))
      .map((matricula) => matricula.turmaId)
  );

  return hydrateContents(
    db,
    db.conteudos.filter(
      (conteudo) => approvedTurmaIds.has(conteudo.turmaId) && Number(conteudo.statusPublicacao) === 2
    )
  );
}

function listStudentEvaluations(studentId) {
  const user = requireAuthenticatedUser();

  if (!MANAGER_ROLES.has(user.tipoUsuario) && user.id !== studentId) {
    throw new DemoApiError("Voce nao pode visualizar avaliacoes demo de outro usuario.", 403);
  }

  const db = readDemoDb();
  ensureEvaluationCollections(db);
  ensureQuestionCollections(db);
  ensureAttemptCollections(db);

  const approvedEnrollments = db.matriculas.filter(
    (matricula) => matricula.alunoId === studentId && matricula.turmaId && cursoTemAcessoLiberadoDemo(db, matricula)
  );
  const approvedTurmaIds = new Set(approvedEnrollments.map((matricula) => matricula.turmaId));
  const enrollmentByTurmaId = new Map(approvedEnrollments.map((matricula) => [matricula.turmaId, matricula]));

  return hydrateEvaluations(
    db,
    db.avaliacoes.filter(
      (avaliacao) => approvedTurmaIds.has(avaliacao.turmaId) && Number(avaliacao.statusPublicacao) === 2
    )
  ).map((avaliacao) => {
    const matricula = enrollmentByTurmaId.get(avaliacao.turmaId);
    const tentativas = db.tentativasAvaliacao.filter(
      (tentativa) => tentativa.avaliacaoId === avaliacao.id && tentativa.matriculaId === matricula?.id
    );
    const ultimaTentativa = [...tentativas].sort((left, right) => Number(right.numeroTentativa || 0) - Number(left.numeroTentativa || 0))[0] || null;

    return {
      ...avaliacao,
      matriculaId: matricula?.id || 0,
      tentativasRealizadas: tentativas.length,
      tentativasRestantes: Math.max(Number(avaliacao.tentativasPermitidas || 1) - tentativas.length, 0),
      ultimaNota: ultimaTentativa?.notaBruta ?? null,
      ultimoStatusTentativa: ultimaTentativa?.statusTentativa ?? null
    };
  });
}

function listStudentEvaluationQuestions(evaluationId) {
  const user = requireRole("Aluno");
  const db = readDemoDb();
  ensureQuestionCollections(db);
  ensureStudentCanAccessEvaluation(db, user.id, evaluationId);

  return hydrateEvaluationQuestions(
    db.questoesAvaliacao.filter((questao) => questao.avaliacaoId === evaluationId)
  ).map(stripCorrectAnswersFromQuestion);
}

function submitStudentEvaluation(evaluationId, payload) {
  const user = requireRole("Aluno");
  const db = readDemoDb();
  ensureQuestionCollections(db);
  ensureAttemptCollections(db);
  const { avaliacao, matricula } = ensureStudentCanAccessEvaluation(db, user.id, evaluationId);
  validateDemoEvaluationPeriod(avaliacao);

  const questoes = db.questoesAvaliacao
    .filter((questao) => questao.avaliacaoId === evaluationId)
    .sort((left, right) => Number(left.ordem || 0) - Number(right.ordem || 0));
  if (!questoes.length) {
    throw new DemoApiError("A avaliacao demo ainda nao possui questoes publicadas.", 400);
  }

  const respostas = Array.isArray(payload.respostas) ? payload.respostas : [];
  const questaoIds = new Set(questoes.map((questao) => questao.id));
  const respostaIds = new Set(respostas.map((resposta) => Number(resposta.questaoId)));
  if (respostas.length !== questoes.length || respostaIds.size !== respostas.length || respostas.some((resposta) => !questaoIds.has(Number(resposta.questaoId)))) {
    throw new DemoApiError("Responda exatamente uma vez cada questao demo.", 400);
  }

  const tentativas = db.tentativasAvaliacao.filter(
    (tentativa) => tentativa.avaliacaoId === evaluationId && tentativa.matriculaId === matricula.id
  );
  if (tentativas.length >= Number(avaliacao.tentativasPermitidas || 1)) {
    throw new DemoApiError("O limite de tentativas desta avaliacao demo ja foi atingido.", 400);
  }

  const respostasPorQuestao = new Map(respostas.map((resposta) => [Number(resposta.questaoId), resposta]));
  let notaBruta = 0;
  let possuiDissertativa = false;
  const now = new Date().toISOString();
  const tentativaId = nextId(db.tentativasAvaliacao);

  questoes.forEach((questao) => {
    const resposta = respostasPorQuestao.get(questao.id);

    if (Number(questao.tipoQuestao) === 3) {
      const texto = String(resposta?.respostaTexto || "").trim();
      if (!texto) {
        throw new DemoApiError("Preencha a resposta dissertativa demo antes de enviar.", 400);
      }

      possuiDissertativa = true;
      db.respostasAvaliacao.push({
        id: nextId(db.respostasAvaliacao),
        tentativaAvaliacaoId: tentativaId,
        questaoPublicadaId: questao.id,
        alternativaQuestaoPublicadaId: null,
        respostaTexto: texto,
        correta: null,
        pontosObtidos: 0,
        respondidaEm: now
      });
      return;
    }

    const alternativaId = Number(resposta?.alternativaId);
    const alternativa = questao.alternativas.find((item) => item.id === alternativaId);
    if (!alternativa) {
      throw new DemoApiError("Selecione uma alternativa demo valida para cada questao objetiva.", 400);
    }

    const correta = Boolean(alternativa.ehCorreta);
    const pontosObtidos = correta ? roundDemoNumber(questao.pontos) : 0;
    notaBruta += pontosObtidos;
    db.respostasAvaliacao.push({
      id: nextId(db.respostasAvaliacao),
      tentativaAvaliacaoId: tentativaId,
      questaoPublicadaId: questao.id,
      alternativaQuestaoPublicadaId: alternativa.id,
      respostaTexto: alternativa.texto,
      correta,
      pontosObtidos,
      respondidaEm: now
    });
  });

  const tentativa = {
    id: tentativaId,
    avaliacaoId: evaluationId,
    matriculaId: matricula.id,
    numeroTentativa: tentativas.length + 1,
    statusTentativa: possuiDissertativa ? 2 : 3,
    notaBruta: possuiDissertativa ? 0 : roundDemoNumber(notaBruta),
    notaMaxima: Number(avaliacao.notaMaxima || 10),
    iniciadaEm: now,
    enviadaEm: now,
    corrigidaEm: possuiDissertativa ? null : now
  };

  db.tentativasAvaliacao.push(tentativa);
  saveDemoDb(db);
  return clone(tentativa);
}

function listStudentProgress(studentId) {
  const user = requireAuthenticatedUser();

  if (!MANAGER_ROLES.has(user.tipoUsuario) && user.id !== studentId) {
    throw new DemoApiError("Voce nao pode visualizar progresso demo de outro usuario.", 403);
  }

  const db = readDemoDb();
  ensureProgressCollections(db);
  return buildStudentProgressSnapshot(db, studentId);
}

function completeStudentContent(contentId) {
  const user = requireAuthenticatedUser();

  if (user.tipoUsuario !== "Aluno") {
    throw new DemoApiError("Este recurso demo exige perfil de aluno.", 403);
  }

  const db = readDemoDb();
  ensureProgressCollections(db);

  const conteudo = db.conteudos.find(
    (item) => item.id === contentId && Number(item.statusPublicacao) === 2
  );
  if (!conteudo) {
    throw new DemoApiError("Conteudo demo publicado nao encontrado.", 404);
  }

  const matricula = db.matriculas.find(
    (item) =>
      item.alunoId === user.id &&
      item.turmaId &&
      item.turmaId === conteudo.turmaId &&
      cursoTemAcessoLiberadoDemo(db, item)
  );
  if (!matricula) {
    throw new DemoApiError("Este conteudo demo nao esta liberado para a matricula do aluno.", 422);
  }

  const now = new Date().toISOString();
  let progresso = db.progressos.conteudos.find(
    (item) => item.matriculaId === matricula.id && item.conteudoDidaticoId === conteudo.id
  );

  if (!progresso) {
    progresso = {
      id: nextId(db.progressos.conteudos),
      matriculaId: matricula.id,
      conteudoDidaticoId: conteudo.id,
      moduloId: conteudo.moduloId,
      statusProgresso: 1,
      percentualConclusao: 0,
      primeiroAcessoEm: now,
      ultimoAcessoEm: null,
      concluidoEm: null
    };
    db.progressos.conteudos.push(progresso);
  }

  progresso.moduloId = conteudo.moduloId;
  progresso.statusProgresso = 3;
  progresso.percentualConclusao = 100;
  progresso.primeiroAcessoEm ||= now;
  progresso.ultimoAcessoEm = now;
  progresso.concluidoEm = now;

  recalculateDemoModuleProgress(db, matricula, conteudo.moduloId, now);
  recalculateDemoCourseProgress(db, matricula, now);
  saveDemoDb(db);

  return buildStudentProgressSnapshot(db, user.id);
}

function uploadContentFile(payload) {
  requireProfessor();

  const arquivo = payload.arquivo;
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    throw new DemoApiError("Nenhum arquivo foi enviado.", 400);
  }

  return { arquivoUrl: URL.createObjectURL(arquivo) };
}

function createContent(payload) {
  const user = requireProfessor();
  const db = readDemoDb();
  validateContentPayload(db, user, payload);

  const now = new Date().toISOString();
  const conteudo = {
    id: nextId(db.conteudos),
    titulo: String(payload.titulo || "").trim(),
    descricao: String(payload.descricao || "").trim(),
    tipoConteudo: Number(payload.tipoConteudo),
    corpoTexto: String(payload.corpoTexto || "").trim(),
    arquivoUrl: String(payload.arquivoUrl || "").trim(),
    linkUrl: String(payload.linkUrl || "").trim(),
    turmaId: Number(payload.turmaId),
    moduloId: Number(payload.moduloId),
    statusPublicacao: Number(payload.statusPublicacao),
    ordemExibicao: Number(payload.ordemExibicao),
    pesoProgresso: Number(payload.pesoProgresso),
    criadoEm: now,
    atualizadoEm: now,
    publicadoEm: Number(payload.statusPublicacao) === 2 ? now : null
  };

  db.conteudos.push(conteudo);
  saveDemoDb(db);
  return hydrateContent(db, conteudo);
}

function updateContent(contentId, payload) {
  const user = requireProfessor();
  const db = readDemoDb();
  validateContentPayload(db, user, payload);

  const conteudo = db.conteudos.find((item) => item.id === contentId);
  if (!conteudo) {
    throw new DemoApiError("Conteudo demo nao encontrado.", 404);
  }

  ensureTeacherOwnsTurma(db, user, Number(payload.turmaId));

  const now = new Date().toISOString();
  const nextStatus = Number(payload.statusPublicacao);
  const wasPublished = Number(conteudo.statusPublicacao) === 2;

  conteudo.titulo = String(payload.titulo || "").trim();
  conteudo.descricao = String(payload.descricao || "").trim();
  conteudo.tipoConteudo = Number(payload.tipoConteudo);
  conteudo.corpoTexto = String(payload.corpoTexto || "").trim();
  conteudo.arquivoUrl = String(payload.arquivoUrl || "").trim();
  conteudo.linkUrl = String(payload.linkUrl || "").trim();
  conteudo.turmaId = Number(payload.turmaId);
  conteudo.moduloId = Number(payload.moduloId);
  conteudo.statusPublicacao = nextStatus;
  conteudo.ordemExibicao = Number(payload.ordemExibicao);
  conteudo.pesoProgresso = Number(payload.pesoProgresso);
  conteudo.atualizadoEm = now;
  conteudo.publicadoEm = nextStatus === 2 ? (wasPublished ? conteudo.publicadoEm || now : now) : null;

  saveDemoDb(db);
  return hydrateContent(db, conteudo);
}

function deleteContent(contentId) {
  const user = requireProfessor();
  const db = readDemoDb();
  const conteudo = db.conteudos.find((item) => item.id === contentId);

  if (!conteudo) {
    throw new DemoApiError("Conteudo demo nao encontrado.", 404);
  }

  ensureTeacherOwnsTurma(db, user, conteudo.turmaId);
  db.conteudos = db.conteudos.filter((item) => item.id !== contentId);
  saveDemoDb(db);
  return { mensagem: "Conteudo demo removido." };
}

function createEvaluation(payload) {
  const user = requireProfessor();
  const db = readDemoDb();
  ensureEvaluationCollections(db);
  validateEvaluationPayload(db, user, payload);

  const now = new Date().toISOString();
  const statusPublicacao = Number(payload.statusPublicacao);
  const avaliacao = {
    id: nextId(db.avaliacoes),
    titulo: String(payload.titulo || "").trim(),
    descricao: String(payload.descricao || "").trim(),
    professorAutorId: user.id,
    turmaId: Number(payload.turmaId),
    moduloId: Number(payload.moduloId),
    tipoAvaliacao: Number(payload.tipoAvaliacao),
    statusPublicacao,
    dataAbertura: normalizeDemoDate(payload.dataAbertura),
    dataFechamento: normalizeDemoDate(payload.dataFechamento),
    tentativasPermitidas: Number(payload.tentativasPermitidas),
    tempoLimiteMinutos: payload.tempoLimiteMinutos ? Number(payload.tempoLimiteMinutos) : null,
    notaMaxima: roundDemoNumber(payload.notaMaxima),
    pesoNota: roundDemoNumber(payload.pesoNota),
    pesoProgresso: roundDemoNumber(payload.pesoProgresso),
    totalQuestoes: 0,
    criadoEm: now,
    atualizadoEm: now,
    publicadoEm: statusPublicacao === 2 ? now : null
  };

  db.avaliacoes.push(avaliacao);
  saveDemoDb(db);
  return hydrateEvaluation(db, avaliacao);
}

function updateEvaluation(evaluationId, payload) {
  const user = requireProfessor();
  const db = readDemoDb();
  ensureEvaluationCollections(db);

  const avaliacao = db.avaliacoes.find((item) => item.id === evaluationId);
  if (!avaliacao) {
    throw new DemoApiError("Avaliacao demo nao encontrada.", 404);
  }

  ensureTeacherOwnsTurma(db, user, avaliacao.turmaId);
  validateEvaluationPayload(db, user, payload);

  const now = new Date().toISOString();
  const nextStatus = Number(payload.statusPublicacao);
  const wasPublished = Number(avaliacao.statusPublicacao) === 2;

  avaliacao.titulo = String(payload.titulo || "").trim();
  avaliacao.descricao = String(payload.descricao || "").trim();
  avaliacao.turmaId = Number(payload.turmaId);
  avaliacao.moduloId = Number(payload.moduloId);
  avaliacao.tipoAvaliacao = Number(payload.tipoAvaliacao);
  avaliacao.statusPublicacao = nextStatus;
  avaliacao.dataAbertura = normalizeDemoDate(payload.dataAbertura);
  avaliacao.dataFechamento = normalizeDemoDate(payload.dataFechamento);
  avaliacao.tentativasPermitidas = Number(payload.tentativasPermitidas);
  avaliacao.tempoLimiteMinutos = payload.tempoLimiteMinutos ? Number(payload.tempoLimiteMinutos) : null;
  avaliacao.notaMaxima = roundDemoNumber(payload.notaMaxima);
  avaliacao.pesoNota = roundDemoNumber(payload.pesoNota);
  avaliacao.pesoProgresso = roundDemoNumber(payload.pesoProgresso);
  avaliacao.atualizadoEm = now;
  avaliacao.publicadoEm =
    nextStatus === 2 ? (wasPublished ? avaliacao.publicadoEm || now : now) : nextStatus === 3 ? avaliacao.publicadoEm || null : null;

  saveDemoDb(db);
  return hydrateEvaluation(db, avaliacao);
}

function deleteEvaluation(evaluationId) {
  const user = requireProfessor();
  const db = readDemoDb();
  ensureEvaluationCollections(db);

  const avaliacao = db.avaliacoes.find((item) => item.id === evaluationId);
  if (!avaliacao) {
    throw new DemoApiError("Avaliacao demo nao encontrada.", 404);
  }

  ensureTeacherOwnsTurma(db, user, avaliacao.turmaId);
  db.avaliacoes = db.avaliacoes.filter((item) => item.id !== evaluationId);
  db.questoesAvaliacao = (db.questoesAvaliacao || []).filter((questao) => questao.avaliacaoId !== evaluationId);
  saveDemoDb(db);
  return { mensagem: "Avaliacao demo removida." };
}

function listEvaluationQuestions(evaluationId) {
  const user = requireProfessor();
  const db = readDemoDb();
  ensureQuestionCollections(db);
  ensureTeacherOwnsEvaluation(db, user, evaluationId);

  return hydrateEvaluationQuestions(
    db.questoesAvaliacao.filter((questao) => questao.avaliacaoId === evaluationId)
  );
}

function createEvaluationQuestion(evaluationId, payload) {
  const user = requireProfessor();
  const db = readDemoDb();
  ensureQuestionCollections(db);
  ensureTeacherOwnsEvaluation(db, user, evaluationId);
  validateEvaluationQuestionPayload(payload);

  const tipoQuestao = Number(payload.tipoQuestao);
  const ordem =
    db.questoesAvaliacao
      .filter((questao) => questao.avaliacaoId === evaluationId)
      .reduce((maxOrder, questao) => Math.max(maxOrder, Number(questao.ordem) || 0), 0) + 1;
  const questaoBancoId = nextId(db.questoesBanco);

  db.questoesBanco.push({
    id: questaoBancoId,
    professorAutorId: user.id,
    tituloInterno: String(payload.tituloInterno || "").trim(),
    contexto: String(payload.contexto || "").trim(),
    enunciado: String(payload.enunciado || "").trim(),
    tipoQuestao,
    tema: String(payload.tema || "").trim(),
    subtema: String(payload.subtema || "").trim(),
    dificuldade: Number(payload.dificuldade || 1),
    explicacaoPosResposta: String(payload.explicacaoPosResposta || "").trim(),
    ativa: true,
    criadoEm: new Date().toISOString()
  });

  const questao = {
    id: nextId(db.questoesAvaliacao),
    avaliacaoId: evaluationId,
    questaoBancoId,
    ordem,
    contexto: String(payload.contexto || "").trim(),
    enunciado: String(payload.enunciado || "").trim(),
    tipoQuestao,
    explicacao: String(payload.explicacaoPosResposta || "").trim(),
    pontos: roundDemoNumber(payload.pontos),
    alternativas:
      tipoQuestao === 3
        ? []
        : payload.alternativas.map((alternativa, index) => ({
            id: index + 1,
            letra: String(alternativa.letra || "").trim().toUpperCase().slice(0, 1),
            texto: String(alternativa.texto || "").trim(),
            ehCorreta: Boolean(alternativa.ehCorreta),
            justificativa: "",
            ordem: index + 1
          }))
  };

  db.questoesAvaliacao.push(questao);
  saveDemoDb(db);
  return clone(questao);
}

function deleteEvaluationQuestion(evaluationId, questionId) {
  const user = requireProfessor();
  const db = readDemoDb();
  ensureQuestionCollections(db);
  ensureTeacherOwnsEvaluation(db, user, evaluationId);

  const exists = db.questoesAvaliacao.some((questao) => questao.id === questionId && questao.avaliacaoId === evaluationId);
  if (!exists) {
    throw new DemoApiError("Questao demo nao encontrada.", 404);
  }

  db.questoesAvaliacao = db.questoesAvaliacao.filter(
    (questao) => !(questao.id === questionId && questao.avaliacaoId === evaluationId)
  );
  saveDemoDb(db);
  return { mensagem: "Questao demo removida." };
}

function validateContentPayload(db, user, payload) {
  const titulo = String(payload.titulo || "").trim();
  const turmaId = Number(payload.turmaId);
  const moduloId = Number(payload.moduloId);
  const tipoConteudo = Number(payload.tipoConteudo);
  const statusPublicacao = Number(payload.statusPublicacao);
  const ordemExibicao = Number(payload.ordemExibicao);
  const pesoProgresso = Number(payload.pesoProgresso);

  if (!titulo) {
    throw new DemoApiError("Informe um titulo para o conteudo demo.", 400);
  }

  if (!turmaId) {
    throw new DemoApiError("Selecione uma turma demo.", 400);
  }

  if (!moduloId) {
    throw new DemoApiError("Selecione um modulo demo.", 400);
  }

  if (![1, 2, 3, 4, 5].includes(tipoConteudo)) {
    throw new DemoApiError("Tipo de conteudo demo invalido.", 400);
  }

  if (![1, 2, 3].includes(statusPublicacao)) {
    throw new DemoApiError("Status de publicacao demo invalido.", 400);
  }

  if (!Number.isInteger(ordemExibicao) || ordemExibicao < 0) {
    throw new DemoApiError("Use uma ordem valida para o conteudo demo.", 400);
  }

  if (!Number.isFinite(pesoProgresso) || pesoProgresso <= 0) {
    throw new DemoApiError("Use um peso de progresso maior que zero.", 400);
  }

  ensureTeacherOwnsTurma(db, user, turmaId);

  const modulo = db.modulos.find((item) => item.id === moduloId);
  if (!modulo) {
    throw new DemoApiError("Modulo demo nao encontrado.", 404);
  }

  const turma = db.turmas.find((item) => item.id === turmaId);
  if (!turma) {
    throw new DemoApiError("Turma demo nao encontrada.", 404);
  }

  if (modulo.cursoId !== turma.cursoId) {
    throw new DemoApiError("O modulo demo precisa pertencer ao curso da turma.", 400);
  }
}

function validateEvaluationPayload(db, user, payload) {
  const titulo = String(payload.titulo || "").trim();
  const turmaId = Number(payload.turmaId);
  const moduloId = Number(payload.moduloId);
  const tipoAvaliacao = Number(payload.tipoAvaliacao);
  const statusPublicacao = Number(payload.statusPublicacao);
  const tentativasPermitidas = Number(payload.tentativasPermitidas);
  const tempoLimiteMinutos = payload.tempoLimiteMinutos ? Number(payload.tempoLimiteMinutos) : null;
  const notaMaxima = Number(payload.notaMaxima);
  const pesoNota = Number(payload.pesoNota);
  const pesoProgresso = Number(payload.pesoProgresso);
  const dataAbertura = normalizeDemoDate(payload.dataAbertura);
  const dataFechamento = normalizeDemoDate(payload.dataFechamento);

  if (!titulo) {
    throw new DemoApiError("Informe um titulo para a avaliacao demo.", 400);
  }

  if (!turmaId) {
    throw new DemoApiError("Selecione uma turma demo.", 400);
  }

  if (!moduloId) {
    throw new DemoApiError("Selecione um modulo demo.", 400);
  }

  if (![1, 2, 3].includes(tipoAvaliacao)) {
    throw new DemoApiError("Tipo de avaliacao demo invalido.", 400);
  }

  if (![1, 2, 3].includes(statusPublicacao)) {
    throw new DemoApiError("Status de publicacao demo invalido.", 400);
  }

  if (!Number.isInteger(tentativasPermitidas) || tentativasPermitidas <= 0) {
    throw new DemoApiError("Informe pelo menos uma tentativa permitida.", 400);
  }

  if (tempoLimiteMinutos !== null && (!Number.isInteger(tempoLimiteMinutos) || tempoLimiteMinutos <= 0)) {
    throw new DemoApiError("O tempo limite demo deve ser maior que zero.", 400);
  }

  if (!Number.isFinite(notaMaxima) || notaMaxima <= 0) {
    throw new DemoApiError("Use uma nota maxima demo maior que zero.", 400);
  }

  if (!Number.isFinite(pesoNota) || pesoNota <= 0) {
    throw new DemoApiError("Use um peso de nota demo maior que zero.", 400);
  }

  if (!Number.isFinite(pesoProgresso) || pesoProgresso <= 0) {
    throw new DemoApiError("Use um peso de progresso demo maior que zero.", 400);
  }

  if (dataAbertura && dataFechamento && new Date(dataFechamento) <= new Date(dataAbertura)) {
    throw new DemoApiError("A data de fechamento demo deve ser posterior a abertura.", 400);
  }

  const turma = ensureTeacherOwnsTurma(db, user, turmaId);

  const modulo = db.modulos.find((item) => item.id === moduloId);
  if (!modulo) {
    throw new DemoApiError("Modulo demo nao encontrado.", 404);
  }

  if (modulo.cursoId !== turma.cursoId) {
    throw new DemoApiError("O modulo demo precisa pertencer ao curso da turma.", 400);
  }
}

function validateEvaluationQuestionPayload(payload) {
  const titulo = String(payload.tituloInterno || "").trim();
  const enunciado = String(payload.enunciado || "").trim();
  const tipoQuestao = Number(payload.tipoQuestao);
  const pontos = Number(payload.pontos);
  const alternativas = Array.isArray(payload.alternativas) ? payload.alternativas : [];

  if (!titulo) {
    throw new DemoApiError("Informe um titulo interno para a questao demo.", 400);
  }

  if (!enunciado) {
    throw new DemoApiError("Informe o enunciado da questao demo.", 400);
  }

  if (![1, 2, 3].includes(tipoQuestao)) {
    throw new DemoApiError("Tipo de questao demo invalido.", 400);
  }

  if (!Number.isFinite(pontos) || pontos <= 0) {
    throw new DemoApiError("A pontuacao da questao demo deve ser maior que zero.", 400);
  }

  if (tipoQuestao === 3) {
    return;
  }

  if (alternativas.length < 2) {
    throw new DemoApiError("Informe pelo menos duas alternativas demo.", 400);
  }

  if (alternativas.some((alternativa) => !String(alternativa.letra || "").trim() || !String(alternativa.texto || "").trim())) {
    throw new DemoApiError("Todas as alternativas demo precisam de letra e texto.", 400);
  }

  if (alternativas.filter((alternativa) => Boolean(alternativa.ehCorreta)).length !== 1) {
    throw new DemoApiError("Marque exatamente uma alternativa demo correta.", 400);
  }
}

function hydrateEnrollments(db, rows) {
  const alunoById = new Map(db.alunos.map((aluno) => [aluno.id, aluno]));
  const cursoById = new Map(db.cursos.map((curso) => [curso.id, curso]));
  const turmaById = new Map(db.turmas.map((turma) => [turma.id, turma]));

  return clone(rows)
    .map((matricula) => ({
      ...matricula,
      aluno: sanitizeDemoUser(alunoById.get(matricula.alunoId)) || null,
      curso: cursoById.get(matricula.cursoId) || null,
      turma: matricula.turmaId ? turmaById.get(matricula.turmaId) || null : null
    }))
    .sort((left, right) => new Date(right.dataSolicitacao || 0).getTime() - new Date(left.dataSolicitacao || 0).getTime());
}

function buildPendingEnrollments(db) {
  const alunoById = new Map(db.alunos.map((aluno) => [aluno.id, aluno]));
  const turmaById = new Map(db.turmas.map((turma) => [turma.id, turma]));

  return db.matriculas
    .filter((matricula) => Number(matricula.status) === 0)
    .map((matricula) => {
      const aluno = alunoById.get(matricula.alunoId);
      const turma = matricula.turmaId ? turmaById.get(matricula.turmaId) : null;

      return {
        id: matricula.id,
        codigoRegistro: matricula.codigoRegistro,
        nomeAluno: aluno?.nome || `Aluno #${matricula.alunoId}`,
        cursoId: matricula.cursoId,
        cpfMascarado: maskCpf(aluno?.cpf || ""),
        nomeTurma: turma?.nomeTurma || null,
        dataSolicitacao: matricula.dataSolicitacao
      };
    })
    .sort((left, right) => new Date(right.dataSolicitacao || 0).getTime() - new Date(left.dataSolicitacao || 0).getTime());
}

function hydrateContents(db, rows) {
  return clone(rows)
    .map((conteudo) => hydrateContent(db, conteudo))
    .sort((left, right) => {
      const leftDate = new Date(left.publicadoEm || left.atualizadoEm || left.criadoEm || 0).getTime();
      const rightDate = new Date(right.publicadoEm || right.atualizadoEm || right.criadoEm || 0).getTime();
      return rightDate - leftDate;
    });
}

function hydrateContent(db, conteudo) {
  const turma = db.turmas.find((item) => item.id === conteudo.turmaId) || null;
  const modulo = db.modulos.find((item) => item.id === conteudo.moduloId) || null;
  const cursoId = turma?.cursoId || modulo?.cursoId || null;
  const curso = db.cursos.find((item) => item.id === cursoId) || null;

  return {
    ...clone(conteudo),
    cursoId,
    cursoTitulo: curso?.titulo || "",
    turmaNome: turma?.nomeTurma || "",
    moduloTitulo: modulo?.titulo || ""
  };
}

function hydrateEvaluations(db, rows) {
  return clone(rows)
    .map((avaliacao) => hydrateEvaluation(db, avaliacao))
    .sort((left, right) => {
      const leftDate = new Date(left.dataAbertura || left.publicadoEm || left.atualizadoEm || left.criadoEm || 0).getTime();
      const rightDate = new Date(right.dataAbertura || right.publicadoEm || right.atualizadoEm || right.criadoEm || 0).getTime();
      return rightDate - leftDate;
    });
}

function hydrateEvaluation(db, avaliacao) {
  const turma = db.turmas.find((item) => item.id === avaliacao.turmaId) || null;
  const modulo = db.modulos.find((item) => item.id === avaliacao.moduloId) || null;
  const cursoId = turma?.cursoId || modulo?.cursoId || null;
  const curso = db.cursos.find((item) => item.id === cursoId) || null;

  return {
    ...clone(avaliacao),
    cursoId,
    cursoTitulo: curso?.titulo || "",
    turmaNome: turma?.nomeTurma || "",
    moduloTitulo: modulo?.titulo || "",
    totalQuestoes: Array.isArray(db.questoesAvaliacao)
      ? db.questoesAvaliacao.filter((questao) => questao.avaliacaoId === avaliacao.id).length
      : Number(avaliacao.totalQuestoes || 0)
  };
}

function hydrateEvaluationQuestions(rows) {
  return clone(rows).sort((left, right) => Number(left.ordem || 0) - Number(right.ordem || 0));
}

function stripCorrectAnswersFromQuestion(questao) {
  return {
    ...questao,
    alternativas: (questao.alternativas || []).map((alternativa) => ({
      id: alternativa.id,
      letra: alternativa.letra,
      texto: alternativa.texto,
      ordem: alternativa.ordem
    }))
  };
}

function ensureStudentCanAccessEvaluation(db, studentId, evaluationId) {
  const avaliacao = db.avaliacoes.find(
    (item) => item.id === evaluationId && Number(item.statusPublicacao) === 2
  );
  if (!avaliacao) {
    throw new DemoApiError("Avaliacao demo publicada nao encontrada.", 404);
  }

  const matricula = db.matriculas.find(
    (item) =>
      item.alunoId === studentId &&
      item.turmaId &&
      item.turmaId === avaliacao.turmaId &&
      cursoTemAcessoLiberadoDemo(db, item)
  );
  if (!matricula) {
    throw new DemoApiError("Esta avaliacao demo nao esta liberada para a matricula do aluno.", 403);
  }

  return { avaliacao, matricula };
}

function validateDemoEvaluationPeriod(avaliacao) {
  const now = Date.now();
  const abertura = avaliacao.dataAbertura ? new Date(avaliacao.dataAbertura).getTime() : null;
  const fechamento = avaliacao.dataFechamento ? new Date(avaliacao.dataFechamento).getTime() : null;

  if (abertura && abertura > now) {
    throw new DemoApiError("Esta avaliacao demo ainda nao esta aberta para resposta.", 400);
  }

  if (fechamento && fechamento < now) {
    throw new DemoApiError("O periodo para responder esta avaliacao demo ja foi encerrado.", 400);
  }
}

function buildStudentProgressSnapshot(db, studentId) {
  ensureProgressCollections(db);

  const enrollmentIds = new Set(
    db.matriculas
      .filter((matricula) => matricula.alunoId === studentId && cursoTemAcessoLiberadoDemo(db, matricula))
      .map((matricula) => matricula.id)
  );

  return clone({
    conteudos: db.progressos.conteudos.filter((progresso) => enrollmentIds.has(progresso.matriculaId)),
    modulos: db.progressos.modulos.filter((progresso) => enrollmentIds.has(progresso.matriculaId)),
    cursos: db.progressos.cursos.filter((progresso) => enrollmentIds.has(progresso.matriculaId))
  });
}

function recalculateDemoModuleProgress(db, matricula, moduloId, now) {
  const conteudosModulo = db.conteudos.filter(
    (conteudo) =>
      Number(conteudo.statusPublicacao) === 2 &&
      conteudo.turmaId === matricula.turmaId &&
      conteudo.moduloId === moduloId
  );
  const contentIds = new Set(conteudosModulo.map((conteudo) => conteudo.id));
  const completedIds = new Set(
    db.progressos.conteudos
      .filter(
        (progresso) =>
          progresso.matriculaId === matricula.id &&
          contentIds.has(progresso.conteudoDidaticoId) &&
          Number(progresso.statusProgresso) === 3
      )
      .map((progresso) => progresso.conteudoDidaticoId)
  );
  const pesoTotal = sumDemoWeights(conteudosModulo);
  const pesoConcluido = sumDemoWeights(conteudosModulo.filter((conteudo) => completedIds.has(conteudo.id)));
  const percentualConclusao = calculateDemoPercent(pesoConcluido, pesoTotal);

  let progressoModulo = db.progressos.modulos.find(
    (progresso) => progresso.matriculaId === matricula.id && progresso.moduloId === moduloId
  );

  if (!progressoModulo) {
    progressoModulo = {
      id: nextId(db.progressos.modulos),
      matriculaId: matricula.id,
      moduloId,
      statusProgresso: 1,
      percentualConclusao: 0,
      pesoConcluido: 0,
      pesoTotal: 0,
      conteudosConcluidos: 0,
      totalConteudos: 0,
      avaliacoesConcluidas: 0,
      totalAvaliacoes: 0,
      mediaModulo: 0,
      atualizadoEm: now
    };
    db.progressos.modulos.push(progressoModulo);
  }

  progressoModulo.statusProgresso = resolveDemoProgressStatus(percentualConclusao);
  progressoModulo.percentualConclusao = percentualConclusao;
  progressoModulo.pesoConcluido = pesoConcluido;
  progressoModulo.pesoTotal = pesoTotal;
  progressoModulo.conteudosConcluidos = completedIds.size;
  progressoModulo.totalConteudos = conteudosModulo.length;
  progressoModulo.atualizadoEm = now;
}

function recalculateDemoCourseProgress(db, matricula, now) {
  const moduleById = new Map(db.modulos.map((modulo) => [modulo.id, modulo]));
  const conteudosCurso = db.conteudos.filter((conteudo) => {
    const modulo = moduleById.get(conteudo.moduloId);
    return (
      Number(conteudo.statusPublicacao) === 2 &&
      conteudo.turmaId === matricula.turmaId &&
      modulo?.cursoId === matricula.cursoId
    );
  });
  const contentIds = new Set(conteudosCurso.map((conteudo) => conteudo.id));
  const completedIds = new Set(
    db.progressos.conteudos
      .filter(
        (progresso) =>
          progresso.matriculaId === matricula.id &&
          contentIds.has(progresso.conteudoDidaticoId) &&
          Number(progresso.statusProgresso) === 3
      )
      .map((progresso) => progresso.conteudoDidaticoId)
  );
  const moduleGroups = new Map();

  conteudosCurso.forEach((conteudo) => {
    const current = moduleGroups.get(conteudo.moduloId) || [];
    current.push(conteudo);
    moduleGroups.set(conteudo.moduloId, current);
  });

  const modulosConcluidos = [...moduleGroups.values()].filter((conteudosModulo) =>
    conteudosModulo.every((conteudo) => completedIds.has(conteudo.id))
  ).length;
  const pesoTotal = sumDemoWeights(conteudosCurso);
  const pesoConcluido = sumDemoWeights(conteudosCurso.filter((conteudo) => completedIds.has(conteudo.id)));
  const percentualConclusao = calculateDemoPercent(pesoConcluido, pesoTotal);

  let progressoCurso = db.progressos.cursos.find(
    (progresso) => progresso.matriculaId === matricula.id && progresso.cursoId === matricula.cursoId
  );

  if (!progressoCurso) {
    progressoCurso = {
      id: nextId(db.progressos.cursos),
      matriculaId: matricula.id,
      cursoId: matricula.cursoId,
      statusProgresso: 1,
      percentualConclusao: 0,
      pesoConcluido: 0,
      pesoTotal: 0,
      modulosConcluidos: 0,
      totalModulos: 0,
      mediaCurso: 0,
      atualizadoEm: now
    };
    db.progressos.cursos.push(progressoCurso);
  }

  progressoCurso.statusProgresso = resolveDemoProgressStatus(percentualConclusao);
  progressoCurso.percentualConclusao = percentualConclusao;
  progressoCurso.pesoConcluido = pesoConcluido;
  progressoCurso.pesoTotal = pesoTotal;
  progressoCurso.modulosConcluidos = modulosConcluidos;
  progressoCurso.totalModulos = moduleGroups.size;
  progressoCurso.atualizadoEm = now;
}

function ensureProgressCollections(db) {
  db.progressos ||= {};
  db.progressos.conteudos ||= [];
  db.progressos.modulos ||= [];
  db.progressos.cursos ||= [];
}

function ensureEvaluationCollections(db) {
  db.avaliacoes ||= [];
}

function ensurePagamentosCollection(db) {
  db.pagamentos ||= [];

  if (!db.pagamentos.some((item) => item.id === 1)) {
    db.pagamentos.push({
      id: 1,
      matriculaId: 501,
      valor: 189.9,
      status: 1, // Pendente
      criadoEm: "2026-03-08T13:25:00.000Z",
      pagoEm: null
    });
  }
}

function ensureQuestionCollections(db) {
  db.questoesBanco ||= [];
  db.questoesAvaliacao ||= [];
}

function ensureAttemptCollections(db) {
  db.tentativasAvaliacao ||= [];
  db.respostasAvaliacao ||= [];
}

function ensurePresentationEvaluation(db) {
  ensureEvaluationCollections(db);
  ensureQuestionCollections(db);
  ensureAttemptCollections(db);

  const evaluationSeed = {
    id: 701,
    titulo: "Avaliacao de teste - apresentacao",
    descricao: "Avaliacao publicada para demonstrar o fluxo do aluno no modo demo.",
    professorAutorId: 301,
    turmaId: 401,
    moduloId: 11,
    tipoAvaliacao: 1,
    statusPublicacao: 2,
    dataAbertura: "2026-04-20T12:00:00.000Z",
    dataFechamento: null,
    tentativasPermitidas: 5,
    tempoLimiteMinutos: 30,
    notaMaxima: 10,
    pesoNota: 1,
    pesoProgresso: 0.5,
    totalQuestoes: 1,
    criadoEm: "2026-04-18T10:00:00.000Z",
    atualizadoEm: "2026-04-20T12:00:00.000Z",
    publicadoEm: "2026-04-20T12:00:00.000Z"
  };

  let evaluation = db.avaliacoes.find((item) => item.id === evaluationSeed.id);
  if (!evaluation) {
    evaluation = { ...evaluationSeed };
    db.avaliacoes.push(evaluation);
  } else {
    Object.assign(evaluation, evaluationSeed);
  }

  const presentationAttempts = db.tentativasAvaliacao.filter(
    (tentativa) => tentativa.avaliacaoId === evaluation.id && tentativa.matriculaId === 501
  );
  evaluation.tentativasPermitidas = Math.max(5, presentationAttempts.length + 1);

  const bankQuestionSeed = {
    id: 801,
    professorAutorId: 301,
    tituloInterno: "Questao demo - apresentacao",
    contexto: "Considere a primeira etapa de um projeto de logica aplicada.",
    enunciado: "Qual acao ajuda a validar o entendimento inicial antes de avancar para codigo?",
    tipoQuestao: 1,
    tema: "Logica",
    subtema: "Validacao",
    dificuldade: 1,
    explicacaoPosResposta: "Antes de codificar, definir criterios claros reduz retrabalho.",
    ativa: true,
    criadoEm: "2026-04-18T11:00:00.000Z"
  };

  const bankQuestion = db.questoesBanco.find((questao) => questao.id === bankQuestionSeed.id);
  if (!bankQuestion) {
    db.questoesBanco.push({ ...bankQuestionSeed });
  } else {
    Object.assign(bankQuestion, bankQuestionSeed);
  }

  const publishedQuestionSeed = {
    id: 811,
    avaliacaoId: evaluation.id,
    questaoBancoId: bankQuestionSeed.id,
    ordem: 1,
    contexto: bankQuestionSeed.contexto,
    enunciado: bankQuestionSeed.enunciado,
    tipoQuestao: 1,
    explicacao: bankQuestionSeed.explicacaoPosResposta,
    pontos: 10,
    alternativas: [
      { id: 1, letra: "A", texto: "Definir os criterios de aceite do problema.", ehCorreta: true, justificativa: "", ordem: 1 },
      { id: 2, letra: "B", texto: "Comecar pela interface sem revisar o objetivo.", ehCorreta: false, justificativa: "", ordem: 2 },
      { id: 3, letra: "C", texto: "Ignorar os casos de erro para ganhar tempo.", ehCorreta: false, justificativa: "", ordem: 3 },
      { id: 4, letra: "D", texto: "Trocar o escopo antes de conversar com a turma.", ehCorreta: false, justificativa: "", ordem: 4 }
    ]
  };

  const publishedQuestion = db.questoesAvaliacao.find((questao) => questao.id === publishedQuestionSeed.id);
  if (!publishedQuestion) {
    db.questoesAvaliacao.push({ ...publishedQuestionSeed });
  } else {
    Object.assign(publishedQuestion, publishedQuestionSeed);
  }
}

function ensureCoordinatorCollection(db) {
  db.coordenadores ||= [
    {
      id: 901,
      codigoRegistro: "COORD-1X4E7V",
      nome: "Clara Campos",
      email: "coordenacao@demo.edtech",
      cpf: "38765432100",
      telefone: "(11) 98888-4400",
      cep: "01310-000",
      rua: "Avenida Paulista",
      numero: "1500",
      bairro: "Bela Vista",
      cidade: "Sao Paulo",
      estado: "SP",
      tipoUsuario: "Coordenador",
      ativo: true,
      cursoResponsavel: "Trilhas CodeRyse"
    },
    {
      id: 902,
      codigoRegistro: "COORD-1XCBZG",
      nome: "Helena Rocha",
      email: "helena@coord.demo",
      cpf: "21987654300",
      telefone: "(21) 98888-5500",
      cep: "20031-170",
      rua: "Rua Primeiro de Marco",
      numero: "90",
      bairro: "Centro",
      cidade: "Rio de Janeiro",
      estado: "RJ",
      tipoUsuario: "Coordenador",
      ativo: true,
      cursoResponsavel: "Dados e Produto"
    }
  ];
}

function ensureRegistrationCodes(db) {
  ensureStudentRegistrationCodes(db);
  ensureCollectionRegistrationCodes(db.cursos, "CUR");
  ensureCollectionRegistrationCodes(db.modulos, "MOD");
  ensureCollectionRegistrationCodes(db.turmas, "TUR");
  ensureCollectionRegistrationCodes(db.coordenadores, "COORD");
  ensureCollectionRegistrationCodes(db.professores, "PROF");
  ensureCollectionRegistrationCodes(db.matriculas, "MAT");
}

function ensureStudentRegistrationCodes(db) {
  const usedCodes = new Set();

  db.alunos.forEach((aluno) => {
    const currentCode = String(aluno.matricula || "").trim().toUpperCase();

    if (currentCode && currentCode !== "PENDENTE" && !usedCodes.has(currentCode)) {
      aluno.matricula = currentCode;
      usedCodes.add(currentCode);
      return;
    }

    aluno.matricula = buildDemoRegistrationCode("ALU", aluno.id, usedCodes);
    usedCodes.add(aluno.matricula);
  });
}

function ensureCollectionRegistrationCodes(items, prefix) {
  const usedCodes = new Set();

  items.forEach((item) => {
    const currentCode = String(item.codigoRegistro || "").trim().toUpperCase();

    if (currentCode && !usedCodes.has(currentCode)) {
      item.codigoRegistro = currentCode;
      usedCodes.add(currentCode);
      return;
    }

    item.codigoRegistro = buildDemoRegistrationCode(prefix, item.id, usedCodes);
    usedCodes.add(item.codigoRegistro);
  });
}

function nextDemoRegistrationCode(items, prefix) {
  const usedCodes = new Set(items.map((item) => String(item.codigoRegistro || "").trim().toUpperCase()).filter(Boolean));
  return buildDemoRegistrationCode(prefix, nextId(items), usedCodes);
}

function nextDemoStudentRegistrationCode(db) {
  const usedCodes = new Set(
    db.alunos
      .map((aluno) => String(aluno.matricula || "").trim().toUpperCase())
      .filter((codigo) => codigo && codigo !== "PENDENTE")
  );

  return buildDemoRegistrationCode("ALU", nextId(db.alunos), usedCodes);
}

function ensureDemoStudentRegistrationCode(db, aluno) {
  const currentCode = String(aluno?.matricula || "").trim();

  if (currentCode && currentCode.toUpperCase() !== "PENDENTE") {
    return;
  }

  aluno.matricula = nextDemoStudentRegistrationCode(db);
}

function buildDemoRegistrationCode(prefix, id, usedCodes) {
  let attempt = 0;

  while (attempt < 100) {
    const seed = Math.abs((Number(id) || 0) * 7919 + attempt * 104729);
    const suffix = seed.toString(36).toUpperCase().padStart(6, "0").slice(-6);
    const code = `${prefix}-${suffix}`;

    if (!usedCodes.has(code)) {
      return code;
    }

    attempt += 1;
  }

  throw new DemoApiError("Nao foi possivel gerar um codigo demo unico.", 500);
}

function sumDemoWeights(conteudos) {
  return roundDemoNumber(
    conteudos.reduce((total, conteudo) => total + Math.max(Number(conteudo.pesoProgresso || 0), 0), 0)
  );
}

function calculateDemoPercent(pesoConcluido, pesoTotal) {
  if (pesoTotal <= 0) {
    return 0;
  }

  return roundDemoNumber(Math.min((pesoConcluido / pesoTotal) * 100, 100));
}

function resolveDemoProgressStatus(percentualConclusao) {
  if (percentualConclusao >= 100) {
    return 3;
  }

  return percentualConclusao > 0 ? 2 : 1;
}

function roundDemoNumber(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function normalizeDemoDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function ensureTeacherOwnsTurma(db, user, turmaId) {
  const turma = db.turmas.find((item) => item.id === turmaId);

  if (!turma) {
    throw new DemoApiError("Turma demo nao encontrada.", 404);
  }

  if (turma.professorId !== user.id) {
    throw new DemoApiError("Esta turma demo nao pertence ao professor autenticado.", 403);
  }

  return turma;
}

function ensureTeacherOwnsEvaluation(db, user, evaluationId) {
  const avaliacao = db.avaliacoes.find((item) => item.id === evaluationId);

  if (!avaliacao) {
    throw new DemoApiError("Avaliacao demo nao encontrada.", 404);
  }

  ensureTeacherOwnsTurma(db, user, avaliacao.turmaId);
  return avaliacao;
}

function requireAuthenticatedUser() {
  const user = readCurrentUser();

  if (!user?.id) {
    throw new DemoApiError("Sua sessao demo expirou. Entre novamente.", 401);
  }

  return user;
}

function requireManager() {
  const user = requireAuthenticatedUser();

  if (!MANAGER_ROLES.has(user.tipoUsuario)) {
    throw new DemoApiError("Este recurso demo exige perfil de coordenacao.", 403);
  }

  return user;
}

function requireAdmin() {
  const user = requireAuthenticatedUser();

  if (user.tipoUsuario !== "Admin") {
    throw new DemoApiError("Este recurso demo exige perfil de administracao.", 403);
  }

  return user;
}

function requireRole(role) {
  const user = requireAuthenticatedUser();

  if (user.tipoUsuario !== role) {
    throw new DemoApiError(`Este recurso demo exige perfil ${role}.`, 403);
  }

  return user;
}

function requireProfessor() {
  const user = requireAuthenticatedUser();

  if (user.tipoUsuario !== "Professor") {
    throw new DemoApiError("Este recurso demo exige perfil de professor.", 403);
  }

  return user;
}

function readCurrentUser() {
  try {
    const rawUser = window.localStorage.getItem("usuarioLogado");
    return rawUser ? JSON.parse(rawUser) : null;
  } catch {
    return null;
  }
}

function readDemoDb() {
  try {
    const stored = window.localStorage.getItem(DEMO_DB_KEY);

    if (stored) {
      const parsed = JSON.parse(stored);

      if (isValidDemoDb(parsed)) {
        ensureProgressCollections(parsed);
        ensureCoordinatorCollection(parsed);
        ensureEvaluationCollections(parsed);
        ensureQuestionCollections(parsed);
        ensureAttemptCollections(parsed);
        ensurePresentationEvaluation(parsed);
        ensureRegistrationCodes(parsed);
        ensurePagamentosCollection(parsed);
        saveDemoDb(parsed);
        return parsed;
      }
    }
  } catch {
    // Ignora dados corrompidos e recria a base demo abaixo.
  }

  const initialDb = createInitialDemoDb();
  ensureEvaluationCollections(initialDb);
  ensureQuestionCollections(initialDb);
  ensureAttemptCollections(initialDb);
  ensurePresentationEvaluation(initialDb);
  ensureRegistrationCodes(initialDb);
  ensurePagamentosCollection(initialDb);
  saveDemoDb(initialDb);
  return initialDb;
}

function saveDemoDb(db) {
  window.localStorage.setItem(DEMO_DB_KEY, JSON.stringify(db));
}

function isValidDemoDb(db) {
  return Boolean(
    db &&
      Array.isArray(db.cursos) &&
      Array.isArray(db.modulos) &&
      Array.isArray(db.alunos) &&
      (db.coordenadores === undefined || Array.isArray(db.coordenadores)) &&
      Array.isArray(db.professores) &&
      Array.isArray(db.turmas) &&
      Array.isArray(db.matriculas) &&
      Array.isArray(db.conteudos) &&
      (db.avaliacoes === undefined || Array.isArray(db.avaliacoes)) &&
      (db.questoesBanco === undefined || Array.isArray(db.questoesBanco)) &&
      (db.questoesAvaliacao === undefined || Array.isArray(db.questoesAvaliacao)) &&
      (db.tentativasAvaliacao === undefined || Array.isArray(db.tentativasAvaliacao)) &&
      (db.respostasAvaliacao === undefined || Array.isArray(db.respostasAvaliacao))
  );
}

function createInitialDemoDb() {
  return {
    cursos: [
      {
        id: 1,
        codigoRegistro: "CUR-007Q0N",
        titulo: "Programacao Aplicada",
        descricao: "Projetos guiados com fundamentos de logica, API e entrega incremental.",
        preco: 189.9,
        coordenadorId: 901
      },
      {
        id: 2,
        codigoRegistro: "CUR-00F60A",
        titulo: "Banco de Dados",
        descricao: "Modelagem relacional, SQL e leitura de cenarios orientados a produto.",
        preco: 169.9,
        coordenadorId: 901
      },
      {
        id: 3,
        codigoRegistro: "CUR-00MXZX",
        titulo: "Analise de Dados",
        descricao: "Metricas, dashboards e interpretacao de indicadores com foco academico.",
        preco: 209.9,
        coordenadorId: 901
      }
    ],
    modulos: [
      { id: 11, codigoRegistro: "MOD-02DEOJ", cursoId: 1, titulo: "Fundamentos de logica" },
      { id: 12, codigoRegistro: "MOD-02KUC6", cursoId: 1, titulo: "Projeto web inicial" },
      { id: 21, codigoRegistro: "MOD-04MVGF", cursoId: 2, titulo: "Modelagem relacional" },
      { id: 22, codigoRegistro: "MOD-04TBY2", cursoId: 2, titulo: "Consultas SQL" },
      { id: 31, codigoRegistro: "MOD-06ULOB", cursoId: 3, titulo: "Leitura de indicadores" },
      { id: 32, codigoRegistro: "MOD-0711ZY", cursoId: 3, titulo: "Storytelling com dados" }
    ],
    alunos: [
      {
        id: 101,
        nome: "Lucas Martins",
        email: "aluno@demo.edtech",
        cpf: "12345678901",
        telefone: "(11) 99888-7766",
        cep: "01310-000",
        rua: "Avenida Paulista",
        numero: "1200",
        bairro: "Bela Vista",
        cidade: "Sao Paulo",
        estado: "SP",
        tipoUsuario: "Aluno",
        ativo: true,
        senha: DEMO_PASSWORD
      },
      {
        id: 102,
        nome: "Bianca Pereira",
        email: "bianca@alunos.demo",
        cpf: "98765432100",
        telefone: "(21) 99777-6611",
        cep: "20031-170",
        rua: "Rua Primeiro de Marco",
        numero: "45",
        bairro: "Centro",
        cidade: "Rio de Janeiro",
        estado: "RJ",
        tipoUsuario: "Aluno",
        ativo: true,
        senha: "senha-bianca"
      },
      {
        id: 103,
        nome: "Caio Nogueira",
        email: "caio@alunos.demo",
        cpf: "45612378900",
        telefone: "(31) 99655-4400",
        cep: "30130-010",
        rua: "Rua da Bahia",
        numero: "310",
        bairro: "Centro",
        cidade: "Belo Horizonte",
        estado: "MG",
        tipoUsuario: "Aluno",
        ativo: true,
        senha: "senha-caio"
      }
    ],
    coordenadores: [
      {
        id: 901,
        codigoRegistro: "COORD-1X4E7V",
        nome: "Clara Campos",
        email: "coordenacao@demo.edtech",
        cpf: "38765432100",
        telefone: "(11) 98888-4400",
        cep: "01310-000",
        rua: "Avenida Paulista",
        numero: "1500",
        bairro: "Bela Vista",
        cidade: "Sao Paulo",
        estado: "SP",
        tipoUsuario: "Coordenador",
        ativo: true,
        cursoResponsavel: "Trilhas CodeRyse"
      },
      {
        id: 902,
        codigoRegistro: "COORD-1XCBZG",
        nome: "Helena Rocha",
        email: "helena@coord.demo",
        cpf: "21987654300",
        telefone: "(21) 98888-5500",
        cep: "20031-170",
        rua: "Rua Primeiro de Marco",
        numero: "90",
        bairro: "Centro",
        cidade: "Rio de Janeiro",
        estado: "RJ",
        tipoUsuario: "Coordenador",
        ativo: true,
        cursoResponsavel: "Dados e Produto"
      }
    ],
    professores: [
      {
        id: 301,
        codigoRegistro: "PROF-1U8L3B",
        nome: "Renata Vieira",
        email: "professor@demo.edtech",
        especialidade: "Arquitetura .NET e jornadas de conteudo",
        cpf: "42156789012"
      },
      {
        id: 302,
        codigoRegistro: "PROF-1UEO0U",
        nome: "Marcio Lima",
        email: "marcio@prof.demo",
        especialidade: "SQL aplicado e modelagem de dados",
        cpf: "65498732100"
      },
      {
        id: 303,
        codigoRegistro: "PROF-1UMQY9",
        nome: "Sofia Andrade",
        email: "sofia@prof.demo",
        especialidade: "UX research e produto digital",
        cpf: "32165498700"
      },
      {
        id: 304,
        codigoRegistro: "PROF-1V4L2K",
        nome: "Thiago Nunes",
        email: "thiago@prof.demo",
        especialidade: "Cloud, DevOps e operacoes",
        cpf: "74185296300"
      },
      {
        id: 305,
        codigoRegistro: "PROF-1VCC53",
        nome: "Patricia Gomes",
        email: "patricia@prof.demo",
        especialidade: "IA aplicada e automacoes",
        cpf: "85296374100"
      },
      {
        id: 306,
        codigoRegistro: "PROF-1VK3DO",
        nome: "Rafael Costa",
        email: "rafael@prof.demo",
        especialidade: "QA e automacao de testes",
        cpf: "96374185200"
      }
    ],
    turmas: [
      {
        id: 401,
        codigoRegistro: "TUR-30Q10H",
        nomeTurma: "Turma online - Programacao Aplicada",
        cursoId: 1,
        professorId: 301,
        dataCriacao: "2026-03-04T10:00:00.000Z"
      },
      {
        id: 402,
        codigoRegistro: "TUR-30WHEW",
        nomeTurma: "Turma online - Banco de Dados",
        cursoId: 2,
        professorId: 302,
        dataCriacao: "2026-03-06T11:00:00.000Z"
      },
      {
        id: 403,
        codigoRegistro: "TUR-3125DB",
        nomeTurma: "Turma online - Analise de Dados",
        cursoId: 3,
        professorId: 301,
        dataCriacao: "2026-03-10T19:00:00.000Z"
      }
    ],
    matriculas: [
      {
        id: 501,
        alunoId: 101,
        cursoId: 1,
        turmaId: 401,
        status: 1,
        notaFinal: 8.7,
        dataSolicitacao: "2026-03-08T13:20:00.000Z"
      },
      {
        id: 502,
        alunoId: 101,
        cursoId: 3,
        turmaId: 403,
        status: 0,
        notaFinal: 0,
        dataSolicitacao: "2026-04-12T15:00:00.000Z"
      },
      {
        id: 503,
        alunoId: 102,
        cursoId: 2,
        turmaId: 402,
        status: 1,
        notaFinal: 9.1,
        dataSolicitacao: "2026-03-11T09:40:00.000Z"
      },
      {
        id: 504,
        alunoId: 103,
        cursoId: 1,
        turmaId: null,
        status: 0,
        notaFinal: 0,
        dataSolicitacao: "2026-04-15T17:30:00.000Z"
      }
    ],
    conteudos: [
      {
        id: 601,
        titulo: "Panorama do modulo",
        descricao: "Introducao pratica aos conceitos basicos que sustentam o curso.",
        tipoConteudo: 1,
        corpoTexto: "Nesta aula o aluno entende o objetivo do modulo, o fluxo das entregas e os marcos que serao avaliados.",
        arquivoUrl: "",
        linkUrl: "",
        turmaId: 401,
        moduloId: 11,
        statusPublicacao: 2,
        ordemExibicao: 1,
        pesoProgresso: 0.4,
        criadoEm: "2026-03-12T10:00:00.000Z",
        atualizadoEm: "2026-03-12T10:00:00.000Z",
        publicadoEm: "2026-03-12T10:00:00.000Z"
      },
      {
        id: 602,
        titulo: "Guia de apoio em PDF",
        descricao: "Material complementar com exemplos de estruturas e checkpoints da semana.",
        tipoConteudo: 2,
        corpoTexto: "",
        arquivoUrl: "https://example.com/demo/programacao-guia.pdf",
        linkUrl: "",
        turmaId: 401,
        moduloId: 12,
        statusPublicacao: 2,
        ordemExibicao: 2,
        pesoProgresso: 0.35,
        criadoEm: "2026-03-14T14:20:00.000Z",
        atualizadoEm: "2026-03-15T09:00:00.000Z",
        publicadoEm: "2026-03-15T09:00:00.000Z"
      },
      {
        id: 603,
        titulo: "Video de leitura de indicadores",
        descricao: "Aula gravada com exemplos de metricas e leitura inicial do dashboard.",
        tipoConteudo: 3,
        corpoTexto: "",
        arquivoUrl: "",
        linkUrl: "https://example.com/demo/indicadores-video",
        turmaId: 403,
        moduloId: 31,
        statusPublicacao: 2,
        ordemExibicao: 1,
        pesoProgresso: 0.5,
        criadoEm: "2026-04-01T18:30:00.000Z",
        atualizadoEm: "2026-04-02T08:10:00.000Z",
        publicadoEm: "2026-04-02T08:10:00.000Z"
      },
      {
        id: 604,
        titulo: "Leitura externa recomendada",
        descricao: "Artigo de apoio para aprofundar repertorio antes do encontro ao vivo.",
        tipoConteudo: 4,
        corpoTexto: "",
        arquivoUrl: "",
        linkUrl: "https://example.com/demo/storytelling-dados",
        turmaId: 403,
        moduloId: 32,
        statusPublicacao: 1,
        ordemExibicao: 2,
        pesoProgresso: 0.2,
        criadoEm: "2026-04-05T20:00:00.000Z",
        atualizadoEm: "2026-04-05T20:00:00.000Z",
        publicadoEm: null
      },
      {
        id: 605,
        titulo: "Consulta SQL comentada",
        descricao: "Exercicio resolvido para revisar filtros, joins e ordenacao.",
        tipoConteudo: 1,
        corpoTexto: "O material demonstra o passo a passo de uma consulta aplicada ao caso da turma.",
        arquivoUrl: "",
        linkUrl: "",
        turmaId: 402,
        moduloId: 22,
        statusPublicacao: 2,
        ordemExibicao: 1,
        pesoProgresso: 0.45,
        criadoEm: "2026-03-18T16:00:00.000Z",
        atualizadoEm: "2026-03-19T11:15:00.000Z",
        publicadoEm: "2026-03-19T11:15:00.000Z"
      }
    ],
    avaliacoes: [
      {
        id: 701,
        titulo: "Avaliacao de teste - apresentacao",
        descricao: "Avaliacao publicada para demonstrar o fluxo do aluno no modo demo.",
        professorAutorId: 301,
        turmaId: 401,
        moduloId: 11,
        tipoAvaliacao: 1,
        statusPublicacao: 2,
        dataAbertura: "2026-04-20T12:00:00.000Z",
        dataFechamento: null,
        tentativasPermitidas: 5,
        tempoLimiteMinutos: 30,
        notaMaxima: 10,
        pesoNota: 1,
        pesoProgresso: 0.5,
        totalQuestoes: 1,
        criadoEm: "2026-04-18T10:00:00.000Z",
        atualizadoEm: "2026-04-20T12:00:00.000Z",
        publicadoEm: "2026-04-20T12:00:00.000Z"
      },
      {
        id: 702,
        titulo: "Prova pratica de indicadores",
        descricao: "Avaliacao em rascunho para a turma de dados.",
        professorAutorId: 301,
        turmaId: 403,
        moduloId: 31,
        tipoAvaliacao: 2,
        statusPublicacao: 1,
        dataAbertura: null,
        dataFechamento: null,
        tentativasPermitidas: 1,
        tempoLimiteMinutos: 90,
        notaMaxima: 10,
        pesoNota: 2,
        pesoProgresso: 1,
        totalQuestoes: 0,
        criadoEm: "2026-04-21T18:00:00.000Z",
        atualizadoEm: "2026-04-21T18:00:00.000Z",
        publicadoEm: null
      },
      {
        id: 703,
        titulo: "Exercicio SQL da semana",
        descricao: "Atividade avaliativa publicada para a turma de Banco de Dados.",
        professorAutorId: 302,
        turmaId: 402,
        moduloId: 22,
        tipoAvaliacao: 3,
        statusPublicacao: 2,
        dataAbertura: "2026-04-19T14:00:00.000Z",
        dataFechamento: "2026-05-03T22:59:00.000Z",
        tentativasPermitidas: 3,
        tempoLimiteMinutos: null,
        notaMaxima: 10,
        pesoNota: 1,
        pesoProgresso: 0.4,
        totalQuestoes: 0,
        criadoEm: "2026-04-17T14:00:00.000Z",
        atualizadoEm: "2026-04-19T14:00:00.000Z",
        publicadoEm: "2026-04-19T14:00:00.000Z"
      }
    ],
    questoesBanco: [
      {
        id: 801,
        professorAutorId: 301,
        tituloInterno: "Questao demo - apresentacao",
        contexto: "Considere a primeira etapa de um projeto de logica aplicada.",
        enunciado: "Qual acao ajuda a validar o entendimento inicial antes de avancar para codigo?",
        tipoQuestao: 1,
        tema: "Logica",
        subtema: "Validacao",
        dificuldade: 1,
        explicacaoPosResposta: "Antes de codificar, definir criterios claros reduz retrabalho.",
        ativa: true,
        criadoEm: "2026-04-18T11:00:00.000Z"
      }
    ],
    questoesAvaliacao: [
      {
        id: 811,
        avaliacaoId: 701,
        questaoBancoId: 801,
        ordem: 1,
        contexto: "Considere a primeira etapa de um projeto de logica aplicada.",
        enunciado: "Qual acao ajuda a validar o entendimento inicial antes de avancar para codigo?",
        tipoQuestao: 1,
        explicacao: "Antes de codificar, definir criterios claros reduz retrabalho.",
        pontos: 10,
        alternativas: [
          { id: 1, letra: "A", texto: "Definir os criterios de aceite do problema.", ehCorreta: true, justificativa: "", ordem: 1 },
          { id: 2, letra: "B", texto: "Comecar pela interface sem revisar o objetivo.", ehCorreta: false, justificativa: "", ordem: 2 },
          { id: 3, letra: "C", texto: "Ignorar os casos de erro para ganhar tempo.", ehCorreta: false, justificativa: "", ordem: 3 },
          { id: 4, letra: "D", texto: "Trocar o escopo antes de conversar com a turma.", ehCorreta: false, justificativa: "", ordem: 4 }
        ]
      }
    ],
    tentativasAvaliacao: [],
    respostasAvaliacao: [],
    progressos: {
      conteudos: [],
      modulos: [],
      cursos: []
    }
  };
}

function parseBody(body) {
  if (!body) {
    return {};
  }

  if (body instanceof FormData) {
    const objeto = {};
    for (const [chave, valor] of body.entries()) {
      objeto[chave] = valor;
    }
    return objeto;
  }

  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }

  return body;
}

function normalizePath(path) {
  const normalized = `/${String(path || "").replace(/^\/+/, "").replace(/\/+$/, "")}`;
  return normalized === "/" ? "/" : normalized;
}

function getNumericId(path) {
  const id = Number(String(path).split("/").pop());

  if (!Number.isInteger(id)) {
    throw new DemoApiError("Identificador demo invalido.", 400);
  }

  return id;
}

function getCertificadoMatriculaId(path) {
  const match = String(path).match(/^\/Certificados\/matricula\/(\d+)\/emitir$/);
  const id = Number(match?.[1]);

  if (!Number.isInteger(id)) {
    throw new DemoApiError("Identificador demo invalido.", 400);
  }

  return id;
}

function getCertificadoVerificarCodigo(path) {
  const match = String(path).match(/^\/Certificados\/verificar\/(.+)$/);
  return decodeURIComponent(match?.[1] || "");
}

function getEnrollmentActionId(path) {
  const match = String(path).match(/^\/Matriculas\/(\d+)\/(?:aprovar|rejeitar)$/);
  const id = Number(match?.[1]);

  if (!Number.isInteger(id)) {
    throw new DemoApiError("Identificador demo invalido.", 400);
  }

  return id;
}

function getPagamentoConfirmActionId(path) {
  const match = String(path).match(/^\/Pagamentos\/(\d+)\/confirmar$/);
  const id = Number(match?.[1]);

  if (!Number.isInteger(id)) {
    throw new DemoApiError("Identificador demo invalido.", 400);
  }

  return id;
}

function getCourseImageActionId(path) {
  const match = String(path).match(/^\/Cursos\/(\d+)\/imagem$/);
  const id = Number(match?.[1]);

  if (!Number.isInteger(id)) {
    throw new DemoApiError("Identificador demo invalido.", 400);
  }

  return id;
}

function getCourseCoordinatorActionId(path) {
  const match = String(path).match(/^\/Cursos\/(\d+)\/coordenador$/);
  const id = Number(match?.[1]);

  if (!Number.isInteger(id)) {
    throw new DemoApiError("Identificador demo invalido.", 400);
  }

  return id;
}

function getClassProfessorActionId(path) {
  const match = String(path).match(/^\/Turmas\/(\d+)\/professor$/);
  const id = Number(match?.[1]);

  if (!Number.isInteger(id)) {
    throw new DemoApiError("Identificador demo invalido.", 400);
  }

  return id;
}

function getProgressContentActionId(path) {
  const match = String(path).match(/^\/Progressos\/conteudos\/(\d+)\/concluir$/);
  const id = Number(match?.[1]);

  if (!Number.isInteger(id)) {
    throw new DemoApiError("Identificador demo invalido.", 400);
  }

  return id;
}

function getEvaluationQuestionsActionId(path) {
  const match = String(path).match(/^\/Avaliacoes\/(\d+)\/questoes$/);
  const id = Number(match?.[1]);

  if (!Number.isInteger(id)) {
    throw new DemoApiError("Identificador demo invalido.", 400);
  }

  return id;
}

function getEvaluationQuestionActionIds(path) {
  const match = String(path).match(/^\/Avaliacoes\/(\d+)\/questoes\/(\d+)$/);
  const evaluationId = Number(match?.[1]);
  const questionId = Number(match?.[2]);

  if (!Number.isInteger(evaluationId) || !Number.isInteger(questionId)) {
    throw new DemoApiError("Identificador demo invalido.", 400);
  }

  return [evaluationId, questionId];
}

function getStudentEvaluationActionId(path, action) {
  const match = String(path).match(new RegExp(`^/Avaliacoes/(\\d+)/aluno/${action}$`));
  const id = Number(match?.[1]);

  if (!Number.isInteger(id)) {
    throw new DemoApiError("Identificador demo invalido.", 400);
  }

  return id;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nextId(items) {
  return items.reduce((maxId, item) => Math.max(maxId, Number(item.id) || 0), 0) + 1;
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function maskCpf(value) {
  const digits = onlyDigits(value);

  if (digits.length !== 11) {
    return value || "-";
  }

  return `***.***.***-${digits.slice(-2)}`;
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
