/**
 * Minimal Supabase REST client for static prototypes (no bundler required).
 * Uses the anon key; ensure RLS policies allow the operations you need.
 */

export const SUPABASE_URL = "https://sctpnjrcluonpomdtnfp.supabase.co";
export const SUPABASE_ANON_KEY =
  "sb_publishable_cT4PL23N5w0B9bfUk1gHCg_9IE__PyV";

const writeHeaders = {
  "Content-Type": "application/json",
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  Prefer: "return=representation",
};

const readHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  Accept: "application/json",
};

/**
 * POST a row to any table; returns parsed JSON array when Prefer: return=representation.
 */
export async function supabaseInsert(table, payload) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: writeHeaders,
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }
  return response.json();
}

/**
 * PATCH row by primary key `id` (int8 or uuid — encoded in query).
 */
export async function supabasePatch(table, rowId, payload) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(String(rowId))}`,
    {
      method: "PATCH",
      headers: writeHeaders,
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : [];
}

/**
 * Load `comments` for this browser session and page (PostgREST filter + order).
 */
export async function fetchCommentsForPage(pageUrl, sessionId) {
  var filter =
    "page_url=eq." +
    encodeURIComponent(pageUrl) +
    "&session_id=eq." +
    encodeURIComponent(sessionId);
  var response = await fetch(
    `${SUPABASE_URL}/rest/v1/comments?select=*&${filter}&order=created_at.asc`,
    { headers: readHeaders },
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }
  return response.json();
}
