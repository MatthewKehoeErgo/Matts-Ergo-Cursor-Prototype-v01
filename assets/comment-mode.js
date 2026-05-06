import { supabaseInsert } from './supabase.js';

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
 * 3) User submits → editor collapses to a marker icon; feedback opens in a new tab as a
 *    pre-filled repository issue (template feedback.yml). Comment mode ends.
 * 4) User clicks a marker → editor reopens with saved text for edits/resubmit.
 *
 * Notes:
 * - Comments live only in memory (lost on refresh), per product requirement.
 * - UI copy avoids naming GitHub/Issue; the script still builds a GitHub issue URL internally.
 */

(function () {
  "use strict";

  /** Default repo if data-feedback-repo is absent on <body> */
  var DEFAULT_REPO = "MatthewKehoeErgo/Matts-Ergo-Cursor-Prototype-v01";
  /** Issue template filename under .github/ISSUE_TEMPLATE/ */
  var ISSUE_TEMPLATE = "feedback.yml";
  /** Issue title shown in the tracker (neutral wording OK there) */
  var ISSUE_TITLE = "[Feedback] Test Details – Prototype v0.1";
  /** Icon used for collapsed markers (same asset as the entry button) */
  var ICON_SRC = "assets/add_comment.svg";

  var state = {
    /** Whether the user is actively placing feedback */
    commentMode: false,
    /** @type {{ id: number, x: number, y: number, text: string, collapsed: boolean }[]} */
    comments: [],
    nextId: 1,
    layer: null,
    hintEl: null,
  };

  function getFeedbackRepo() {
    return document.body.getAttribute("data-feedback-repo") || DEFAULT_REPO;
  }

  function getScreenLabel() {
    return (
      document.body.getAttribute("data-feedback-screen") ||
      document.title ||
      "Prototype"
    );
  }

  /**
   * Builds the raw issue body sent via URL (also used if clipboard fallback is needed).
   * Includes URL, screen id, viewport coordinates, and the collaborator text.
   */
  function buildIssueBody(commentText, anchorX, anchorY) {
    var pageUrl = window.location.href.split("#")[0];
    var screen = getScreenLabel();
    var lines = [
      "### Prototype",
      "- URL: " + pageUrl,
      "- Screen / flow: " + screen,
      "- Placement (viewport px): x ≈ " + Math.round(anchorX) + ", y ≈ " + Math.round(anchorY),
      "",
      "### Feedback",
      commentText.trim(),
    ];
    return lines.join("\n");
  }

  /**
   * Opens the repo's new-issue page with template + pre-filled title/body.
   * GitHub may ignore some query params for YAML form templates; body/title still help on many repos.
   */
  function openPrefilledFeedbackIssue(commentText, anchorX, anchorY) {
    var repo = getFeedbackRepo();
    var body = buildIssueBody(commentText, anchorX, anchorY);
    var params = new URLSearchParams();
    params.set("template", ISSUE_TEMPLATE);
    params.set("title", ISSUE_TITLE);
    params.set("body", body);
    var url =
      "https://github.com/" + repo + "/issues/new?" + params.toString();

    window.open(url, "_blank", "noopener,noreferrer");
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

    submit.addEventListener("click", function (ev) {
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

      var idx = state.comments.findIndex(function (c) {
        return c.id === id;
      });
      if (idx >= 0) state.comments[idx] = record;
      else state.comments.push(record);

      card.remove();
      renderMarker(record);
      openPrefilledFeedbackIssue(text, record.x, record.y);
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
