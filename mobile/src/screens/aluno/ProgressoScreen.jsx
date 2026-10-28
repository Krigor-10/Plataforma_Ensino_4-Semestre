import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { BackHandler, ScrollView, StyleSheet, Text, View } from "react-native";
import CartaoCursoAtivo from "../../components/CartaoCursoAtivo.jsx";
import ProgressoCircular from "../../components/ProgressoCircular.jsx";
import { agruparConteudosPorCurso } from "../../lib/conteudos.js";
import { formatGrade, formatPercent } from "../../lib/format.js";
import { cores, espacamentos, raios, tipografia } from "../../lib/theme.js";
import SeletorCurso from "../../components/SeletorCurso.jsx";

// Mesmo valor usado em AvaliacoesScreen.jsx/CertificadoService.
// ObterPendenciasAsync - so pra marcar o requisito "Media >= 7,00" abaixo.
// O card so mostra os 2 requisitos conhecidos aqui (progresso+media); a
// verdade sobre o certificado estar liberado (que pode depender de mais
// pendencias, tipo prova sem correcao) continua exclusiva da aba
// Certificados (GET /Certificados/status) - nunca recalculada aqui.
const NOTA_MINIMA_APROVACAO = 7;

/* Progresso do Aluno segue o mesmo contexto Curso->conteudo ja usado em
   Avaliacoes/Conteudos: primeiro o aluno escolhe o curso (mesmo cartao
   CapaCurso+titulo+borda esquerda da Home), so depois ve o progresso
   daquele curso — evita misturar KPIs de cursos diferentes na mesma tela.
   Estado local (cursoSelecionadoId), sem Navigator novo.

   Modulos continuam compactos: so nome->progresso->check (reaproveita
   agruparConteudosPorCurso, mesma funcao que ConteudosScreen.jsx ja usa);
   Progresso tem finalidade diferente de Conteudos (evolucao, nao navegacao
   pelos materiais), entao NAO repete tipo de material nem status por item
   aqui — esse detalhamento continua exclusivo da aba Conteudos. */
export default function ProgressoScreen({ snapshot }) {
  const [cursoSelecionadoId, setCursoSelecionadoId] = useState(null);

  // Mesmo ajuste de ConteudosScreen.jsx/AvaliacoesScreen.jsx: curso
  // selecionado e estado local, nao rota — sem isso o voltar fisico do
  // Android pulava direto pra fora da aba em vez de voltar pra selecao
  // de curso.
  useEffect(() => {
    if (!cursoSelecionadoId) {
      return undefined;
    }

    const assinatura = BackHandler.addEventListener("hardwareBackPress", () => {
      setCursoSelecionadoId(null);
      return true;
    });

    return () => assinatura.remove();
  }, [cursoSelecionadoId]);

  const cursoPorId = useMemo(() => new Map(snapshot.cursos.map((curso) => [curso.id, curso])), [snapshot.cursos]);

  const progressosPorCurso = useMemo(
    () =>
      [...(snapshot.progressos.cursos || [])].sort((a, b) => {
        const tituloA = cursoPorId.get(a.cursoId)?.titulo || "";
        const tituloB = cursoPorId.get(b.cursoId)?.titulo || "";
        return tituloA.localeCompare(tituloB);
      }),
    [cursoPorId, snapshot.progressos.cursos]
  );

  const gruposPorCursoId = useMemo(() => {
    const grupos = agruparConteudosPorCurso({
      avaliacoes: snapshot.avaliacoes,
      conteudos: snapshot.conteudos,
      cursos: snapshot.cursos,
      matriculas: snapshot.matriculas,
      modulos: snapshot.modulos,
      progressos: snapshot.progressos
    });
    return new Map(grupos.map((grupo) => [grupo.id, grupo]));
  }, [snapshot]);

  if (progressosPorCurso.length === 0) {
    return (
      <View style={estilos.container}>
        <Text style={estilos.vazio}>Assim que sua matrícula for aprovada e você começar a trilha, seu progresso aparecerá aqui.</Text>
      </View>
    );
  }

  if (!cursoSelecionadoId) {
    return (
      <View style={estilos.container}>
        <SeletorCurso
          accessibilityLabelPrefix="Ver progresso de"
          itens={progressosPorCurso.map((progresso) => ({ curso: cursoPorId.get(progresso.cursoId), id: progresso.cursoId }))}
          onSelecionar={setCursoSelecionadoId}
        />
      </View>
    );
  }

  const progresso = progressosPorCurso.find((item) => item.cursoId === cursoSelecionadoId);
  const curso = cursoPorId.get(cursoSelecionadoId);
  const grupo = gruposPorCursoId.get(cursoSelecionadoId);
  const tituloCursoAtivo = curso?.titulo || `Curso #${cursoSelecionadoId}`;

  const percentualGeral = Math.max(0, Math.min(Number(progresso?.percentualConclusao) || 0, 100));
  const mediaCurso = Number(progresso?.mediaCurso) || 0;
  // Dois requisitos conhecidos do certificado - ver nota em NOTA_MINIMA_
  // APROVACAO acima: isso e so um checklist informativo com dados reais,
  // nunca um veredito de "certificado liberado" (isso e so da aba
  // Certificados).
  const progressoAtingido = percentualGeral >= 100;
  const mediaAtingida = mediaCurso >= NOTA_MINIMA_APROVACAO;

  return (
    <View style={estilos.container}>
      <Text style={estilos.tituloTela}>Progresso</Text>
      <Text style={estilos.subtituloTela}>Acompanhamento da sua evolução acadêmica</Text>

      <CartaoCursoAtivo onTrocar={() => setCursoSelecionadoId(null)} titulo={tituloCursoAtivo} />

      <ScrollView contentContainerStyle={estilos.corpo}>
        <View style={estilos.cartaoAnel}>
          <ProgressoCircular espessura={8} percentual={percentualGeral} size={140} />
          <Text style={estilos.anelRotulo}>Progresso Geral</Text>

          <View style={estilos.statsLinha}>
            <View style={estilos.statCartao}>
              <View style={estilos.statIcone}>
                <Ionicons color={cores.destaque} name="star-outline" size={16} />
              </View>
              <Text style={estilos.statValor}>
                {mediaCurso > 0 ? formatGrade(mediaCurso) : "-"} <Text style={estilos.statValorUnidade}>/ 10</Text>
              </Text>
              <Text style={estilos.statRotulo}>Desempenho</Text>
            </View>
            <View style={estilos.statCartao}>
              <View style={estilos.statIcone}>
                <Ionicons color={cores.destaque} name="layers-outline" size={16} />
              </View>
              <Text style={estilos.statValor}>
                {progresso?.modulosConcluidos || 0} <Text style={estilos.statValorUnidade}>de {progresso?.totalModulos || 0}</Text>
              </Text>
              <Text style={estilos.statRotulo}>Concluídos</Text>
            </View>
          </View>
        </View>

        <View style={estilos.cartaoCertificado}>
          <View style={estilos.certificadoCabecalho}>
            <View style={estilos.certificadoIcone}>
              <Ionicons color={cores.destaque} name="ribbon-outline" size={18} />
            </View>
            <View style={estilos.certificadoTextos}>
              <Text style={estilos.certificadoTitulo}>Certificado do Curso</Text>
              <Text style={estilos.certificadoDescricao}>
                Seu certificado é liberado automaticamente com progresso 100% e média final ≥ 7,00.
              </Text>
            </View>
          </View>

          <RequisitoLinha
            atingido={progressoAtingido}
            rotulo={`Progresso ${formatPercent(percentualGeral)} de 100%`}
          />
          <RequisitoLinha
            atingido={mediaAtingida}
            rotulo={`Média ${mediaCurso > 0 ? formatGrade(mediaCurso) : "-"} ≥ ${formatGrade(NOTA_MINIMA_APROVACAO)}`}
          />
        </View>

        <View style={estilos.modulosCabecalho}>
          <Text style={estilos.tituloSecao}>Módulos</Text>
          {grupo ? <Text style={estilos.modulosContagem}>{grupo.modulos.length} módulo(s)</Text> : null}
        </View>

        <View style={estilos.modulosLista}>
          {!grupo || grupo.modulos.length === 0 ? (
            <Text style={estilos.vazioModulo}>Nenhum módulo publicado neste curso ainda.</Text>
          ) : (
            grupo.modulos.map((modulo) => {
              const totalConteudos = modulo.conteudos.length;
              const moduloConcluido = totalConteudos > 0 && modulo.concluidos === totalConteudos;
              const percentualModulo = totalConteudos > 0 ? (modulo.concluidos / totalConteudos) * 100 : 0;
              const moduloPill = modulo.bloqueado
                ? { cor: cores.textoSuave, corFundo: cores.fundoCartaoAtivo, icone: "lock-closed", rotulo: "Bloqueado" }
                : moduloConcluido
                  ? { cor: cores.sucesso, corFundo: cores.sucessoFundo, icone: "checkmark-circle", rotulo: "Módulo concluído" }
                  : { cor: cores.destaque, corFundo: cores.bordaCartao, icone: "ellipse", rotulo: "Em andamento" };

              return (
                <View
                  accessibilityLabel={`${modulo.titulo}. ${moduloPill.rotulo}. ${modulo.concluidos} de ${totalConteudos} conteúdos concluídos.`}
                  accessible
                  key={modulo.id}
                  style={[estilos.modulo, modulo.bloqueado ? estilos.moduloBloqueado : null]}
                >
                  <View style={estilos.moduloTopo}>
                    <Text numberOfLines={1} style={[estilos.moduloEyebrow, modulo.bloqueado ? { color: cores.textoSuave } : null]}>
                      MÓDULO
                    </Text>
                    <View style={[estilos.pill, { backgroundColor: moduloPill.corFundo }]}>
                      <Ionicons color={moduloPill.cor} name={moduloPill.icone} size={11} />
                      <Text style={[estilos.pillTexto, { color: moduloPill.cor }]}>{moduloPill.rotulo}</Text>
                    </View>
                  </View>
                  <Text numberOfLines={2} style={[estilos.moduloTitulo, modulo.bloqueado ? { color: cores.textoSuave } : null]}>
                    {modulo.titulo}
                  </Text>
                  <View style={estilos.moduloProgressoLinha}>
                    <Text style={estilos.moduloProgressoRotulo}>Conclusão</Text>
                    <Text style={estilos.moduloProgressoValor}>{Math.round(percentualModulo)}%</Text>
                  </View>
                  <View style={estilos.barraFundoFina}>
                    <View
                      style={[
                        estilos.barraPreenchidaFina,
                        { width: `${percentualModulo}%`, backgroundColor: moduloConcluido ? cores.sucesso : cores.destaque }
                      ]}
                    />
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function RequisitoLinha({ atingido, rotulo }) {
  return (
    <View accessibilityLabel={`${rotulo}. ${atingido ? "Atingido" : "Pendente"}.`} accessible style={estilos.requisitoLinha}>
      <View style={estilos.requisitoTextos}>
        <Ionicons
          color={atingido ? cores.sucesso : cores.textoSuave}
          name={atingido ? "checkmark-circle" : "ellipse-outline"}
          size={16}
        />
        <Text numberOfLines={1} style={[estilos.requisitoTexto, atingido ? { color: cores.texto } : null]}>{rotulo}</Text>
      </View>
      <Text style={[estilos.requisitoEstado, { color: atingido ? cores.sucesso : cores.textoSuave }]}>
        {atingido ? "Atingido" : "Pendente"}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  tituloTela: { color: cores.texto, fontWeight: "700", fontSize: tipografia.titulo, paddingHorizontal: espacamentos.xl, paddingTop: espacamentos.xl },
  subtituloTela: { color: cores.textoRotulo, fontSize: tipografia.rotulo, paddingHorizontal: espacamentos.xl, marginTop: 2 },
  corpo: { padding: espacamentos.xl, paddingTop: espacamentos.md, gap: espacamentos.md },
  cartaoAnel: {
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    paddingVertical: espacamentos.xl,
    alignItems: "center"
  },
  anelRotulo: { color: cores.textoSuave, fontSize: tipografia.rotulo, marginTop: espacamentos.sm },
  statsLinha: { flexDirection: "row", gap: espacamentos.sm, marginTop: espacamentos.lg, width: "100%", paddingHorizontal: espacamentos.lg },
  statCartao: {
    flex: 1,
    alignItems: "center",
    backgroundColor: cores.fundoCartaoAtivo,
    borderRadius: raios.md,
    paddingVertical: espacamentos.md
  },
  statIcone: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: cores.bordaCartao,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6
  },
  statValor: { color: cores.texto, fontWeight: "800", fontSize: tipografia.subtitulo },
  statValorUnidade: { color: cores.textoSuave, fontWeight: "600", fontSize: tipografia.rotulo },
  statRotulo: { color: cores.textoSuave, fontSize: tipografia.legenda, marginTop: 2 },
  cartaoCertificado: {
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    padding: espacamentos.lg,
    gap: espacamentos.sm
  },
  certificadoCabecalho: { flexDirection: "row", gap: espacamentos.sm, marginBottom: espacamentos.xs },
  certificadoIcone: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: cores.fundoCartaoAtivo,
    alignItems: "center",
    justifyContent: "center"
  },
  certificadoTextos: { flex: 1 },
  certificadoTitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.rotulo },
  certificadoDescricao: { color: cores.textoSuave, fontSize: tipografia.legenda, marginTop: 2, lineHeight: 16 },
  requisitoLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: espacamentos.sm,
    borderTopWidth: 1,
    borderTopColor: cores.divisoria
  },
  requisitoTextos: { flexDirection: "row", alignItems: "center", gap: espacamentos.sm, flex: 1 },
  requisitoTexto: { color: cores.textoSuave, fontSize: tipografia.rotulo, flexShrink: 1 },
  requisitoEstado: { fontSize: tipografia.legenda, fontWeight: "700" },
  modulosCabecalho: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: espacamentos.sm },
  tituloSecao: { color: cores.texto, fontWeight: "700", fontSize: tipografia.subtitulo },
  modulosContagem: { color: cores.textoSuave, fontSize: tipografia.rotulo },
  modulosLista: { gap: espacamentos.sm },
  modulo: {
    backgroundColor: cores.fundoCartao,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.bordaCartao,
    padding: espacamentos.md
  },
  moduloBloqueado: { opacity: 0.7 },
  moduloTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  moduloEyebrow: { color: cores.destaque, fontSize: tipografia.legenda, fontWeight: "700", letterSpacing: 0.5 },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: raios.pilula, paddingHorizontal: espacamentos.sm, paddingVertical: 3 },
  pillTexto: { fontSize: tipografia.legenda, fontWeight: "700" },
  moduloTitulo: { color: cores.texto, fontWeight: "700", fontSize: tipografia.rotulo, marginTop: 4, marginBottom: espacamentos.sm },
  moduloProgressoLinha: { flexDirection: "row", justifyContent: "space-between" },
  moduloProgressoRotulo: { color: cores.textoSuave, fontSize: tipografia.legenda },
  moduloProgressoValor: { color: cores.textoSuave, fontSize: tipografia.legenda, fontWeight: "700" },
  barraFundoFina: { height: 6, borderRadius: raios.sm, backgroundColor: cores.bordaCartao, overflow: "hidden", marginTop: 4 },
  barraPreenchidaFina: { height: 6, borderRadius: raios.sm },
  vazioModulo: { color: cores.textoSuave, fontSize: 12, fontStyle: "italic" },
  vazio: { color: cores.textoSuave, textAlign: "center", marginTop: 40, paddingHorizontal: 24 }
});
