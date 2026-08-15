"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LeoPose } from "./leo-data";

type ActorProps = {
  pose: LeoPose;
  action: string;
  onPet: () => void;
  compact?: boolean;
};

type SketchfabAnimation = [uid: string, name: string, duration: number];

type SketchfabApi = {
  start: () => void;
  addEventListener: (event: string, callback: (...args: unknown[]) => void, options?: Record<string, unknown>) => void;
  getAnimations: (callback: (error: unknown, animations: SketchfabAnimation[]) => void) => void;
  setCurrentAnimationByUID: (uid: string, callback?: (error: unknown) => void) => void;
  setCycleMode: (mode: "one" | "loopOne", callback?: (error: unknown) => void) => void;
  setSpeed: (speed: number, callback?: (error: unknown) => void) => void;
  seekTo: (seconds: number, callback?: (error: unknown) => void) => void;
  play: (callback?: (error: unknown) => void) => void;
  pause: (callback?: (error: unknown) => void) => void;
  focusOnVisibleGeometries: (callback?: (error: unknown) => void) => void;
  setCameraLookAt: (position: number[], target: number[], duration?: number, callback?: (error: unknown) => void) => void;
  setFov: (degrees: number, callback?: (error: unknown) => void) => void;
};

type SketchfabClient = {
  init: (uid: string, options: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    Sketchfab?: new (version: string, iframe: HTMLIFrameElement) => SketchfabClient;
    __leoSketchfabScript?: Promise<void>;
  }
}

const MODEL_UID = "e75a550f4a9b4d18bc1b45ca2e6f56d2";
const VIEWER_SCRIPT = "https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js";
const HOSTED_MODEL_ENABLED = false;

const actionClipHints: Record<string, string[]> = {
  ready: ["idle 1", "idle"],
  patted: ["idle 4", "idle 2", "idle"],
  come: ["walk f ip", "trot f ip", "walk"],
  sit: ["sitting start", "sitting loop"],
  down: ["lie start", "lie loop"],
  stay: ["sitting loop", "idle"],
  paw: ["sitting loop"],
  speak: ["idle 3", "idle 4", "idle"],
  spin: ["turn 180 l ip", "turn 180 r ip", "turn"],
  walk: ["walk f ip", "walk"],
  run: ["run f ip", "run"],
  jump: ["jump place", "jump up vert", "jump"],
  "roll-over": ["lie loop 2", "lie loop"],
  beg: ["sitting loop"],
  sniff: ["eat loop", "eat 2", "idle 2"],
  dig: ["digging loop", "digging start"],
  stretch: ["crouch idle start", "lie start"],
  zoomies: ["run f ip", "trot f ip", "run"],
  shake: ["idle 5 loop", "idle 5 start", "idle 4"],
  scratch: ["idle 5 loop", "idle 4", "sitting loop"],
  lick: ["eat 2", "eat loop", "idle 3"],
  "look-around": ["idle 2", "idle 4", "idle"],
  play: ["crouch idle loop", "crouch idle start", "crouch"],
  treat: ["eat loop", "eat 2", "eatdrink start"],
  sleep: ["lie sleep start", "lie sleep loop"],
  wake: ["lie sleep end", "lie end", "idle"],
  release: ["idle 1", "idle"],
};

const poseClipHints: Record<LeoPose, string[]> = {
  stand: ["idle 1", "idle 2", "idle 4", "idle"],
  sit: ["sitting loop", "sitting"],
  down: ["lie loop", "lie"],
  play: ["crouch idle loop", "crouch idle", "idle"],
  paw: ["sitting loop", "idle"],
  sleep: ["lie sleep loop", "lie loop"],
};

type CameraPreset = "standard" | "low" | "jump";

const lowCameraActions = new Set([
  "down", "roll-over", "sniff", "dig", "stretch", "scratch", "lick", "play", "treat", "sleep", "wake",
]);

const finiteLoopActions = new Set(["come", "walk", "run", "zoomies"]);

function cameraPresetFor(action: string, pose: LeoPose): CameraPreset {
  if (action.toLowerCase() === "jump") return "jump";
  if (lowCameraActions.has(action.toLowerCase()) || ["down", "play", "sleep"].includes(pose)) return "low";
  return "standard";
}

function cameraFrameFor(preset: CameraPreset, compact: boolean) {
  if (preset === "jump") return { position: compact ? [84, -100, 47] : [80, -95, 45], target: [-1.3, -5.9, 38] };
  if (preset === "low") return { position: compact ? [62, -74, 18] : [58, -70, 17], target: [-1.3, -5.9, 8.5] };
  return { position: compact ? [50, -60, 22] : [47, -56, 22], target: [-1.3, -5.9, 17.2] };
}

function loadViewerScript() {
  if (window.Sketchfab) return Promise.resolve();
  if (window.__leoSketchfabScript) return window.__leoSketchfabScript;

  window.__leoSketchfabScript = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${VIEWER_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Sketchfab viewer failed to load")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = VIEWER_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Sketchfab viewer failed to load"));
    document.head.appendChild(script);
  });
  return window.__leoSketchfabScript;
}

function chooseClip(animations: SketchfabAnimation[], hints: string[]) {
  const normalized = animations.map((clip) => ({ clip, name: clip[1].toLowerCase().replace(/[_|-]+/g, " ") }));
  for (const hint of hints) {
    const exactWord = normalized.find(({ name }) => name.split(/\s+/).includes(hint));
    if (exactWord) return exactWord.clip;
    const partial = normalized.find(({ name }) => name.includes(hint));
    if (partial) return partial.clip;
  }
  return normalized.find(({ name }) => name.includes("idle"))?.clip ?? animations[0];
}

export function Leo3D({ pose, action, onPet, compact = false }: ActorProps) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const api = useRef<SketchfabApi | null>(null);
  const clips = useRef<SketchfabAnimation[]>([]);
  const onPetRef = useRef(onPet);
  const returnToPoseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">(
    HOSTED_MODEL_ENABLED ? "loading" : "fallback",
  );
  const [selectedClipName, setSelectedClipName] = useState("");
  const [selectedCycleMode, setSelectedCycleMode] = useState<"one" | "loopOne">("one");
  const [selectedCameraPreset, setSelectedCameraPreset] = useState<CameraPreset>("standard");
  const actionRef = useRef(action);
  const poseRef = useRef(pose);

  useEffect(() => {
    onPetRef.current = onPet;
  }, [onPet]);

  const frameCamera = useCallback((nextAction: string, nextPose: LeoPose, duration = 0.28) => {
    if (!api.current) return;
    const preset = cameraPresetFor(nextAction, nextPose);
    const frame = cameraFrameFor(preset, compact);
    setSelectedCameraPreset(preset);
    api.current.setCameraLookAt(frame.position, frame.target, duration);
  }, [compact]);

  const playBasePose = useCallback((nextPose: LeoPose) => {
    if (!api.current || clips.current.length === 0) return;
    if (returnToPoseTimer.current) clearTimeout(returnToPoseTimer.current);
    const selected = chooseClip(clips.current, poseClipHints[nextPose]);
    if (!selected) return;
    const cycleMode = nextPose === "sleep" ? "loopOne" : "one";
    setSelectedClipName(selected[1]);
    setSelectedCycleMode(cycleMode);
    frameCamera("ready", nextPose);
    api.current.setCurrentAnimationByUID(selected[0], () => {
      api.current?.setCycleMode(cycleMode);
      api.current?.setSpeed(nextPose === "sleep" ? 0.72 : 1);
      api.current?.seekTo(0, () => api.current?.play());
    });
  }, [frameCamera]);

  const playClip = useCallback((nextAction: string, nextPose: LeoPose, forceLoop?: boolean) => {
    if (!api.current || clips.current.length === 0) return;
    if (returnToPoseTimer.current) clearTimeout(returnToPoseTimer.current);
    const normalizedAction = nextAction.toLowerCase();
    const hints = normalizedAction === "ready"
      ? poseClipHints[nextPose]
      : actionClipHints[normalizedAction] ?? poseClipHints[nextPose];
    const selected = chooseClip(clips.current, hints);
    if (!selected) return;
    setSelectedClipName(selected[1]);
    const shouldLoop = forceLoop ?? finiteLoopActions.has(normalizedAction);
    setSelectedCycleMode(shouldLoop ? "loopOne" : "one");
    frameCamera(normalizedAction, nextPose);
    api.current.setCurrentAnimationByUID(selected[0], (error) => {
      if (error) return;
      api.current?.setCycleMode(shouldLoop ? "loopOne" : "one");
      api.current?.setSpeed(nextAction === "zoomies" ? 1.35 : nextAction === "sleep" ? 0.72 : 1);
      api.current?.seekTo(0, () => api.current?.play());
      if (!shouldLoop && normalizedAction === "sleep") {
        returnToPoseTimer.current = setTimeout(() => {
          if (actionRef.current.toLowerCase() === "sleep") playBasePose("sleep");
        }, Math.max(450, selected[2] * 1000 + 80));
      }
    });
  }, [frameCamera, playBasePose]);

  useEffect(() => {
    actionRef.current = action;
    poseRef.current = pose;
    playClip(action, pose);
  }, [action, pose, playClip]);

  useEffect(() => {
    if (!HOSTED_MODEL_ENABLED) return;
    let cancelled = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

    loadViewerScript()
      .then(() => {
        if (cancelled || !iframe.current || !window.Sketchfab) return;
        const client = new window.Sketchfab("1.12.1", iframe.current);
        client.init(MODEL_UID, {
          autostart: 1,
          preload: 1,
          transparent: 1,
          ui_animations: 0,
          ui_annotations: 0,
          ui_controls: 0,
          ui_fullscreen: 0,
          ui_help: 0,
          ui_hint: 0,
          ui_infos: 0,
          ui_inspector: 0,
          ui_settings: 0,
          ui_stop: 0,
          ui_vr: 0,
          ui_watermark: 0,
          ui_watermark_link: 0,
          success: (viewerApi: SketchfabApi) => {
            api.current = viewerApi;
            viewerApi.start();
            viewerApi.addEventListener("viewerready", () => {
              if (cancelled) return;
              viewerApi.getAnimations((error, animations) => {
                if (error || !animations?.length) {
                  setStatus("fallback");
                  return;
                }
                clips.current = animations;
                viewerApi.setFov(compact ? 34 : 38);
                viewerApi.focusOnVisibleGeometries(() => {
                  window.setTimeout(() => frameCamera(actionRef.current, poseRef.current, 0.35), 300);
                });
                setStatus("ready");
                playClip(actionRef.current, poseRef.current);
              });
              viewerApi.addEventListener("click", () => onPetRef.current(), { pick: "fast" });
            });
          },
          error: () => setStatus("fallback"),
        });
        fallbackTimer = setTimeout(() => {
          if (!api.current) setStatus("fallback");
        }, 15000);
      })
      .catch(() => setStatus("fallback"));

    return () => {
      cancelled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (returnToPoseTimer.current) clearTimeout(returnToPoseTimer.current);
      api.current?.pause();
      api.current = null;
    };
  }, [compact, frameCamera, playClip]);

  return (
    <div className={`leo-3d rigged-leo ${compact ? "compact" : ""}`} role="group" aria-label={`3D Leo is performing: ${action}`} data-animation-clip={selectedClipName} data-animation-cycle={selectedCycleMode} data-camera-preset={selectedCameraPreset}>
      {status !== "fallback" && (
        <iframe
          ref={iframe}
          className="leo-viewer-frame"
          title="Interactive rigged 3D model of Leo"
          allow="autoplay; fullscreen; xr-spatial-tracking; accelerometer; gyroscope"
        />
      )}
      {status === "fallback" && <LocalRiggedLeo action={action} onPet={onPet} compact={compact} />}
      {status === "loading" && <div className="leo-model-loading"><i />Building Leo&rsquo;s 3D movement&hellip;</div>}
      <button className="pet-leo-control" type="button" onClick={onPet}>Pet Leo</button>
      <span className="drag-3d">Drag to look · smooth local 3D motion</span>
      {status !== "fallback" && <a className="model-credit" href="https://sketchfab.com/3d-models/jack-russell-terrier-animated-130-animations-e75a550f4a9b4d18bc1b45ca2e6f56d2" target="_blank" rel="noreferrer">3D model by RedDeer</a>}
    </div>
  );
}

function LocalRiggedLeo({ action, onPet, compact }: Pick<ActorProps, "action" | "onPet" | "compact">) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.6]}
      camera={{ position: compact ? [9, 4.8, 9] : [10, 5.3, 10], fov: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={1.8} />
      <hemisphereLight args={["#fff7e7", "#6f7b65", 1.25]} />
      <directionalLight castShadow position={[-4, 7, 5]} intensity={3.2} />
      <Suspense fallback={<Html center><span className="fallback-loading">Loading Leo&hellip;</span></Html>}>
        <FallbackDog action={action} onPet={onPet} compact={compact} />
      </Suspense>
      <ContactShadows position={[0, 0.02, 0]} opacity={0.35} scale={9} blur={2.2} far={8} />
      <OrbitControls target={[0.15, 1.75, 0]} enablePan={false} enableZoom={false} minPolarAngle={Math.PI * 0.22} maxPolarAngle={Math.PI * 0.5} />
    </Canvas>
  );
}

function FallbackDog({ action, onPet, compact }: Pick<ActorProps, "action" | "onPet" | "compact">) {
  const group = useRef<THREE.Group>(null);
  const dog = useRef<THREE.Group>(null);
  const actionStartedAt = useRef(0);
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/leo-detailed-v3.glb`);
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  useEffect(() => {
    actionStartedAt.current = performance.now() / 1000;
  }, [action]);

  useEffect(() => {
    const clonedMaterials: THREE.Material[] = [];
    clonedScene.traverse((object) => {
      if (!(object as THREE.Mesh).isMesh) return;
      const mesh = object as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const sourceMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const materials = sourceMaterials.map((source) => {
        if (!(source as THREE.MeshStandardMaterial).isMeshStandardMaterial) return source;
        const material = (source as THREE.MeshStandardMaterial).clone();
        clonedMaterials.push(material);
        material.roughness = 0.88;
        material.metalness = 0;
        if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
        material.onBeforeCompile = (shader) => {
          shader.vertexShader = shader.vertexShader
            .replace(
              "#include <common>",
              "#include <common>\nvarying vec3 vLeoModelPosition;",
            )
            .replace(
              "#include <begin_vertex>",
              "#include <begin_vertex>\nvLeoModelPosition = position;",
            );
          shader.fragmentShader = shader.fragmentShader
            .replace(
              "#include <common>",
              `#include <common>
varying vec3 vLeoModelPosition;

float leoPatchEllipsoid(vec3 point, vec3 center, vec3 radius) {
  vec3 normalizedPoint = (point - center) / radius;
  return 1.0 - smoothstep(0.82, 1.0, length(normalizedPoint));
}`,
            )
            .replace(
              "#include <map_fragment>",
              `#include <map_fragment>

float leoNegativeSide = 1.0 - smoothstep(-2.0, -0.8, vLeoModelPosition.x);
float leoPositiveSide = smoothstep(0.8, 2.0, vLeoModelPosition.x);
float leoRearPatch = leoPatchEllipsoid(
  vLeoModelPosition,
  vec3(4.35, 9.8, 14.0),
  vec3(2.6, 4.7, 3.9)
) * leoPositiveSide;
float leoShoulderPatch = leoPatchEllipsoid(
  vLeoModelPosition,
  vec3(-4.35, -4.8, 11.0),
  vec3(2.7, 3.8, 3.0)
) * leoNegativeSide;
float leoOldShoulderPatch = leoPatchEllipsoid(
  vLeoModelPosition,
  vec3(0.0, -4.2, 12.8),
  vec3(7.0, 6.0, 5.2)
);
float leoBackArtifactErase = leoPatchEllipsoid(
  vLeoModelPosition,
  vec3(0.0, 14.9, 19.2),
  vec3(7.0, 2.7, 3.6)
);
float leoRedBackSpotErase = leoPatchEllipsoid(
  vLeoModelPosition,
  vec3(0.0, 12.7, 21.2),
  vec3(4.0, 2.4, 2.3)
);
float leoNeckErase = leoPatchEllipsoid(
  vLeoModelPosition,
  vec3(0.0, -9.8, 20.5),
  vec3(6.8, 5.0, 6.8)
) * smoothstep(-14.8, -12.8, vLeoModelPosition.y);
float leoHeadBackErase = leoPatchEllipsoid(
  vLeoModelPosition,
  vec3(0.0, -14.2, 26.0),
  vec3(4.8, 4.0, 6.0)
) * (1.0 - smoothstep(2.8, 4.2, abs(vLeoModelPosition.x)))
  * smoothstep(-15.6, -13.8, vLeoModelPosition.y);
float leoWhiteMask = max(
  max(leoOldShoulderPatch, max(leoBackArtifactErase, leoRedBackSpotErase)),
  max(leoNeckErase, leoHeadBackErase)
);
float leoSourceLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
float leoNeedsWhiteCorrection = 1.0 - smoothstep(0.62, 0.78, leoSourceLuma);
vec3 leoWhiteFur = diffuseColor.rgb;
#ifdef USE_MAP
  vec2 leoWhiteFurUv = vec2(
    0.35 + clamp((vLeoModelPosition.y + 22.0) / 44.0, 0.0, 1.0) * 0.10,
    0.55 + clamp(vLeoModelPosition.z / 31.0, 0.0, 1.0) * 0.10
  );
  leoWhiteFur = texture2D(map, leoWhiteFurUv).rgb;
#else
  float leoWhiteTextureLuma = 0.78 + 0.14 * pow(max(leoSourceLuma, 0.0), 0.35);
  leoWhiteFur = vec3(0.86, 0.845, 0.81) * (leoWhiteTextureLuma / 0.845);
#endif
diffuseColor.rgb = mix(
  diffuseColor.rgb,
  leoWhiteFur,
  leoWhiteMask * leoNeedsWhiteCorrection
);
float leoPatch = max(leoShoulderPatch, leoRearPatch);
float leoBlackSourceLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
float leoBlackTextureLuma = clamp(
  0.026 + (leoBlackSourceLuma - 0.72) * 0.16,
  0.012,
  0.075
);
vec3 leoBlackFur = vec3(1.0, 0.92, 0.84) * leoBlackTextureLuma;
diffuseColor.rgb = mix(diffuseColor.rgb, leoBlackFur, leoPatch);`,
            );
        };
        material.customProgramCacheKey = () => "leo-side-patches-v20-clean-white-fur";
        material.needsUpdate = true;
        return material;
      });
      mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
    });
    return () => clonedMaterials.forEach((material) => material.dispose());
  }, [clonedScene]);

  useFrame((state, delta) => {
    if (!group.current || !dog.current) return;

    const now = performance.now() / 1000;
    const elapsed = Math.max(0, now - actionStartedAt.current);
    const command = action.toLowerCase();
    const idleTime = state.clock.elapsedTime;
    const idleBeat = Math.floor(idleTime / 7.5) % 4;
    const activeGait = ["come", "walk", "run", "zoomies", "play"].includes(command) && elapsed < (command === "run" || command === "zoomies" ? 3.1 : 2.5);
    const gaitSpeed = command === "run" || command === "zoomies" ? 11 : 7;
    const gait = activeGait ? Math.sin(elapsed * gaitSpeed) : 0;

    let targetY = 0;
    let targetPitch = 0;
    let targetRoll = 0;
    let targetYaw = -0.12;
    let scaleY = 1;

    if (["sit", "stay", "paw", "beg", "treat"].includes(command)) {
      targetY = -0.16;
      targetPitch = -0.07;
      scaleY = 0.94;
    } else if (["down", "sleep", "roll-over"].includes(command)) {
      targetY = -0.9;
      targetRoll = command === "roll-over" && elapsed < 2.2 ? Math.min(elapsed / 2.2, 1) * Math.PI * 2 : Math.PI / 2;
      scaleY = 0.96;
    } else if (command === "jump" && elapsed < 1.45) {
      targetY = Math.sin(Math.min(elapsed / 1.45, 1) * Math.PI) * 1.05;
      targetPitch = -Math.sin(Math.min(elapsed / 1.45, 1) * Math.PI) * 0.13;
    } else if (command === "spin" && elapsed < 1.7) {
      targetYaw -= Math.min(elapsed / 1.7, 1) * Math.PI * 2;
    } else if (["sniff", "lick"].includes(command) && elapsed < 2.2) {
      targetPitch = 0.1 + Math.sin(elapsed * 5) * 0.04;
      targetY = -0.08;
    } else if (["speak", "shake", "scratch"].includes(command) && elapsed < 1.5) {
      targetRoll = Math.sin(elapsed * 9) * 0.045;
      scaleY = 1 + Math.sin(elapsed * 10) * 0.018;
    } else if (command === "patted") {
      targetRoll = -0.035;
      targetYaw = -0.18;
    } else if (!activeGait && ["ready", "idle", "wake"].includes(command)) {
      if (idleBeat === 1) targetYaw -= 0.07;
      if (idleBeat === 2) targetPitch = 0.025;
      if (idleBeat === 3) targetRoll = 0.018;
    }

    if (activeGait) {
      targetY += Math.abs(gait) * (command === "run" || command === "zoomies" ? 0.12 : 0.065);
      targetRoll += gait * 0.025;
      targetPitch -= Math.abs(gait) * 0.018;
    }

    const breathing = 1 + Math.sin(idleTime * 2.05) * 0.0045;
    group.current.position.y = THREE.MathUtils.damp(group.current.position.y, targetY, 7, delta);
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, targetPitch, 7, delta);
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, targetYaw, 7, delta);
    group.current.rotation.z = THREE.MathUtils.damp(group.current.rotation.z, targetRoll, 7, delta);
    const modelScale = compact ? 0.18 : 0.17;
    dog.current.scale.set(modelScale * breathing, modelScale * scaleY * breathing, modelScale * breathing);
  });

  return (
    <group ref={group} onPointerDown={(event) => { event.stopPropagation(); onPet(); }}>
      <group ref={dog} rotation={[0, 0, 0]}>
        <primitive object={clonedScene} />
      </group>
    </group>
  );
}

useGLTF.preload(`${import.meta.env.BASE_URL}models/leo-detailed-v3.glb`);
