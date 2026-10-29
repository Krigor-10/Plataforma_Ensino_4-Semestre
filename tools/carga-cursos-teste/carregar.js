#!/usr/bin/env node
// Script de carga dos 3 cursos de teste (ver docs/teste-usabilidade/PROMPT-agente-carga-cursos-teste.md).
// So Node nativo (fetch/FormData/fs do Node 20+), zero dependencia.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACOTE_DIR = join(__dirname, "..", "..", "docs", "teste-usabilidade", "cursos");

const MODELO_CURSO = { Gratuito: 1, PagoPacote: 2, Acompanhado: 3 };
const TIPO_CONTEUDO = { Pdf: 2, Imagem: 5 };
const TIPO_QUESTAO = { MultiplaEscolha: 1, VerdadeiroFalso: 2, Dissertativa: 3, AfirmativasCombinadas: 4 };
const TIPO_AVALIACAO = { Quiz: 1, Prova: 2, Exercicio: 3 };
const STATUS_PUBLICACAO = { Rascunho: 1, Publicado: 2, Arquivado: 3 };

function env(nome) {
  const valor = process.env[nome];
  if (!valor) {
    throw new Error(`Variavel de ambiente ${nome} nao definida.`);
  }
  return valor;
}

function parseArgs(argv) {
  const cursoArgIndex = argv.indexOf("--curso");
  return {
    aplicar: argv.includes("--aplicar"),
    curso: cursoArgIndex >= 0 ? argv[cursoArgIndex + 1] : null
  };
}

async function api(baseUrl, token, method, caminho, corpo) {
  const resposta = await fetch(`${baseUrl}/api/v1${caminho}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(corpo !== undefined ? { "Content-Type": "application/json" } : {})
    },
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined
  });

  if (!resposta.ok) {
    const corpoErro = await resposta.text();
    throw new Error(`${method} ${caminho} -> ${resposta.status}: ${corpoErro.slice(0, 500)}`);
  }

  if (resposta.status === 204) {
    return null;
  }

  return resposta.json();
}

async function apiUpload(baseUrl, token, caminho, campos) {
  const formData = new FormData();
  for (const [chave, valor] of Object.entries(campos)) {
    if (valor instanceof Uint8Array) {
      formData.append(chave, new Blob([valor]), campos.__nomeArquivo || "arquivo");
    } else if (valor !== undefined && valor !== null) {
      formData.append(chave, String(valor));
    }
  }

  const resposta = await fetch(`${baseUrl}/api/v1${caminho}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });

  if (!resposta.ok) {
    const corpoErro = await resposta.text();
    throw new Error(`POST ${caminho} (upload) -> ${resposta.status}: ${corpoErro.slice(0, 500)}`);
  }

  return resposta.json();
}

function lerArquivo(caminhoRelativo) {
  return readFileSync(join(PACOTE_DIR, caminhoRelativo));
}

function nomeArquivo(caminhoRelativo) {
  return caminhoRelativo.split("/").pop();
}

function mapearAlternativa(a) {
  return { letra: a.letra, texto: a.texto, ehCorreta: a.ehCorreta, justificativa: a.justificativa || "" };
}

function mapearAfirmativa(a) {
  return { numero: a.numero, texto: a.texto, ehCorreta: a.ehCorreta, justificativa: a.justificativa || "" };
}

function mapearQuestao(q) {
  return {
    tituloInterno: q.tituloInterno,
    contexto: q.contexto || "",
    enunciado: q.enunciado,
    tipoQuestao: TIPO_QUESTAO[q.tipoQuestao],
    tema: q.tema || "",
    subtema: q.subtema || "",
    dificuldade: q.dificuldade,
    explicacaoPosResposta: q.explicacaoPosResposta || "",
    referenciasBibliograficas: q.referenciasBibliograficas || "",
    pontos: q.pontos,
    alternativas: (q.alternativas || []).map(mapearAlternativa),
    afirmativas: (q.afirmativas || []).map(mapearAfirmativa)
  };
}

async function garantirCurso(ctx, curso) {
  const existentes = await api(ctx.baseUrl, ctx.tokenAdmin, "GET", "/Cursos");
  const existente = existentes.find((c) => c.titulo === curso.titulo);

  if (existente) {
    ctx.log(`  curso "${curso.titulo}": reaproveitado (id=${existente.id})`);
    return { id: existente.id, novo: false, imagemUrl: existente.imagemUrl };
  }

  ctx.log(`  curso "${curso.titulo}": ${ctx.aplicar ? "criando..." : "seria criado"}`);
  if (!ctx.aplicar) {
    return { id: null, novo: true, imagemUrl: null };
  }

  const criado = await api(ctx.baseUrl, ctx.tokenAdmin, "POST", "/Cursos", {
    titulo: curso.titulo,
    descricao: curso.descricao,
    preco: curso.preco,
    modeloCurso: MODELO_CURSO[curso.modeloCurso]
  });
  ctx.log(`  curso "${curso.titulo}": criado (id=${criado.id})`);
  return { id: criado.id, novo: true, imagemUrl: null };
}

async function garantirCapa(ctx, curso, cursoId, imagemUrlAtual) {
  if (!curso.imagemCapa) {
    return;
  }
  if (imagemUrlAtual) {
    ctx.log(`  capa: ja definida, pulando`);
    return;
  }
  ctx.log(`  capa: ${ctx.aplicar ? "enviando..." : "seria enviada"} (${curso.imagemCapa})`);
  if (!ctx.aplicar) {
    return;
  }
  await apiUpload(ctx.baseUrl, ctx.tokenAdmin, `/Cursos/${cursoId}/imagem`, {
    imagem: lerArquivo(curso.imagemCapa),
    __nomeArquivo: nomeArquivo(curso.imagemCapa)
  });
  ctx.log(`  capa: enviada`);
}

async function garantirModulo(ctx, cursoId, moduloJson) {
  const existentes = await api(ctx.baseUrl, ctx.tokenAdmin, "GET", `/Modulos/curso/${cursoId}`);
  const existente = existentes.find((m) => m.titulo === moduloJson.titulo);

  if (existente) {
    ctx.log(`    modulo "${moduloJson.titulo}": reaproveitado (id=${existente.id})`);
    return existente.id;
  }

  ctx.log(`    modulo "${moduloJson.titulo}": ${ctx.aplicar ? "criando..." : "seria criado"}`);
  if (!ctx.aplicar) {
    return null;
  }

  const criado = await api(ctx.baseUrl, ctx.tokenAdmin, "POST", "/Modulos", {
    titulo: moduloJson.titulo,
    cursoId
  });
  ctx.log(`    modulo "${moduloJson.titulo}": criado (id=${criado.id})`);
  return criado.id;
}

async function garantirProfessorNoCurso(ctx, cursoId) {
  const professores = await api(ctx.baseUrl, ctx.tokenAdmin, "GET", `/Cursos/${cursoId}/professores`);
  if (professores.some((p) => p.id === Number(ctx.professorId))) {
    ctx.log(`  professor: ja vinculado`);
    return;
  }

  ctx.log(`  professor: ${ctx.aplicar ? "vinculando..." : "seria vinculado"}`);
  if (!ctx.aplicar) {
    return;
  }
  await api(ctx.baseUrl, ctx.tokenAdmin, "POST", `/Cursos/${cursoId}/professores/${ctx.professorId}`);
  ctx.log(`  professor: vinculado`);
}

// TurmaService.CriarTurmaAsync ignora o NomeTurma enviado (sempre gera um nome
// padrao a partir do titulo do curso) e so permite UMA turma por curso ("turma
// padrao") - por isso a idempotencia aqui e so por cursoId, o nomeTurma do
// cursos.json e so documentacao, nao e de fato enviado/usado pra casar.
async function garantirTurma(ctx, cursoId, nomeTurmaDesejado) {
  const existentes = await api(ctx.baseUrl, ctx.tokenProfessor, "GET", "/Turmas/minhas");
  const existente = existentes.find((t) => t.cursoId === cursoId);

  if (existente) {
    ctx.log(`  turma: reaproveitada (id=${existente.id}, nome="${existente.nomeTurma}")`);
    return existente.id;
  }

  ctx.log(`  turma: ${ctx.aplicar ? "criando..." : "seria criada"}`);
  if (!ctx.aplicar) {
    return null;
  }

  const criada = await api(ctx.baseUrl, ctx.tokenAdmin, "POST", "/Turmas", {
    nomeTurma: nomeTurmaDesejado,
    cursoId,
    professorId: Number(ctx.professorId)
  });
  ctx.log(`  turma: criada (id=${criada.id}, nome="${criada.nomeTurma}")`);
  return criada.id;
}

async function garantirAula(ctx, turmaId, moduloId, aulaJson, ordemExibicao) {
  const existentes = await api(ctx.baseUrl, ctx.tokenProfessor, "GET", "/ConteudosDidaticos");
  const existente = existentes.find((c) => c.moduloId === moduloId && c.titulo === aulaJson.titulo);

  if (existente) {
    ctx.log(`      aula "${aulaJson.titulo}": reaproveitada (id=${existente.id})`);
    return existente.id;
  }

  ctx.log(`      aula "${aulaJson.titulo}": ${ctx.aplicar ? "enviando arquivo + criando..." : "seria criada"}`);
  if (!ctx.aplicar) {
    return null;
  }

  const upload = await apiUpload(ctx.baseUrl, ctx.tokenProfessor, "/ConteudosDidaticos/arquivo", {
    arquivo: lerArquivo(aulaJson.arquivo),
    __nomeArquivo: nomeArquivo(aulaJson.arquivo),
    tipoConteudo: TIPO_CONTEUDO.Pdf
  });

  const criado = await api(ctx.baseUrl, ctx.tokenProfessor, "POST", "/ConteudosDidaticos", {
    titulo: aulaJson.titulo,
    descricao: aulaJson.descricao || "",
    tipoConteudo: TIPO_CONTEUDO.Pdf,
    arquivoUrl: upload.arquivoUrl,
    turmaId,
    moduloId,
    statusPublicacao: STATUS_PUBLICACAO.Publicado,
    ordemExibicao
  });
  ctx.log(`      aula "${aulaJson.titulo}": criada (id=${criado.id})`);
  return criado.id;
}

async function garantirAvaliacao(ctx, { turmaId, moduloId, avaliacaoJson, tipoAvaliacao, tentativasPermitidas, tempoLimiteMinutos, notaMaxima }) {
  const existentes = await api(ctx.baseUrl, ctx.tokenProfessor, "GET", "/Avaliacoes");
  const existente = existentes.find(
    (a) => a.titulo === avaliacaoJson.titulo && a.turmaId === turmaId && (a.moduloId || null) === (moduloId || null)
  );

  const payloadBase = {
    titulo: avaliacaoJson.titulo,
    descricao: avaliacaoJson.descricao || "",
    turmaId,
    moduloId: moduloId || null,
    tipoAvaliacao: TIPO_AVALIACAO[tipoAvaliacao],
    tentativasPermitidas,
    tempoLimiteMinutos: tempoLimiteMinutos ?? null,
    notaMaxima
  };

  let avaliacaoId = existente?.id ?? null;
  let totalQuestoesExistente = existente?.totalQuestoes ?? 0;
  let statusAtual = existente?.statusPublicacao ?? null;

  if (existente) {
    ctx.log(`    avaliacao "${avaliacaoJson.titulo}": reaproveitada (id=${existente.id}, ${totalQuestoesExistente} questao(oes))`);
  } else {
    ctx.log(`    avaliacao "${avaliacaoJson.titulo}": ${ctx.aplicar ? "criando..." : "seria criada"}`);
    if (!ctx.aplicar) {
      return;
    }
    const criada = await api(ctx.baseUrl, ctx.tokenProfessor, "POST", "/Avaliacoes", {
      ...payloadBase,
      statusPublicacao: STATUS_PUBLICACAO.Rascunho
    });
    avaliacaoId = criada.id;
    statusAtual = STATUS_PUBLICACAO.Rascunho;
    ctx.log(`    avaliacao "${avaliacaoJson.titulo}": criada (id=${avaliacaoId})`);
  }

  if (totalQuestoesExistente > 0) {
    ctx.log(`      questoes: ja existem (${totalQuestoesExistente}), pulando lote`);
  } else {
    ctx.log(`      questoes: ${ctx.aplicar ? "enviando lote..." : `seriam enviadas ${avaliacaoJson.questoes.length}`}`);
    if (ctx.aplicar) {
      const questoesMapeadas = avaliacaoJson.questoes.map(mapearQuestao);
      const criadas = await api(ctx.baseUrl, ctx.tokenProfessor, "POST", `/Avaliacoes/${avaliacaoId}/questoes/lote`, {
        questoes: questoesMapeadas
      });
      ctx.log(`      questoes: ${criadas.length} criada(s)`);

      for (let i = 0; i < avaliacaoJson.questoes.length; i++) {
        const anexos = avaliacaoJson.questoes[i].anexos || [];
        if (anexos.length === 0) {
          continue;
        }
        const questaoBancoId = criadas[i].questaoBancoId;
        for (const anexo of anexos) {
          await apiUpload(ctx.baseUrl, ctx.tokenProfessor, `/Avaliacoes/questoes-banco/${questaoBancoId}/anexos`, {
            arquivo: lerArquivo(anexo.arquivo),
            __nomeArquivo: nomeArquivo(anexo.arquivo),
            titulo: anexo.titulo,
            tipoAnexo: TIPO_CONTEUDO.Imagem
          });
          ctx.log(`        anexo "${anexo.titulo}": enviado`);
        }
      }
    }
  }

  if (statusAtual !== STATUS_PUBLICACAO.Publicado) {
    ctx.log(`    avaliacao "${avaliacaoJson.titulo}": ${ctx.aplicar ? "publicando..." : "seria publicada"}`);
    if (ctx.aplicar) {
      await api(ctx.baseUrl, ctx.tokenProfessor, "PUT", `/Avaliacoes/${avaliacaoId}`, {
        ...payloadBase,
        statusPublicacao: STATUS_PUBLICACAO.Publicado
      });
      ctx.log(`    avaliacao "${avaliacaoJson.titulo}": publicada`);
    }
  } else {
    ctx.log(`    avaliacao "${avaliacaoJson.titulo}": ja publicada`);
  }
}

async function carregarCurso(ctx, curso) {
  ctx.log(`\n== ${curso.chave} — ${curso.titulo} ==`);

  const { id: cursoId, imagemUrl } = await garantirCurso(ctx, curso);
  await garantirCapa(ctx, curso, cursoId, imagemUrl);

  if (!ctx.aplicar && !cursoId) {
    ctx.log(`  (dry-run sem curso existente: pulando o resto da simulacao detalhada deste curso)`);
    return;
  }

  await garantirProfessorNoCurso(ctx, cursoId);
  const turmaId = await garantirTurma(ctx, cursoId, curso.turma.nomeTurma);

  for (const moduloJson of curso.modulos) {
    const moduloId = await garantirModulo(ctx, cursoId, moduloJson);
    if (!ctx.aplicar && !moduloId) {
      continue;
    }

    let ordem = 1;
    for (const aulaJson of moduloJson.aulas) {
      await garantirAula(ctx, turmaId, moduloId, aulaJson, ordem);
      ordem++;
    }

    await garantirAvaliacao(ctx, {
      turmaId,
      moduloId,
      avaliacaoJson: moduloJson.quiz,
      tipoAvaliacao: "Quiz",
      tentativasPermitidas: moduloJson.quiz.tentativasPermitidas,
      tempoLimiteMinutos: null,
      notaMaxima: 10
    });
  }

  await garantirAvaliacao(ctx, {
    turmaId,
    moduloId: null,
    avaliacaoJson: curso.avaliacaoFinal,
    tipoAvaliacao: curso.avaliacaoFinal.tipoAvaliacao,
    tentativasPermitidas: curso.avaliacaoFinal.tentativasPermitidas,
    tempoLimiteMinutos: curso.avaliacaoFinal.tempoLimiteMinutos,
    notaMaxima: curso.avaliacaoFinal.notaMaxima
  });
}

async function main() {
  const { aplicar, curso: cursoFiltro } = parseArgs(process.argv.slice(2));

  const ctx = {
    baseUrl: env("CARGA_API_URL").replace(/\/$/, ""),
    tokenAdmin: env("CARGA_TOKEN_ADMIN"),
    tokenProfessor: env("CARGA_TOKEN_PROFESSOR"),
    professorId: env("CARGA_PROFESSOR_ID"),
    aplicar,
    log: (msg) => console.log(msg)
  };

  const pacote = JSON.parse(readFileSync(join(PACOTE_DIR, "cursos.json"), "utf8"));
  const cursos = cursoFiltro ? pacote.cursos.filter((c) => c.chave === cursoFiltro) : pacote.cursos;

  if (cursos.length === 0) {
    throw new Error(`Nenhum curso encontrado com chave "${cursoFiltro}". Chaves disponiveis: ${pacote.cursos.map((c) => c.chave).join(", ")}`);
  }

  ctx.log(`Modo: ${aplicar ? "APLICAR (cria de verdade)" : "DRY-RUN (so lista)"}`);
  ctx.log(`API: ${ctx.baseUrl}`);
  ctx.log(`Cursos: ${cursos.map((c) => c.chave).join(", ")}`);

  for (const curso of cursos) {
    await carregarCurso(ctx, curso);
  }

  ctx.log(`\nConcluido.`);
}

main().catch((err) => {
  console.error(`\nErro: ${err.message}`);
  process.exitCode = 1;
});
