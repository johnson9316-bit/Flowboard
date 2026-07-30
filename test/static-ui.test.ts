import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createTaskfoldStaticUiHandler } from "../src/ui-static.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function createUiRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "taskfold-ui-"));
  roots.push(root);
  fs.mkdirSync(path.join(root, "assets"));
  fs.writeFileSync(path.join(root, "index.html"), "<!doctype html><title>taskfold</title>");
  fs.writeFileSync(path.join(root, "assets", "app.js"), "console.log('taskfold');");
  return root;
}

async function request(
  root: string,
  requestPath: string,
  method = "GET",
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  const server = http.createServer((req, res) => createTaskfoldStaticUiHandler(root)(req, res));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Test server did not expose a TCP address.");
  }
  try {
    return await new Promise((resolve, reject) => {
      const request = http.request(
        {
          host: "127.0.0.1",
          method,
          path: requestPath,
          port: address.port,
        },
        (response) => {
          let body = "";
          response.setEncoding("utf8");
          response.on("data", (chunk) => {
            body += chunk;
          });
          response.on("end", () =>
            resolve({
              status: response.statusCode ?? 0,
              headers: response.headers,
              body,
            }),
          );
        },
      );
      request.on("error", reject);
      request.end();
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe("taskfold static Control UI route", () => {
  it("serves immutable assets and SPA fallbacks", async () => {
    const root = createUiRoot();
    const asset = await request(root, "/taskfold/assets/app.js");
    const fallback = await request(root, "/taskfold/cards/card-1");

    expect(asset.status).toBe(200);
    expect(asset.headers["cache-control"]).toContain("immutable");
    expect(asset.headers["content-type"]).toContain("text/javascript");
    expect(fallback.status).toBe(200);
    expect(fallback.body).toContain("taskfold");
  });

  it("rejects missing assets, encoded traversal, and non-read methods", async () => {
    const root = createUiRoot();

    await expect(request(root, "/taskfold/assets/missing.js")).resolves.toMatchObject({ status: 404 });
    await expect(request(root, "/taskfold/%2e%2e/secret")).resolves.toMatchObject({ status: 404 });
    await expect(request(root, "/taskfold/", "POST")).resolves.toMatchObject({ status: 405 });
  });
});
