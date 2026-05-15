import {
  fetchCommentsForPage,
  fetchCommentsOverview,
  supabaseDelete,
  supabaseInsert,
  supabasePatch,
} from "../../assets/supabase.js";
import {
  parseStoredComment,
  serializeStoredComment,
} from "../features/review-mode/utils/commentSerialization.js";
import { inferCommentPositionAnchor } from "../features/review-mode/utils/commentPositionAnchor.js";

const COMMENTS_TABLE = "comments";

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toNullableRatio(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : null;
}

function toNullablePositiveInt(value) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toNullablePreviewImageUrl(value) {
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;
  if (s.startsWith("https://") || s.startsWith("http://") || s.startsWith("data:image/")) {
    return s;
  }
  return null;
}

function normalizeComment(row) {
  const parsed = parseStoredComment(row?.text || "");
  const version =
    row?.version != null && row.version !== "" ? String(row.version) : null;
  const rawStatus = row?.status != null ? String(row.status).toLowerCase() : "";
  const status = rawStatus === "resolved" ? "resolved" : "unresolved";
  return {
    id: row?.id ?? null,
    pageUrl: row?.page_url ?? "",
    sessionId: row?.session_id != null ? String(row.session_id) : "",
    version,
    status,
    resolvedAt: row?.resolved_at ?? null,
    x: toNumber(row?.x_position),
    y: toNumber(row?.y_position),
    positionAnchor: inferCommentPositionAnchor(row),
    xRatio: toNullableRatio(row?.x_ratio),
    yRatio: toNullableRatio(row?.y_ratio),
    viewportWidth: toNullablePositiveInt(row?.viewport_width),
    viewportHeight: toNullablePositiveInt(row?.viewport_height),
    previewImageUrl: toNullablePreviewImageUrl(row?.preview_image_url),
    body: parsed.body,
    authorName: parsed.authorName,
    authorPosition: parsed.authorPosition,
    createdAt: row?.created_at ?? null,
    updatedAt: row?.updated_at ?? null,
  };
}

export function createSupabaseCommentRepository() {
  return {
    async listForPage({ pageUrl, sessionId, version }) {
      const rows = await fetchCommentsForPage(pageUrl, sessionId, version, {
        onlyUnresolved: true,
        filterBySession: false,
      });
      return Array.isArray(rows) ? rows.map(normalizeComment) : [];
    },

    async listAll(filters = {}) {
      const rows = await fetchCommentsOverview({
        pageUrl: filters.pageUrl,
        sessionId: filters.sessionId,
        version: filters.version,
        status: filters.status,
      });
      return Array.isArray(rows) ? rows.map(normalizeComment) : [];
    },

    async create(comment) {
      const rows = await supabaseInsert(COMMENTS_TABLE, {
        text: serializeStoredComment(comment),
        page_url: comment.pageUrl,
        x_position: comment.x,
        y_position: comment.y,
        session_id: comment.sessionId,
        version: comment.version,
        x_ratio: toNullableRatio(comment.xRatio),
        y_ratio: toNullableRatio(comment.yRatio),
        viewport_width: toNullablePositiveInt(comment.viewportWidth),
        viewport_height: toNullablePositiveInt(comment.viewportHeight),
        status: "unresolved",
      });
      const inserted = Array.isArray(rows) ? rows[0] : rows;
      return normalizeComment(inserted);
    },

    async patchPreviewThumbnail(commentId, previewImageUrl) {
      const safe = toNullablePreviewImageUrl(previewImageUrl);
      if (commentId == null || !safe) return null;
      const rows = await supabasePatch(COMMENTS_TABLE, commentId, {
        preview_image_url: safe,
        updated_at: new Date().toISOString(),
      });
      const updated = Array.isArray(rows) ? rows[0] : rows;
      return updated ? normalizeComment(updated) : null;
    },

    async update(comment) {
      const rows = await supabasePatch(COMMENTS_TABLE, comment.id, {
        text: serializeStoredComment(comment),
        updated_at: new Date().toISOString(),
      });
      const updated = Array.isArray(rows) ? rows[0] : rows;
      return updated
        ? normalizeComment(updated)
        : {
            ...comment,
            updatedAt: new Date().toISOString(),
          };
    },

    async resolve(commentId) {
      if (commentId == null) return null;
      const resolvedAt = new Date().toISOString();
      const rows = await supabasePatch(COMMENTS_TABLE, commentId, {
        status: "resolved",
        resolved_at: resolvedAt,
        updated_at: resolvedAt,
      });
      const updated = Array.isArray(rows) ? rows[0] : rows;
      return updated ? normalizeComment(updated) : null;
    },

    async remove(commentId) {
      await supabaseDelete(COMMENTS_TABLE, commentId);
    },
  };
}
