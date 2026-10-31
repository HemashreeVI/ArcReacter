"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useStore } from "@/lib/store";

/** Short loader; when it lifts, the city builds itself. */
export default function Preloader() {
  const setReady = useStore((s) => s.setReady);
  const el = useRef<HTMLDivElement>(null);
  const [pct, setPct] = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    let fast = false;
    try {
      fast = sessionStorage.getItem("hv-seen") === "1";
      sessionStorage.setItem("hv-seen", "1");
    } catch {}
    const o = { v: 0 };
    const tl = gsap.timeline();
    tl.to(o, { v: 100, duration: fast ? 0.5 : 1.6, ease: "power2.inOut", onUpdate: () => setPct(Math.round(o.v)) })
      .add(() => setReady(true))
      .to(el.current, { opacity: 0, duration: 0.7, ease: "power2.out" }, "+=0.1")
      .add(() => setGone(true));
    return () => {
      tl.kill();
    };
  }, [setReady]);

  if (gone) return null;
  return (
    <div ref={el} className="preloader" role="status" aria-label="Loading">
      <div className="pl-mark">HV</div>
      <div className="pl-bar">
        <i style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
      <div className="pl-txt">
        Building the city <b>{pct}%</b>
      </div>
    </div>
  );
}
