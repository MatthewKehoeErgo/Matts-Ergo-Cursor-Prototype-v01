import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  buildPrototypeVersionOptions,
  getPrototypeVersionIdFromWindow,
  PROTOTYPE_VERSION_V1,
} from "../constants/prototypeVersion.js";
import { ReviewModeProvider } from "../features/review-mode/index.js";
import { createSupabaseCommentRepository } from "./createSupabaseCommentRepository.js";

const SESSION_STORAGE_KEY = "prototype-comments-session-id";

/** Full navigation target for the React prototype (HashRouter). Keeps static HTML and SPA in sync. */
const REACT_ENTRY_HREF = `${import.meta.env.BASE_URL}index.html#/dashboard`;

const VERSION_OPTIONS = buildPrototypeVersionOptions(REACT_ENTRY_HREF);

function getOrCreateSessionId() {
  const existing = localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;

  const nextId = crypto.randomUUID
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
        const rand = (Math.random() * 16) | 0;
        const value = char === "x" ? rand : (rand & 0x3) | 0x8;
        return value.toString(16);
      });

  localStorage.setItem(SESSION_STORAGE_KEY, nextId);
  return nextId;
}

function currentVersionId() {
  return getPrototypeVersionIdFromWindow();
}

export function AppReviewModeRoot({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const repository = useMemo(() => createSupabaseCommentRepository(), []);

  const host = useMemo(
    () => ({
      pageUrl:
        typeof window === "undefined" ? location.pathname : window.location.href.split("#")[0],
      sessionId:
        typeof window === "undefined" ? "" : getOrCreateSessionId(),
      versionOptions: VERSION_OPTIONS,
      currentVersionId: currentVersionId(),
      openOverview: () => {
        const v = getPrototypeVersionIdFromWindow();
        navigate({
          pathname: "/comments-overview",
          search: new URLSearchParams({ version: v }).toString(),
        });
      },
      openDefaultScreen: (versionId) => {
        if (versionId === PROTOTYPE_VERSION_V1) {
          sessionStorage.setItem("sbci-version-transition", "1");
          const href =
            VERSION_OPTIONS.find((o) => o.id === PROTOTYPE_VERSION_V1)?.href ??
            "sbci-hub-v1.html";
          window.location.href = href;
          return;
        }
        navigate("/dashboard");
      },
      openVersion: (option) => {
        if (!option?.href) return;
        sessionStorage.setItem("sbci-version-transition", "1");
        window.location.href = option.href;
      },
      shouldIgnorePlacementTarget: (el) =>
        Boolean(el?.closest(".prototype-version-banner")),
      confirmDelete: (message) => window.confirm(message),
      confirmResolve: (message) => window.confirm(message),
      alert: (message) => window.alert(message),
    }),
    [location.pathname, location.hash, navigate],
  );

  return (
    <ReviewModeProvider repository={repository} host={host}>
      {children}
    </ReviewModeProvider>
  );
}
