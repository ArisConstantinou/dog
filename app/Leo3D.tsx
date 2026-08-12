"use client";

import { Canvas } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, useAnimations, useGLTF } from "@react-three/drei";
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
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
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
      <span className="drag-3d">Drag to look · real skeletal animation</span>
      <a className="model-credit" href="https://sketchfab.com/3d-models/jack-russell-terrier-animated-130-animations-e75a550f4a9b4d18bc1b45ca2e6f56d2" target="_blank" rel="noreferrer">3D model by RedDeer</a>
    </div>
  );
}

function LocalRiggedLeo({ action, onPet, compact }: Pick<ActorProps, "action" | "onPet" | "compact">) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.6]}
      camera={{ position: compact ? [7, 4.2, 7] : [8, 4.8, 8], fov: 34 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={1.8} />
      <hemisphereLight args={["#fff7e7", "#6f7b65", 1.25]} />
      <directionalLight castShadow position={[-4, 7, 5]} intensity={3.2} />
      <Suspense fallback={<Html center><span className="fallback-loading">Loading Leo&hellip;</span></Html>}>
        <FallbackDog action={action} onPet={onPet} />
      </Suspense>
      <ContactShadows position={[0, 0.02, 0]} opacity={0.35} scale={9} blur={2.2} far={8} />
      <OrbitControls target={[0, 1.65, 0]} enablePan={false} enableZoom={false} minPolarAngle={Math.PI * 0.22} maxPolarAngle={Math.PI * 0.5} />
    </Canvas>
  );
}

function FallbackDog({ action, onPet }: Pick<ActorProps, "action" | "onPet">) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(`${import.meta.env.BASE_URL}models/leo-rigged-fallback.glb`);
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    const preferred = ["walk", "run", "come", "zoomies"].includes(action.toLowerCase()) ? "walking" : "idle";
    const selected = Object.entries(actions).find(([name]) => name.toLowerCase().includes(preferred))?.[1];
    if (selected) {
      selected.reset();
      selected.setLoop(THREE.LoopOnce, 1);
      selected.clampWhenFinished = true;
      selected.fadeIn(0.22).play();
    }
    return () => { selected?.fadeOut(0.18); };
  }, [action, actions]);

  useEffect(() => {
    clonedScene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      const material = object.material as THREE.MeshStandardMaterial;
      material.color.set("#eee9df");
      material.roughness = 0.82;
    });
  }, [clonedScene]);

  return (
    <group ref={group} rotation={[0, -0.78, 0]} position={[0, 0, 0]} scale={0.85} onPointerDown={(event) => { event.stopPropagation(); onPet(); }}>
      <primitive object={clonedScene} />
    </group>
  );
}

useGLTF.preload(`${import.meta.env.BASE_URL}models/leo-rigged-fallback.glb`);
