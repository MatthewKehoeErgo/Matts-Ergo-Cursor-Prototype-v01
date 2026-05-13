import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./features/review-mode/styles/review-mode.css";
import "./index.css";
/** SBCI Hub visual system (legacy CSS extracted from static HTML). Loads after base tokens. */
import "./styles/sbci-hub.css";
import { AppReviewModeRoot } from "./review-mode/AppReviewModeRoot.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppReviewModeRoot>
        <App />
      </AppReviewModeRoot>
    </BrowserRouter>
  </React.StrictMode>
);
