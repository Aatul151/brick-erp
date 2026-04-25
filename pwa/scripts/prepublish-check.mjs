import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envFiles = [".env.local", ".env"];
const envMap = new Map();

function parseEnv(content) {
  const out = new Map();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out.set(key, value);
  }
  return out;
}

for (const relFile of envFiles) {
  const absFile = path.join(root, relFile);
  if (!fs.existsSync(absFile)) continue;
  const parsed = parseEnv(fs.readFileSync(absFile, "utf8"));
  for (const [key, value] of parsed.entries()) {
    if (!envMap.has(key)) envMap.set(key, value);
  }
}

const appName = envMap.get("NEXT_PUBLIC_APP_NAME") ?? process.env.NEXT_PUBLIC_APP_NAME ?? "";
const appUrl = envMap.get("NEXT_PUBLIC_APP_URL") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

const errors = [];

if (!appName || appName.toLowerCase().includes("example")) {
  errors.push("NEXT_PUBLIC_APP_NAME is missing or still placeholder.");
}

if (!appUrl || appUrl.includes("example.com")) {
  errors.push("NEXT_PUBLIC_APP_URL is missing or still placeholder.");
} else {
  try {
    const url = new URL(appUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      errors.push("NEXT_PUBLIC_APP_URL must use http or https.");
    }
  } catch {
    errors.push("NEXT_PUBLIC_APP_URL is not a valid URL.");
  }
}

if (errors.length > 0) {
  console.error("Pre-publish check failed:");
  for (const err of errors) {
    console.error(`- ${err}`);
  }
  console.error("\nSet values in .env.local, then run: npm run prepublish-check");
  process.exit(1);
}

console.log("Pre-publish check passed.");
console.log(`- NEXT_PUBLIC_APP_NAME: ${appName}`);
console.log(`- NEXT_PUBLIC_APP_URL: ${appUrl}`);
