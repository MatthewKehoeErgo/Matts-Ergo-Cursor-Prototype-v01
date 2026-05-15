import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { CommentOverlay } from "./components/CommentOverlay.jsx";
import { ReviewModeContextProvider } from "./context/ReviewModeContext.jsx";
import {
  COORDINATE_SPACE_DOCUMENT,
  pageAnchorToViewportClientCenter,
} from "./utils/reviewModeScrollRoot.js";

function toCommentArray(value) {
  return Array.isArray(value) ? value : [];
}

const PREVIEW_CAPTURE_MAX_URL_LENGTH = 2_400_000;

function excludeReviewModeUIFromPreviewCapture(node) {
  if (!(node instanceof Element)) return true;
  return !node.closest("[data-review-mode-ui='true']");
}

function getPreviewCaptureRoot() {
  return (
    document.getElementById("root") ??
    document.getElementById("app-root") ??
    document.body
  );
}

/**
 * After the editor closes, capture a lightweight JPEG of the main layout root and PATCH `preview_image_url`.
 * Uses `#root` in the React app, or `#app-root` on static SBCI pages (Version 1 HTML).
 * Skips quietly if `html-to-image` fails, the image is too large, or RLS rejects the update.
 */
async function captureRootPreviewAndPatch(repository, commentId) {
  if (!repository?.patchPreviewThumbnail || commentId == null) return null;
  await new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
  try {
    const { toJpeg } = await import("html-to-image");
    const root = getPreviewCaptureRoot();
    if (!root) return null;
    const dataUrl = await toJpeg(root, {
      quality: 0.47,
      pixelRatio: 0.3,
      cacheBust: true,
      filter: excludeReviewModeUIFromPreviewCapture,
    });
    if (
      typeof dataUrl !== "string" ||
      dataUrl.length > PREVIEW_CAPTURE_MAX_URL_LENGTH
    ) {
      return null;
    }
    return repository.patchPreviewThumbnail(commentId, dataUrl);
  } catch (error) {
    console.warn("[ReviewMode] Preview snapshot skipped:", error);
    return null;
  }
}

export function ReviewModeProvider({ repository, host, children }) {
  const location = useLocation();
  const [panelOpen, setPanelOpen] = useState(() => import.meta.env.DEV);
  const [commentModeActive, setCommentModeActive] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [openEditor, setOpenEditor] = useState(null);

  const pageUrl = host?.pageUrl ?? "";
  const sessionId = host?.sessionId ?? "";
  const versionOptions = Array.isArray(host?.versionOptions)
    ? host.versionOptions
    : [];
  const currentVersionId = host?.currentVersionId ?? null;
  const currentVersionLabel =
    versionOptions.find((option) => option.id === currentVersionId)?.label ??
    versionOptions[0]?.label ??
    "Current version";

  const onCommentsOverview =
    typeof location.pathname === "string" &&
    location.pathname.replace(/\/$/, "").endsWith("comments-overview");

  useEffect(() => {
    if (!onCommentsOverview) return;
    setCommentModeActive(false);
    setOpenEditor(null);
  }, [onCommentsOverview]);

  useEffect(() => {
    let active = true;

    async function loadComments() {
      if (!repository?.listForPage || !pageUrl || !sessionId || !currentVersionId) {
        setComments([]);
        return;
      }

      setCommentsLoading(true);
      try {
        const rows = await repository.listForPage({
          pageUrl,
          sessionId,
          version: currentVersionId,
        });
        if (active) setComments(toCommentArray(rows));
      } catch (error) {
        console.error("[ReviewMode] Failed to load comments", error);
        if (active) setComments([]);
      } finally {
        if (active) setCommentsLoading(false);
      }
    }

    loadComments();
    return () => {
      active = false;
    };
  }, [currentVersionId, location.pathname, pageUrl, repository, sessionId]);

  useEffect(() => {
    if (panelOpen) return;
    setCommentModeActive(false);
    setOpenEditor(null);
  }, [panelOpen]);

  const notifyError = useCallback(
    (message, error) => {
      if (error) {
        console.error(message, error);
      } else {
        console.error(message);
      }

      if (host?.onError) {
        host.onError(message, error);
        return;
      }

      if (host?.alert) {
        host.alert(message);
      }
    },
    [host],
  );

  const isIgnoredPlacementTarget = useCallback(
    (el) => {
      if (!(el instanceof Element)) return true;
      if (el.closest("[data-review-mode-ui='true']")) return true;
      return Boolean(host?.shouldIgnorePlacementTarget?.(el));
    },
    [host],
  );

  const closeEditor = useCallback(() => {
    setOpenEditor(null);
  }, []);

  const openEditorForCreate = useCallback(
    ({ x, y, coordinateSpace = COORDINATE_SPACE_DOCUMENT }) => {
      if (onCommentsOverview) return;
      setOpenEditor({
        id: null,
        x,
        y,
        coordinateSpace,
        positionAnchor: "page",
        body: "",
        authorName: "",
        authorPosition: "",
        isNew: true,
      });
    },
    [onCommentsOverview],
  );

  const openEditorForComment = useCallback(
    (comment) => {
      if (onCommentsOverview) return;
      if (!comment) return;
      setOpenEditor({
        ...comment,
        isNew: false,
      });
    },
    [onCommentsOverview],
  );

  const updateOpenEditor = useCallback((patch) => {
    setOpenEditor((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const openPanel = useCallback(() => {
    setPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
  }, []);

  const toggleCommentMode = useCallback(() => {
    if (onCommentsOverview) return;
    setCommentModeActive((active) => !active);
  }, [onCommentsOverview]);

  const exitCommentMode = useCallback(() => {
    setCommentModeActive(false);
  }, []);

  const openOverview = useCallback(() => {
    host?.openOverview?.();
  }, [host]);

  const openDefaultScreen = useCallback((versionId) => {
    host?.openDefaultScreen?.(versionId);
  }, [host]);

  const openVersion = useCallback(
    (versionId) => {
      const selected = versionOptions.find((option) => option.id === versionId);
      if (!selected) return;
      host?.openVersion?.(selected);
    },
    [host, versionOptions],
  );

  const saveOpenEditor = useCallback(async () => {
    if (!openEditor || !repository) return;

    const body = String(openEditor.body || "").trim();
    if (!body) return;

    let payload = {
      ...openEditor,
      body,
      authorName: String(openEditor.authorName || "").trim(),
      authorPosition: String(openEditor.authorPosition || "").trim(),
      pageUrl,
      sessionId,
      version: currentVersionId,
    };

    if (openEditor.id == null && typeof window !== "undefined") {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (vw > 0 && vh > 0) {
        let vx;
        let vy;
        if (openEditor.positionAnchor === "viewport") {
          vx = Number(openEditor.x);
          vy = Number(openEditor.y);
        } else {
          const c = pageAnchorToViewportClientCenter(openEditor);
          vx = c.x;
          vy = c.y;
        }
        payload = {
          ...payload,
          viewportWidth: vw,
          viewportHeight: vh,
          xRatio: Math.min(1, Math.max(0, vx / vw)),
          yRatio: Math.min(1, Math.max(0, vy / vh)),
        };
      }
    }

    try {
      if (openEditor.id != null) {
        const updated = await repository.update(payload);
        setComments((current) =>
          current.map((comment) =>
            comment.id === openEditor.id ? updated ?? payload : comment,
          ),
        );
      } else {
        const created = await repository.create(payload);
        const merged = created ?? payload;
        setComments((current) => [...current, merged]);
        setOpenEditor(null);
        setCommentModeActive(false);
        const newId = merged?.id ?? null;
        if (newId != null && repository.patchPreviewThumbnail) {
          void captureRootPreviewAndPatch(repository, newId).then((updated) => {
            if (updated?.id != null) {
              setComments((current) =>
                current.map((c) => (c.id === updated.id ? updated : c)),
              );
            }
          });
        }
        return;
      }
      setOpenEditor(null);
      setCommentModeActive(false);
    } catch (error) {
      notifyError("Could not save your comment. Please try again.", error);
    }
  }, [currentVersionId, notifyError, openEditor, pageUrl, repository, sessionId]);

  const deleteOpenEditor = useCallback(async () => {
    if (!openEditor || openEditor.id == null || !repository?.remove) return;

    const confirmed = await Promise.resolve(
      host?.confirmDelete
        ? host.confirmDelete("Delete this comment?")
        : true,
    );
    if (!confirmed) return;

    try {
      await repository.remove(openEditor.id);
      setComments((current) =>
        current.filter((comment) => comment.id !== openEditor.id),
      );
      setOpenEditor(null);
      setCommentModeActive(false);
    } catch (error) {
      notifyError("Could not delete this comment. Please try again.", error);
    }
  }, [host, notifyError, openEditor, repository]);

  const resolveOpenEditor = useCallback(async () => {
    if (!openEditor || openEditor.id == null || !repository?.resolve) return;

    const message =
      "Resolve this comment? It will no longer appear on the prototype but will stay in Comments overview as resolved.";
    const confirmed = await Promise.resolve(
      host?.confirmResolve ? host.confirmResolve(message) : window.confirm(message),
    );
    if (!confirmed) return;

    try {
      await repository.resolve(openEditor.id);
      setComments((current) =>
        current.filter((comment) => comment.id !== openEditor.id),
      );
      setOpenEditor(null);
      setCommentModeActive(false);
    } catch (error) {
      notifyError("Could not resolve this comment. Please try again.", error);
    }
  }, [host, notifyError, openEditor, repository]);

  const value = useMemo(
    () => ({
      repository,
      host,
      pageUrl,
      sessionId,
      panelOpen,
      commentModeActive,
      comments,
      commentsLoading,
      openEditor,
      versionOptions,
      currentVersionId,
      currentVersionLabel,
      isIgnoredPlacementTarget,
      openPanel,
      closePanel,
      toggleCommentMode,
      exitCommentMode,
      closeEditor,
      openEditorForCreate,
      openEditorForComment,
      updateOpenEditor,
      saveOpenEditor,
      deleteOpenEditor,
      resolveOpenEditor,
      openOverview,
      openDefaultScreen,
      openVersion,
    }),
    [
      closeEditor,
      closePanel,
      commentModeActive,
      comments,
      commentsLoading,
      currentVersionId,
      currentVersionLabel,
      exitCommentMode,
      host,
      isIgnoredPlacementTarget,
      openDefaultScreen,
      openEditor,
      openEditorForComment,
      openEditorForCreate,
      openOverview,
      openPanel,
      openVersion,
      pageUrl,
      panelOpen,
      repository,
      saveOpenEditor,
      sessionId,
      toggleCommentMode,
      updateOpenEditor,
      deleteOpenEditor,
      resolveOpenEditor,
      versionOptions,
    ],
  );

  return (
    <ReviewModeContextProvider value={value}>
      {children}
      <CommentOverlay />
    </ReviewModeContextProvider>
  );
}
