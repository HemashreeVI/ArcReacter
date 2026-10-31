"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import Preloader from "./ui/Preloader";
import Navbar, { PointerTracker } from "./ui/Navbar";
import { Hero, About, District, Work, Experience, Skills, Gallery, Contact, Dossier } from "./sections/Sections";
import { useStore, type Mode } from "@/lib/store";

const Scene = dynamic(() => import("./three/Scene"), { ssr: false });

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const ready = useStore((s) => s.ready);
  const project = useStore((s) => s.activeProject);
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    try {
      const m = localStorage.getItem("hv-mode") as Mode | null;
      if (m === "day" || m === "night") setMode(m);
    } catch {}
  }, [setMode]);

  useEffect(() => {
    document.documentElement.dataset.mode = mode;
  }, [mode]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const l = new Lenis({ lerp: 0.085, anchors: { offset: -20 } });
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

  useEffect(() => {
    const lock = !ready || !!project;
    if (lenis) {
      if (lock) lenis.stop();
      else lenis.start();
    }
    document.documentElement.classList.toggle("lock", lock);
  }, [ready, project, lenis]);

  useEffect(() => {
    if (!ready) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
        gsap.fromTo(
          el,
          { y: 60, opacity: 0, filter: "blur(8px)" },
          {
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 1.1,
            ease: "expo.out",
            // a leftover filter would switch off the glass blur, so drop it when done
            clearProps: "filter",
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
          },
        );
      });
      gsap.fromTo(".tl-line i", { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: ".timeline", start: "top 70%", end: "bottom 60%", scrub: true } });
      gsap.utils.toArray<HTMLElement>(".bar i").forEach((el) =>
        gsap.fromTo(el, { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 95%", once: true } }),
      );
    });
    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [ready]);

  return (
    <>
      <div className="sky" aria-hidden />
      <Scene />
      <PointerTracker />
      <Navbar />
      <main className="content">
        <Hero />
        <About />
        <District />
        <Work />
        <Experience />
        <Skills />
        <Gallery />
        <Contact />
      </main>
      <Dossier />
      <Preloader />
    </>
  );
}
