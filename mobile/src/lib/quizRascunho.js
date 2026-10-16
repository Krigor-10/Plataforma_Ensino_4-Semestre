import AsyncStorage from "@react-native-async-storage/async-storage";
import { readSession } from "./session.js";

const CHAVE_RASCUNHO_AVALIACAO = "edtech.rascunhoAvaliacao";

/* Rascunho de tentativa em andamento — persistido no AsyncStorage pra
   sobreviver a fechar o modal/app/navegar pra outra tela. Mesma logica do
   web (ver CHAVE_RASCUNHO_AVALIACAO em frontend/SecoesAluno.jsx): nao existe
   conceito de "tentativa em andamento" no backend (a TentativaAvaliacao so
   e criada no envio final, atomicamente), entao reabrir a mesma avaliacao
   nunca cria uma tentativa nova por si so; o rascunho so evita perder as
   respostas que o aluno ja tinha dado. Escopado por usuario e invalidado se
   o numero de tentativas ja usadas no servidor mudou desde que foi salvo
   (ex.: enviada por outro dispositivo). */

async function montarChaveRascunho(avaliacaoId) {
  const sessao = await readSession();
  const usuarioId = sessao?.user?.id;
  return usuarioId ? `${CHAVE_RASCUNHO_AVALIACAO}.${usuarioId}.${avaliacaoId}` : null;
}

async function lerRascunhoAvaliacao(avaliacaoId) {
  const chave = await montarChaveRascunho(avaliacaoId);
  if (!chave) {
    return null;
  }

  try {
    const bruto = await AsyncStorage.getItem(chave);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

export async function salvarRascunhoAvaliacao(avaliacaoId, dados) {
  const chave = await montarChaveRascunho(avaliacaoId);
  if (!chave) {
    return;
  }

  try {
    await AsyncStorage.setItem(chave, JSON.stringify(dados));
  } catch {
    // AsyncStorage indisponivel/quota - progresso fica so em memoria.
  }
}

export async function removerRascunhoAvaliacao(avaliacaoId) {
  const chave = await montarChaveRascunho(avaliacaoId);
  if (!chave) {
    return;
  }

  try {
    await AsyncStorage.removeItem(chave);
  } catch {
    // ignora
  }
}

export async function rascunhoAvaliacaoValido(avaliacao) {
  const rascunho = await lerRascunhoAvaliacao(avaliacao.id);
  if (!rascunho) {
    return null;
  }

  const tentativasAtuais = avaliacao.tentativasRealizadas || 0;
  return rascunho.tentativasRealizadasNoMomento === tentativasAtuais ? rascunho : null;
}
