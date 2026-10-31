"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { live } from "@/lib/live";
import { site } from "@/lib/site";
import { useStore } from "@/lib/store";

/* ------------------------------------------------------------------ layout constants */

export const R = 7.2; // radius of the city disc
const S = 2.2; // block pitch (block + road)
const ROAD = 0.46;
const B = S - ROAD; // block size

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ------------------------------------------------------------------ textures (painted on canvases, nothing to download) */

function canvasTex(w: number, h: number, paint: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  paint(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** One window cell per texture repeat: a pane inside a light mullion frame. */
function windowTex(pane: string, frame: string, frameW: number) {
  return canvasTex(64, 64, (g) => {
    g.fillStyle = frame;
    g.fillRect(0, 0, 64, 64);
    const fw = 64 * frameW;
    const grd = g.createLinearGradient(0, 0, 64, 64);
    grd.addColorStop(0, pane);
    grd.addColorStop(1, shade(pane, -0.25));
    g.fillStyle = grd;
    g.fillRect(fw, fw * 1.3, 64 - fw * 2, 64 - fw * 2.3);
  });
}

/** 4×4 cells of randomly lit windows, used as the night-time emissive map. */
function nightTex(seed: number) {
  const r = rng(seed);
  return canvasTex(256, 256, (g) => {
    g.fillStyle = "#000";
    g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        if (r() < 0.45) continue;
        const warm = r() > 0.25;
        g.fillStyle = warm ? `hsl(${36 + r() * 10}, 100%, ${62 + r() * 14}%)` : "#bcd6ff";
        g.fillRect(x * 64 + 9, y * 64 + 11, 46, 42);
      }
  });
}

function shade(hex: string, k: number) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, k * 0.4);
  return `#${c.getHexString()}`;
}

/** Streets, pavements and lots painted to match the block grid. */
function groundTex(parks: Set<string>) {
  const N = 1024;
  const toPx = (v: number) => ((v + R) / (2 * R)) * N;
  return canvasTex(N, N, (g) => {
    g.fillStyle = "#2c3c66";
    g.fillRect(0, 0, N, N);
    for (let i = -4; i <= 4; i++)
      for (let j = -4; j <= 4; j++) {
        const cx = i * S, cz = j * S;
        const x0 = toPx(cx - B / 2), z0 = toPx(cz - B / 2), sz = (B / (2 * R)) * N;
        g.fillStyle = "#a9badf";
        roundRect(g, x0, z0, sz, sz, 10);
        g.fillStyle = parks.has(`${i},${j}`) ? "#6fb27a" : "#c2cfeb";
        roundRect(g, x0 + 7, z0 + 7, sz - 14, sz - 14, 6);
      }
    // lane markings
    g.strokeStyle = "rgba(255,255,255,0.55)";
    g.lineWidth = 2;
    g.setLineDash([10, 12]);
    for (let i = -4; i <= 3; i++) {
      const c = toPx((i + 0.5) * S);
      g.beginPath();
      g.moveTo(c, 0);
      g.lineTo(c, N);
      g.moveTo(0, c);
      g.lineTo(N, c);
      g.stroke();
    }
  });
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.fill();
}

/* ------------------------------------------------------------------ geometry helpers */

const CELL_W = 0.2; // window width in world units
const CELL_H = 0.26; // storey height

/** Box whose side UVs are scaled so one window texture tile = one window. */
function boxGeo(w: number, h: number, d: number) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  // face order: +x, -x, +y, -y, +z, -z (4 vertices each)
  const across = [d, d, 0, 0, w, w];
  for (let f = 0; f < 6; f++) {
    if (f === 2 || f === 3) {
      for (let v = 0; v < 4; v++) uv.setXY(f * 4 + v, 0.02, 0.02);
      continue;
    }
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * Math.max(1, Math.round(across[f] / CELL_W)), uv.getY(i) * Math.max(1, Math.round(h / CELL_H)));
    }
  }
  geo.translate(0, h / 2, 0);
  return geo;
}

function cylGeo(r: number, h: number) {
  const geo = new THREE.CylinderGeometry(r, r, h, 40, 1);
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  const side = 41 * 2; // (radialSegments + 1) * (heightSegments + 1) side vertices come first
  const su = Math.round((Math.PI * 2 * r) / CELL_W), sv = Math.max(1, Math.round(h / CELL_H));
  for (let i = 0; i < side; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  geo.translate(0, h / 2, 0);
  return geo;
}

/* ------------------------------------------------------------------ build-up animation in the vertex shader */

const buildUniform = { value: -1 };

/** Scales every vertex's height by the building's own rise progress (aDelay per vertex). */
function withBuild<T extends THREE.Material>(m: T): T {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uBuild = buildUniform;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aDelay;\nuniform float uBuild;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float bk = clamp((uBuild - aDelay) / 0.9, 0.0, 1.0);
        bk = 1.0 - pow(1.0 - bk, 4.0);
        transformed.y *= max(bk, 0.0001);`,
      );
  };
  m.customProgramCacheKey = () => "city-build";
  return m;
}

/* ------------------------------------------------------------------ city plan */

type Piece = {
  geo: THREE.BufferGeometry;
  mat: "glass" | "silver" | "accent" | "roof" | "metal";
  pos: [number, number, number];
  rotY?: number;
  multi?: boolean; // box with separate roof material
};
type Building = { pieces: Piece[]; x: number; z: number; delay: number; top: number; landmark?: string };

const LANDMARK_LOTS: [number, number, string][] = [
  [0, 0, "jarvis"],
  [1, -1, "dental"],
  [-1, 1, "rootlens"],
  [-2, -1, "rover"],
  [2, 1, "triage"],
  [0, -2, "walker"],
  [0, 2, "grocer"],
  [-1, -1, "ids"],
];

function makeTower(r: () => number, x: number, z: number, w: number, d: number, h: number, kind: number, glass: Piece["mat"]): Piece[] {
  const p: Piece[] = [];
  if (kind === 0) {
    // stepped tower
    const h1 = h * (0.6 + r() * 0.15);
    p.push({ geo: boxGeo(w, h1, d), mat: glass, pos: [x, 0, z], multi: true });
    const w2 = w * 0.72, d2 = d * 0.72, h2 = h - h1;
    p.push({ geo: boxGeo(w2, h2, d2), mat: glass, pos: [x, h1, z], multi: true });
    if (r() > 0.4) p.push({ geo: new THREE.CylinderGeometry(0.015, 0.02, 0.6, 6).translate(0, 0.3, 0), mat: "metal", pos: [x, h, z] });
  } else if (kind === 1) {
    // round tower with silver bands
    const rad = Math.min(w, d) / 2;
    p.push({ geo: cylGeo(rad, h), mat: glass, pos: [x, 0, z] });
    for (let y = CELL_H * 6; y < h - 0.2; y += CELL_H * 6)
      p.push({ geo: new THREE.TorusGeometry(rad + 0.01, 0.025, 6, 40).rotateX(Math.PI / 2), mat: "silver", pos: [x, y, z] });
    p.push({ geo: new THREE.CylinderGeometry(rad * 0.8, rad, 0.12, 40).translate(0, 0.06, 0), mat: "silver", pos: [x, h, z] });
  } else if (kind === 2) {
    // glass spire with a pyramid crown
    p.push({ geo: boxGeo(w, h, d), mat: glass, pos: [x, 0, z], multi: true });
    const crown = new THREE.ConeGeometry(Math.max(w, d) * 0.72, h * 0.28, 4).rotateY(Math.PI / 4).translate(0, h * 0.14, 0);
    p.push({ geo: crown, mat: "accent", pos: [x, h, z] });
  } else {
    // low block with a rooftop box
    p.push({ geo: boxGeo(w, h, d), mat: glass, pos: [x, 0, z], multi: true });
    p.push({ geo: new THREE.BoxGeometry(w * 0.35, 0.12, d * 0.3).translate(0, 0.06, 0), mat: "roof", pos: [x + w * 0.15, h, z - d * 0.1] });
  }
  return p;
}

function planCity() {
  const r = rng(2024);
  const buildings: Building[] = [];
  const parks = new Set<string>();
  const trees: [number, number, number][] = [];
  const marks = new Map(LANDMARK_LOTS.map(([i, j, id]) => [`${i},${j}`, id]));

  for (let i = -3; i <= 3; i++)
    for (let j = -3; j <= 3; j++) {
      const cx = i * S, cz = j * S;
      const dist = Math.hypot(cx, cz);
      if (dist + B * 0.62 > R) continue;
      const key = `${i},${j}`;
      const landmark = marks.get(key);
      const hc = 1.0 + 5.6 * Math.exp(-(dist * dist) / 16);
      const delay = dist * 0.11 + r() * 0.25;

      if (!landmark && (r() < 0.12 || (dist > 5 && r() < 0.3))) {
        parks.add(key);
        for (let t = 0; t < 5; t++) trees.push([cx + (r() - 0.5) * B * 0.7, cz + (r() - 0.5) * B * 0.7, 0.7 + r() * 0.5]);
        continue;
      }

      if (landmark) {
        const h = Math.max(hc * 1.15, 2.6);
        const kind = [2, 1, 0, 2][buildings.filter((b) => b.landmark).length % 4];
        buildings.push({ pieces: makeTower(r, cx, cz, B * 0.62, B * 0.62, h, kind, "accent"), x: cx, z: cz, delay, top: h + (kind === 2 ? h * 0.28 : 0.15), landmark });
        continue;
      }

      const glass = r() < 0.72 ? "glass" : "silver";
      if (r() < 0.55 || dist < 3) {
        const h = hc * (0.6 + r() * 0.55);
        const kind = h > 3 ? Math.floor(r() * 3) : 3;
        const w = B * (0.55 + r() * 0.2), d = B * (0.55 + r() * 0.2);
        buildings.push({ pieces: makeTower(r, cx, cz, w, d, h, kind, glass), x: cx, z: cz, delay, top: h });
      } else {
        // four small buildings on one block
        for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          if (r() < 0.15) continue;
          const h = hc * (0.25 + r() * 0.35);
          const w = B * (0.32 + r() * 0.08), d = B * (0.32 + r() * 0.08);
          const x = cx + (ox * B) / 4.4, z = cz + (oz * B) / 4.4;
          buildings.push({ pieces: makeTower(r, x, z, w, d, h, h > 2 ? Math.floor(r() * 3) : 3, r() < 0.6 ? "glass" : "silver"), x, z, delay: delay + r() * 0.2, top: h });
        }
      }
    }
  return { buildings, parks, trees };
}

/* ------------------------------------------------------------------ pieces */

function Trees({ trees }: { trees: [number, number, number][] }) {
  const leaves = useRef<THREE.InstancedMesh>(null);
  const trunks = useRef<THREE.InstancedMesh>(null);
  const done = useRef(false);
  useFrame(() => {
    if (done.current || !leaves.current || !trunks.current) return;
    done.current = true;
    const o = new THREE.Object3D();
    trees.forEach(([x, z, s], i) => {
      o.position.set(x, 0.1 * s, z);
      o.scale.setScalar(s);
      o.updateMatrix();
      trunks.current!.setMatrixAt(i, o.matrix);
      o.position.set(x, 0.26 * s, z);
      o.updateMatrix();
      leaves.current!.setMatrixAt(i, o.matrix);
    });
    leaves.current.instanceMatrix.needsUpdate = true;
    trunks.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={trunks} args={[undefined, undefined, trees.length]} castShadow>
        <cylinderGeometry args={[0.02, 0.03, 0.2, 6]} />
        <meshStandardMaterial color="#6b4f3a" />
      </instancedMesh>
      <instancedMesh ref={leaves} args={[undefined, undefined, trees.length]} castShadow>
        <icosahedronGeometry args={[0.16, 1]} />
        <meshStandardMaterial color="#4c9a5f" roughness={0.7} flatShading />
      </instancedMesh>
    </>
  );
}

const CAR_COLORS = ["#ffffff", "#e8eef9", "#e04848", "#f2c14e", "#3a6fe0", "#1d2433"];

function Cars({ count, mats }: { count: number; mats: { car: THREE.MeshStandardMaterial } }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const cars = useMemo(() => {
    const r = rng(77);
    const roads: number[] = [];
    for (let i = -4; i <= 3; i++) {
      const c = (i + 0.5) * S;
      if (Math.abs(c) < R - 0.6) roads.push(c);
    }
    return Array.from({ length: count }, () => {
      const c = roads[Math.floor(r() * roads.length)];
      const dir = r() > 0.5 ? 1 : -1;
      return { axis: r() > 0.5 ? 0 : 1, c: c + dir * 0.1, dir, s: (r() - 0.5) * 10, v: 0.35 + r() * 0.5, L: Math.sqrt(R * R - c * c) - 0.35, color: CAR_COLORS[Math.floor(r() * CAR_COLORS.length)] };
    });
  }, [count]);
  const o = useMemo(() => new THREE.Object3D(), []);
  const colored = useRef(false);

  useFrame((_, dt) => {
    const m = mesh.current;
    if (!m) return;
    if (!colored.current) {
      colored.current = true;
      const c = new THREE.Color();
      cars.forEach((car, i) => m.setColorAt(i, c.set(car.color)));
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    const build = THREE.MathUtils.clamp((live.buildT - 1.2) / 0.8, 0, 1);
    cars.forEach((car, i) => {
      car.s += car.v * car.dir * Math.min(dt, 0.05);
      if (car.s > car.L) car.s = -car.L;
      if (car.s < -car.L) car.s = car.L;
      if (car.axis === 0) {
        o.position.set(car.s, 0.045, car.c);
        o.rotation.y = 0;
      } else {
        o.position.set(car.c, 0.045, car.s);
        o.rotation.y = Math.PI / 2;
      }
      o.scale.setScalar(build);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, mats.car, count]} castShadow>
      <boxGeometry args={[0.16, 0.07, 0.085]} />
    </instancedMesh>
  );
}

function Cloud({ position, scale = 1, phase = 0 }: { position: [number, number, number]; scale?: number; phase?: number }) {
  const ref = useRef<THREE.Group>(null);
  const puffs = useMemo(() => {
    const r = rng(Math.floor(phase * 1000) + 3);
    return Array.from({ length: 6 }, (_, i) => ({
      p: [(i - 2.5) * 0.32 + (r() - 0.5) * 0.15, (r() - 0.3) * 0.18, (r() - 0.5) * 0.3] as [number, number, number],
      s: 0.28 + r() * 0.22 + (i === 2 || i === 3 ? 0.12 : 0),
    }));
  }, [phase]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.position.y = position[1] + Math.sin(t * 0.5 + phase) * 0.25;
    ref.current.position.x = position[0] + Math.sin(t * 0.13 + phase) * 0.5;
  });
  return (
    <group ref={ref} position={position} scale={scale}>
      {puffs.map((pf, i) => (
        <mesh key={i} position={pf.p} scale={pf.s} castShadow>
          <sphereGeometry args={[1, 32, 24]} />
          <meshPhysicalMaterial color="#dfe8fb" roughness={0.35} metalness={0.1} clearcoat={0.8} clearcoatRoughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

function Pin({ id, at }: { id: string; at: [number, number, number] }) {
  const p = site.projects.find((x) => x.id === id)!;
  const open = useStore((s) => s.openProject);
  const el = useRef<HTMLDivElement>(null);
  const anchor = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!el.current) return;
    el.current.style.opacity = String(live.pins);
    el.current.style.pointerEvents = live.pins > 0.6 && !live.focus ? "auto" : "none";
  });
  const go = () => {
    const v = new THREE.Vector3();
    anchor.current?.getWorldPosition(v);
    live.focus = [v.x, v.y, v.z];
    setTimeout(() => open(id), 700);
  };
  return (
    <group ref={anchor} position={at}>
    <Html center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
      <div ref={el} className="pin" style={{ opacity: 0 }}>
        <button onClick={go}>
          <span className="pin-dot" />
          <span className="pin-text">
            <small>{p.genre.split("·")[0].trim()}</small>
            <b>{p.title}</b>
          </span>
        </button>
        <i className="pin-stem" />
      </div>
    </Html>
    </group>
  );
}

/* ------------------------------------------------------------------ city */

export default function City({ low }: { low: boolean }) {
  const mode = useStore((s) => s.mode);
  const ready = useStore((s) => s.ready);
  const root = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const rings = useRef<(THREE.Mesh | null)[]>([]);

  const plan = useMemo(planCity, []);

  const mats = useMemo(() => {
    const n1 = nightTex(1), n2 = nightTex(2);
    n1.repeat.set(0.25, 0.25);
    n2.repeat.set(0.25, 0.25);
    const glass = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      map: windowTex("#2f63d6", "#9fb8ee", 0.1),
      metalness: 0.35,
      roughness: 0.16,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      emissive: "#ffffff",
      emissiveMap: n1,
      emissiveIntensity: 0,
      envMapIntensity: 1.3,
    });
    const silver = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      map: windowTex("#5d84d4", "#eef3fc", 0.2),
      metalness: 0.45,
      roughness: 0.22,
      clearcoat: 1,
      emissive: "#ffffff",
      emissiveMap: n2,
      emissiveIntensity: 0,
    });
    const accent = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      map: windowTex("#1d4fd8", "#7fa6ff", 0.08),
      metalness: 0.5,
      roughness: 0.1,
      clearcoat: 1,
      emissive: "#ffffff",
      emissiveMap: n1,
      emissiveIntensity: 0,
      envMapIntensity: 1.6,
    });
    const roof = new THREE.MeshStandardMaterial({ color: "#cdd7ec", roughness: 0.6, metalness: 0.2 });
    const metal = new THREE.MeshStandardMaterial({ color: "#dde4f2", roughness: 0.3, metalness: 0.9 });
    const ground = new THREE.MeshStandardMaterial({ map: groundTex(plan.parks), roughness: 0.75, metalness: 0.05 });
    const slab = new THREE.MeshPhysicalMaterial({ color: "#eef2fb", metalness: 0.4, roughness: 0.18, clearcoat: 1 });
    const slab2 = new THREE.MeshPhysicalMaterial({ color: "#2b55b8", metalness: 0.75, roughness: 0.22, clearcoat: 1 });
    const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color("#6fa8ff"), toneMapped: false });
    const car = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.3, metalness: 0.4, emissive: "#fff2c8", emissiveIntensity: 0 });
    const ring = new THREE.MeshBasicMaterial({ color: new THREE.Color("#8fc0ff"), toneMapped: false, transparent: true, opacity: 0 });
    [glass, silver, accent, roof, metal].forEach((m) => withBuild(m));
    return { glass, silver, accent, roof, metal, ground, slab, slab2, glow, car, ring };
  }, [plan.parks]);

  // One merged mesh per material: a handful of draw calls for the whole skyline.
  const merged = useMemo(() => {
    const buckets: Record<string, THREE.BufferGeometry[]> = {};
    plan.buildings.forEach((b) =>
      b.pieces.forEach((p) => {
        let g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
        if (!g.attributes.uv) return;
        g = new THREE.BufferGeometry().copy(g);
        for (const name of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(name)) g.deleteAttribute(name);
        g.clearGroups();
        g.translate(p.pos[0], p.pos[1], p.pos[2]);
        const n = g.attributes.position.count;
        g.setAttribute("aDelay", new THREE.Float32BufferAttribute(new Float32Array(n).fill(b.delay), 1));
        (buckets[p.mat] ??= []).push(g);
      }),
    );
    return Object.entries(buckets).map(([mat, list]) => ({ mat: mat as Piece["mat"], geo: mergeGeometries(list, false)! }));
  }, [plan]);

  const depthMat = useMemo(() => withBuild(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })), []);

  const glowColor = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock }, dt) => {
    if (ready) live.buildT = live.buildT < 0 ? 0 : live.buildT + dt;
    const bt = live.buildT;

    // buildings rise out of the platform, centre first (see withBuild)
    buildUniform.value = bt;

    // day ↔ night
    live.night = THREE.MathUtils.damp(live.night, mode === "night" ? 1 : 0, 2.5, dt);
    const n = live.night;
    mats.glass.emissiveIntensity = n * 1.6;
    mats.silver.emissiveIntensity = n * 1.3;
    mats.accent.emissiveIntensity = n * 1.8;
    mats.car.emissiveIntensity = n * 0.9;
    mats.ground.color.setScalar(1 - n * 0.55);
    mats.glass.envMapIntensity = 1.3 - n * 0.8;
    glowColor.set("#6fa8ff").multiplyScalar(1.4 + n * 2.2 + Math.sin(clock.elapsedTime * 2) * 0.15);
    mats.glow.color.copy(glowColor);

    // landmark rings pulse while the projects are on show
    const t = clock.elapsedTime;
    mats.ring.opacity = live.pins * 0.9;
    rings.current.forEach((m, i) => {
      if (m) m.scale.setScalar(1 + ((t * 0.6 + i * 0.13) % 1) * 0.6);
    });

    // slow turntable, which pauses while you pick a landmark
    if (spin.current) spin.current.rotation.y += dt * 0.05 * (1 - live.pins) * (live.focus ? 0 : 1);
    if (root.current) {
      root.current.rotation.x = THREE.MathUtils.damp(root.current.rotation.x, live.mouseY * 0.04, 2, dt);
      root.current.rotation.z = THREE.MathUtils.damp(root.current.rotation.z, -live.mouseX * 0.04, 2, dt);
      root.current.position.y = Math.sin(t * 0.6) * 0.08;
    }
  });

  return (
    <group ref={root}>
      <group ref={spin}>
        {/* platform */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} material={mats.ground} receiveShadow>
          <circleGeometry args={[R, 128]} />
        </mesh>
        <mesh material={mats.slab} position={[0, -0.18, 0]} receiveShadow>
          <cylinderGeometry args={[R + 0.15, R + 0.15, 0.36, 128]} />
        </mesh>
        <mesh material={mats.glow} position={[0, -0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[R + 0.17, 0.035, 12, 160]} />
        </mesh>
        <mesh material={mats.slab2} position={[0, -0.56, 0]}>
          <cylinderGeometry args={[R + 0.7, R + 0.95, 0.4, 128]} />
        </mesh>
        <mesh material={mats.glow} position={[0, -0.36, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[R + 0.72, 0.03, 12, 160]} />
        </mesh>
        <mesh position={[0, -0.86, 0]}>
          <cylinderGeometry args={[R + 1.35, R + 1.4, 0.12, 128]} />
          <meshPhysicalMaterial color="#9fbaf0" metalness={0.3} roughness={0.15} transparent opacity={0.55} />
        </mesh>

        {/* buildings */}
        {merged.map(({ mat, geo }) => (
          <mesh key={mat} geometry={geo} material={mats[mat]} customDepthMaterial={depthMat} castShadow receiveShadow />
        ))}

        {/* landmark rings + pins */}
        {plan.buildings
          .filter((b) => b.landmark)
          .map((b, i) => (
            <group key={b.landmark}>
              <mesh
                ref={(m) => {
                  rings.current[i] = m;
                }}
                material={mats.ring}
                position={[b.x, 0.02, b.z]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <ringGeometry args={[0.85, 0.92, 48]} />
              </mesh>
              <Pin id={b.landmark!} at={[b.x, b.top + (b.landmark === "jarvis" ? 1.6 : 0.35), b.z]} />
            </group>
          ))}

        <Trees trees={plan.trees} />
        <Cars count={low ? 26 : 48} mats={mats} />
      </group>

      {/* clouds don't spin with the city */}
      <Cloud position={[-7.5, 5.2, -4]} scale={1.1} phase={0.3} />
      <Cloud position={[6.5, 6.2, -5]} scale={1.3} phase={1.7} />
      <Cloud position={[8.5, 3.6, 5]} scale={0.8} phase={2.9} />
      {!low && <Cloud position={[-9, 2.8, 4]} scale={0.7} phase={4.1} />}
    </group>
  );
}
