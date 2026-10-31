"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, Grid, Stars, Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import DataStreams from "./DataStreams";
import { live } from "@/lib/live";

/** Dark mode: deep-space HUD with streams of data pouring into the reactor. */
export function HudWorld({ low }: { low: boolean }) {
  const stars = useRef<THREE.Points>(null);
  useFrame((_, dt) => {
    if (stars.current) stars.current.rotation.y += dt * 0.01;
  });
  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[4, 6, 5]} intensity={1.1} color="#ffe2c0" />
      <directionalLight position={[-6, -2, 3]} intensity={0.5} color="#d4202f" />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={2.5} color="#fff0dc" scale={[8, 3, 1]} position={[0, 5, 6]} />
        <Lightformer form="rect" intensity={1} color="#ffffff" scale={[10, 2, 1]} position={[0, -5, 3]} />
      </Environment>
      <Stars ref={stars as never} radius={60} depth={40} count={low ? 600 : 1500} factor={2} saturation={0} fade speed={0.3} />
      <DataStreams count={low ? 900 : 2200} arms={5} />
    </>
  );
}

/** A faint horizontal scan line that sweeps vertically through the scene. */
function ScanPlane() {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#e3a740",
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.elapsedTime * 0.12) % 1;
    ref.current.position.y = THREE.MathUtils.lerp(-6, 6, t);
    mat.opacity = 0.1 * live.power * Math.sin(t * Math.PI);
  });
  return (
    <mesh ref={ref} material={mat} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[30, 0.04]} />
    </mesh>
  );
}

/** Wireframe hologram floating above a projector beam. */
function Hologram({
  position,
  children,
  speed = 0.3,
}: {
  position: [number, number, number];
  children: React.ReactNode;
  speed?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const beam = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uPower: { value: 0 } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uPower; varying vec2 vUv;
          void main(){ float a = pow(1.0 - vUv.y, 1.5) * 0.18 * uPower; gl_FragColor = vec4(0.89, 0.62, 0.22, a); }`,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  useFrame((_, dt) => {
    if (ref.current) {
      ref.current.rotation.y += dt * speed;
      ref.current.rotation.x += dt * speed * 0.4;
    }
    beam.uniforms.uPower.value = live.power;
  });
  const floor = -2.4;
  const h = position[1] - floor;
  return (
    <group position={[position[0], 0, position[2]]}>
      {/* projector puck */}
      <mesh position={[0, floor + 0.05, 0]}>
        <cylinderGeometry args={[0.45, 0.5, 0.1, 40]} />
        <meshStandardMaterial color="#9a1420" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0, floor + 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.36, 48]} />
        <meshBasicMaterial color="#e3a740" />
      </mesh>
      {/* light cone */}
      <mesh material={beam} position={[0, floor + h / 2, 0]}>
        <cylinderGeometry args={[0.9, 0.3, h, 40, 1, true]} />
      </mesh>
      <Float speed={1.4} floatIntensity={0.6} rotationIntensity={0.2}>
        <mesh ref={ref} position={[0, position[1] - 0, 0]}>
          {children}
          <meshBasicMaterial color="#b9791f" wireframe transparent opacity={0.75} />
        </mesh>
      </Float>
    </group>
  );
}

/** Light mode: a bright workshop with a holographic floor and floating projections. */
export function LabWorld({ low }: { low: boolean }) {
  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[5, 8, 6]} intensity={1.4} />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={3} color="#ffffff" scale={[12, 4, 1]} position={[0, 6, 4]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={1.5} color="#ffd9b0" scale={[4, 8, 1]} position={[-6, 0, 2]} rotation-y={Math.PI / 2} />
        <Lightformer form="ring" intensity={1.5} color="#ff8a7a" scale={4} position={[5, 1, 3]} />
      </Environment>

      <Grid
        position={[0, -2.4, 0]}
        args={[40, 40]}
        cellSize={0.5}
        cellThickness={0.6}
        cellColor="#cdbfb2"
        sectionSize={2.5}
        sectionThickness={1.1}
        sectionColor="#a80f1f"
        fadeDistance={32}
        fadeStrength={1.6}
        infiniteGrid
      />

      {/* pedestal under the reactor */}
      <mesh position={[0, -2.3, 0]}>
        <cylinderGeometry args={[0.7, 0.9, 0.2, 64]} />
        <meshStandardMaterial color="#2a2222" metalness={0.8} roughness={0.35} />
      </mesh>

      <Hologram position={[-11, 1.6, -7]}>
        <icosahedronGeometry args={[1, 1]} />
      </Hologram>
      <Hologram position={[6.5, 0.8, -5]} speed={-0.25}>
        <torusKnotGeometry args={[0.7, 0.2, 90, 10]} />
      </Hologram>
      {!low && (
        <>
          <Hologram position={[-9, 0.2, 1]} speed={0.4}>
            <octahedronGeometry args={[0.8, 0]} />
          </Hologram>
          <Hologram position={[4.2, 2.2, 2.5]} speed={0.2}>
            <dodecahedronGeometry args={[0.7, 0]} />
          </Hologram>
        </>
      )}

      <DataStreams count={low ? 500 : 1200} arms={4} light />
    </>
  );
}
