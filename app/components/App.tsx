"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import Boot from "./ui/Boot";
import Chrome from "./ui/Chrome";
import Cursor from "./ui/Cursor";
import { Hero, Profile, Projects, Experience, Skills, Contact, Dossier } from "./sections/Sections";
import { useStore, type Mode } from "@/lib/store";

const Scene = dynamic(() => import("./three/Scene"), { ssr: false });

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const booted = useStore((s) => s.booted);
  const project = useStore((s) => s.activeProject);
  const [lenis, setLenis] = useState<Lenis | null>(null);

  // Restore the saved mode.
  useEffect(() => {
    try {
      const m = localStorage.getItem("arc-mode") as Mode | null;
      if (m === "hud" || m === "lab") setMode(m);
    } catch {}
  }, [setMode]);

  useEffect(() => {
    document.documentElement.dataset.mode = mode;
  }, [mode]);

  // Smooth scrolling, driven by the GSAP ticker so ScrollTrigger stays in sync.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const l = new Lenis({ lerp: 0.09, anchors: { offset: -40 } });
    l.on("scroll", ScrollTrigger.update);
    const raf = (t: number) => l.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    setLenis(l);
    return () => {
      gsap.ticker.remove(raf);
      l.destroy();
    };
  }, []);

  // Hold the page still during boot and while a dossier is open.
  useEffect(() => {
    const lock = !booted || !!project;
    if (lenis) {
      if (lock) lenis.stop();
      else lenis.start();
    }
    document.documentElement.classList.toggle("lock", lock);
  }, [booted, project, lenis]);

  // Scroll-triggered reveals.
  useEffect(() => {
    if (!booted) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
        gsap.fromTo(
          el,
          { y: 50, opacity: 0, clipPath: "inset(0 0 100% 0)" },
          {
            y: 0,
            opacity: 1,
            clipPath: "inset(0 0 0% 0)",
            duration: 1,
            ease: "expo.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          },
        );
      });
      gsap.fromTo(
        ".tl-fill",
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: { trigger: ".timeline", start: "top 70%", end: "bottom 60%", scrub: true },
        },
      );
      gsap.utils.toArray<HTMLElement>(".build-bar i").forEach((el) => {
        gsap.fromTo(el, { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 92%", once: true } });
      });
    });
    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [booted]);

  return (
    <>
      <Scene />
      <div className="grain" aria-hidden />
      <Chrome />
      <main className="content">
        <Hero />
        <Profile />
        <Projects />
        <Experience />
        <Skills />
        <Contact />
      </main>
      <Dossier />
      <Cursor />
      <Boot />
    </>
  );
}
