"use client";

import { useEffect, useRef } from "react";
import { live } from "@/lib/live";

/** Targeting-reticle cursor with live coordinates. Disabled on touch devices. */
export default function Cursor() {
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const coords = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const onMoveAll = (e: PointerEvent) => {
      live.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      live.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("pointermove", onMoveAll);
    if (!fine) return () => window.removeEventListener("pointermove", onMoveAll);

    document.documentElement.classList.add("has-cursor");
    let x = innerWidth / 2,
      y = innerHeight / 2,
      rx = x,
      ry = y,
      raf = 0;
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      const t = e.target as HTMLElement | null;
      const hot = !!t?.closest("a, button, [data-cursor]");
      ring.current?.classList.toggle("hot", hot);
    };
    const onDown = () => ring.current?.classList.add("down");
    const onUp = () => ring.current?.classList.remove("down");
    const loop = () => {
      rx += (x - rx) * 0.18;
      ry += (y - ry) * 0.18;
      if (ring.current) ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      if (dot.current) dot.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (coords.current) coords.current.textContent = `${String(Math.round(x)).padStart(4, "0")}·${String(Math.round(y)).padStart(4, "0")}`;
      raf = requestAnimationFrame(loop);
    };
    loop();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("has-cursor");
      window.removeEventListener("pointermove", onMoveAll);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <>
      <div ref={ring} className="cursor-ring" aria-hidden>
        <span ref={coords} className="cursor-coords mono" />
      </div>
      <div ref={dot} className="cursor-dot" aria-hidden />
    </>
  );
}
