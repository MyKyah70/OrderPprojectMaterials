import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the material request workflow", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Material Request \| 3D Technology Services<\/title>/i);
  assert.match(html, /Order project/);
  assert.match(html, /Normal/);
  assert.match(html, /Rush/);
  assert.match(html, /Urgent/);
  assert.match(html, /Part number/);
  assert.match(html, /Manufacturer/);
  assert.match(html, /Project number/);
  assert.match(html, /Submit material request/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});
