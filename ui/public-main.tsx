import { createRoot } from "react-dom/client";
import { Landing } from "./Landing";
import "./panel.css";

function LocalPanel() {
  return (
    <main style={{ maxWidth: 720, margin: "12vh auto", padding: 24 }}>
      <h1>Otwórz lokalny panel</h1>
      <p style={{ marginTop: 24 }}>
        Montaż i pliki klientów pozostają na Twoim komputerze. Uruchom
        MontageFrames poleceniem <code>npm run ui</code>, a następnie otwórz
        lokalny panel.
      </p>
      <p style={{ marginTop: 24 }}>
        <a href="http://127.0.0.1:3100/panel">Otwórz panel na tym komputerze</a>
      </p>
      <p style={{ marginTop: 24 }}>
        <a href="https://github.com/DKWGroup/MontageFrames#readme">
          Instrukcja instalacji
        </a>{" "}
        · <a href="/">Wróć do strony</a>
      </p>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  location.pathname.startsWith("/panel") ? <LocalPanel /> : <Landing />,
);
