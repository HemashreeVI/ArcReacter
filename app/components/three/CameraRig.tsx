"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { live } from "@/lib/live";
import { useStore } from "@/lib/store";

type V3 = [number, number, number];
type Stop = { y: number; pos: V3; look: V3 };

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Camera stops pinned to real section positions, so the path fits any screen. */
function buildStops() {
  const vh = window.innerHeight;
  const top = (id: string) => {
    const e = document.getElementById(id);
    return e ? e.getBoundingClientRect().top + window.scrollY : 0;
  };
  const h = (id: string) => document.getElementById(id)?.offsetHeight ?? 0;
  const wide = window.innerWidth >= 900;
  const k = wide ? 1 : 0;
  const far = wide ? 1 : 1.45; // phones: pull back so the whole city fits

  const st = top("district"), sh = h("district");
  const v = (x: number, y: number, z: number): V3 => [x * far, y * far, z * far];

  const stops: Stop[] = [
    { y: 0, pos: v(-17, 12.5, 22), look: [-8.2 * k, wide ? 0.6 : 9, 0] }, // hero: city on the right
    { y: top("about"), pos: v(19, 9, 15), look: [10.5 * k, wide ? 0.8 : 6, 0] }, // about: city on the left
    { y: st - vh * 0.15, pos: v(0, 29, 12.5), look: [0, -0.6, -0.6] }, // landmarks
    { y: st + sh - vh, pos: v(0, 28, 11.5), look: [0, -0.6, -0.6] },
    { y: top("work"), pos: v(-20, 12, -11), look: [0, 1.5, 0] },
    { y: top("experience"), pos: v(16, 5, -17), look: [-7 * k, 2, 0] },
    { y: top("skills"), pos: v(0.01, 30, 0.6), look: [0, 0, 0] }, // straight down
    { y: top("gallery"), pos: v(-17, 6, 17), look: [5 * k, 2, 0] },
    { y: top("contact"), pos: v(17, 12, 21), look: [8.2 * k, 0.6, 0] },
  ];
  for (let i = 1; i < stops.length; i++) stops[i].y = Math.max(stops[i].y, stops[i - 1].y);
  return { stops, st, sh, vh };
}

export default function CameraRig() {
  const ready = useStore((s) => s.ready);
  const path = useRef<ReturnType<typeof buildStops> | null>(null);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const cur = useMemo(() => new THREE.Vector3(-8.2, 0.6, 0), []);
  const a = useMemo(() => new THREE.Vector3(), []);
  const b = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const rebuild = () => (path.current = buildStops());
    rebuild();
    const ro = new ResizeObserver(rebuild);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, [ready]);

  useFrame(({ camera }, dt) => {
    const p = path.current;
    if (!p) return;
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    live.scroll = max > 0 ? THREE.MathUtils.clamp(y / max, 0, 1) : 0;

    const { stops } = p;
    let i = 0;
    while (i < stops.length - 2 && y >= stops[i + 1].y) i++;
    const s0 = stops[i], s1 = stops[i + 1];
    const span = s1.y - s0.y;
    const t = span > 0 ? smooth(THREE.MathUtils.clamp((y - s0.y) / span, 0, 1)) : 1;
    pos.copy(a.fromArray(s0.pos)).lerp(b.fromArray(s1.pos), t);
    look.copy(a.fromArray(s0.look)).lerp(b.fromArray(s1.look), t);

    const inDistrict = y > p.st - p.vh * 0.5 && y < p.st + p.sh - p.vh * 0.5;
    live.pins = THREE.MathUtils.damp(live.pins, inDistrict ? 1 : 0, 4, dt);

    if (live.focus) {
      const [fx, fy, fz] = live.focus;
      pos.set(fx + 2.2, fy + 2.2, fz + 4.2);
      look.set(fx, fy - 0.8, fz);
    } else {
      pos.x += live.mouseX * 0.8;
      pos.y += live.mouseY * 0.5;
    }

    const r = live.focus ? 3.5 : 2.6;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, pos.x, r, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, pos.y, r, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, pos.z, r, dt);
    cur.x = THREE.MathUtils.damp(cur.x, look.x, r, dt);
    cur.y = THREE.MathUtils.damp(cur.y, look.y, r, dt);
    cur.z = THREE.MathUtils.damp(cur.z, look.z, r, dt);
    camera.lookAt(cur);
  });

  return null;
}
