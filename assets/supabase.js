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
  "Content-Type": "application/json",
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  Accept: "application/json",
};

/**
 * Read non-OK response body once, log it loudly, then surface a thrown Error
 * so the caller can decide how to react (we never silently swallow failures).
 */
async function throwWithLoggedBody(action, response) {
  let body = "";
  try {
    body = await response.text();
  } catch (_e) {
    body = "<unreadable response body>";
  }
  console.error(
    `[supabase] ${action} failed: ${response.status} ${response.statusText}`,
    body,
  );
  throw new Error(
    `Supabase ${action} failed (${response.status}): ${body || response.statusText}`,
  );
}

/**
 * POST a row. Returns parsed JSON array (Prefer: return=representation).
 */
export async function supabaseInsert(table, payload) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: writeHeaders,
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    await throwWithLoggedBody(`INSERT ${table}`, response);
  }
  return response.json();
}

/**
 * PATCH row by primary key `id` (int8 or uuid — encoded once in the value).
 */
export async function supabasePatch(table, rowId, payload) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  url.searchParams.set("id", `eq.${String(rowId)}`);
  const response = await fetch(url.toString(), {
    method: "PATCH",
    headers: writeHeaders,
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    await throwWithLoggedBody(`PATCH ${table}`, response);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : [];
}

/**
 * DELETE row by primary key `id`.
 */
export async function supabaseDelete(table, rowId) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  url.searchParams.set("id", `eq.${String(rowId)}`);
  const response = await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!response.ok) {
    await throwWithLoggedBody(`DELETE ${table}`, response);
  }
}

/**
 * GET comments for the current `page_url` and `session_id`.
 *
 * IMPORTANT: Each PostgREST filter is its own query parameter. We use
 * URLSearchParams so only the *values* are URL-encoded — never the whole
 * query string. The shape is:
 *   ?select=*&page_url=eq.<encoded url>&session_id=eq.<uuid>&order=created_at.asc
 */
export async function fetchCommentsForPage(pageUrl, sessionId) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/comments`);
  url.searchParams.set("select", "*");
  url.searchParams.set("page_url", `eq.${pageUrl}`);
  url.searchParams.set("session_id", `eq.${sessionId}`);
  url.searchParams.set("order", "created_at.asc");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: readHeaders,
  });
  if (!response.ok) {
    await throwWithLoggedBody("SELECT comments", response);
  }
  return response.json();
}
