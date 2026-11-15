import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import HomePage from "./pages/HomePage.js";
import LoginPage from "./pages/LoginPage.js";
import "./styles/ReferenceTheme.css";
import { restoreSession, SESSION_KEY } from "./utils/auth.js";

function App() {
  const [session, setSession] = useState(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const token = window.sessionStorage.getItem(SESSION_KEY);
        if (token) {
          const restored = await restoreSession(token);
          if (active) setSession(restored);
        }
      } catch {
        try { window.sessionStorage.removeItem(SESSION_KEY); } catch { /* Storage may be disabled. */ }
      } finally {
        if (active) setRestoring(false);
      }
    }
    restore();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(logOut, Math.max(0, Date.parse(session.expires_at) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [session]);

  function logIn(authenticatedSession) {
    try { window.sessionStorage.setItem(SESSION_KEY, authenticatedSession.access_token); } catch { /* Keep the session in memory. */ }
    window.location.hash = "#home";
    setSession(authenticatedSession);
  }

  function logOut() {
    try { window.sessionStorage.removeItem(SESSION_KEY); } catch { /* Storage may be disabled. */ }
    setSession(null);
    window.location.hash = "#login";
  }

  if (restoring) return <main className="login-page" role="status">Checking your session…</main>;
  return session ? <HomePage onLogOut={logOut} /> : <LoginPage onLogIn={logIn} />;
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);
