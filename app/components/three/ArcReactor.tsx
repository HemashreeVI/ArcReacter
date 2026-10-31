"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { live } from "@/lib/live";
import type { Mode } from "@/lib/store";

const TAU = Math.PI * 2;
const COILS = 10;

/** A thin ring drawn as dashed segments, done in a fragment shader so it stays one draw call. */
function HudRing({
  radius,
  width,
  count,
  duty,
  speed,
  tilt = [0, 0, 0],
  color,
  opacity,
  mode,
}: {
  radius: number;
  width: number;
  count: number;
  duty: number;
  speed: number;
  tilt?: [number, number, number];
  color: string;
  opacity: number;
  mode: Mode;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uCount: { value: count },
          uDuty: { value: duty },
          uOpacity: { value: opacity },
          uPower: { value: 0 },
          uBoost: { value: 1.0 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vP;
          void main() {
            vP = position.xy;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uCount, uDuty, uOpacity, uPower, uBoost;
          varying vec2 vP;
          void main() {
            float a = atan(vP.y, vP.x) / 6.28318 + 0.5;
            // reveal the ring around its circumference as power comes up
            if (a > uPower) discard;
            if (fract(a * uCount) > uDuty) discard;
            gl_FragColor = vec4(uColor * uBoost, uOpacity);
          }`,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending,
      }),
    [color, count, duty, opacity, mode],
  );

  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.z += speed * dt;
    material.uniforms.uPower.value = Math.min(1, live.power * 1.15);
  });

  return (
    <group rotation={tilt}>
      <mesh ref={ref} material={material}>
        <ringGeometry args={[radius, radius + width, 192, 1]} />
      </mesh>
    </group>
  );
}

/** Soft radial glow billboard behind the core. */
function Glow({ mode }: { mode: Mode }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(mode === "hud" ? "#ffcf8a" : "#e8a24a") },
          uIntensity: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; uniform float uIntensity; varying vec2 vUv;
          void main() {
            float d = length(vUv - 0.5) * 2.0;
            float g = pow(max(0.0, 1.0 - d), 3.0);
            gl_FragColor = vec4(uColor * g * uIntensity, g * uIntensity);
          }`,
        transparent: true,
        depthWrite: false,
        blending: mode === "hud" ? THREE.AdditiveBlending : THREE.NormalBlending,
      }),
    [mode],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const base = mode === "hud" ? 0.35 : 0.3;
    material.uniforms.uIntensity.value =
      live.power * base * (0.9 + 0.1 * Math.sin(t * 2.3)) + live.flare * 1.5;
  });

  return (
    <mesh material={material} position={[0, 0, 0.05]}>
      <planeGeometry args={[7, 7]} />
    </mesh>
  );
}

export default function ArcReactor({ mode }: { mode: Mode }) {
  const root = useRef<THREE.Group>(null);
  const coilRing = useRef<THREE.Group>(null);
  const triangle = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);

  const hud = mode === "hud";

  const coreMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color("#fff1dc"), toneMapped: false }),
    [],
  );
  const emissiveMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#3a2a1a",
        emissive: new THREE.Color("#ffe2b0"),
        emissiveIntensity: 0,
        metalness: 0.4,
        roughness: 0.35,
        toneMapped: false,
      }),
    [],
  );
  const coilMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#8f4f24",
        metalness: 1,
        roughness: 0.38,
        emissive: new THREE.Color("#ff9a3a"),
        emissiveIntensity: 0,
      }),
    [],
  );
  const casingMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: hud ? "#c99a3e" : "#b8862f",
        metalness: 1,
        roughness: 0.3,
      }),
    [hud],
  );
  const plateMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: hud ? "#7d0d15" : "#9a1420",
        metalness: 0.9,
        roughness: 0.5,
      }),
    [hud],
  );

  const coils = useMemo(
    () =>
      Array.from({ length: COILS }, (_, i) => {
        const a = (i / COILS) * TAU;
        return { a, x: Math.cos(a) * 1.08, y: Math.sin(a) * 1.08 };
      }),
    [],
  );

  const tmpColor = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;

    // Ease power towards its target; slower on the way up for a "spin-up" feel.
    const rate = live.powerTarget > live.power ? 0.9 : 3;
    live.power = THREE.MathUtils.damp(live.power, live.powerTarget, rate, dt);
    live.flare = THREE.MathUtils.damp(live.flare, 0, 2.2, dt);

    const p = live.power;
    // Subtle flicker: two incommensurate sines plus a rare dip.
    const flicker =
      0.92 + 0.05 * Math.sin(t * 7.3) + 0.03 * Math.sin(t * 13.1) - (Math.sin(t * 0.7) > 0.995 ? 0.25 : 0);
    const level = p * flicker + live.flare * 2.5;

    coreMat.color.copy(tmpColor.set("#fff1dc")).multiplyScalar(0.4 + level * (hud ? 3.2 : 2.6));
    emissiveMat.emissiveIntensity = level * (hud ? 1.2 : 1.4);
    coilMat.emissiveIntensity = level * (hud ? 0.35 : 0.15);
    if (light.current) light.current.intensity = level * (hud ? 18 : 8);

    if (coilRing.current) coilRing.current.rotation.z -= dt * 0.12 * (0.3 + p);
    if (triangle.current) triangle.current.rotation.z += dt * 0.35 * (0.3 + p);

    if (root.current) {
      // Gentle hover plus a slow turn driven by scroll.
      root.current.position.y = Math.sin(t * 0.8) * 0.06;
      root.current.rotation.y = THREE.MathUtils.damp(
        root.current.rotation.y,
        live.mouseX * 0.25 + Math.sin(live.scroll * Math.PI * 2) * 0.35,
        2,
        dt,
      );
      root.current.rotation.x = THREE.MathUtils.damp(root.current.rotation.x, -live.mouseY * 0.18, 2, dt);
    }
  });

  return (
    <group ref={root}>
      <pointLight ref={light} color="#ffd9a0" distance={12} decay={1.6} position={[0, 0, 1.2]} />

      {/* back plate */}
      <mesh material={plateMat} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.18]}>
        <cylinderGeometry args={[1.62, 1.62, 0.2, 96]} />
      </mesh>

      {/* outer casing */}
      <mesh material={casingMat}>
        <torusGeometry args={[1.56, 0.13, 32, 160]} />
      </mesh>
      <mesh material={casingMat} position={[0, 0, -0.04]}>
        <torusGeometry args={[1.38, 0.05, 16, 160]} />
      </mesh>

      {/* glowing channel between casing and coils */}
      <mesh material={emissiveMat} position={[0, 0, -0.06]}>
        <torusGeometry args={[1.43, 0.025, 12, 160]} />
      </mesh>

      {/* copper coil segments */}
      <group ref={coilRing}>
        {coils.map(({ a, x, y }, i) => (
          <group key={i} position={[x, y, 0]} rotation={[0, 0, a]}>
            <mesh material={coilMat}>
              <boxGeometry args={[0.42, 0.42, 0.2]} />
            </mesh>
            {[-0.12, 0, 0.12].map((o) => (
              <mesh key={o} material={emissiveMat} position={[0, o, 0.105]}>
                <boxGeometry args={[0.4, 0.025, 0.01]} />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* inner ring */}
      <mesh material={casingMat} position={[0, 0, 0.02]}>
        <torusGeometry args={[0.72, 0.07, 20, 120]} />
      </mesh>
      <mesh material={emissiveMat} position={[0, 0, 0.06]}>
        <torusGeometry args={[0.6, 0.04, 16, 120]} />
      </mesh>

      {/* triangular element: a torus with three tubular segments is a triangle */}
      <mesh ref={triangle} material={emissiveMat} position={[0, 0, 0.12]}>
        <torusGeometry args={[0.46, 0.045, 8, 3]} />
      </mesh>

      {/* core */}
      <mesh material={coreMat} position={[0, 0, 0.1]}>
        <sphereGeometry args={[0.26, 48, 48]} />
      </mesh>

      <Glow mode={mode} />

      {/* rotating HUD rings */}
      <HudRing mode={mode} radius={1.95} width={0.02} count={1} duty={0.82} speed={0.25} color={hud ? "#e3a740" : "#a0701c"} opacity={0.75} />
      <HudRing mode={mode} radius={2.12} width={0.06} count={60} duty={0.45} speed={-0.15} color={hud ? "#e3a740" : "#a0701c"} opacity={0.5} />
      <HudRing mode={mode} radius={2.42} width={0.012} count={6} duty={0.7} speed={0.4} color={hud ? "#d4202f" : "#a80f1f"} opacity={0.8} />
      <HudRing mode={mode} radius={2.62} width={0.1} count={3} duty={0.22} speed={-0.3} color={hud ? "#e3a740" : "#a0701c"} opacity={0.35} />
    </group>
  );
}
