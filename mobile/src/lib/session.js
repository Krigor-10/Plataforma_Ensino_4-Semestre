import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSessionStore } from "../../../shared/session.js";

export const { readSession, persistSession, clearSession } = createSessionStore(AsyncStorage);
