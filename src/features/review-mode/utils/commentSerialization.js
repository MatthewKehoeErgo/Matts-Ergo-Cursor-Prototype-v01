const META_PREFIX = "<<META>>\n";
const BODY_SEPARATOR = "\n<<BODY>>\n";

function sanitizeMetaLine(value) {
  return String(value || "").replace(/\r?\n/g, " ").trim();
}

export function serializeStoredComment({
  authorName = "",
  authorPosition = "",
  body = "",
  coordinateSpace,
}) {
  const coordLine =
    coordinateSpace === "scroll_root"
      ? `coord_space:${coordinateSpace}\n`
      : "";
  return (
    META_PREFIX +
    `name:${sanitizeMetaLine(authorName)}\n` +
    `position:${sanitizeMetaLine(authorPosition)}\n` +
    coordLine +
    BODY_SEPARATOR +
    String(body || "").trim()
  );
}

export function parseStoredComment(raw) {
  if (typeof raw !== "string" || raw.indexOf(META_PREFIX) !== 0) {
    return {
      authorName: "",
      authorPosition: "",
      body: raw || "",
      coordinateSpace: undefined,
    };
  }

  const sepIndex = raw.indexOf(BODY_SEPARATOR);
  if (sepIndex === -1) {
    return {
      authorName: "",
      authorPosition: "",
      body: raw,
      coordinateSpace: undefined,
    };
  }

  const metaBlock = raw.slice(META_PREFIX.length, sepIndex);
  const body = raw.slice(sepIndex + BODY_SEPARATOR.length);
  let authorName = "";
  let authorPosition = "";
  let coordinateSpace;

  metaBlock.split("\n").forEach((line) => {
    if (line.indexOf("name:") === 0) authorName = line.slice(5).trim();
    else if (line.indexOf("position:") === 0) {
      authorPosition = line.slice(9).trim();
    } else if (line.indexOf("coord_space:") === 0) {
      const v = line.slice(12).trim();
      if (v === "scroll_root") coordinateSpace = "scroll_root";
    }
  });

  return { authorName, authorPosition, body, coordinateSpace };
}
