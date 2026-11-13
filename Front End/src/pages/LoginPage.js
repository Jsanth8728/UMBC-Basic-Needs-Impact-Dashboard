import { useEffect } from "react";
import "./LoginPage.css";

export default function LoginPage({ onLogIn }) {
  useEffect(() => {
    document.title = "Log In | UMBC Basic Needs";
  }, []);

  return (
    <main className="login-page">
      <div className="login-container">
        <section className="login-card" aria-labelledby="login-heading">
          <div className="login-heading-row">
            <h1 id="login-heading">Log In</h1>
          </div>
          <form autoComplete="off" onSubmit={(event) => {
            event.preventDefault();
            onLogIn();
          }}>
            <label htmlFor="login-username">Email Address / Username / Campus ID</label>
            <input id="login-username" type="text" autoCapitalize="none" spellCheck={false} />
            <label htmlFor="login-password">Password</label>
            <input id="login-password" type="password" autoComplete="new-password" />
            <div className="login-actions">
              <button type="submit">Log In</button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
