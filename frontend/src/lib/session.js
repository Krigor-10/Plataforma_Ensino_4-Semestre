import { createSessionStore } from "../../../shared/session.js";
import { webStorage } from "./webStorage.js";

export const { readSession, persistSession, clearSession } = createSessionStore(webStorage);
