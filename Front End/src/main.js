import { createRoot } from "react-dom/client";
import HomePage from "./pages/HomePage.js";
import "./styles/ReferenceTheme.css";

const root = createRoot(document.getElementById("root"));
root.render(<HomePage />);
