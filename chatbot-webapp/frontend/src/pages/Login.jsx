import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import logo from "../assets/logo.png";

export default function Login() {
  const { login, isAuthenticated, initializing } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!initializing && isAuthenticated) {
    return <Navigate to="/chat" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("Enter your username and password to continue.");
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
      navigate("/chat", { replace: true });
    } catch (err) {
      setError(
        err?.response?.data?.message || "We couldn't sign you in. Check your details and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-10 font-sans">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex justify-center">
          <img
            src={logo}
            alt="Ashraya"
            className="h-25 w-25 object-contain"
          />
        </div>
        <form onSubmit={handleSubmit} className="rounded-xl2 border border-line bg-white p-6 shadow-soft">
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-ink">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-line bg-paper/40 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal focus:bg-white"
                placeholder="e.g. jane.doe"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-line bg-paper/40 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal focus:bg-white"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-[#B65C4A]/10 px-3 py-2 text-sm text-[#B65C4A]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-teal px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-muted">
          Everything you share here stays between you and your support team.
        </p>
      </div>
    </div>
  );
}
