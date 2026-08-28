import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "usuarioLogado";

export async function readSession() {
  try {
    const [token, refreshToken, storedUser] = await Promise.all([
      AsyncStorage.getItem(TOKEN_KEY),
      AsyncStorage.getItem(REFRESH_TOKEN_KEY),
      AsyncStorage.getItem(USER_KEY)
    ]);

    return {
      token: token || "",
      refreshToken: refreshToken || "",
      user: storedUser ? JSON.parse(storedUser) : null
    };
  } catch {
    return { token: "", refreshToken: "", user: null };
  }
}

export async function persistSession(session) {
  await AsyncStorage.setItem(TOKEN_KEY, session.token);
  await AsyncStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken || "");
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export async function clearSession() {
  await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
}
