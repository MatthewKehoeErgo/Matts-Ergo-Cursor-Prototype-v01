/**
 * Comment mode for static prototypes: place pins, edit text, persist to Supabase `comments`.
 *
 * State machine:
 * - `commentMode` — when true, the next click on the page (outside ignored UI) opens an editor.
 * - Toggled by the existing "Add a comment" button (same button turns mode off).
 *
 * Coordinates:
 * - New comments store document-space (page) coordinates in `x_position` / `y_position`
 *   so pins track page scroll. Legacy rows (matching saved ratios) are treated as viewport
 *   client coordinates. Markers use `position: fixed` and are repositioned on scroll/resize.
 *
 * Supabase:
 * - `session_id` — UUID per browser in localStorage (stored on insert; pins load for all sessions on the page).
 * - Inserts use `text`, `page_url`, `x_position`, `y_position`, `x_ratio`, `y_ratio`,
 *   `viewport_width`, `viewport_height`, `session_id`, `version`.
 * - Updates set `text` and `updated_at` (ISO string) for the row `id`.
 * - `text` encodes optional name, position, and comment body (see serializeStoredComment).
 */

import {
  supabaseInsert,
  supabasePatch,
  supabaseDelete,
  fetchCommentsForPage,
} from "./supabase.js";
import { getPrototypeVersionIdFromWindow } from "./prototype-version.js";
import { toJpeg } from "html-to-image";
import placedCommentIcon from "./Comment - Placed - Icon.svg?url";
import submitIcon from "./Submit Icon.svg?url";
import closeSmallIcon from "./close_small.svg?url";

const COMMENTS_TABLE = "comments";
const SESSION_STORAGE_KEY = "prototype-comments-session-id";
const PREVIEW_PATCH_MAX_URL_LENGTH = 2400000;
const ICON_SRC = placedCommentIcon;
const SUBMIT_ICON_SRC = submitIcon;
const CLOSE_ICON_SRC = closeSmallIcon;

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
 *     positionAnchor: "viewport"|"page",
 *     text: string,
 *     authorName: string,
 *     authorPosition: string,
 *   }>,
 *   layer: HTMLElement|null,
 *   hintEl: HTMLElement|null,
 *   openEditor: { shell: HTMLElement, existing: any, anchorPageX: number, anchorPageY: number } | null,
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

function excludeCommentChromeFromPreviewCapture(node) {
  if (!(node instanceof Element)) return true;
  if (node.closest(".comment-mode-layer")) return false;
  if (node.closest("[data-review-mode-ui='true']")) return false;
  if (node.closest("#floating-test-card")) return false;
  if (node.closest("#toggle-test-card")) return false;
  return true;
}

function inferPositionAnchorFromRow(row) {
  var vw = Number(row.viewport_width);
  var vh = Number(row.viewport_height);
  var x = Number(row.x_position);
  var y = Number(row.y_position);
  var xr = Number(row.x_ratio);
  var yr = Number(row.y_ratio);
  if (
    !(vw > 0) ||
    !(vh > 0) ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(xr) ||
    !Number.isFinite(yr)
  ) {
    return "page";
  }
  var tol = 0.06;
  var nearXr = Math.abs(x / vw - xr) < tol;
  var nearYr = Math.abs(y / vh - yr) < tol;
  return nearXr && nearYr ? "viewport" : "page";
}

function eventPageXY(ev) {
  if (typeof ev.pageX === "number" && typeof ev.pageY === "number") {
    return { x: ev.pageX, y: ev.pageY };
  }
  return {
    x: ev.clientX + window.scrollX,
    y: ev.clientY + window.scrollY,
  };
}

/** Top-left of 48×48 marker in viewport px for `position: fixed` (record.x/y = pin center). */
function markerFixedTopLeft(record) {
  if (record.positionAnchor === "viewport") {
    var pv = clampPanelPosition(record.x - 24, record.y - 24, 48, 48);
    return { left: pv.left, top: pv.top };
  }
  var cx = record.x - window.scrollX - 24;
  var cy = record.y - window.scrollY - 24;
  var p = clampPanelPosition(cx, cy, 48, 48);
  return { left: p.left, top: p.top };
}

function syncAllMarkerDomPositions() {
  if (!state.layer) return;
  state.layer.querySelectorAll(".comment-mode-marker[data-db-id]").forEach(function (btn) {
    var id = parseInt(btn.dataset.dbId, 10);
    var rec = state.comments.find(function (c) {
      return c.id === id;
    });
    if (!rec) return;
    var pos = markerFixedTopLeft(rec);
    btn.style.left = pos.left + "px";
    btn.style.top = pos.top + "px";
  });
}

function layoutEditorCardFromViewportPoint(shell, viewX, viewY) {
  var card = shell.querySelector(".comment-mode-pin-card");
  if (!card) return;
  var rect = card.getBoundingClientRect();
  var pinHalf = EDITOR_PIN_SIZE_PX / 2;
  var pinTop = viewY - pinHalf;
  var clickLeftOfCenter = viewX < window.innerWidth / 2;
  var preferredLeft = clickLeftOfCenter
    ? viewX + pinHalf + EDITOR_CARD_GAP_PX
    : viewX - pinHalf - EDITOR_CARD_GAP_PX - rect.width;
  var pos = clampPanelPosition(preferredLeft, pinTop, rect.width, rect.height);
  card.style.left = pos.left + "px";
  card.style.top = pos.top + "px";
}

function repositionOpenEditorChrome() {
  var entry = state.openEditor;
  if (!entry || !entry.shell) return;
  var pin = entry.shell.querySelector(".comment-mode-editor-pin");
  if (pin) {
    pin.style.left = entry.anchorPageX - window.scrollX + "px";
    pin.style.top = entry.anchorPageY - window.scrollY + "px";
  }
  var viewX = entry.anchorPageX - window.scrollX;
  var viewY = entry.anchorPageY - window.scrollY;
  layoutEditorCardFromViewportPoint(entry.shell, viewX, viewY);
}

function onViewportScrollOrResize() {
  syncAllMarkerDomPositions();
  repositionOpenEditorChrome();
}

var viewportListenersAttached = false;

function attachViewportScrollListenersOnce() {
  if (viewportListenersAttached) return;
  viewportListenersAttached = true;
  window.addEventListener("scroll", onViewportScrollOrResize, { passive: true });
  window.addEventListener("resize", onViewportScrollOrResize);
}

/**
 * Match React Review Mode: capture main prototype chrome (not comment overlays) and PATCH preview_image_url.
 */
async function captureStaticPreviewAndPatch(commentId) {
  await new Promise(function (resolve) {
    requestAnimationFrame(function () {
      requestAnimationFrame(resolve);
    });
  });
  try {
    var target =
      document.getElementById("app-root") ||
      document.getElementById("root") ||
      document.body;
    var dataUrl = await toJpeg(target, {
      quality: 0.47,
      pixelRatio: 0.3,
      cacheBust: true,
      filter: excludeCommentChromeFromPreviewCapture,
    });
    if (
      typeof dataUrl !== "string" ||
      dataUrl.length > PREVIEW_PATCH_MAX_URL_LENGTH
    ) {
      return;
    }
    await supabasePatch(COMMENTS_TABLE, commentId, {
      preview_image_url: dataUrl,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[comment-mode] Preview snapshot skipped:", err);
  }
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
  if (!btn) return;
  btn.classList.toggle("is-comment-mode-active", active);
  btn.classList.toggle("is-active", active);
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
  if (!(el instanceof Element)) return true;
  if (el.closest("[data-review-mode-ui='true']")) return true;
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
 *   INSERT — text, page_url, x_position, y_position, x_ratio, y_ratio,
 *            viewport_width, viewport_height, session_id, version
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
  var version = getPrototypeVersionIdFromWindow();

  var vw =
    typeof window !== "undefined" && window.innerWidth > 0
      ? window.innerWidth
      : 0;
  var vh =
    typeof window !== "undefined" && window.innerHeight > 0
      ? window.innerHeight
      : 0;
  var insertPayload = {
    text: storageText,
    page_url: pageUrl,
    x_position: record.x,
    y_position: record.y,
    session_id: sessionId,
    version: version,
    status: "unresolved",
  };
  if (vw > 0 && vh > 0) {
    var vx =
      record.positionAnchor === "viewport"
        ? record.x
        : record.x - window.scrollX;
    var vy =
      record.positionAnchor === "viewport"
        ? record.y
        : record.y - window.scrollY;
    insertPayload.x_ratio = Math.min(1, Math.max(0, vx / vw));
    insertPayload.y_ratio = Math.min(1, Math.max(0, vy / vh));
    insertPayload.viewport_width = Math.round(vw);
    insertPayload.viewport_height = Math.round(vh);
  }

  var rows = await supabaseInsert(COMMENTS_TABLE, insertPayload);
  var inserted = Array.isArray(rows) ? rows[0] : rows;
  if (!inserted || inserted.id == null) {
    throw new Error("Insert did not return a row id");
  }
  record.id = inserted.id;
}

/**
 * Load saved pins for this `page_url` + `version` (all sessions) and draw markers (after refresh).
 */
async function loadCommentsFromSupabase() {
  var pageUrl = getPageUrlForQuery();
  var sessionId = getOrCreateSessionId();
  var version = getPrototypeVersionIdFromWindow();
  var rows;
  try {
    rows = await fetchCommentsForPage(pageUrl, sessionId, version, {
      filterBySession: false,
    });
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
      positionAnchor: inferPositionAnchorFromRow(row),
      text: parsed.body,
      authorName: parsed.authorName,
      authorPosition: parsed.authorPosition,
      status:
        row.status && String(row.status).toLowerCase() === "resolved"
          ? "resolved"
          : "unresolved",
    };
    state.comments.push(rec);
    renderMarker(rec);
  });
  syncAllMarkerDomPositions();
}

function openCommentEditor(pageX, pageY, existing) {
  // Only one editor at a time — silently dismiss any previously open one.
  closeOpenEditor();
  ensureLayer();
  var anchorPageX = existing
    ? existing.positionAnchor === "viewport"
      ? existing.x + window.scrollX
      : existing.x
    : pageX;
  var anchorPageY = existing
    ? existing.positionAnchor === "viewport"
      ? existing.y + window.scrollY
      : existing.y
    : pageY;
  var viewX = anchorPageX - window.scrollX;
  var viewY = anchorPageY - window.scrollY;
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
  pin.style.left = viewX + "px";
  pin.style.top = viewY + "px";

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
  var resolveBtn = null;
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
  if (
    existing &&
    existing.id != null &&
    existing.status !== "resolved"
  ) {
    resolveBtn = document.createElement("button");
    resolveBtn.type = "button";
    resolveBtn.className = "comment-mode-resolve";
    resolveBtn.setAttribute("aria-label", "Resolve comment");
    resolveBtn.setAttribute("title", "Resolve — remove from prototype, keep in overview");
    resolveBtn.textContent = "Resolve";
    card.classList.add("comment-mode-pin-card--has-delete");
  }

  card.appendChild(closeBtn);
  card.appendChild(fields);
  card.appendChild(submit);
  if (resolveBtn) card.appendChild(resolveBtn);
  if (deleteBtn) card.appendChild(deleteBtn);
  shell.appendChild(pin);
  shell.appendChild(card);
  state.layer.appendChild(shell);

  state.openEditor = {
    shell: shell,
    existing: existing || null,
    anchorPageX: anchorPageX,
    anchorPageY: anchorPageY,
  };

  closeBtn.addEventListener("click", function (ev) {
    ev.preventDefault();
    ev.stopPropagation();
    closeOpenEditor();
  });

  layoutEditorCardFromViewportPoint(shell, viewX, viewY);

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

  if (resolveBtn) {
    resolveBtn.addEventListener("click", async function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      if (!existing || existing.id == null) return;
      if (
        !window.confirm(
          "Resolve this comment? It will no longer appear on the prototype but will stay in Comments overview.",
        )
      )
        return;
      var resolvedAt = new Date().toISOString();
      try {
        await supabasePatch(COMMENTS_TABLE, existing.id, {
          status: "resolved",
          resolved_at: resolvedAt,
          updated_at: resolvedAt,
        });
      } catch (err) {
        console.error("Comment resolve failed:", err);
        alert("Could not resolve this comment. Please try again.");
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
      x: existing && existing.id != null ? existing.x : pageX,
      y: existing && existing.id != null ? existing.y : pageY,
      positionAnchor:
        existing && existing.id != null
          ? existing.positionAnchor || "page"
          : "page",
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
    if (idx >= 0) {
      record.status =
        existing && existing.status === "resolved" ? "resolved" : "unresolved";
      state.comments[idx] = record;
    } else {
      record.status = "unresolved";
      state.comments.push(record);
    }

    document
      .querySelectorAll('.comment-mode-marker[data-db-id="' + record.id + '"]')
      .forEach(function (n) {
        n.remove();
      });

    state.openEditor = null;
    shell.remove();
    renderMarker(record);
    exitCommentMode();

    if (!isUpdate && record.id != null) {
      void captureStaticPreviewAndPatch(record.id);
    }
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
  var pos = markerFixedTopLeft(record);
  btn.style.left = pos.left + "px";
  btn.style.top = pos.top + "px";

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
    // Same ignore list as placement mode: Review Mode panel/launcher must stay clickable
    // (e.g. #close-test-card) even though this handler runs in the capture phase.
    if (shouldIgnorePlacementTarget(ev.target)) return;
    ev.preventDefault();
    ev.stopPropagation();
    closeOpenEditor();
    return;
  }

  if (!state.commentMode) return;
  if (shouldIgnorePlacementTarget(ev.target)) return;

  ev.preventDefault();
  ev.stopPropagation();

  var pxy = eventPageXY(ev);
  openCommentEditor(pxy.x, pxy.y, null);
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
  attachViewportScrollListenersOnce();
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
