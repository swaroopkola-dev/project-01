import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/App.css", import.meta.url), "utf8");
const lines = css.split(/\r?\n/);
let depth = 0;
let mediaDepth = 0;
let sawMedia = false;
let globalSelector = "";
const declarations = [];
let selectorBuffer = "";

for (let i = 0; i < lines.length; i += 1) {
  const raw = lines[i];
  const line = raw.trim();
  if (!line) continue;

  if (line.startsWith("@media")) {
    sawMedia = true;
    mediaDepth += 1;
  }

  if (depth === 0 && !line.startsWith("@") && line.endsWith("{")) {
    selectorBuffer = line.slice(0, -1).trim();
    if (sawMedia) {
      declarations.push({ selector: selectorBuffer, line: i + 1 });
    } else {
      globalSelector = selectorBuffer;
    }
  }

  for (const char of raw) {
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0 && mediaDepth > 0) mediaDepth -= 1;
    }
  }
}

const unexpected = declarations.filter(({ selector }) =>
  !selector.startsWith(":root") &&
  !selector.startsWith("*") &&
  !selector.startsWith("@")
);

if (unexpected.length) {
  console.error("CSS self-check failed: global selectors were found after responsive blocks.");
  for (const item of unexpected) console.error(item.line + ": " + item.selector);
  process.exit(1);
}

console.log("CSS self-check: PASS — no late global selector declarations after responsive media rules.");
