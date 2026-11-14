
import { useEffect, useState } from "react";
import "./LoginPage.css";

export default function LoginPage({ onLogIn }) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Log In | UMBC Basic Needs";
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Login failed.");
        return;
      }

      // Save authentication information
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("role", data.role);

      // Notify the parent component
      onLogIn(data);

    } catch (error) {
      console.error("Login error:", error);
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-container">
        <section className="login-card" aria-labelledby="login-heading">

          <div className="login-heading-row">
            <h1 id="login-heading">Log In</h1>
          </div>

          <form autoComplete="off" onSubmit={handleLogin}>

            <label htmlFor="login-username">
              Email Address / Username / Campus ID
            </label>

            <input
              id="login-username"
              type="text"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              autoCapitalize="none"
              spellCheck={false}
              required
            />

            <label htmlFor="login-password">
              Password
            </label>

            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <div className="login-actions">
              <button type="submit" disabled={loading}>
                {loading ? "Logging in..." : "Log In"}
              </button>
            </div>

          </form>
        </section>
      </div>
    </main>
  );
}
