"use client";

import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, Sparkles } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import City from "./City";
import CameraRig from "./CameraRig";
import { live } from "@/lib/live";

/** Sun by day, moonlight by night, eased with the city's day/night value. */
function Lights() {
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const moon = useRef<THREE.DirectionalLight>(null);
  useFrame(() => {
    const n = live.night;
    if (hemi.current) hemi.current.intensity = 1.1 - n * 0.8;
    if (sun.current) sun.current.intensity = 2.6 * (1 - n * 0.85);
    if (moon.current) moon.current.intensity = n * 0.9;
  });
  return (
    <>
      <hemisphereLight ref={hemi} args={["#d6e6ff", "#1d2f63", 1.1]} />
      <directionalLight
        ref={sun}
        position={[7, 13, 6]}
        intensity={2.6}
        color="#fff4e6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={1}
        shadow-camera-far={40}
      />
      <directionalLight ref={moon} position={[-8, 10, -4]} intensity={0} color="#8fb0ff" />
    </>
  );
}

function Stars() {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.visible = live.night > 0.05;
  });
  return (
    <group ref={ref}>
      <Sparkles count={120} scale={[40, 18, 40]} position={[0, 10, 0]} size={2.2} speed={0.15} color="#cfe0ff" opacity={0.8} />
    </group>
  );
}

/** Soft round shadow under the floating platform. */
function SoftShadow() {
  const mat = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(0.03, 0.06, 0.16, 0.5 * pow(1.0 - smoothstep(0.35, 1.0, d), 1.6)); }`,
    transparent: true,
    depthWrite: false,
  });
  return (
    <mesh material={mat} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.6, 0]}>
      <planeGeometry args={[24, 24]} />
    </mesh>
  );
}

function Effects({ low }: { low: boolean }) {
  const bloom = useRef<{ intensity: number } | null>(null);
  useFrame(() => {
    if (bloom.current) bloom.current.intensity = 0.35 + live.night * 0.9;
  });
  return (
    <EffectComposer multisampling={low ? 0 : 4}>
      <Bloom ref={bloom as never} mipmapBlur intensity={0.35} luminanceThreshold={0.85} luminanceSmoothing={0.2} radius={0.6} />
      <Vignette eskil={false} offset={0.3} darkness={0.35} />
    </EffectComposer>
  );
}

export default function Scene() {
  const [low] = useState(() => window.innerWidth < 900 || (navigator.hardwareConcurrency ?? 8) <= 4);
  return (
    <div className="scene" aria-hidden>
      <Canvas
        shadows
        dpr={[1, low ? 1.5 : 2]}
        camera={{ position: [-17, 12.5, 22], fov: 38, near: 0.1, far: 200 }}
        gl={{ alpha: true, antialias: false, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={3} color="#ffffff" scale={[14, 5, 1]} position={[0, 9, 6]} rotation-x={Math.PI / 2.5} />
          <Lightformer form="rect" intensity={2} color="#b9d2ff" scale={[6, 12, 1]} position={[-10, 3, 2]} rotation-y={Math.PI / 2} />
          <Lightformer form="rect" intensity={1.5} color="#7aa2ff" scale={[6, 12, 1]} position={[10, 3, -2]} rotation-y={-Math.PI / 2} />
          <Lightformer form="circle" intensity={2} color="#ffe9d1" scale={3} position={[6, 8, 8]} />
        </Environment>
        <Lights />
        <CameraRig />
        <City low={low} />
        <Stars />
        <SoftShadow />
        <Effects low={low} />
      </Canvas>
    </div>
  );
}
