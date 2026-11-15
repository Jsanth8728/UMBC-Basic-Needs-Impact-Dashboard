
import { useEffect, useState } from "react";
import "./LoginPage.css";
import { login } from "../utils/auth.js";

export default function LoginPage({ onLogIn }) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Log In | UMBC Basic Needs";
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const session = await login(userId.trim(), password);
      onLogIn(session);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-container">
        <section className="login-card" aria-labelledby="login-heading">
          <div className="login-heading-row">
            <h1 id="login-heading">Log In</h1>
          </div>
          <form onSubmit={handleSubmit} aria-busy={loading}>
            <label htmlFor="login-username">Campus ID</label>
            <input id="login-username" name="username" type="text" autoComplete="username"
              autoCapitalize="none" spellCheck={false} required maxLength={30}
              value={userId} onChange={event => setUserId(event.target.value)} disabled={loading} />
            <label htmlFor="login-password">Password</label>
            <input id="login-password" name="password" type="password" autoComplete="current-password"
              required maxLength={1024} value={password}
              onChange={event => setPassword(event.target.value)} disabled={loading} />
            {error && <p className="login-error" role="alert">{error}</p>}
            <div className="login-actions">
              <button type="submit" disabled={loading}>{loading ? "Logging in…" : "Log In"}</button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
