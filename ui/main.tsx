import { createRoot } from "react-dom/client";
import { lazy, Suspense } from "react";
import { pageRoute } from "./page-route.mjs";
import "./panel.css";
const App = lazy(() => import("./App").then((m) => ({ default: m.App })));
const Landing = lazy(() =>
  import("./Landing").then((m) => ({ default: m.Landing })),
);
const route = pageRoute(window.location.pathname, window.location.hash);
if (route === "legacy-panel")
  window.location.replace(`/panel${window.location.hash}`);
else {
  document.title =
    route === "panel"
      ? "Panel — MontageFrames"
      : "MontageFrames — Ty nagrywasz. Resztę zmontuje AI.";
  createRoot(document.getElementById("root")!).render(
    <Suspense
      fallback={
        <p className="loading-page" role="status">
          Wczytuję MontageFrames…
        </p>
      }
    >
      {route === "panel" ? <App /> : <Landing />}
    </Suspense>,
  );
}
