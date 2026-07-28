import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";

const UI_PREFIX = "/flowboard/";
const MIME_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".woff2": "font/woff2",
};

function send(
  req: IncomingMessage,
  res: ServerResponse,
  status: number,
  headers: Record<string, string>,
  body?: Buffer,
): void {
  res.writeHead(status, headers);
  if (req.method !== "HEAD" && body) {
    res.end(body);
    return;
  }
  res.end();
}

function isWithinRoot(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== "..");
}

function resolveUiFile(root: string, requestPath: string): { filePath: string; fallback: boolean } | null {
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(requestPath);
  } catch {
    return null;
  }
  if (decodedPath.includes("\0") || decodedPath.includes("\\")) {
    return null;
  }

  const relativePath = decodedPath.slice(UI_PREFIX.length).replace(/^\/+/, "");
  const candidate = path.resolve(root, relativePath || "index.html");
  if (!isWithinRoot(root, candidate)) {
    return null;
  }
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return { filePath: candidate, fallback: false };
  }

  // Only extensionless application paths get the SPA document; missing assets stay 404.
  if (path.extname(relativePath) === "") {
    return { filePath: path.join(root, "index.html"), fallback: true };
  }
  return null;
}

export function createFlowboardStaticUiHandler(uiRoot?: string) {
  const root = path.resolve(
    uiRoot ?? fileURLToPath(new URL("../ui/dist/", import.meta.url)),
  );

  return (req: IncomingMessage, res: ServerResponse): boolean => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      send(req, res, 405, { Allow: "GET, HEAD" });
      return true;
    }

    const pathname = new URL(req.url ?? UI_PREFIX, "http://flowboard.local").pathname;
    if (!pathname.startsWith(UI_PREFIX)) {
      send(req, res, 404, {});
      return true;
    }

    const resolved = resolveUiFile(root, pathname);
    if (!resolved) {
      send(req, res, 404, { "Content-Type": "text/plain; charset=utf-8" }, Buffer.from("Not found"));
      return true;
    }

    try {
      const content = fs.readFileSync(resolved.filePath);
      const extension = path.extname(resolved.filePath).toLowerCase();
      const immutableAsset = pathname.includes("/assets/") && !resolved.fallback;
      send(
        req,
        res,
        200,
        {
          "Cache-Control": immutableAsset
            ? "public, max-age=31536000, immutable"
            : "no-cache",
          "Content-Type": MIME_TYPES[extension] ?? "application/octet-stream",
          "X-Content-Type-Options": "nosniff",
        },
        content,
      );
    } catch {
      send(req, res, 404, { "Content-Type": "text/plain; charset=utf-8" }, Buffer.from("Not found"));
    }
    return true;
  };
}
