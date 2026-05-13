import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ReviewModeProvider } from "../features/review-mode/index.js";
import { createSupabaseCommentRepository } from "./createSupabaseCommentRepository.js";

const SESSION_STORAGE_KEY = "prototype-comments-session-id";

const VERSION_OPTIONS = [
  {
    id: "prototype-v1",
    label: "Prototype — Version 1",
    href: "sbci-hub-v1.html",
  },
  {
    id: "prototype-v2",
    label: "Prototype — Version 2",
    href: import.meta.env.BASE_URL,
  },
];

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
  if (typeof window === "undefined") return "prototype-v2";
  const file = window.location.pathname.split("/").pop()?.toLowerCase() ?? "";
  return file === "sbci-hub-v1.html" ? "prototype-v1" : "prototype-v2";
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
      openOverview: () => navigate("/comments-overview"),
      openDefaultScreen: () => navigate("/dashboard"),
      openVersion: (option) => {
        if (!option?.href) return;
        sessionStorage.setItem("sbci-version-transition", "1");
        window.location.href = option.href;
      },
      shouldIgnorePlacementTarget: (el) =>
        Boolean(el?.closest(".prototype-version-banner")),
      confirmDelete: (message) => window.confirm(message),
      alert: (message) => window.alert(message),
    }),
    [location.pathname, navigate],
  );

  return (
    <ReviewModeProvider repository={repository} host={host}>
      {children}
    </ReviewModeProvider>
  );
}
