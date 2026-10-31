"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { live } from "@/lib/live";

/**
 * GPU particle "data streams": thousands of points spiralling along arms into the
 * reactor core. All motion runs in the vertex shader; the CPU only updates uniforms.
 * Points are pushed away from the pointer.
 */
export default function DataStreams({ count = 7000, arms = 6, light = false }: { count?: number; arms?: number; light?: boolean }) {
  const points = useRef<THREE.Points>(null);
  const { camera, gl } = useThree();

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const arm = new Float32Array(count);
    const off = new Float32Array(count);
    const speed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      seed[i] = Math.random();
      arm[i] = Math.floor(Math.random() * arms);
      off[i] = Math.random();
      speed[i] = 0.6 + Math.random() * 0.8;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.setAttribute("aArm", new THREE.BufferAttribute(arm, 1));
    g.setAttribute("aOff", new THREE.BufferAttribute(off, 1));
    g.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1));
    // Positions are computed in the shader; give the bounds manually so it is never culled.
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 20);
    return g;
  }, [count, arms]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uPower: { value: 0 },
          uArms: { value: arms },
          uSize: { value: 26 * Math.min(gl.getPixelRatio(), 2) },
          uMouse: { value: new THREE.Vector3(999, 999, 0) },
          uColorA: { value: new THREE.Color(light ? "#8a1a14" : "#d4202f") },
          uColorB: { value: new THREE.Color(light ? "#5a3a10" : "#ffd79a") },
          uColorC: { value: new THREE.Color(light ? "#a0701c" : "#ffffff") },
        },
        vertexShader: /* glsl */ `
          attribute float aSeed, aArm, aOff, aSpeed;
          uniform float uTime, uPower, uArms, uSize;
          uniform vec3 uMouse;
          varying float vP;
          varying float vSeed;
          void main() {
            float p = fract(aOff + uTime * 0.04 * aSpeed);
            float r = mix(10.0, 0.3, pow(p, 0.7));
            float ang = aArm / uArms * 6.28318 + p * 6.5 + (aSeed - 0.5) * 0.5 + uTime * 0.06;
            vec3 pos = vec3(cos(ang) * r, sin(ang) * r, mix((aSeed - 0.5) * 7.0, 0.0, smoothstep(0.0, 0.9, p)));
            // give each arm some thickness
            pos.xy += vec2(sin(aSeed * 91.7), cos(aSeed * 53.3)) * 0.06 * r;

            vec4 world = modelMatrix * vec4(pos, 1.0);
            vec2 d = world.xy - uMouse.xy;
            float dist = length(d);
            world.xy += normalize(d + 1e-4) * smoothstep(2.0, 0.0, dist) * 1.1;

            vec4 mv = viewMatrix * world;
            gl_Position = projectionMatrix * mv;
            gl_PointSize = uSize * (0.35 + aSeed * 0.9) * (0.8 + p * 1.2) / -mv.z * uPower;
            vP = p;
            vSeed = aSeed;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColorA, uColorB, uColorC;
          uniform float uPower;
          varying float vP;
          varying float vSeed;
          void main() {
            vec2 c = gl_PointCoord - 0.5;
            float d = length(c);
            if (d > 0.5) discard;
            float soft = smoothstep(0.5, 0.0, d);
            vec3 col = mix(uColorA, uColorB, pow(vP, 3.0));
            // a few "hot" packets in the accent colour
            col = mix(col, uColorC, step(0.965, vSeed));
            float fade = smoothstep(0.0, 0.12, vP) * (1.0 - smoothstep(0.94, 1.0, vP));
            gl_FragColor = vec4(col, soft * fade * uPower);
          }`,
        transparent: true,
        depthWrite: false,
        blending: light ? THREE.NormalBlending : THREE.AdditiveBlending,
      }),
    [arms, gl, light],
  );

  const ndc = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uPower.value = live.power;
    // Project the pointer onto the z = 0 plane so particles can avoid it.
    ndc.set(live.mouseX, live.mouseY, 0.5).unproject(camera);
    dir.copy(ndc).sub(camera.position).normalize();
    if (Math.abs(dir.z) > 1e-4) {
      const t = -camera.position.z / dir.z;
      material.uniforms.uMouse.value.copy(camera.position).addScaledVector(dir, t);
    }
    if (points.current) points.current.rotation.z += 0.0004;
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}
