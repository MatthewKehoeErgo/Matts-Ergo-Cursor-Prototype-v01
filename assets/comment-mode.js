import { supabaseInsert, supabasePatch } from './supabase.js';

/** PostgREST table storing pinned feedback (see SQL in repo root `feedback_items.sql`). */
var FEEDBACK_TABLE = 'feedback_items';

let currentSessionId = null;

async function startFeedbackSession() {
  const [session] = await supabaseInsert('sessions', {
    name: null
  });

  currentSessionId = session.id;
  console.log('Feedback session started:', currentSessionId);
}

/**
 * Contextual comment mode for static prototypes (GitHub Pages).
 *
 * Flow:
 * 1) User clicks "Add a comment" → enters comment mode (subtle tint + crosshair + hint).
 * 2) User clicks on the page → a compact editor opens anchored near that point.
 * 3) User submits → feedback is saved to Supabase; editor collapses to a marker icon.
 *    Comment mode ends.
 * 4) User clicks a marker → editor reopens with saved text for edits/resubmit (updates same row).
 *
 * Notes:
 * - Marker positions and text stay in memory for the session; persistence is via Supabase.
 */

(function () {
  "use strict";

  /** Icon used for collapsed markers (same asset as the entry button) */
  var ICON_SRC = "assets/add_comment.svg";

  var state = {
    /** Whether the user is actively placing feedback */
    commentMode: false,
    /** @type {{ id: number, x: number, y: number, text: string, collapsed: boolean, supabaseRowId?: string }[]} */
    comments: [],
    nextId: 1,
    layer: null,
    hintEl: null,
  };

  function getScreenLabel() {
    return (
      document.body.getAttribute("data-feedback-screen") ||
      document.title ||
      "Prototype"
    );
  }

  /**
   * Saves or updates feedback in Supabase for the current session.
   * Sets `record.supabaseRowId` after insert.
   */
  async function persistFeedbackToSupabase(record, existing) {
    var pageUrl = window.location.href.split("#")[0];
    var screen = getScreenLabel();
    if (currentSessionId === null) {
      await startFeedbackSession();
    }
    var rowId = existing && existing.supabaseRowId;
    var payload = {
      body: record.text.trim(),
      anchor_x: record.x,
      anchor_y: record.y,
      page_url: pageUrl,
      screen_label: screen,
    };
    if (rowId) {
      await supabasePatch(FEEDBACK_TABLE, rowId, payload);
      record.supabaseRowId = rowId;
      return;
    }
    payload.session_id = currentSessionId;
    var rows = await supabaseInsert(FEEDBACK_TABLE, payload);
    record.supabaseRowId = rows[0].id;
  }

  function ensureLayer() {
    if (state.layer) return state.layer;
    state.layer = document.createElement("div");
    state.layer.className = "comment-mode-layer";
    state.layer.setAttribute("aria-live", "polite");
    document.body.appendChild(state.layer);
    return state.layer;
  }

  function showHint() {
    if (state.hintEl) return;
    state.hintEl = document.createElement("p");
    state.hintEl.id = "comment-mode-hint";
    state.hintEl.className = "comment-mode-hint";
    state.hintEl.setAttribute("role", "status");
    state.hintEl.textContent =
      "Click anywhere to place a comment · Esc to cancel";
    document.body.appendChild(state.hintEl);
  }

  function hideHint() {
    if (state.hintEl && state.hintEl.parentNode) {
      state.hintEl.parentNode.removeChild(state.hintEl);
    }
    state.hintEl = null;
  }

  /**
   * Clamp a floating panel so it stays inside the viewport.
   */
  function clampPanelPosition(left, top, width, height) {
    var pad = 8;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var w = width || 280;
    var h = height || 200;
    left = Math.min(Math.max(pad, left), vw - w - pad);
    top = Math.min(Math.max(pad, top), vh - h - pad);
    return { left: left, top: top };
  }

  function toggleCommentModeFromTrigger() {
    state.commentMode = !state.commentMode;
    document.documentElement.classList.toggle(
      "comment-mode-active",
      state.commentMode,
    );
    document.body.classList.toggle(
      "comment-mode-active",
      state.commentMode,
    );
    if (state.commentMode) showHint();
    else hideHint();
  }

  function exitCommentMode() {
    state.commentMode = false;
    document.documentElement.classList.remove("comment-mode-active");
    document.body.classList.remove("comment-mode-active");
    hideHint();
  }

  /**
   * Returns true when the click target should NOT start a new placement
   * (floating chrome, transition overlay, markers, open editors, etc.).
   */
  function shouldIgnorePlacementTarget(el) {
    if (!el) return true;
    if (el.closest("#floating-test-card")) return true;
    if (el.closest("#page-transition")) return true;
    if (el.closest(".prototype-version-banner")) return true;
    if (el.closest(".comment-mode-pin-card")) return true;
    if (el.closest(".comment-mode-marker")) return true;
    if (el.closest("#comment-mode-hint")) return true;
    return false;
  }

  /**
   * Creates an expanded editor at (x,y). `existing` carries id/text when editing.
   */
  function openCommentEditor(clientX, clientY, existing) {
    ensureLayer();
    var id = existing ? existing.id : state.nextId++;
    var initialText = existing ? existing.text : "";

    var card = document.createElement("div");
    card.className = "comment-mode-pin-card";
    card.dataset.commentId = String(id);

    var inner = document.createElement("div");
    inner.className = "comment-mode-pin-card__inner";

    var label = document.createElement("label");
    label.setAttribute("for", "comment-field-" + id);
    label.textContent = "Add comment below";

    var ta = document.createElement("textarea");
    ta.id = "comment-field-" + id;
    ta.setAttribute("maxlength", "180");
    ta.setAttribute("rows", "4");
    ta.value = initialText;

    var submit = document.createElement("button");
    submit.type = "button";
    submit.className = "comment-mode-submit";
    submit.textContent = "Submit";

    inner.appendChild(label);
    inner.appendChild(ta);
    inner.appendChild(submit);
    card.appendChild(inner);

    state.layer.appendChild(card);

    var rect = card.getBoundingClientRect();
    var pos = clampPanelPosition(clientX + 8, clientY + 8, rect.width, rect.height);
    card.style.left = pos.left + "px";
    card.style.top = pos.top + "px";

    submit.addEventListener("click", async function (ev) {
      ev.stopPropagation();
      var text = ta.value;
      if (!text.trim()) {
        ta.focus();
        return;
      }

      var record = {
        id: id,
        x: clientX,
        y: clientY,
        text: text,
        collapsed: true,
      };

      try {
        await persistFeedbackToSupabase(record, existing);
      } catch (err) {
        console.error("Feedback save failed:", err);
        return;
      }

      var idx = state.comments.findIndex(function (c) {
        return c.id === id;
      });
      if (idx >= 0) state.comments[idx] = record;
      else state.comments.push(record);

      card.remove();
      renderMarker(record);
      exitCommentMode();
    });

    ta.focus();
  }

  function renderMarker(record) {
    ensureLayer();
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "comment-mode-marker";
    btn.dataset.commentId = String(record.id);
    btn.setAttribute(
      "aria-label",
      "View or edit comment",
    );
    btn.style.left =
      clampPanelPosition(record.x - 18, record.y - 18, 36, 36).left + "px";
    btn.style.top =
      clampPanelPosition(record.x - 18, record.y - 18, 36, 36).top + "px";

    var img = document.createElement("img");
    img.src = ICON_SRC;
    img.alt = "";
    btn.appendChild(img);

    btn.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      var rid = parseInt(btn.dataset.commentId, 10);
      var found = state.comments.find(function (c) {
        return c.id === rid;
      });
      btn.remove();
      if (found) {
        openCommentEditor(found.x, found.y, found);
      }
    });

    state.layer.appendChild(btn);
  }

  function onDocumentClick(ev) {
    if (!state.commentMode) return;
    if (shouldIgnorePlacementTarget(ev.target)) return;

    ev.preventDefault();
    ev.stopPropagation();

    openCommentEditor(ev.clientX, ev.clientY, null);
  }

  function onKeyDown(ev) {
    if (ev.key !== "Escape") return;
    var openCard = document.querySelector(".comment-mode-pin-card");
    if (openCard) {
      openCard.remove();
      exitCommentMode();
      return;
    }
    if (state.commentMode) exitCommentMode();
  }

  var globalListenersAttached = false;

  function attachGlobalListenersOnce() {
    if (globalListenersAttached) return;
    globalListenersAttached = true;
    document.addEventListener("click", onDocumentClick, true);
    document.addEventListener("keydown", onKeyDown);
  }

  /**
   * Wire the trigger button (static HTML or React-injected). Uses a MutationObserver so late-mounted
   * SPA buttons still bind once.
   */
  function bindTrigger(el) {
    if (!el || el.dataset.commentModeBound) return;
    el.dataset.commentModeBound = "1";
    el.addEventListener("click", async function (ev) {
      ev.stopPropagation();
      if (currentSessionId === null) {
        await startFeedbackSession();
      }
      toggleCommentModeFromTrigger();
    });
  }

  function init() {
    attachGlobalListenersOnce();
    bindTrigger(document.querySelector(".floating-test-card__comment-btn"));
    var obs = new MutationObserver(function () {
      bindTrigger(document.querySelector(".floating-test-card__comment-btn"));
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
