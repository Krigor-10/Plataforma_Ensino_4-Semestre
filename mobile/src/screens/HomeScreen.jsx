import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { apiRequest } from "../lib/api.js";

export default function HomeScreen({ onLogout, usuario }) {
  const [cursos, setCursos] = useState([]);
  const [status, setStatus] = useState("loading");
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ignore = false;

    apiRequest("/Cursos")
      .then((resposta) => {
        if (!ignore) {
          setCursos(resposta || []);
          setStatus("ready");
        }
      })
      .catch((err) => {
        if (!ignore) {
          setErro(err.message || "Nao foi possivel carregar os cursos.");
          setStatus("error");
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.cabecalho}>
        <View>
          <Text style={styles.saudacao}>Ola, {usuario.nome}</Text>
          <Text style={styles.perfil}>{usuario.tipoUsuario}</Text>
        </View>
        <TouchableOpacity onPress={onLogout}>
          <Text style={styles.sair}>Sair</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.tituloSecao}>Cursos disponiveis</Text>

      {status === "loading" ? <ActivityIndicator color="#7b2ff7" style={{ marginTop: 24 }} /> : null}
      {status === "error" ? <Text style={styles.erro}>{erro}</Text> : null}

      {status === "ready" ? (
        <FlatList
          data={cursos}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.cartao}>
              <Text style={styles.cartaoTitulo}>{item.titulo}</Text>
              <Text style={styles.cartaoCodigo}>{item.codigoRegistro}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.vazio}>Nenhum curso cadastrado ainda.</Text>}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#191221",
    paddingHorizontal: 20,
    paddingTop: 60
  },
  cabecalho: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24
  },
  saudacao: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700"
  },
  perfil: {
    color: "#a89fb3",
    marginTop: 2
  },
  sair: {
    color: "#f87171",
    fontWeight: "600"
  },
  tituloSecao: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12
  },
  cartao: {
    backgroundColor: "#241a30",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#7b2ff7"
  },
  cartaoTitulo: {
    color: "#fff",
    fontWeight: "600",
    marginBottom: 4
  },
  cartaoCodigo: {
    color: "#a89fb3",
    fontSize: 12
  },
  vazio: {
    color: "#a89fb3",
    textAlign: "center",
    marginTop: 24
  },
  erro: {
    color: "#f87171",
    marginTop: 24,
    textAlign: "center"
  }
});
