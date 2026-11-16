import { useState } from "react";
import { createRoot } from "react-dom/client";
import HomePage from "./pages/HomePage.js";
import LoginPage from "./pages/LoginPage.js";
import "./styles/ReferenceTheme.css";

function App() {
  const [user, setUser] = useState(null);

  function logIn(account) {
    window.location.hash = "#home";
    setUser(account);
  }

  return user ? <HomePage user={user} /> : <LoginPage onLogIn={logIn} />;
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);
