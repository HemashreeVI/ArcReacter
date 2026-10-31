"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { live } from "@/lib/live";
import { useStore } from "@/lib/store";
import { site } from "@/lib/site";

const LINES = [
  ["J.A.R.V.I.S. PORTFOLIO KERNEL v5.5", ""],
  ["Initialising neural core", "OK"],
  ["Calibrating arc reactor output", "3.2 GJ/s"],
  ["Mounting project archive", `${site.projects.length} RECORDS`],
  ["Loading vision models · YOLOv9", "97.1% mAP"],
  ["Syncing telemetry · Chennai ⇄ Singapore", "LINKED"],
  ["Biometric match", site.fullName.toUpperCase()],
] as const;

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Working late, I see.";
  if (h < 12) return "Good morning.";
  if (h < 17) return "Good afternoon.";
  return "Good evening.";
}

export default function Boot() {
  const setBooted = useStore((s) => s.setBooted);
  const root = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(0);
  const [pct, setPct] = useState(0);
  const [done, setDone] = useState(false);
  const [gone, setGone] = useState(false);
  const finished = useRef(false);

  const finish = () => {
    if (finished.current || !root.current) return;
    finished.current = true;
    setDone(true);
    setPct(100);
    try {
      sessionStorage.setItem("arc-booted", "1");
    } catch {}
    live.powerTarget = 1;
    const el = root.current;
    // Iris open: the overlay is masked by a growing transparent hole.
    gsap
      .timeline({
        onComplete: () => {
          setGone(true);
          setBooted(true);
        },
      })
      .to(el, { "--iris": "0%", duration: 0.01 })
      .to(el.querySelector(".boot-inner"), { scale: 1.08, opacity: 0, duration: 0.6, ease: "power2.in" }, 0.5)
      .to(el, { "--iris": "150%", duration: 1.3, ease: "expo.inOut" }, 0.7);
  };

  useEffect(() => {
    let returning = false;
    try {
      returning = sessionStorage.getItem("arc-booted") === "1";
    } catch {}
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const speed = returning || reduce ? 0.35 : 1;

    const timers: number[] = [];
    LINES.forEach((_, i) => {
      timers.push(window.setTimeout(() => setShown(i + 1), (250 + i * 380) * speed));
    });
    const counter = { v: 0 };
    const tween = gsap.to(counter, {
      v: 100,
      duration: 3.2 * speed,
      ease: "power1.inOut",
      onUpdate: () => setPct(Math.round(counter.v)),
    });
    timers.push(window.setTimeout(finish, (3600 + 900) * speed));

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      timers.forEach(clearTimeout);
      tween.kill();
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (gone) return null;

  const R = 92;
  const C = 2 * Math.PI * R;

  return (
    <div ref={root} className="boot" role="dialog" aria-label="Loading">
      <div className="boot-inner">
        <div className="boot-dial" aria-hidden>
          <svg viewBox="0 0 240 240">
            <circle className="d d1" cx="120" cy="120" r="114" />
            <circle className="d d2" cx="120" cy="120" r="104" />
            <circle className="d d3" cx="120" cy="120" r="78" />
            <circle className="d d4" cx="120" cy="120" r="66" />
            <circle
              className="prog"
              cx="120"
              cy="120"
              r={R}
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct / 100)}
            />
          </svg>
          <div className="boot-pct">
            <span>{String(pct).padStart(3, "0")}</span>
            <small>%</small>
          </div>
        </div>

        <div className="boot-log mono">
          {LINES.slice(0, shown).map(([l, r], i) => (
            <div key={i} className="boot-line">
              <span className="dim">[{(i * 0.381).toFixed(3)}]</span> {l}
              {r && (
                <>
                  <span className="dots" />
                  <b>{r}</b>
                </>
              )}
            </div>
          ))}
          {done && <div className="boot-greet">{greeting()} Systems online.</div>}
        </div>

        <button className="boot-skip mono" onClick={finish} data-cursor>
          SKIP ⏎
        </button>
      </div>
    </div>
  );
}
