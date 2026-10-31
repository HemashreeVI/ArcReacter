"use client";

import { useEffect, useState } from "react";
import { live } from "@/lib/live";
import { useStore } from "@/lib/store";

export const NAV = [
  ["hero", "Home"],
  ["about", "About"],
  ["district", "Projects"],
  ["experience", "Journey"],
  ["skills", "Skills"],
  ["contact", "Contact"],
] as const;

export default function Navbar() {
  const section = useStore((s) => s.section);
  const setSection = useStore((s) => s.setSection);
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const ready = useStore((s) => s.ready);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let raf = 0, last = "";
    const loop = () => {
      setScrolled(window.scrollY > 40);
      const mid = window.scrollY + window.innerHeight * 0.45;
      let cur = "hero";
      for (const [id] of NAV) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top + window.scrollY <= mid) cur = id;
      }
      if (cur !== last) {
        last = cur;
        setSection(cur);
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [setSection]);

  const toggle = () => {
    const next = mode === "day" ? "night" : "day";
    setMode(next);
    try {
      localStorage.setItem("hv-mode", next);
    } catch {}
  };

  return (
    <header className={`navbar ${scrolled ? "scrolled" : ""} ${ready ? "in" : ""}`}>
      <a href="#hero" className="logo" onClick={() => setOpen(false)}>
        <span className="logo-mark">
          <svg viewBox="0 0 32 32" aria-hidden>
            <path d="M5 27V9l6-4v22M11 16h10M21 27V9l6-4v22" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="logo-txt">
          HEMASHREE
          <small>Software Engineer</small>
        </span>
      </a>
      <nav className={`links ${open ? "open" : ""}`}>
        {NAV.slice(1).map(([id, name]) => (
          <a key={id} href={`#${id}`} className={section === id ? "active" : ""} onClick={() => setOpen(false)}>
            {name}
          </a>
        ))}
      </nav>
      <div className="nav-right">
        <button className="icon-btn" onClick={toggle} aria-label={`Switch to ${mode === "day" ? "night" : "day"}`} title={mode === "day" ? "Night city" : "Day city"}>
          {mode === "day" ? (
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="12" r="4.5" fill="currentColor" />
              {Array.from({ length: 8 }, (_, i) => {
                const a = (i * Math.PI) / 4;
                return <line key={i} x1={12 + Math.cos(a) * 7} y1={12 + Math.sin(a) * 7} x2={12 + Math.cos(a) * 9.5} y2={12 + Math.sin(a) * 9.5} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />;
              })}
            </svg>
          )}
        </button>
        <a href="#contact" className="pill white small">
          Get in touch
        </a>
        <button className="icon-btn burger" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}

/** Keeps live.mouse up to date for the scene's parallax. */
export function PointerTracker() {
  useEffect(() => {
    const move = (e: PointerEvent) => {
      live.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      live.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);
  return null;
}
