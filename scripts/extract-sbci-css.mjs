import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "sbci-hub-v1.html");
const outPath = path.join(root, "src", "styles", "sbci-hub.css");

const h = fs.readFileSync(htmlPath, "utf8");
const m = h.match(/<style>([\s\S]*?)<\/style>/);
if (!m) throw new Error("No <style> block in sbci-hub-v1.html");

let css = m[1];
css = css.replace(/url\("assets\//g, 'url("/assets/');
css = css.replace(/url\('assets\//g, "url('/assets/");

const banner =
  "/* SBCI Hub design system — extracted from legacy static HTML (sbci-hub-v1.html). Imported globally for React. */\n";

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, banner + css);
console.log("Wrote", outPath, fs.statSync(outPath).size, "bytes");
