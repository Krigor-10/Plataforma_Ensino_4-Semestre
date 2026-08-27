import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "token";
const USER_KEY = "usuarioLogado";

export async function readSession() {
  try {
    const [token, storedUser] = await Promise.all([
      AsyncStorage.getItem(TOKEN_KEY),
      AsyncStorage.getItem(USER_KEY)
    ]);

    return {
      token: token || "",
      user: storedUser ? JSON.parse(storedUser) : null
    };
  } catch {
    return { token: "", user: null };
  }
}

export async function persistSession(session) {
  await AsyncStorage.setItem(TOKEN_KEY, session.token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export async function clearSession() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}
