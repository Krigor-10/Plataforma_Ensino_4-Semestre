import { createSessionStore } from "../../../shared/session.js";
import { secureStorage } from "./secureStorage.js";

export const { readSession, persistSession, clearSession } = createSessionStore(secureStorage);
