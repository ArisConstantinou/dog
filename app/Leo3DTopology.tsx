"use client";

/* eslint-disable react/no-unknown-property */

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { Suspense, useEffect, useMemo, useRef } from "react";
import type { LeoPose } from "./leo-data";

type ActorProps = {
  pose: LeoPose;
  action: string;
  onPet: () => void;
  compact?: boolean;
};

type LeoUniforms = {
  uLeoBreath: { value: number };
  uLeoHeadYaw: { value: number };
  uLeoHeadPitch: { value: number };
  uLeoTailWag: { value: number };
  uLeoGait: { value: number };
  uLeoPawLift: { value: number };
  uLeoCrouch: { value: number };
  uLeoSpineTwist: { value: number };
};

type MotionTargets = Record<keyof LeoUniforms, number>;

declare global {
  interface Window {
    __leoAnimationTime?: number;
    __leoTopologyState?: {
      action: string;
      elapsed: number;
      gait: number;
      headYaw: number;
      headPitch: number;
      tailWag: number;
      pawLift: number;
      crouch: number;
      spineTwist: number;
    };
  }
}

const MODEL_PATH = `${import.meta.env.BASE_URL}models/leo.glb`;
const locomotionActions = new Set(["come", "walk", "run", "zoomies"]);

function activeTime(clockTime: number) {
  return typeof window !== "undefined" && typeof window.__leoAnimationTime === "number"
    ? window.__leoAnimationTime
    : clockTime;
}

function calculateMotion(action: string, elapsed: number, time: number, reducedMotion: boolean): MotionTargets {
  const command = action.toLowerCase();
  const gentle = reducedMotion ? 0.28 : 1;
  const targets: MotionTargets = {
    uLeoBreath: (0.5 + Math.sin(time * 2.05) * 0.5) * 0.015,
    uLeoHeadYaw: Math.sin(time * 0.52) * 0.055 * gentle,
    uLeoHeadPitch: Math.sin(time * 0.71) * 0.018 * gentle,
    uLeoTailWag: Math.sin(time * 3.1) * 0.12 * gentle,
    uLeoGait: 0,
    uLeoPawLift: 0,
    uLeoCrouch: 0,
    uLeoSpineTwist: 0,
  };

  if (locomotionActions.has(command)) {
    const run = command === "run" || command === "zoomies";
    const duration = run ? 3.1 : 2.5;
    if (elapsed < duration && !reducedMotion) {
      targets.uLeoGait = Math.sin(elapsed * (run ? 12.5 : 8.2)) * (run ? 0.42 : 0.28);
      targets.uLeoTailWag = Math.sin(elapsed * 7.5) * 0.28;
      targets.uLeoSpineTwist = Math.sin(elapsed * (run ? 6.2 : 4.2)) * 0.025;
    }
  } else if (["sit", "stay"].includes(command)) {
    targets.uLeoCrouch = 0.5;
    targets.uLeoTailWag *= 0.55;
  } else if (["paw", "beg"].includes(command)) {
    targets.uLeoCrouch = 0.48;
    targets.uLeoPawLift = Math.min(elapsed / 0.55, 1) * 0.72;
    targets.uLeoHeadYaw = -0.08;
  } else if (["down", "sleep", "roll-over"].includes(command)) {
    targets.uLeoCrouch = command === "sleep" ? 0.78 : 0.68;
    targets.uLeoHeadPitch = 0.15;
    targets.uLeoTailWag *= command === "sleep" ? 0.08 : 0.3;
  } else if (["sniff", "lick", "treat"].includes(command) && elapsed < 2.4) {
    targets.uLeoHeadPitch = 0.33 + Math.sin(elapsed * 4.6) * 0.035;
    targets.uLeoHeadYaw = Math.sin(elapsed * 3.1) * 0.055;
  } else if (command === "dig" && elapsed < 3.8 && !reducedMotion) {
    targets.uLeoCrouch = 0.28;
    targets.uLeoHeadPitch = 0.19;
    targets.uLeoGait = Math.sin(elapsed * 12.5) * 0.34;
    targets.uLeoSpineTwist = Math.sin(elapsed * 6.25) * 0.025;
  } else if (command === "look-around" && elapsed < 2.6) {
    targets.uLeoHeadYaw = Math.sin(elapsed * 2.35) * 0.42 * gentle;
    targets.uLeoHeadPitch = Math.sin(elapsed * 1.7) * 0.06 * gentle;
  } else if (command === "patted") {
    targets.uLeoHeadYaw = -0.18 * gentle;
    targets.uLeoHeadPitch = 0.07 * gentle;
    targets.uLeoTailWag = Math.sin(time * 6.8) * 0.34 * gentle;
  } else if (["speak", "shake", "scratch"].includes(command) && elapsed < 1.8) {
    targets.uLeoHeadYaw = Math.sin(elapsed * 11) * 0.11 * gentle;
    targets.uLeoSpineTwist = Math.sin(elapsed * 13) * 0.075 * gentle;
  } else if (command === "play") {
    targets.uLeoCrouch = 0.34;
    targets.uLeoHeadPitch = 0.12;
    targets.uLeoTailWag = Math.sin(time * 7.2) * 0.32 * gentle;
  } else if (command === "stretch") {
    targets.uLeoCrouch = 0.26;
    targets.uLeoHeadPitch = 0.2;
  }

  return targets;
}

export function Leo3D({ pose, action, onPet, compact = false }: ActorProps) {
  return (
    <div
      className={`leo-3d rigged-leo ${compact ? "compact" : ""}`}
      role="group"
      aria-label={`3D Leo is performing: ${action}`}
      data-model="leo.glb"
      data-motion-system="topology-deformation"
      data-topology-action={action.toLowerCase()}
    >
      <Canvas
        shadows
        dpr={[1, 1.6]}
        camera={{ position: compact ? [4.3, 2.45, 4.4] : [4.7, 2.65, 4.8], fov: 38 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={1.55} />
        <hemisphereLight args={["#fff7e7", "#6f7b65", 1.35]} />
        <directionalLight castShadow position={[-4, 7, 5]} intensity={3.1} />
        <Suspense fallback={<Html center><span className="fallback-loading">Loading Leo&hellip;</span></Html>}>
          <TopologyLeo pose={pose} action={action} onPet={onPet} compact={compact} />
        </Suspense>
        <ContactShadows position={[0, 0.015, 0]} opacity={0.32} scale={7} blur={2.1} far={6} />
        <OrbitControls
          target={[0, 1.15, 0]}
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI * 0.2}
          maxPolarAngle={Math.PI * 0.52}
        />
      </Canvas>
      <button className="pet-leo-control" type="button" onClick={onPet}>Pet Leo</button>
      <span className="drag-3d">Drag to look · topology-driven local motion</span>
    </div>
  );
}

function TopologyLeo({ action, onPet, compact }: ActorProps) {
  const group = useRef<THREE.Group>(null);
  const actor = useRef<THREE.Group>(null);
  const shaderUniforms = useRef<LeoUniforms[]>([]);
  const actionStartedAt = useRef({ real: 0, virtual: 0 });
  const { scene } = useGLTF(MODEL_PATH);
  const reducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    clone.position.set(-center.x, -box.min.y, -center.z);
    return clone;
  }, [scene]);

  useEffect(() => {
    actionStartedAt.current = {
      real: performance.now() / 1000,
      virtual: window.__leoAnimationTime ?? 0,
    };
  }, [action]);

  useEffect(() => {
    const ownedMaterials: THREE.Material[] = [];
    shaderUniforms.current = [];
    clonedScene.traverse((object) => {
      if (!(object as THREE.Mesh).isMesh) return;
      const mesh = object as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      const sources = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const materials = sources.map((source) => {
        if (!(source as THREE.MeshStandardMaterial).isMeshStandardMaterial) return source;
        const material = (source as THREE.MeshStandardMaterial).clone();
        ownedMaterials.push(material);
        material.vertexColors = true;
        material.roughness = 0.9;
        material.metalness = 0;
        if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
        material.onBeforeCompile = (shader) => {
          const uniforms: LeoUniforms = {
            uLeoBreath: { value: 0 },
            uLeoHeadYaw: { value: 0 },
            uLeoHeadPitch: { value: 0 },
            uLeoTailWag: { value: 0 },
            uLeoGait: { value: 0 },
            uLeoPawLift: { value: 0 },
            uLeoCrouch: { value: 0 },
            uLeoSpineTwist: { value: 0 },
          };
          Object.assign(shader.uniforms, uniforms);
          shaderUniforms.current.push(uniforms);
          shader.vertexShader = shader.vertexShader
            .replace(
              "#include <common>",
              `#include <common>
uniform float uLeoBreath;
uniform float uLeoHeadYaw;
uniform float uLeoHeadPitch;
uniform float uLeoTailWag;
uniform float uLeoGait;
uniform float uLeoPawLift;
uniform float uLeoCrouch;
uniform float uLeoSpineTwist;

mat2 leoRotate(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}`,
            )
            .replace(
              "#include <begin_vertex>",
              `#include <begin_vertex>
vec3 leoSource = position;

float leoTorso = smoothstep(-0.62, -0.42, leoSource.z)
  * (1.0 - smoothstep(0.24, 0.43, leoSource.z))
  * smoothstep(-0.28, -0.05, leoSource.y);
transformed.x *= 1.0 + uLeoBreath * leoTorso;
transformed.y += uLeoBreath * 0.32 * leoTorso;

float leoHead = smoothstep(0.34, 0.58, leoSource.z);
vec3 leoHeadPivot = vec3(0.0, 0.12, 0.39);
vec3 leoHeadPoint = transformed - leoHeadPivot;
leoHeadPoint.xz = leoRotate(uLeoHeadYaw * leoHead) * leoHeadPoint.xz;
leoHeadPoint.yz = leoRotate(uLeoHeadPitch * leoHead) * leoHeadPoint.yz;
transformed = mix(transformed, leoHeadPoint + leoHeadPivot, leoHead);

float leoTailLength = 1.0 - smoothstep(-0.88, -0.50, leoSource.z);
float leoTailHeight = smoothstep(0.02, 0.20, leoSource.y);
float leoTail = leoTailLength * leoTailHeight;
vec3 leoTailPivot = vec3(0.0, 0.12, -0.53);
vec3 leoTailPoint = transformed - leoTailPivot;
leoTailPoint.xz = leoRotate(uLeoTailWag * leoTailLength) * leoTailPoint.xz;
transformed = mix(transformed, leoTailPoint + leoTailPivot, leoTail);

float leoBelowBody = 1.0 - smoothstep(-0.16, 0.02, leoSource.y);
float leoFrontLeg = smoothstep(0.19, 0.33, leoSource.z) * leoBelowBody;
float leoRearLeg = (1.0 - smoothstep(-0.37, -0.20, leoSource.z)) * leoBelowBody;
float leoSidePhase = mix(-1.0, 1.0, step(0.0, leoSource.x));
float leoLegAngle = uLeoGait * leoSidePhase;
vec3 leoFrontPivot = vec3(leoSource.x, -0.02, 0.31);
vec3 leoFrontPoint = transformed - leoFrontPivot;
leoFrontPoint.yz = leoRotate(leoLegAngle) * leoFrontPoint.yz;
transformed = mix(transformed, leoFrontPoint + leoFrontPivot, leoFrontLeg);
vec3 leoRearPivot = vec3(leoSource.x, -0.01, -0.32);
vec3 leoRearPoint = transformed - leoRearPivot;
leoRearPoint.yz = leoRotate(-leoLegAngle * 0.84) * leoRearPoint.yz;
transformed = mix(transformed, leoRearPoint + leoRearPivot, leoRearLeg);

float leoRaisedPaw = leoFrontLeg * (1.0 - smoothstep(-0.12, -0.015, leoSource.x));
vec3 leoPawPoint = transformed - leoFrontPivot;
leoPawPoint.yz = leoRotate(-uLeoPawLift * 1.04) * leoPawPoint.yz;
leoPawPoint.y += uLeoPawLift * 0.16;
transformed = mix(transformed, leoPawPoint + leoFrontPivot, leoRaisedPaw * uLeoPawLift);

float leoRearBody = (1.0 - smoothstep(-0.28, -0.02, leoSource.z))
  * smoothstep(-0.28, 0.02, leoSource.y);
transformed.y -= uLeoCrouch * leoRearBody * 0.22;
transformed.z += uLeoCrouch * leoRearBody * 0.055;

float leoSpine = smoothstep(-0.50, -0.20, leoSource.z)
  * (1.0 - smoothstep(0.20, 0.48, leoSource.z));
vec3 leoSpinePivot = vec3(0.0, 0.05, -0.02);
vec3 leoSpinePoint = transformed - leoSpinePivot;
leoSpinePoint.xz = leoRotate(uLeoSpineTwist * leoSpine) * leoSpinePoint.xz;
transformed = mix(transformed, leoSpinePoint + leoSpinePivot, leoSpine);`,
            );
        };
        material.customProgramCacheKey = () => "leo-topology-motion-v1";
        material.needsUpdate = true;
        return material;
      });
      mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
    });
    return () => ownedMaterials.forEach((material) => material.dispose());
  }, [clonedScene]);

  useFrame((state, delta) => {
    if (!group.current || !actor.current) return;
    const time = activeTime(state.clock.elapsedTime);
    const virtual = typeof window.__leoAnimationTime === "number";
    const elapsed = Math.max(
      0,
      virtual ? time - actionStartedAt.current.virtual : performance.now() / 1000 - actionStartedAt.current.real,
    );
    const targets = calculateMotion(action, elapsed, time, reducedMotion);
    for (const uniforms of shaderUniforms.current) {
      for (const name of Object.keys(targets) as (keyof LeoUniforms)[]) {
        // Three.js owns these shader uniforms after compilation; this is the render-loop update path.
        // eslint-disable-next-line react-hooks/immutability
        uniforms[name].value = THREE.MathUtils.damp(uniforms[name].value, targets[name], 8.5, delta);
      }
    }
    window.__leoTopologyState = {
      action: action.toLowerCase(),
      elapsed: Number(elapsed.toFixed(3)),
      gait: Number(targets.uLeoGait.toFixed(4)),
      headYaw: Number(targets.uLeoHeadYaw.toFixed(4)),
      headPitch: Number(targets.uLeoHeadPitch.toFixed(4)),
      tailWag: Number(targets.uLeoTailWag.toFixed(4)),
      pawLift: Number(targets.uLeoPawLift.toFixed(4)),
      crouch: Number(targets.uLeoCrouch.toFixed(4)),
      spineTwist: Number(targets.uLeoSpineTwist.toFixed(4)),
    };

    const command = action.toLowerCase();
    let targetY = 0;
    let targetYaw = -0.24;
    let targetRoll = 0;
    if (command === "jump" && elapsed < 1.45 && !reducedMotion) {
      targetY = Math.sin(Math.min(elapsed / 1.45, 1) * Math.PI) * 0.48;
    } else if (command === "spin" && elapsed < 1.7 && !reducedMotion) {
      targetYaw -= Math.min(elapsed / 1.7, 1) * Math.PI * 2;
    } else if (command === "roll-over" && elapsed < 2.2 && !reducedMotion) {
      targetRoll = Math.min(elapsed / 2.2, 1) * Math.PI * 2;
    } else if (["down", "sleep"].includes(command)) {
      targetY = -0.22;
    } else if (command === "patted") {
      targetYaw = -0.31;
    }

    group.current.position.y = THREE.MathUtils.damp(group.current.position.y, targetY, 7, delta);
    actor.current.rotation.y = THREE.MathUtils.damp(actor.current.rotation.y, targetYaw, 7, delta);
    actor.current.rotation.z = THREE.MathUtils.damp(actor.current.rotation.z, targetRoll, 7, delta);
    const scale = compact ? 2.05 : 2.2;
    actor.current.scale.setScalar(scale);
  });

  return (
    <group ref={group} onPointerDown={(event) => { event.stopPropagation(); onPet(); }}>
      <group ref={actor}>
        <primitive object={clonedScene} />
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_PATH);
