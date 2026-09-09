import { criarRespostasIniciais, obterDisponibilidadeAvaliacao } from "../avaliacoes.js";

describe("criarRespostasIniciais", () => {
  it("cria uma resposta vazia por questao, indexada pelo id", () => {
    const questoes = [{ id: 10 }, { id: 20 }];
    expect(criarRespostasIniciais(questoes)).toEqual({
      10: { questaoId: 10, alternativaId: null, respostaTexto: "" },
      20: { questaoId: 20, alternativaId: null, respostaTexto: "" }
    });
  });

  it("retorna objeto vazio para lista vazia", () => {
    expect(criarRespostasIniciais([])).toEqual({});
  });
});

describe("obterDisponibilidadeAvaliacao", () => {
  const base = {
    totalQuestoes: 5,
    tentativasRestantes: 1,
    dataAbertura: null,
    dataFechamento: null
  };

  it("bloqueia quando nao ha questoes publicadas", () => {
    const resultado = obterDisponibilidadeAvaliacao({ ...base, totalQuestoes: 0 });
    expect(resultado).toMatchObject({ podeRealizar: false, label: "Sem questoes" });
  });

  it("bloqueia quando as tentativas se esgotaram", () => {
    const resultado = obterDisponibilidadeAvaliacao({ ...base, tentativasRestantes: 0 });
    expect(resultado).toMatchObject({ podeRealizar: false, label: "Concluida" });
  });

  it("bloqueia quando a avaliacao ainda nao abriu", () => {
    const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const resultado = obterDisponibilidadeAvaliacao({ ...base, dataAbertura: amanha });
    expect(resultado).toMatchObject({ podeRealizar: false, label: "Agendada" });
  });

  it("bloqueia quando o periodo ja fechou", () => {
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const resultado = obterDisponibilidadeAvaliacao({ ...base, dataFechamento: ontem });
    expect(resultado).toMatchObject({ podeRealizar: false, label: "Encerrada" });
  });

  it("libera quando nada impede", () => {
    const resultado = obterDisponibilidadeAvaliacao(base);
    expect(resultado).toMatchObject({ podeRealizar: true, label: "Disponivel" });
  });
});
