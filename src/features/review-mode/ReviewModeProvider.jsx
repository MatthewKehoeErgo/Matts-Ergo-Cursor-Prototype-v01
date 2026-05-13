import { useCallback, useEffect, useMemo, useState } from "react";
import { CommentOverlay } from "./components/CommentOverlay.jsx";
import { ReviewModeContextProvider } from "./context/ReviewModeContext.jsx";

function toCommentArray(value) {
  return Array.isArray(value) ? value : [];
}

export function ReviewModeProvider({ repository, host, children }) {
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

  useEffect(() => {
    let active = true;

    async function loadComments() {
      if (!repository?.listForPage || !pageUrl || !sessionId) {
        setComments([]);
        return;
      }

      setCommentsLoading(true);
      try {
        const rows = await repository.listForPage({ pageUrl, sessionId });
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
  }, [pageUrl, repository, sessionId]);

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

  const openEditorForCreate = useCallback((x, y) => {
    setOpenEditor({
      id: null,
      x,
      y,
      body: "",
      authorName: "",
      authorPosition: "",
      isNew: true,
    });
  }, []);

  const openEditorForComment = useCallback((comment) => {
    if (!comment) return;
    setOpenEditor({
      ...comment,
      isNew: false,
    });
  }, []);

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
    setCommentModeActive((active) => !active);
  }, []);

  const exitCommentMode = useCallback(() => {
    setCommentModeActive(false);
  }, []);

  const openOverview = useCallback(() => {
    host?.openOverview?.();
  }, [host]);

  const openDefaultScreen = useCallback(() => {
    host?.openDefaultScreen?.();
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

    const payload = {
      ...openEditor,
      body,
      authorName: String(openEditor.authorName || "").trim(),
      authorPosition: String(openEditor.authorPosition || "").trim(),
      pageUrl,
      sessionId,
    };

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
        setComments((current) => [...current, created ?? payload]);
      }
      setOpenEditor(null);
      setCommentModeActive(false);
    } catch (error) {
      notifyError("Could not save your comment. Please try again.", error);
    }
  }, [notifyError, openEditor, pageUrl, repository, sessionId]);

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
