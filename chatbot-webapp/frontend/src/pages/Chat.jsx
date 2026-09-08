import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircleHeart, Send, LogOut, UserRound } from "lucide-react";
import dayjs from "dayjs";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../lib/api";
import CategoryButtons from "../components/CategoryButtons.jsx";
import logo from "../assets/logo.png";

export default function Chat() {
  const { user, messages, addMessages, logout } = useAuth();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendContent(content) {
    const trimmed = content.trim();
    if (!trimmed || sending) return;
    setError("");
    setSending(true);

    // Show the user's message immediately for a responsive feel.
    const optimisticUserMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    addMessages([optimisticUserMessage]);
    setDraft("");

    try {
      const { data } = await api.post("/messages", { content: trimmed });
      // Replace with the server's canonical pair once it responds.
      addMessages([data.data.assistantMessage].filter(Boolean));
    } catch (err) {
      setError(err?.response?.data?.message || "Your message couldn't be sent. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendContent(draft);
  }

  return (
    <div className="flex min-h-screen justify-center bg-paper px-4 py-6 font-sans sm:py-10">
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-xl2 border border-line bg-white shadow-soft">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-tint">
              <img
                src={logo}
                alt="Ashraya"
                className="h-7 w-7 object-contain"
              />
            </div>
            <div>
              <h1 className="font-display text-lg leading-tight text-ink">Ashraya</h1>
              <p className="text-xs text-muted">{user?.name || "Your conversation"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link
              to="/profile"
              className="rounded-full p-2 text-muted transition-colors hover:bg-sand hover:text-ink"
              aria-label="View profile"
            >
              <UserRound size={18} />
            </Link>
            <button
              type="button"
              onClick={logout}
              className="rounded-full p-2 text-muted transition-colors hover:bg-sand hover:text-ink"
              aria-label="Log out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-6" style={{ maxHeight: "65vh" }}>
          {messages.length === 0 && (
            <p className="py-10 text-center text-sm text-muted">
              Start the conversation whenever you're ready. There's no rush.
            </p>
          )}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </div>

        {/* Composer */}
        <div className="border-t border-line px-5 py-4">
          {error && <p className="mb-3 text-sm text-[#B65C4A]">{error}</p>}
          <form onSubmit={handleSubmit} className="mb-4 flex items-center gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type your message…"
              className="flex-1 rounded-full border border-line bg-paper/50 px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal focus:bg-white"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="inline-flex items-center gap-1.5 rounded-full bg-teal px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={15} />
              Send
            </button>
          </form>
          <CategoryButtons onSelect={sendContent} disabled={sending} />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${isUser ? "bg-teal text-white" : "bg-sand text-ink"}`}>
        <p className="text-sm leading-relaxed">{message.content}</p>
        <p className={`mt-1 text-[11px] ${isUser ? "text-white/70" : "text-muted"}`}>
          {dayjs(message.createdAt).format("h:mm A")}
        </p>
      </div>
    </div>
  );
}
