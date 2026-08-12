"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef, type RefObject } from "react";
import type { LeoPose } from "./leo-data";

type ActorProps = {
  pose: LeoPose;
  action: string;
  onPet: () => void;
  compact?: boolean;
};

const damp = (current: number, target: number, speed: number, delta: number) =>
  THREE.MathUtils.damp(current, target, speed, delta);

export function Leo3D({ pose, action, onPet, compact = false }: ActorProps) {
  return (
    <div className={`leo-3d ${compact ? "compact" : ""}`} role="group" aria-label={`3D Leo is performing: ${action}`}>
      <Canvas
        shadows
        dpr={[1, 1.8]}
        camera={{ position: compact ? [-4.8, 2.9, 6.3] : [-6.2, 3.6, 8], fov: compact ? 33 : 35 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onPointerMissed={onPet}
      >
        <ambientLight intensity={1.7} />
        <hemisphereLight args={["#fff7e7", "#6f7b65", 1.1]} />
        <directionalLight castShadow position={[-4, 7, 5]} intensity={3.2} shadow-mapSize={[1024, 1024]} />
        <Dog pose={pose} action={action} onPet={onPet} />
        <ContactShadows position={[0, 0.02, 0]} opacity={0.34} scale={8} blur={2.2} far={5} />
        <OrbitControls target={[0, 1, 0]} enablePan={false} enableZoom={false} minPolarAngle={Math.PI * .24} maxPolarAngle={Math.PI * .48} />
      </Canvas>
      <span className="drag-3d">Drag to look · tap to pet</span>
    </div>
  );
}

function Dog({ pose, action, onPet }: Omit<ActorProps, "compact">) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const chest = useRef<THREE.Mesh>(null);
  const head = useRef<THREE.Group>(null);
  const muzzle = useRef<THREE.Group>(null);
  const jaw = useRef<THREE.Mesh>(null);
  const tail = useRef<THREE.Group>(null);
  const frontLeft = useRef<THREE.Group>(null);
  const frontRight = useRef<THREE.Group>(null);
  const backLeft = useRef<THREE.Group>(null);
  const backRight = useRef<THREE.Group>(null);
  const { pointer } = useThree();
  const walkClock = useRef(0);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((frame, delta) => {
    if (!root.current || !body.current || !head.current || !tail.current || !muzzle.current) return;
    const t = frame.clock.elapsedTime;
    const activeWalk = ["come", "walk", "run", "zoomies"].includes(action);
    const speed = action === "zoomies" ? 14 : action === "run" ? 10 : 6;
    walkClock.current += delta * speed;
    const gait = activeWalk ? Math.sin(walkClock.current) : 0;
    const idleBreath = Math.sin(t * 2.05) * 0.018;
    const isSit = pose === "sit" || pose === "paw";
    const isDown = pose === "down" || pose === "play";
    const isSleep = pose === "sleep";
    const isPlay = pose === "play";

    target.set(0, isSleep ? 0.32 : isDown ? 0.28 : isSit ? 0.08 : 0, 0);
    root.current.position.x = damp(root.current.position.x, target.x, 4.5, delta);
    root.current.position.y = damp(root.current.position.y, target.y, 4.5, delta);
    root.current.position.z = damp(root.current.position.z, target.z, 4.5, delta);
    root.current.rotation.z = damp(root.current.rotation.z, isSleep ? -0.24 : isSit ? -0.16 : 0, 4.2, delta);

    if (action === "spin") root.current.rotation.y += delta * 5.4;
    else if (action === "zoomies") root.current.rotation.y += delta * 3.6;
    else root.current.rotation.y = damp(root.current.rotation.y, 0, 4, delta);
    if (action === "roll-over") root.current.rotation.x = damp(root.current.rotation.x, Math.sin(t * 3.3) * 2.5, 3.6, delta);
    else root.current.rotation.x = damp(root.current.rotation.x, isSleep ? -0.36 : 0, 4, delta);

    body.current.scale.y = damp(body.current.scale.y, .8 + idleBreath, 4, delta);
    if (chest.current) chest.current.scale.y = damp(chest.current.scale.y, 1 + idleBreath * 1.5, 4, delta);

    const lookY = THREE.MathUtils.clamp(pointer.y * .2, -.13, .16);
    const lookZ = THREE.MathUtils.clamp(-pointer.x * .25, -.28, .28);
    head.current.rotation.y = damp(head.current.rotation.y, lookZ, 5, delta);
    head.current.rotation.z = damp(head.current.rotation.z, lookY + (action === "bark" || action === "speak" ? Math.sin(t * 17) * .07 : 0), 5, delta);
    head.current.rotation.x = damp(head.current.rotation.x, ["treat", "sniff", "dig"].includes(action) ? -.6 : isSleep ? .24 : 0, 4.5, delta);
    if (action === "look-around") head.current.rotation.y += Math.sin(t * 2.1) * delta * 1.8;
    if (action === "shake") head.current.rotation.x += Math.sin(t * 24) * delta * 2.4;
    muzzle.current.rotation.z = damp(muzzle.current.rotation.z, action === "speak" || action === "bark" ? Math.sin(t * 19) * .06 : 0, 9, delta);
    if (jaw.current) jaw.current.rotation.z = damp(jaw.current.rotation.z, action === "speak" || action === "bark" ? -.25 : action === "treat" ? -.12 + Math.sin(t * 12) * .08 : -.03, 10, delta);
    if (action === "lick" && jaw.current) jaw.current.rotation.z = -.18 + Math.sin(t * 14) * .06;

    const wag = isSleep || action === "stay" ? .08 : action === "play" || action === "treat" || action === "patted" ? .72 : .27;
    tail.current.rotation.y = Math.sin(t * (action === "play" ? 13 : 8)) * wag;
    tail.current.rotation.z = damp(tail.current.rotation.z, isSleep ? -1.3 : .35, 4, delta);

    const frontFold = isDown ? -1.22 : isSit ? -.18 : 0;
    const backFold = isSit ? 1.18 : isDown ? .42 : 0;
    const stride = gait * (action === "run" ? .72 : .46);
    if (frontLeft.current) frontLeft.current.rotation.z = damp(frontLeft.current.rotation.z, pose === "paw" ? -1.45 : frontFold + stride, 10, delta);
    if (frontRight.current) frontRight.current.rotation.z = damp(frontRight.current.rotation.z, frontFold - stride, 10, delta);
    if (backLeft.current) backLeft.current.rotation.z = damp(backLeft.current.rotation.z, backFold - stride, 10, delta);
    if (backRight.current) backRight.current.rotation.z = damp(backRight.current.rotation.z, backFold + stride, 10, delta);
    if (action === "scratch" && backLeft.current) backLeft.current.rotation.z = -1.05 + Math.sin(t * 16) * .35;

    const bounce = activeWalk ? Math.abs(Math.sin(walkClock.current * 2)) * (action === "run" || action === "zoomies" ? .13 : .07) : action === "jump" ? Math.max(0, Math.sin(t * 3.1)) * 1.35 : 0;
    if (action === "shake") root.current.rotation.x += Math.sin(t * 25) * delta * 2.2;
    root.current.position.y += bounce;
    if (isPlay) root.current.rotation.z = damp(root.current.rotation.z, .15, 6, delta);
    if (action === "beg") root.current.rotation.z = damp(root.current.rotation.z, -.68, 5, delta);
    if (action === "stretch") root.current.scale.x = damp(root.current.scale.x, .86, 4, delta);
    else root.current.scale.x = damp(root.current.scale.x, .78, 4, delta);
  });

  const white = "#e8e3d8";
  const cream = "#d7c7aa";
  const black = "#161413";
  const tan = "#a7673d";
  const blue = "#315aa8";

  return (
    <group ref={root} position={[0, 0, 0]} scale={[.78,.78,.78]} onPointerDown={(event) => { event.stopPropagation(); onPet(); }}>
      <mesh ref={body} castShadow receiveShadow position={[0, 1.12, 0]} scale={[1.52, .8, .72]}>
        <sphereGeometry args={[1, 48, 32]} /><meshStandardMaterial color={white} roughness={.88} />
      </mesh>
      <mesh castShadow position={[.42, 1.38, .69]} scale={[.52, .44, .09]} rotation={[.08, 0, .07]}>
        <sphereGeometry args={[1, 36, 24]} /><meshStandardMaterial color={black} roughness={.94} />
      </mesh>
      <mesh castShadow position={[.96, 1.2, -.5]} scale={[.34, .28, .14]}>
        <sphereGeometry args={[1, 32, 20]} /><meshStandardMaterial color={black} roughness={.94} />
      </mesh>
      <mesh ref={chest} castShadow position={[-1.05, 1.18, 0]} scale={[.72, .9, .75]}>
        <sphereGeometry args={[1, 40, 28]} /><meshStandardMaterial color={white} roughness={.87} />
      </mesh>

      <group ref={head} position={[-1.55, 1.74, 0]}>
        <mesh castShadow scale={[.72, .7, .66]}><sphereGeometry args={[1, 40, 32]} /><meshStandardMaterial color={black} roughness={.86} /></mesh>
        <mesh castShadow position={[-.35, -.03, .43]} scale={[.48, .53, .25]} rotation={[0,.1,-.08]}><sphereGeometry args={[1, 32, 24]} /><meshStandardMaterial color={tan} roughness={.88} /></mesh>
        <mesh castShadow position={[-.34, -.03, -.43]} scale={[.48, .53, .25]} rotation={[0,-.1,-.08]}><sphereGeometry args={[1, 32, 24]} /><meshStandardMaterial color={tan} roughness={.88} /></mesh>
        <mesh castShadow position={[-.52, .23, 0]} scale={[.29, .55, .19]} rotation={[0,0,-.2]}><sphereGeometry args={[1, 30, 20]} /><meshStandardMaterial color={white} roughness={.9} /></mesh>
        <group ref={muzzle} position={[-.72, -.22, 0]}>
          <mesh castShadow scale={[.58, .35, .42]}><sphereGeometry args={[1, 36, 24]} /><meshStandardMaterial color={cream} roughness={.93} /></mesh>
          <mesh castShadow position={[-.51,.04,0]} scale={[.18,.16,.21]}><sphereGeometry args={[1, 32, 20]} /><meshStandardMaterial color="#11100f" roughness={.5} /></mesh>
          <mesh ref={jaw} castShadow position={[-.19,-.28,0]} scale={[.4,.13,.3]} rotation={[0,0,-.03]}><sphereGeometry args={[1, 28, 18]} /><meshStandardMaterial color="#3a201a" roughness={.72} /></mesh>
          <mesh position={[-.35,-.28,.01]} scale={[.25,.06,.18]}><sphereGeometry args={[1,24,16]} /><meshStandardMaterial color="#b85d62" roughness={.62} /></mesh>
        </group>
        <mesh position={[-.58,.18,.5]} scale={[.09,.1,.08]}><sphereGeometry args={[1,24,16]} /><meshPhysicalMaterial color="#352619" roughness={.18} clearcoat={1} /></mesh>
        <mesh position={[-.58,.18,-.5]} scale={[.09,.1,.08]}><sphereGeometry args={[1,24,16]} /><meshPhysicalMaterial color="#352619" roughness={.18} clearcoat={1} /></mesh>
        <mesh castShadow position={[-.03,.13,.66]} scale={[.31,.62,.15]} rotation={[.15,.12,-.45]}><sphereGeometry args={[1,28,20]} /><meshStandardMaterial color={black} roughness={.97} /></mesh>
        <mesh castShadow position={[-.03,.13,-.66]} scale={[.31,.62,.15]} rotation={[-.15,-.12,-.45]}><sphereGeometry args={[1,28,20]} /><meshStandardMaterial color={black} roughness={.97} /></mesh>
      </group>

      <mesh castShadow position={[-1.05,1.54,0]} rotation={[0,0,Math.PI/2]}><torusGeometry args={[.48,.08,14,48]} /><meshStandardMaterial color={blue} roughness={.52} metalness={.05} /></mesh>
      <mesh position={[-1.08,1.1,.5]} scale={[.08,.11,.04]}><boxGeometry /><meshStandardMaterial color="#d4aa4c" metalness={.7} roughness={.28} /></mesh>

      <Leg refObject={frontLeft} position={[-.84,.88,.48]} color={white} />
      <Leg refObject={frontRight} position={[-.84,.88,-.48]} color={white} hidden />
      <Leg refObject={backLeft} position={[.88,.86,.47]} color={white} back />
      <Leg refObject={backRight} position={[.88,.86,-.47]} color={white} back hidden />

      <group ref={tail} position={[1.32,1.45,0]} rotation={[0,0,.35]}>
        <TailSegment position={[.25,.22,0]} rotation={[0,0,-.52]} color={black} />
        <TailSegment position={[.57,.51,0]} rotation={[0,0,-.72]} color={black} />
        <TailSegment position={[.78,.82,0]} rotation={[0,0,-.94]} color={white} tip />
      </group>
    </group>
  );
}

function Leg({ refObject, position, color, back = false, hidden = false, pawOnly = false }: {
  refObject: RefObject<THREE.Group | null>; position: [number,number,number]; color: string; back?: boolean; hidden?: boolean; pawOnly?: boolean;
}) {
  return (
    <group ref={refObject} position={position} renderOrder={hidden ? -1 : 1}>
      <mesh castShadow position={[0,-.28,0]} scale={[back ? .28 : .24,.54,.25]}><capsuleGeometry args={[1,1,10,20]} /><meshStandardMaterial color={color} roughness={.9} /></mesh>
      <mesh castShadow position={[-.08,-.78,.03]} scale={[.23,.46,.22]} rotation={[0,0,.08]}><capsuleGeometry args={[1,1,10,20]} /><meshStandardMaterial color={color} roughness={.9} /></mesh>
      <mesh castShadow position={[-.22,-1.1,.03]} scale={[.38,.16,.3]}><sphereGeometry args={[1,24,16]} /><meshStandardMaterial color={color} roughness={.92} /></mesh>
      {pawOnly && <mesh position={[-.32,-1.18,.13]} scale={[.06,.04,.08]}><sphereGeometry /><meshStandardMaterial color="#25211e" /></mesh>}
    </group>
  );
}

function TailSegment({ position, rotation, color, tip = false }: { position:[number,number,number];rotation:[number,number,number];color:string;tip?:boolean }) {
  return <mesh castShadow position={position} rotation={rotation} scale={[tip ? .16 : .2, tip ? .38 : .43, .19]}><capsuleGeometry args={[1,1,8,16]} /><meshStandardMaterial color={color} roughness={.93} /></mesh>;
}
