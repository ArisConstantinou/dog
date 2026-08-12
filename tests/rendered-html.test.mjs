import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders Leo's interactive 3D companion", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Leo — Always With You<\/title>/i);
  assert.match(html, /Come sit with/);
  assert.match(html, /Interactive companion/);
  assert.match(html, /Talk to Leo/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("Leo uses a rigged model instead of disconnected primitive shapes", async () => {
  const source = await readFile(new URL("../app/Leo3D.tsx", import.meta.url), "utf8");
  assert.match(source, /SketchfabAnimation/);
  assert.match(source, /leo-rigged-fallback\.glb/);
  assert.doesNotMatch(source, /sphereGeometry|capsuleGeometry/);

  const fallback = await stat(new URL("../public/models/leo-rigged-fallback.glb", import.meta.url));
  assert.ok(fallback.size > 100_000, "expected a real rigged binary model asset");
});

test("one-shot commands return Leo to Ready instead of looping forever", async () => {
  const source = await readFile(new URL("../app/LeoApp.tsx", import.meta.url), "utf8");
  assert.match(source, /action:\s*id === "stay" \|\| id === "sleep" \? id : "Ready"/);
  assert.match(source, /stored\.stay \? "stay" : stored\.pose === "sleep" \? "sleep" : "Ready"/);
});
