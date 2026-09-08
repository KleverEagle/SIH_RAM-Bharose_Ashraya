import { createContext, useContext, useEffect, useState, useCallback } from "react";
import Cookies from "js-cookie";
import api from "../lib/api";

const AuthContext = createContext(null);

const COOKIE_OPTS = { expires: 7, sameSite: "lax" };

function readJSONCookie(name) {
  const raw = Cookies.get(name);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readJSONCookie("user"));
  const [token, setToken] = useState(() => Cookies.get("auth_token") || null);
  const [conversation, setConversation] = useState(() => readJSONCookie("conversation"));
  const [messages, setMessages] = useState(() => readJSONCookie("messages") || []);
  const [initializing, setInitializing] = useState(true);

  // Keep cookies in sync whenever state changes.
  useEffect(() => {
    if (token) Cookies.set("auth_token", token, COOKIE_OPTS);
    else Cookies.remove("auth_token");
  }, [token]);

  useEffect(() => {
    if (user) Cookies.set("user", JSON.stringify(user), COOKIE_OPTS);
    else Cookies.remove("user");
  }, [user]);

  useEffect(() => {
    if (conversation) Cookies.set("conversation", JSON.stringify(conversation), COOKIE_OPTS);
    else Cookies.remove("conversation");
  }, [conversation]);

  useEffect(() => {
    if (messages) Cookies.set("messages", JSON.stringify(messages), COOKIE_OPTS);
    else Cookies.remove("messages");
  }, [messages]);

  // On app load, if a token exists, confirm it's still valid and refresh the user.
  useEffect(() => {
    async function verify() {
      if (!Cookies.get("auth_token")) {
        setInitializing(false);
        return;
      }
      try {
        const { data } = await api.get("/auth/me");
        setUser(data.data);
      } catch {
        setToken(null);
        setUser(null);
        setConversation(null);
        setMessages([]);
      } finally {
        setInitializing(false);
      }
    }
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (username, password) => {
    const { data } = await api.post("/auth/login", { username, password });

    const { token, user } = data.data;
    Cookies.set("auth_token", token, COOKIE_OPTS);

    setToken(token);
    setUser(user);

    // Prefetch the conversation and its messages so the chat is ready immediately.
    try {
      const [convoRes, messagesRes] = await Promise.all([
        api.get("/conversation"),
        api.get("/messages"),
      ]);
      setConversation(convoRes.data.data);
      setMessages(messagesRes.data.data.messages || []);
    } catch {
      setConversation(null);
      setMessages([]);
    }

    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Even if the request fails, proceed to clear local session state.
    }
    setToken(null);
    setUser(null);
    setConversation(null);
    setMessages([]);
    Cookies.remove("auth_token");
    Cookies.remove("user");
    Cookies.remove("conversation");
    Cookies.remove("messages");
  }, []);

  const updateProfile = useCallback((updatedUser) => {
    setUser(updatedUser);
  }, []);

  const addMessages = useCallback((newMessages) => {
    setMessages((prev) => [...prev, ...newMessages]);
  }, []);

  const value = {
    user,
    token,
    conversation,
    messages,
    initializing,
    isAuthenticated: Boolean(token),
    login,
    logout,
    updateProfile,
    addMessages,
    setMessages,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
