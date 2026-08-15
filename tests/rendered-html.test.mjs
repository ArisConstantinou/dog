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
  assert.match(source, /HOSTED_MODEL_ENABLED = true/);
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

test("autonomous idle behaviors vary and yield to protected states", async () => {
  const source = await readFile(new URL("../app/LeoApp.tsx", import.meta.url), "utf8");
  assert.match(source, /recentAutonomy\.current\.includes\(behavior\.id\)/);
  assert.match(source, /current\.busy \|\| current\.stay \|\| current\.pose === "sleep"/);
  assert.match(source, /window\.render_game_to_text/);
  assert.match(source, /window\.advanceTime/);
});

test("Ready keeps the pose established by the completed command", async () => {
  const source = await readFile(new URL("../app/Leo3D.tsx", import.meta.url), "utf8");
  assert.match(source, /normalizedAction === "ready"\s*\? poseClipHints\[nextPose\]/);
  assert.match(source, /data-animation-clip=\{selectedClipName\}/);
});

test("resting poses hold instead of endlessly replaying a transition", async () => {
  const source = await readFile(new URL("../app/Leo3D.tsx", import.meta.url), "utf8");
  assert.match(source, /stand: \["idle 1", "idle 2", "idle 4", "idle"\]/);
  assert.match(source, /shouldLoop = forceLoop \?\? finiteLoopActions\.has\(normalizedAction\)/);
  assert.match(source, /data-animation-cycle=\{selectedCycleMode\}/);
  assert.match(source, /selected\.setLoop\(THREE\.LoopOnce, 1\)/);
  assert.match(source, /selected\.clampWhenFinished = true/);
  assert.doesNotMatch(source, /\["ready", "stay"\]\.includes/);
});

test("autonomous behavior returns to the user's requested pose", async () => {
  const source = await readFile(new URL("../app/LeoApp.tsx", import.meta.url), "utf8");
  assert.match(source, /const returnPose = current\.pose/);
  assert.match(source, /pose: returnPose,\s*action: "Ready"/);
  assert.doesNotMatch(source, /pose: behavior\.endPose/);
});

test("every animation family uses a safe camera frame and complete clips", async () => {
  const source = await readFile(new URL("../app/Leo3D.tsx", import.meta.url), "utf8");
  assert.match(source, /type CameraPreset = "standard" \| "low" \| "jump"/);
  assert.match(source, /data-camera-preset=\{selectedCameraPreset\}/);
  assert.match(source, /"roll-over": \["lie loop 2", "lie loop"\]/);
  assert.match(source, /dig: \["digging loop", "digging start"\]/);
  assert.match(source, /treat: \["eat loop", "eat 2", "eatdrink start"\]/);
  assert.match(source, /!shouldLoop && normalizedAction === "sleep"/);
  assert.doesNotMatch(source, /actionRef\.current === requestedAction/);
});

test("command timing follows the actual selected 3D clips", async () => {
  const appSource = await readFile(new URL("../app/LeoApp.tsx", import.meta.url), "utf8");
  assert.match(appSource, /spin: \{[^}]+duration: 2150/);
  assert.match(appSource, /"roll-over": \{[^}]+duration: 4200/);
  assert.match(appSource, /dig: \{[^}]+duration: 4200/);
  assert.match(appSource, /const runCommand = \(id: string\) => \{\s*dispatch\(id\);\s*setExpanded\(false\)/);
});
