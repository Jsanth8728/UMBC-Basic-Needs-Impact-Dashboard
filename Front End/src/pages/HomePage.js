import { useEffect, useRef, useState } from "react";
import marylandFlag from "../assets/images/maryland-flag-header.jpg";
import umbcLogo from "../assets/images/UMBC-primary-logo-CMYK-on-black.png";
import "./HomePage.css";
import ImportExportPage from "./ImportExportPage.js";
import DashboardOverview from "./DashboardOverview.js";

const pages = [
  { hash: "#home", label: "Home" },
  { hash: "#import-export", label: "Import / Export" },
];

export default function HomePage() {
  const [page, setPage] = useState(() => window.location.hash || "#home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [fileHistory, setFileHistory] = useState([]);
  const navigationRef = useRef(null);
  const buttonRef = useRef(null);
  const mainRef = useRef(null);

  useEffect(() => {
    function navigate() {
      setPage(window.location.hash || "#home");
      setMenuOpen(false);
      mainRef.current?.focus();
    }
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);

  useEffect(() => {
    document.title = `${page === "#import-export" ? "Import / Export" : "Home"} | UMBC Basic Needs`;
  }, [page]);

  useEffect(() => {
    if (!menuOpen) return;
    function dismiss(event) {
      if (!navigationRef.current?.contains(event.target)) setMenuOpen(false);
    }
    function onKeyDown(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <div>
      <a className="skip-link" href="#main-content" onClick={(event) => {
        event.preventDefault();
        mainRef.current?.focus();
      }}>Skip to content</a>
      <header className="home-page-header">
        <img src={marylandFlag} alt="" className="header-image" />
        <div className="header-text">
          <a className="brand-link" href="#home" aria-label="UMBC Basic Needs home">
            <img src={umbcLogo} alt="UMBC" className="UMBC-logo" />
          </a>
          <nav className="page-navigation" aria-label="Main navigation" ref={navigationRef}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false);
            }}>
            <button className="menu-button" type="button" ref={buttonRef}
              aria-expanded={menuOpen} aria-controls="page-menu"
              onClick={() => setMenuOpen(!menuOpen)}>
              <span className="menu-icon" aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
              Menu
            </button>
            <ul id="page-menu" className="page-menu" hidden={!menuOpen}>
              {pages.map(({ hash, label }) => (
                <li key={hash}>
                  <a href={hash} aria-current={page === hash ? "page" : undefined}
                    onClick={() => {
                      setMenuOpen(false);
                      if (page === hash) mainRef.current?.focus();
                    }}>{label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main id="main-content" className="page-content" tabIndex={-1} ref={mainRef}>
        {page === "#import-export" ? <ImportExportPage history={fileHistory} onHistoryChange={setFileHistory} /> : (
          <DashboardOverview />
        )}
      </main>
    </div>
  );
}
