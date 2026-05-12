/**
 * Mirrors `parseStoredComment` in `assets/comment-mode.js` — packed META + BODY in `text`.
 */
export function parseStoredComment(raw) {
  if (typeof raw !== "string" || raw.indexOf("<<META>>\n") !== 0) {
    return {
      authorName: "",
      authorPosition: "",
      body: raw || "",
    };
  }
  const sep = "\n<<BODY>>\n";
  const idx = raw.indexOf(sep);
  if (idx === -1) {
    return { authorName: "", authorPosition: "", body: raw };
  }
  const metaBlock = raw.slice("<<META>>\n".length, idx);
  const body = raw.slice(idx + sep.length);
  let authorName = "";
  let authorPosition = "";
  metaBlock.split("\n").forEach((line) => {
    if (line.indexOf("name:") === 0) authorName = line.slice(5).trim();
    else if (line.indexOf("position:") === 0)
      authorPosition = line.slice(9).trim();
  });
  return { authorName, authorPosition, body };
}
