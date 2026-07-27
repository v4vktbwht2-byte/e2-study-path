import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const distDirectory = path.resolve(process.argv[2] ?? "dist");

function normalizeBasePath(value) {
  const candidate = value?.trim() || "/";
  const withLeadingSlash = candidate.startsWith("/") ? candidate : `/${candidate}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

const expectedBasePath = normalizeBasePath(
  process.env.EXPECTED_BASE_PATH ?? process.env.VITE_BASE_PATH,
);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function assertFile(relativePath) {
  const normalizedPath = relativePath.replaceAll("/", path.sep);
  const resolvedPath = path.resolve(distDirectory, normalizedPath);
  const pathWithinDist = path.relative(distDirectory, resolvedPath);
  assert(
    pathWithinDist !== ".." &&
      !pathWithinDist.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(pathWithinDist),
    `公開artifact外を参照しています: ${relativePath}`,
  );
  await access(resolvedPath);
}

async function listFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path.join(directory, entry.name), relativePath)));
    } else {
      files.push(relativePath);
    }
  }
  return files;
}

const requiredFiles = [
  "index.html",
  "offline.html",
  "manifest.webmanifest",
  "service-worker.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "content/pilot-core-ja-original/0.7.0/index.json",
];
await Promise.all(requiredFiles.map(assertFile));

const manifest = JSON.parse(
  await readFile(path.join(distDirectory, "manifest.webmanifest"), "utf8"),
);
assert(manifest.id === expectedBasePath, "manifest.idがbase pathと一致しません。");
assert(
  manifest.start_url === expectedBasePath,
  "manifest.start_urlがbase pathと一致しません。",
);
assert(
  manifest.scope === expectedBasePath,
  "manifest.scopeがbase pathと一致しません。",
);
assert(
  manifest.display === "standalone",
  "manifest.displayがstandaloneではありません。",
);
assert(manifest.lang === "ja", "manifest.langがjaではありません。");

for (const requiredIcon of [
  ["192x192", "any"],
  ["512x512", "any"],
  ["512x512", "maskable"],
]) {
  const icon = manifest.icons?.find(
    (candidate) =>
      candidate.sizes === requiredIcon[0] &&
      (candidate.purpose ?? "any") === requiredIcon[1],
  );
  assert(icon?.src, `${requiredIcon.join(" / ")}のPWA iconがありません。`);
  await assertFile(icon.src);
}

const indexHtml = await readFile(path.join(distDirectory, "index.html"), "utf8");
const localReferences = [...indexHtml.matchAll(/\b(?:href|src)="([^"]+)"/gu)].map(
  (match) => match[1],
);
for (const reference of localReferences) {
  if (
    reference.startsWith("data:") ||
    reference.startsWith("http://") ||
    reference.startsWith("https://") ||
    reference.startsWith("#")
  ) {
    continue;
  }
  if (reference.startsWith("/")) {
    assert(
      reference.startsWith(expectedBasePath),
      `index.htmlにbase path外の参照があります: ${reference}`,
    );
  }
  const relativePath = reference.startsWith(expectedBasePath)
    ? reference.slice(expectedBasePath.length)
    : reference.replace(/^\.\//u, "");
  await assertFile(relativePath);
}

const workerSource = await readFile(
  path.join(distDirectory, "service-worker.js"),
  "utf8",
);
assert(workerSource.includes("SKIP_WAITING"), "更新用message handlerがありません。");
assert(
  workerSource.includes(
    `${expectedBasePath}content/pilot-core-ja-original/0.7.0/index.json`,
  ),
  "starter教材がbase path付きprecacheへ含まれていません。",
);

const files = await listFiles(distDirectory);
assert(
  files.every((file) => !file.endsWith(".map")),
  "公開artifactにsource mapが含まれています。",
);

console.log(
  `Production artifact validation passed: base=${expectedBasePath}, files=${files.length}.`,
);
