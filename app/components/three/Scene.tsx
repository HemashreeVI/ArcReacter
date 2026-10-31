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
/** Gradient sky dome that only exists inside the reflection environment. */
function ReflectionSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `varying vec3 vW; void main(){ vW = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec3 vW;
      void main(){
        float h = vW.y;
        vec3 zenith = vec3(0.20, 0.33, 0.72);
        vec3 horizon = vec3(0.80, 0.88, 1.0);
        vec3 ground = vec3(0.03, 0.06, 0.16);
        // bright band at the horizon, deep blue overhead, dark "city below" under it:
        // the contrast is what makes the glass read as glass
        vec3 c = h > 0.0 ? mix(horizon, zenith, pow(h, 0.45)) : mix(horizon * 0.45, ground, smoothstep(0.0, 0.12, -h));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  return (
    <mesh material={mat} scale={60}>
      <sphereGeometry args={[1, 48, 24]} />
    </mesh>
  );
}

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
        <Environment resolution={512}>
          <ReflectionSky />
          {/* sun glint and broad soft sky panels */}
          <Lightformer form="circle" intensity={6} color="#fff3e2" scale={2.5} position={[8, 10, 9]} />
          <Lightformer form="rect" intensity={2.4} color="#ffffff" scale={[18, 5, 1]} position={[0, 12, 0]} rotation-x={Math.PI / 2} />
          {/* tall strips read as neighbouring towers sliding across the glass */}
          {[-14, -9, -4, 3, 8, 13].map((x, i) => (
            <Lightformer key={x} form="rect" intensity={i % 2 ? 2.2 : 3.4} color={i % 3 ? "#cfe0ff" : "#ffffff"} scale={[1.2 + (i % 3), 14, 1]} position={[x, 2, -14]} />
          ))}
          {[-12, -5, 6, 12].map((z, i) => (
            <Lightformer key={z} form="rect" intensity={2.6} color="#dbe7ff" scale={[1.5 + i * 0.4, 12, 1]} position={[-15, 2, z]} rotation-y={Math.PI / 2} />
          ))}
          <Lightformer form="rect" intensity={1.2} color="#9fbaf2" scale={[10, 10, 1]} position={[15, 3, 0]} rotation-y={-Math.PI / 2} />
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
