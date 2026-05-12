import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Button from "../components/ui/Button";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--app-text)]">AI-WAF</h1>
            <p className="text-sm text-[var(--app-text-muted)]">Dashboard access</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={toggleTheme}>
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>

        <section className="panel p-6">
          <h2 className="text-xl font-bold text-[var(--app-text)]">Sign in</h2>
          <p className="mt-1 text-sm text-[var(--app-text-muted)]">
            Use the admin account configured on the backend.
          </p>

          {error && (
            <div className="mt-5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-[var(--app-danger)]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label">Username</label>
              <input
                className="input"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Login;
