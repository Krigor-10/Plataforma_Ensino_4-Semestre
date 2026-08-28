const DEMO_MODE_KEY = "edtech.demoMode";
const ENV_DEMO_MODE_ENABLED = String(import.meta.env.VITE_DEMO_MODE || "").toLowerCase() === "true";

export const DEMO_PASSWORD = "demo123";

export const DEMO_ACCOUNTS = Object.freeze([
  {
    key: "coordenador",
    label: "Coordenacao",
    description: "Visao completa de gestao com cursos, alunos e matriculas.",
    email: "coordenacao@demo.edtech",
    password: DEMO_PASSWORD,
    user: {
      id: 901,
      nome: "Clara Campos",
      email: "coordenacao@demo.edtech",
      cpf: "38765432100",
      tipoUsuario: "Coordenador"
    }
  },
  {
    key: "professor",
    label: "Professor",
    description: "Publicacao de conteudos, turmas e trilha docente.",
    email: "professor@demo.edtech",
    password: DEMO_PASSWORD,
    user: {
      id: 301,
      nome: "Renata Vieira",
      email: "professor@demo.edtech",
      cpf: "42156789012",
      tipoUsuario: "Professor"
    }
  },
  {
    key: "aluno",
    label: "Aluno",
    description: "Experiencia do estudante com cursos, materiais e matriculas.",
    email: "aluno@demo.edtech",
    password: DEMO_PASSWORD,
    user: {
      id: 101,
      nome: "Lucas Martins",
      email: "aluno@demo.edtech",
      cpf: "12345678901",
      tipoUsuario: "Aluno"
    }
  }
]);

export function readDemoMode() {
  if (ENV_DEMO_MODE_ENABLED) {
    return true;
  }

  try {
    return window.localStorage.getItem(DEMO_MODE_KEY) === "true";
  } catch {
    return false;
  }
}

export function enableDemoMode() {
  if (!ENV_DEMO_MODE_ENABLED) {
    window.localStorage.setItem(DEMO_MODE_KEY, "true");
  }

  return true;
}

export function disableDemoMode() {
  if (!ENV_DEMO_MODE_ENABLED) {
    window.localStorage.removeItem(DEMO_MODE_KEY);
  }

  return readDemoMode();
}

export function isDemoModeLocked() {
  return ENV_DEMO_MODE_ENABLED;
}

export function getDemoAccountByKey(accountKey) {
  return DEMO_ACCOUNTS.find((account) => account.key === accountKey) || null;
}

export function getDemoAccountByEmail(email) {
  return DEMO_ACCOUNTS.find(
    (account) => account.email.toLowerCase() === String(email || "").trim().toLowerCase()
  ) || null;
}

export function sanitizeDemoUser(user) {
  if (!user) {
    return null;
  }

  const { senha, ...safeUser } = user;
  return safeUser;
}

export function createDemoSessionFromUser(user) {
  const safeUser = sanitizeDemoUser(user);

  if (!safeUser?.id) {
    throw new Error("Usuario demo invalido.");
  }

  return {
    token: `demo-token-${safeUser.id}`,
    refreshToken: "",
    user: safeUser
  };
}

export function createDemoSession(accountKey) {
  const account = getDemoAccountByKey(accountKey);

  if (!account) {
    throw new Error(`Perfil demo desconhecido: ${accountKey}`);
  }

  return createDemoSessionFromUser(account.user);
}
