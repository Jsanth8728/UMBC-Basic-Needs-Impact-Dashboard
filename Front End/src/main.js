import { useState } from "react";
import { createRoot } from "react-dom/client";
import HomePage from "./pages/HomePage.js";
import LoginPage from "./pages/LoginPage.js";
import "./styles/ReferenceTheme.css";

function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  function logIn() {
    window.location.hash = "#home";
    setLoggedIn(true);
  }

  return loggedIn ? <HomePage /> : <LoginPage onLogIn={logIn} />;
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);
