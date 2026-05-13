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

const COMMENTS_TABLE = "comments";

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toNullableRatio(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : null;
}

function normalizeComment(row) {
  const parsed = parseStoredComment(row?.text || "");
  return {
    id: row?.id ?? null,
    pageUrl: row?.page_url ?? "",
    sessionId: row?.session_id != null ? String(row.session_id) : "",
    x: toNumber(row?.x_position),
    y: toNumber(row?.y_position),
    xRatio: toNullableRatio(row?.x_ratio),
    yRatio: toNullableRatio(row?.y_ratio),
    body: parsed.body,
    authorName: parsed.authorName,
    authorPosition: parsed.authorPosition,
    createdAt: row?.created_at ?? null,
    updatedAt: row?.updated_at ?? null,
  };
}

export function createSupabaseCommentRepository() {
  return {
    async listForPage({ pageUrl, sessionId }) {
      const rows = await fetchCommentsForPage(pageUrl, sessionId);
      return Array.isArray(rows) ? rows.map(normalizeComment) : [];
    },

    async listAll(filters = {}) {
      const rows = await fetchCommentsOverview({
        pageUrl: filters.pageUrl,
        sessionId: filters.sessionId,
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
      });
      const inserted = Array.isArray(rows) ? rows[0] : rows;
      return normalizeComment(inserted);
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

    async remove(commentId) {
      await supabaseDelete(COMMENTS_TABLE, commentId);
    },
  };
}
