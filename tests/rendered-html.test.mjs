import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
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

test("Leo uses only the optimized owner-selected Meshy GLB", async () => {
  const bridge = await readFile(new URL("../app/Leo3D.tsx", import.meta.url), "utf8");
  const source = await readFile(new URL("../app/Leo3DTopology.tsx", import.meta.url), "utf8");
  assert.match(bridge, /Leo3DTopology/);
  assert.match(source, /models\/leo\.glb/);
  assert.match(source, /data-motion-system="topology-deformation"/);
  assert.doesNotMatch(source, /Sketchfab|leo-detailed|leo-rigged-fallback/);
  assert.doesNotMatch(source, /sphereGeometry|capsuleGeometry/);

  const modelDirectory = new URL("../public/models/", import.meta.url);
  const glbFiles = (await readdir(modelDirectory)).filter((name) => name.endsWith(".glb"));
  assert.deepEqual(glbFiles, ["leo.glb"]);
  const detailed = await stat(new URL("../public/models/leo.glb", import.meta.url));
  assert.ok(detailed.size > 7_000_000 && detailed.size < 9_000_000, "expected the optimized Meshy runtime asset");
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

test("topology motion responds to Leo's current action", async () => {
  const source = await readFile(new URL("../app/Leo3DTopology.tsx", import.meta.url), "utf8");
  assert.match(source, /calculateMotion\(action, elapsed, time, reducedMotion\)/);
  assert.match(source, /uLeoHeadYaw/);
  assert.match(source, /uLeoTailWag/);
  assert.match(source, /uLeoGait/);
  assert.match(source, /data-topology-action=\{action\.toLowerCase\(\)\}/);
});

test("resting poses hold instead of endlessly replaying a transition", async () => {
  const source = await readFile(new URL("../app/Leo3DTopology.tsx", import.meta.url), "utf8");
  assert.match(source, /if \(elapsed < duration && !reducedMotion\)/);
  assert.match(source, /command === "jump" && elapsed < 1\.45/);
  assert.match(source, /command === "spin" && elapsed < 1\.7/);
  assert.match(source, /\["sit", "stay"\]\.includes\(command\)/);
  assert.doesNotMatch(source, /AnimationMixer|LoopRepeat/);
});

test("Leo keeps the photographed coat patches on their corrected sides", async () => {
  const source = await readFile(new URL("../app/Leo3DTopology.tsx", import.meta.url), "utf8");
  assert.match(source, /material\.vertexColors = true/);
  assert.match(source, /leo-topology-motion-v1/);
  assert.doesNotMatch(source, /leoRearPatch|leoShoulderPatch|leoWhiteFurUv|#ff00ff/);
});

test("autonomous behavior returns to the user's requested pose", async () => {
  const source = await readFile(new URL("../app/LeoApp.tsx", import.meta.url), "utf8");
  assert.match(source, /const returnPose = current\.pose/);
  assert.match(source, /pose: returnPose,\s*action: "Ready"/);
  assert.doesNotMatch(source, /pose: behavior\.endPose/);
});

test("topology regions cover head, tail, legs, paw, rear body, and spine", async () => {
  const source = await readFile(new URL("../app/Leo3DTopology.tsx", import.meta.url), "utf8");
  for (const region of ["leoHead", "leoTail", "leoFrontLeg", "leoRearLeg", "leoRaisedPaw", "leoRearBody", "leoSpine"]) {
    assert.match(source, new RegExp(region));
  }
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /window\.__leoAnimationTime/);
});

test("command timing keeps the topology actions bounded", async () => {
  const appSource = await readFile(new URL("../app/LeoApp.tsx", import.meta.url), "utf8");
  assert.match(appSource, /spin: \{[^}]+duration: 2150/);
  assert.match(appSource, /"roll-over": \{[^}]+duration: 4200/);
  assert.match(appSource, /dig: \{[^}]+duration: 4200/);
  assert.match(appSource, /const runCommand = \(id: string\) => \{\s*dispatch\(id\);\s*setExpanded\(false\)/);
});
