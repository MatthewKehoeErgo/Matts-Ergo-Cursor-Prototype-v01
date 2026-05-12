/**
 * Comment mode for static prototypes: place pins, edit text, persist to Supabase `comments`.
 *
 * State machine:
 * - `commentMode` — when true, the next click on the page (outside ignored UI) opens an editor.
 * - Toggled by the existing "Add a comment" button (same button turns mode off).
 *
 * Coordinates:
 * - We store viewport coordinates (`clientX` / `clientY`) in `x_position` / `y_position` to match
 *   the schema; markers are positioned with `position: fixed` using those values.
 *
 * Supabase:
 * - `session_id` — UUID string in localStorage (`SESSION_STORAGE_KEY`), reused for all rows.
 * - Inserts use `text`, `page_url`, `x_position`, `y_position`, `session_id`.
 * - Updates set `text` and `updated_at` (ISO string) for the row `id`.
 * - `text` encodes optional name, position, and comment body (see serializeStoredComment).
 */

import {
  supabaseInsert,
  supabasePatch,
  supabaseDelete,
  fetchCommentsForPage,
} from "./supabase.js";

const COMMENTS_TABLE = "comments";
const SESSION_STORAGE_KEY = "prototype-comments-session-id";
const ICON_SRC = "assets/Comment - Placed - Icon.svg";
const SUBMIT_ICON_SRC = "assets/Submit Icon.svg";
const CLOSE_ICON_SRC = "assets/close_small.svg";

/**
 * Outer diameter of `.comment-mode-editor-pin` (must match `comment-mode.css`;
 * currently `calc(56px * 0.7)` — 30% smaller than the 56px base).
 */
const EDITOR_PIN_SIZE_PX = 56 * 0.7;
/** Horizontal gap between pin edge and dialogue (px). */
const EDITOR_CARD_GAP_PX = 16;

/**
 * @type {{
 *   commentMode: boolean,
 *   comments: Array<{
 *     id: number,
 *     x: number,
 *     y: number,
 *     text: string,
 *     authorName: string,
 *     authorPosition: string,
 *   }>,
 *   layer: HTMLElement|null,
 *   hintEl: HTMLElement|null,
 *   openEditor: { shell: HTMLElement, existing: any } | null,
 * }}
 *
 * `openEditor` enforces "only one editor at a time" — checked when a click happens
 * outside the open card so the previous one closes before a new placement can start.
 */
var state = {
  commentMode: false,
  comments: [],
  layer: null,
  hintEl: null,
  openEditor: null,
};

function getPageUrlForQuery() {
  return window.location.href.split("#")[0];
}

/**
 * UUID v4 for `session_id` — created once per browser and kept in localStorage.
 */
function getOrCreateSessionId() {
  var existing = localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;
  var id = crypto.randomUUID
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        var v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
  localStorage.setItem(SESSION_STORAGE_KEY, id);
  return id;
}

function setTriggerActive(active) {
  var btn = document.querySelector(".floating-test-card__comment-btn");
  if (btn) btn.classList.toggle("is-comment-mode-active", active);
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
    "Click anywhere to place a comment · Esc to cancel · click Add a comment again to leave mode";
  document.body.appendChild(state.hintEl);
}

function hideHint() {
  if (state.hintEl && state.hintEl.parentNode) {
    state.hintEl.parentNode.removeChild(state.hintEl);
  }
  state.hintEl = null;
}

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
  document.body.classList.toggle("comment-mode-active", state.commentMode);
  setTriggerActive(state.commentMode);
  if (state.commentMode) showHint();
  else hideHint();
}

function exitCommentMode() {
  state.commentMode = false;
  document.documentElement.classList.remove("comment-mode-active");
  document.body.classList.remove("comment-mode-active");
  setTriggerActive(false);
  hideHint();
}

function shouldIgnorePlacementTarget(el) {
  if (!el) return true;
  if (el.closest("#toggle-test-card")) return true;
  if (el.closest("#floating-test-card")) return true;
  if (el.closest("#page-transition")) return true;
  if (el.closest(".prototype-version-banner")) return true;
  if (el.closest(".comment-mode-editor-shell")) return true;
  if (el.closest(".comment-mode-pin-card")) return true;
  if (el.closest(".comment-mode-marker")) return true;
  if (el.closest("#comment-mode-hint")) return true;
  return false;
}

/**
 * Closes the currently-open editor without saving.
 * If it was an existing comment being edited, the marker is restored at its anchor
 * so the saved feedback remains accessible.
 */
function closeOpenEditor() {
  var entry = state.openEditor;
  if (!entry) return;
  state.openEditor = null;
  if (entry.shell && entry.shell.parentNode) entry.shell.remove();
  if (entry.existing && entry.existing.id != null) {
    renderMarker(entry.existing);
  }
}

function createIconImg(src) {
  var img = document.createElement("img");
  img.src = src;
  img.alt = "";
  img.setAttribute("aria-hidden", "true");
  return img;
}

function sanitizeMetaLine(s) {
  return String(s || "").replace(/\r?\n/g, " ").trim();
}

/**
 * Pack name, position, and comment body into the single `text` column (no DB migration).
 * Legacy rows without `<<META>>` parse as body-only.
 */
function serializeStoredComment(authorName, authorPosition, body) {
  var n = sanitizeMetaLine(authorName);
  var p = sanitizeMetaLine(authorPosition);
  var b = String(body || "").trim();
  return (
    "<<META>>\n" +
    "name:" +
    n +
    "\n" +
    "position:" +
    p +
    "\n" +
    "<<BODY>>\n" +
    b
  );
}

function parseStoredComment(raw) {
  if (typeof raw !== "string" || raw.indexOf("<<META>>\n") !== 0) {
    return {
      authorName: "",
      authorPosition: "",
      body: raw || "",
    };
  }
  var sep = "\n<<BODY>>\n";
  var idx = raw.indexOf(sep);
  if (idx === -1) {
    return { authorName: "", authorPosition: "", body: raw };
  }
  var metaBlock = raw.slice("<<META>>\n".length, idx);
  var body = raw.slice(idx + sep.length);
  var authorName = "";
  var authorPosition = "";
  metaBlock.split("\n").forEach(function (line) {
    if (line.indexOf("name:") === 0) authorName = line.slice(5).trim();
    else if (line.indexOf("position:") === 0)
      authorPosition = line.slice(9).trim();
  });
  return { authorName: authorName, authorPosition: authorPosition, body: body };
}

/**
 * Insert or update a row in `comments` after the user submits the inline form.
 *
 * Payload contracts (must match the existing schema exactly):
 *   INSERT — text, page_url, x_position, y_position, session_id
 *            (created_at / updated_at are Postgres defaults — we don't send them)
 *   PATCH  — text, updated_at
 *
 * `text` stores serialized name, position, and body via {@link serializeStoredComment}.
 */
async function persistComment(record, isUpdate) {
  var storageText = serializeStoredComment(
    record.authorName,
    record.authorPosition,
    record.text,
  );

  if (isUpdate) {
    await supabasePatch(COMMENTS_TABLE, record.id, {
      text: storageText,
      updated_at: new Date().toISOString(),
    });
    return;
  }

  var pageUrl = getPageUrlForQuery();
  var sessionId = getOrCreateSessionId();

  var rows = await supabaseInsert(COMMENTS_TABLE, {
    text: storageText,
    page_url: pageUrl,
    x_position: record.x,
    y_position: record.y,
    session_id: sessionId,
  });
  var inserted = Array.isArray(rows) ? rows[0] : rows;
  if (!inserted || inserted.id == null) {
    throw new Error("Insert did not return a row id");
  }
  record.id = inserted.id;
}

/**
 * Load saved pins for this `page_url` + `session_id` and draw markers (after refresh).
 */
async function loadCommentsFromSupabase() {
  var pageUrl = getPageUrlForQuery();
  var sessionId = getOrCreateSessionId();
  var rows;
  try {
    rows = await fetchCommentsForPage(pageUrl, sessionId);
  } catch (err) {
    console.error("Failed to load comments:", err);
    return;
  }
  if (!Array.isArray(rows)) {
    rows = [];
  }
  state.comments = [];
  ensureLayer();
  rows.forEach(function (row) {
    var raw = row.text || "";
    var parsed = parseStoredComment(raw);
    var rec = {
      id: row.id,
      x: Number(row.x_position),
      y: Number(row.y_position),
      text: parsed.body,
      authorName: parsed.authorName,
      authorPosition: parsed.authorPosition,
    };
    state.comments.push(rec);
    renderMarker(rec);
  });
}

function openCommentEditor(clientX, clientY, existing) {
  // Only one editor at a time — silently dismiss any previously open one.
  closeOpenEditor();
  ensureLayer();
  var fieldId =
    existing && existing.id != null
      ? "comment-field-" + existing.id
      : "comment-field-new-" + Date.now();
  var initialBody = "";
  var initialName = "";
  var initialPosition = "";
  if (existing) {
    if (
      existing.authorName !== undefined ||
      existing.authorPosition !== undefined
    ) {
      initialBody = existing.text != null ? existing.text : "";
      initialName = existing.authorName != null ? existing.authorName : "";
      initialPosition =
        existing.authorPosition != null ? existing.authorPosition : "";
    } else {
      var fp = parseStoredComment(existing.text || "");
      initialBody = fp.body;
      initialName = fp.authorName;
      initialPosition = fp.authorPosition;
    }
  }

  var shell = document.createElement("div");
  shell.className = "comment-mode-editor-shell";

  var pin = document.createElement("div");
  pin.className = "comment-mode-editor-pin";
  pin.appendChild(createIconImg(ICON_SRC));
  pin.style.left = clientX + "px";
  pin.style.top = clientY + "px";

  var card = document.createElement("div");
  card.className = "comment-mode-pin-card";
  if (existing && existing.id != null) {
    card.dataset.dbId = String(existing.id);
  }

  var closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "comment-mode-close";
  closeBtn.setAttribute("aria-label", "Close comment");
  closeBtn.appendChild(createIconImg(CLOSE_ICON_SRC));

  var fields = document.createElement("div");
  fields.className = "comment-mode-pin-fields";

  var nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "comment-mode-name-input";
  nameInput.setAttribute("placeholder", "Add your name");
  nameInput.setAttribute("aria-label", "Your name");
  nameInput.setAttribute("maxlength", "120");
  nameInput.setAttribute("autocomplete", "name");
  nameInput.value = initialName;

  var positionInput = document.createElement("input");
  positionInput.type = "text";
  positionInput.className = "comment-mode-position-input";
  positionInput.setAttribute("placeholder", "Add your position");
  positionInput.setAttribute("aria-label", "Your position");
  positionInput.setAttribute("maxlength", "120");
  positionInput.setAttribute("autocomplete", "organization-title");
  positionInput.value = initialPosition;

  var ta = document.createElement("textarea");
  ta.id = fieldId;
  ta.className = "comment-mode-textarea";
  ta.setAttribute("maxlength", "180");
  ta.setAttribute("placeholder", "Add a comment");
  ta.value = initialBody;

  fields.appendChild(nameInput);
  fields.appendChild(positionInput);
  fields.appendChild(ta);

  var submit = document.createElement("button");
  submit.type = "button";
  submit.className = "comment-mode-submit";
  submit.setAttribute("aria-label", "Submit comment");
  submit.appendChild(createIconImg(SUBMIT_ICON_SRC));

  var deleteBtn = null;
  if (existing && existing.id != null) {
    card.classList.add("comment-mode-pin-card--has-delete");
    deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "comment-mode-delete";
    deleteBtn.setAttribute("aria-label", "Delete comment");
    deleteBtn.setAttribute("title", "Delete comment");
    var binGlyph = document.createElement("span");
    binGlyph.className = "material-symbols-outlined";
    binGlyph.setAttribute("aria-hidden", "true");
    binGlyph.textContent = "delete";
    deleteBtn.appendChild(binGlyph);
  }

  card.appendChild(closeBtn);
  card.appendChild(fields);
  card.appendChild(submit);
  if (deleteBtn) card.appendChild(deleteBtn);
  shell.appendChild(pin);
  shell.appendChild(card);
  state.layer.appendChild(shell);

  state.openEditor = { shell: shell, existing: existing || null };

  closeBtn.addEventListener("click", function (ev) {
    ev.preventDefault();
    ev.stopPropagation();
    closeOpenEditor();
  });

  var rect = card.getBoundingClientRect();
  /* Pin is centered on the click; align dialogue top with pin top. */
  var pinHalf = EDITOR_PIN_SIZE_PX / 2;
  var pinTop = clientY - pinHalf;
  /*
   * Keep the pin uncovered: if the click is left of viewport center, open the
   * dialogue to the right of the pin; if right of center, open it to the left.
   */
  var clickLeftOfCenter = clientX < window.innerWidth / 2;
  var preferredLeft = clickLeftOfCenter
    ? clientX + pinHalf + EDITOR_CARD_GAP_PX
    : clientX - pinHalf - EDITOR_CARD_GAP_PX - rect.width;

  var pos = clampPanelPosition(
    preferredLeft,
    pinTop,
    rect.width,
    rect.height,
  );
  card.style.left = pos.left + "px";
  card.style.top = pos.top + "px";

  if (deleteBtn) {
    deleteBtn.addEventListener("click", async function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      if (!existing || existing.id == null) return;
      if (!window.confirm("Delete this comment?")) return;
      try {
        await supabaseDelete(COMMENTS_TABLE, existing.id);
      } catch (err) {
        console.error("Comment delete failed:", err);
        alert("Could not delete this comment. Please try again.");
        return;
      }
      state.comments = state.comments.filter(function (c) {
        return c.id !== existing.id;
      });
      document
        .querySelectorAll(
          '.comment-mode-marker[data-db-id="' + existing.id + '"]',
        )
        .forEach(function (n) {
          n.remove();
        });
      state.openEditor = null;
      shell.remove();
      exitCommentMode();
    });
  }

  submit.addEventListener("click", async function (ev) {
    ev.stopPropagation();
    var bodyText = ta.value;
    if (!bodyText.trim()) {
      ta.focus();
      return;
    }

    var isUpdate = !!(existing && existing.id != null);
    var record = {
      id: existing && existing.id != null ? existing.id : null,
      x: existing && existing.id != null ? existing.x : clientX,
      y: existing && existing.id != null ? existing.y : clientY,
      text: bodyText.trim(),
      authorName: nameInput.value.trim(),
      authorPosition: positionInput.value.trim(),
    };

    try {
      await persistComment(record, isUpdate);
    } catch (err) {
      console.error("Comment save failed:", err);
      alert("Could not save your comment. Please try again.");
      return;
    }

    var idx = state.comments.findIndex(function (c) {
      return c.id === record.id;
    });
    if (idx >= 0) state.comments[idx] = record;
    else state.comments.push(record);

    document
      .querySelectorAll('.comment-mode-marker[data-db-id="' + record.id + '"]')
      .forEach(function (n) {
        n.remove();
      });

    state.openEditor = null;
    shell.remove();
    renderMarker(record);
    exitCommentMode();
  });

  nameInput.focus();
}

function renderMarker(record) {
  ensureLayer();
  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "comment-mode-marker";
  btn.dataset.dbId = String(record.id);
  btn.setAttribute("aria-label", "View or edit comment");
  btn.style.left =
    clampPanelPosition(record.x - 24, record.y - 24, 48, 48).left + "px";
  btn.style.top =
    clampPanelPosition(record.x - 24, record.y - 24, 48, 48).top + "px";

  var img = document.createElement("img");
  img.src = ICON_SRC;
  img.alt = "";
  btn.appendChild(img);

  btn.addEventListener("click", function (ev) {
    ev.preventDefault();
    ev.stopPropagation();
    var dbId = parseInt(btn.dataset.dbId, 10);
    var found = state.comments.find(function (c) {
      return c.id === dbId;
    });
    btn.remove();
    if (found) {
      openCommentEditor(found.x, found.y, found);
    }
  });

  state.layer.appendChild(btn);
}

function onDocumentClick(ev) {
  // Outside-click close: an editor is already open and the click is anywhere outside it
  // (including outside any other comment chrome). Swallow this click so it doesn't
  // immediately open a new editor — the user must click again to start a new one.
  if (state.openEditor) {
    if (ev.target.closest(".comment-mode-editor-shell")) return;
    ev.preventDefault();
    ev.stopPropagation();
    closeOpenEditor();
    return;
  }

  if (!state.commentMode) return;
  if (shouldIgnorePlacementTarget(ev.target)) return;

  ev.preventDefault();
  ev.stopPropagation();

  openCommentEditor(ev.clientX, ev.clientY, null);
}

function onKeyDown(ev) {
  if (ev.key !== "Escape") return;
  if (state.openEditor) {
    closeOpenEditor();
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

function bindTrigger(el) {
  if (!el || el.dataset.commentModeBound) return;
  el.dataset.commentModeBound = "1";
  el.addEventListener("click", function (ev) {
    ev.stopPropagation();
    toggleCommentModeFromTrigger();
  });
}

async function init() {
  getOrCreateSessionId();
  attachGlobalListenersOnce();
  bindTrigger(document.querySelector(".floating-test-card__comment-btn"));
  var obs = new MutationObserver(function () {
    bindTrigger(document.querySelector(".floating-test-card__comment-btn"));
  });
  obs.observe(document.body, { childList: true, subtree: true });

  await loadCommentsFromSupabase();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    init();
  });
} else {
  init();
}
