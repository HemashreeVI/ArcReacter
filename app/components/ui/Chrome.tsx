"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { live } from "@/lib/live";
import { useStore, type Mode } from "@/lib/store";

export const NAV = [
  ["hero", "Home"],
  ["profile", "Profile"],
  ["projects", "Projects"],
  ["experience", "Timeline"],
  ["skills", "Systems"],
  ["contact", "Contact"],
] as const;

function Clock() {
  const [now, setNow] = useState("");
  useEffect(() => {
    const tick = () =>
      setNow(new Date().toLocaleTimeString("en-GB", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="mono">{now}</span>;
}

/** Light/dark switch: a shockwave sweeps out from the button, the scene swaps under cover of it. */
function ModeToggle() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const switching = useStore((s) => s.switching);
  const setSwitching = useStore((s) => s.setSwitching);
  const btn = useRef<HTMLButtonElement>(null);

  const toggle = () => {
    if (switching) return;
    const next: Mode = mode === "hud" ? "lab" : "hud";
    const flash = document.querySelector<HTMLDivElement>(".mode-flash");
    const r = btn.current?.getBoundingClientRect();
    if (!flash || !r) {
      setMode(next);
      return;
    }
    setSwitching(true);
    flash.style.setProperty("--fx", `${r.left + r.width / 2}px`);
    flash.style.setProperty("--fy", `${r.top + r.height / 2}px`);
    flash.dataset.to = next;
    live.flare = 1;
    gsap
      .timeline({ onComplete: () => setSwitching(false) })
      .set(flash, { "--r": "0vmax", opacity: 1 })
      .to(flash, { "--r": "160vmax", duration: 0.7, ease: "power3.in" })
      .add(() => {
        setMode(next);
        try {
          localStorage.setItem("arc-mode", next);
        } catch {}
      })
      .to(flash, { opacity: 0, duration: 0.7, ease: "power2.out" }, "+=0.08");
  };

  return (
    <button
      ref={btn}
      className="mode-toggle"
      onClick={toggle}
      data-cursor
      aria-label={`Switch to ${mode === "hud" ? "light lab" : "dark HUD"} mode`}
    >
      <span className={mode === "lab" ? "on" : ""}>LAB</span>
      <i className="mt-core" />
      <span className={mode === "hud" ? "on" : ""}>HUD</span>
    </button>
  );
}

export default function Chrome() {
  const section = useStore((s) => s.section);
  const setSection = useStore((s) => s.setSection);
  const booted = useStore((s) => s.booted);
  const bar = useRef<HTMLDivElement>(null);

  // Track the visible section for the nav and status line.
  useEffect(() => {
    const els = NAV.map(([id]) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => e.isIntersecting && setSection(e.target.id));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [setSection]);

  // Scroll gauge.
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (bar.current) bar.current.style.transform = `scaleY(${live.scroll})`;
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);

  const label = NAV.find(([id]) => id === section)?.[1] ?? "";

  return (
    <div className={`chrome ${booted ? "in" : ""}`}>
      <span className="corner tl" />
      <span className="corner tr" />
      <span className="corner bl" />
      <span className="corner br" />

      <header className="topbar">
        <a href="#hero" className="brand" data-cursor>
          <i className="brand-core" />
          <span>
            J.A.R.V.I.S<b>/HV</b>
          </span>
        </a>
        <nav className="nav">
          {NAV.slice(1).map(([id, name]) => (
            <a key={id} href={`#${id}`} className={section === id ? "active" : ""} data-cursor>
              {name}
            </a>
          ))}
        </nav>
        <div className="topbar-right">
          <Clock />
          <ModeToggle />
        </div>
      </header>

      <div className="status mono">
        <span className="blink">●</span> SYS ONLINE · SECTOR: {label.toUpperCase()}
      </div>

      <div className="gauge" aria-hidden>
        <div className="gauge-track">
          <div ref={bar} className="gauge-fill" />
        </div>
        {NAV.map(([id], i) => (
          <span key={id} className={`gauge-tick ${section === id ? "on" : ""}`} style={{ top: `${(i / (NAV.length - 1)) * 100}%` }} />
        ))}
      </div>

      <div className="mode-flash" aria-hidden />
    </div>
  );
}
