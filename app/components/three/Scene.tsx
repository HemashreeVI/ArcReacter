"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import ArcReactor from "./ArcReactor";
import { HudWorld, LabWorld } from "./Worlds";
import { live } from "@/lib/live";
import { useStore, type Mode } from "@/lib/store";

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Camera keyframes along the page: [scroll progress, position, look-at]. */
const KEYS: [number, [number, number, number], [number, number, number]][] = [
  [0.0, [0, 0, 9.5], [-3.6, 0, 0]], // hero: reactor sits right of the headline
  [0.14, [3.5, 1.2, 9], [-2.4, 0, 0]], // profile
  [0.36, [0, 5.5, 11], [0, 0, 0]], // projects: look down on the whole scene
  [0.6, [-5, -0.6, 8], [1, 0, 0]], // experience
  [0.8, [0, 1.5, 15], [0, 0, 0]], // skills & gallery: wide shot
  [1.0, [1.5, 0.4, 8.5], [-3.2, 0, 0]], // contact: reactor beside the terminal
];

function CameraRig({ narrow }: { narrow: boolean }) {
  const pos = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const curLook = useMemo(() => new THREE.Vector3(-3.6, 0, 0), []);
  const a = useMemo(() => new THREE.Vector3(), []);
  const b = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera }, dt) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    live.scroll = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    const s = live.scroll;

    let i = 0;
    while (i < KEYS.length - 2 && s > KEYS[i + 1][0]) i++;
    const [s0, p0, l0] = KEYS[i];
    const [s1, p1, l1] = KEYS[i + 1];
    const t = smooth(THREE.MathUtils.clamp((s - s0) / (s1 - s0), 0, 1));
    pos.copy(a.fromArray(p0)).lerp(b.fromArray(p1), t);
    look.copy(a.fromArray(l0)).lerp(b.fromArray(l1), t);

    // On phones, keep the reactor centred and pull back a little.
    if (narrow) {
      look.x = 0;
      pos.z += 2;
    }
    // Pointer parallax.
    pos.x += live.mouseX * 0.6;
    pos.y += live.mouseY * 0.4;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, pos.x, 3, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, pos.y, 3, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, pos.z, 3, dt);
    curLook.x = THREE.MathUtils.damp(curLook.x, look.x, 3, dt);
    curLook.y = THREE.MathUtils.damp(curLook.y, look.y, 3, dt);
    curLook.z = THREE.MathUtils.damp(curLook.z, look.z, 3, dt);
    camera.lookAt(curLook);
  });
  return null;
}

function Effects({ mode, low }: { mode: Mode; low: boolean }) {
  // The postprocessing BloomEffect exposes `intensity` as a mutable property.
  const bloom = useRef<{ intensity: number } | null>(null);
  const hud = mode === "hud";
  const base = hud ? 0.55 : 0.45;
  useFrame(() => {
    if (bloom.current) bloom.current.intensity = base * (0.4 + 0.6 * live.power) + live.flare * 3;
  });
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        ref={bloom as never}
        mipmapBlur
        intensity={base}
        luminanceThreshold={hud ? 0.75 : 0.98}
        luminanceSmoothing={0.2}
        radius={0.75}
      />
      <Vignette eskil={false} offset={hud ? 0.2 : 0.35} darkness={hud ? 0.75 : 0.25} />
    </EffectComposer>
  );
}

export default function Scene() {
  const mode = useStore((s) => s.mode);
  const [{ low, narrow }] = useState(() => {
    const narrow = window.innerWidth < 820;
    const low = narrow || (navigator.hardwareConcurrency ?? 8) <= 4;
    return { low, narrow };
  });
  const hud = mode === "hud";
  const bg = hud ? "#0a0606" : "#efe9e2";

  return (
    <div className="scene" aria-hidden>
      <Canvas
        dpr={[1, low ? 1.25 : 1.75]}
        camera={{ position: [0, 0, 9.5], fov: 45, near: 0.1, far: 200 }}
        gl={{ antialias: false, powerPreference: "high-performance" }}
      >
        <color attach="background" args={[bg]} />
        <fog attach="fog" args={[bg, 14, hud ? 60 : 42]} />
        <CameraRig narrow={narrow} />
        <ArcReactor mode={mode} />
        {hud ? <HudWorld low={low} /> : <LabWorld low={low} />}
        <Effects mode={mode} low={low} />
      </Canvas>
    </div>
  );
}
