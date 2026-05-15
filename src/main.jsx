import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App.jsx";
import "./features/review-mode/styles/review-mode.css";
import "./index.css";
/** SBCI Hub visual system (legacy CSS extracted from static HTML). Loads after base tokens. */
import "./styles/sbci-hub.css";
import "./styles/setu-fonts.css";
import "./styles/setu-theme.css";
import { AppReviewModeRoot } from "./review-mode/AppReviewModeRoot.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter basename={import.meta.env.BASE_URL}>
      <AppReviewModeRoot>
        <App />
      </AppReviewModeRoot>
    </HashRouter>
  </React.StrictMode>
);
