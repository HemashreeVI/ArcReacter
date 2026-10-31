"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { site, type Project } from "@/lib/site";
import { asset } from "@/lib/live";
import { useStore } from "@/lib/store";
import Scramble from "../ui/Scramble";

function SectionHead({ index, title, sub }: { index: string; title: string; sub?: string }) {
  return (
    <div className="sec-head reveal">
      <span className="sec-index mono">{index}</span>
      <Scramble as="h2" text={title} className="sec-title" />
      {sub && <p className="sec-sub">{sub}</p>}
      <span className="sec-rule" />
    </div>
  );
}

/* ------------------------------------------------------------------ hero */

function Counter({ value, decimals, suffix, play }: { value: number; decimals: number; suffix: string; play: boolean }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!play) return;
    const o = { v: 0 };
    const tw = gsap.to(o, { v: value, duration: 2, ease: "power2.out", delay: 0.6, onUpdate: () => setV(o.v) });
    return () => {
      tw.kill();
    };
  }, [play, value]);
  return (
    <>
      {v.toFixed(decimals)}
      {suffix}
    </>
  );
}

export function Hero() {
  const booted = useStore((s) => s.booted);
  return (
    <section id="hero" className="hero">
      <div className="hero-copy">
        <div className={`hero-tag mono ${booted ? "in" : ""}`}>
          <span className="blink">▮</span> IDENTITY CONFIRMED · {site.location.toUpperCase()} · {site.coords}
        </div>
        <Scramble as="h1" text={site.name} className="hero-name" play={booted} duration={1200} />
        <Scramble as="p" text={`${site.title} · ${site.college}`} className="hero-role" play={booted} delay={500} />
        <p className={`hero-tagline ${booted ? "in" : ""}`}>{site.tagline}</p>
        <div className={`hero-cta ${booted ? "in" : ""}`}>
          <a href="#projects" className="btn primary" data-cursor>
            <span>Open Project Archive</span>
          </a>
          <a href={asset(site.links.resume)} target="_blank" rel="noreferrer" className="btn" data-cursor>
            <span>Download Résumé</span>
          </a>
        </div>
      </div>

      <div className={`hero-stats ${booted ? "in" : ""}`}>
        {site.stats.map((s) => (
          <div key={s.label} className="stat">
            <b className="mono">
              <Counter value={s.value} decimals={s.decimals} suffix={s.suffix} play={booted} />
            </b>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      <div className={`hero-readout mono ${booted ? "in" : ""}`} aria-hidden>
        <div>REACTOR OUTPUT <b>NOMINAL</b></div>
        <div>CORE TEMP <b>3,200 K</b></div>
        <div>STATUS <b className="hot">OPEN TO OPPORTUNITIES</b></div>
      </div>

      <a href="#profile" className={`scroll-hint mono ${booted ? "in" : ""}`} data-cursor>
        SCROLL <i />
      </a>
    </section>
  );
}

/* ------------------------------------------------------------------ profile */

export function Profile() {
  return (
    <section id="profile" className="section">
      <SectionHead index="01" title="PILOT PROFILE" sub="Who's behind the systems." />
      <div className="profile">
        <div className="profile-photo reveal" data-cursor>
          <img src={asset(site.photo)} alt={site.fullName} />
          <span className="scanline" />
          <span className="pf-corner a" />
          <span className="pf-corner b" />
          <div className="pf-label mono">
            SUBJECT · {site.fullName.toUpperCase()}
          </div>
        </div>
        <div className="panel profile-body reveal">
          <h3>{site.fullName}</h3>
          <p className="muted">
            {site.degree} · {site.college} · since {site.since}
          </p>
          {site.bio.map((b) => (
            <p key={b}>{b}</p>
          ))}
          <div className="facts">
            {site.facts.map((f) => (
              <div key={f.title} className="fact">
                <b>{f.title}</b>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ projects */

function ProjectCard({ p }: { p: Project }) {
  const open = useStore((s) => s.openProject);
  const ref = useRef<HTMLButtonElement>(null);

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - y) * 12}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * 14}deg`);
    el.style.setProperty("--gx", `${x * 100}%`);
    el.style.setProperty("--gy", `${y * 100}%`);
  };
  const onLeave = () => {
    ref.current?.style.setProperty("--rx", "0deg");
    ref.current?.style.setProperty("--ry", "0deg");
  };

  return (
    <button
      ref={ref}
      className="card reveal"
      style={{ "--c": p.color } as React.CSSProperties}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onClick={() => open(p.id)}
      data-cursor
    >
      <div className="card-media">
        {p.image ? <img src={asset(p.image)} alt="" loading="lazy" /> : <div className="card-placeholder mono">{p.code}</div>}
        <span className="card-scan" />
      </div>
      <div className="card-body">
        <div className="card-meta mono">
          <span>{p.code}</span>
          <span>{p.year}</span>
        </div>
        <h3>{p.title}</h3>
        <p className="card-genre mono">{p.genre}</p>
        <p className="card-log">{p.logline}</p>
        <div className="chips">
          {p.stack.slice(0, 4).map((s) => (
            <span key={s} className="chip">
              {s}
            </span>
          ))}
        </div>
      </div>
      {p.badge && <span className="badge mono">{p.badge}</span>}
      <span className="card-glare" />
      <span className="card-open mono">OPEN DOSSIER →</span>
    </button>
  );
}

export function Dossier() {
  const id = useStore((s) => s.activeProject);
  const close = useStore((s) => s.openProject);
  const p = site.projects.find((x) => x.id === id);
  const ref = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState(0);

  useEffect(() => {
    if (!p) return;
    setImg(0);
    document.documentElement.classList.add("lock");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close(null);
    window.addEventListener("keydown", onKey);
    gsap.fromTo(ref.current, { clipPath: "inset(50% 0 50% 0)" }, { clipPath: "inset(0% 0 0% 0)", duration: 0.6, ease: "expo.out" });
    gsap.fromTo(".dossier .stagger", { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.05, delay: 0.2, duration: 0.5 });
    return () => {
      document.documentElement.classList.remove("lock");
      window.removeEventListener("keydown", onKey);
    };
  }, [p, close]);

  if (!p) return null;
  const gallery = p.gallery ?? (p.image ? [[p.image, p.title] as [string, string]] : []);

  return (
    <div className="dossier-wrap" onClick={() => close(null)} data-lenis-prevent>
      <div
        ref={ref}
        className="dossier panel"
        style={{ "--c": p.color } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={p.title}
      >
        <button className="dossier-close mono" onClick={() => close(null)} data-cursor aria-label="Close">
          ✕ CLOSE
        </button>
        <div className="dossier-head stagger">
          <span className="mono">
            DOSSIER {p.code} · {p.genre.toUpperCase()} · {p.year}
          </span>
          <h2>{p.title}</h2>
          <p className="dossier-log">{p.logline}</p>
        </div>

        {gallery.length > 0 && (
          <div className="dossier-gallery stagger">
            <div className="dg-main">
              <img src={asset(gallery[img][0])} alt={gallery[img][1]} />
              <span className="mono dg-cap">{gallery[img][1]}</span>
            </div>
            {gallery.length > 1 && (
              <div className="dg-thumbs">
                {gallery.map(([src], i) => (
                  <button key={src} className={i === img ? "on" : ""} onClick={() => setImg(i)} data-cursor>
                    <img src={asset(src)} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="stagger">{p.synopsis}</p>

        <h4 className="mono stagger">MISSION LOG</h4>
        <ol className="mission">
          {p.log.map(([t, d], i) => (
            <li key={t} className="stagger">
              <span className="mono">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <b>{t}</b>
                <p>{d}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="chips stagger">
          {p.stack.map((s) => (
            <span key={s} className="chip">
              {s}
            </span>
          ))}
        </div>

        {p.repo && (
          <a href={p.repo} target="_blank" rel="noreferrer" className="btn primary stagger" data-cursor>
            <span>View Source on GitHub</span>
          </a>
        )}
      </div>
    </div>
  );
}

export function Projects() {
  return (
    <section id="projects" className="section">
      <SectionHead index="02" title="PROJECT ARCHIVE" sub="Each suit has a mark number. Select one to open its dossier." />
      <div className="cards">
        {site.projects.map((p) => (
          <ProjectCard key={p.id} p={p} />
        ))}
      </div>

      <div className="building reveal">
        <h3 className="mono">// CURRENTLY ON THE WORKBENCH</h3>
        {site.building.map((b) => (
          <div key={b.title} className="build-row">
            <div className="build-top">
              <b>{b.repo ? <a href={b.repo} target="_blank" rel="noreferrer" data-cursor>{b.title} ↗</a> : b.title}</b>
              <span className="mono">{b.status}</span>
            </div>
            <p>{b.note}</p>
            <div className="build-bar">
              <i style={{ "--p": b.progress } as React.CSSProperties} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ experience */

export function Experience() {
  return (
    <section id="experience" className="section">
      <SectionHead index="03" title="FLIGHT LOG" sub="Milestones, missions and the places they happened." />
      <div className="timeline">
        <span className="tl-line">
          <i className="tl-fill" />
        </span>
        {site.experience.map((e, i) => (
          <div key={e.title} className={`tl-item reveal ${i % 2 ? "right" : "left"}`}>
            <span className="tl-node" />
            <div className="panel tl-card">
              <div className="tl-meta mono">
                <span className="kicker">{e.kicker}</span>
                <span>{e.when}</span>
              </div>
              <h3>{e.title}</h3>
              <p>{e.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ skills */

export function Skills() {
  return (
    <section id="skills" className="section">
      <SectionHead index="04" title="SYSTEMS & LOADOUT" sub="Everything installed, grouped by subsystem." />
      <div className="skills">
        {site.skills.map((s, i) => (
          <div key={s.title} className="panel skill reveal">
            <div className="skill-head">
              <span className="mono">{String(i + 1).padStart(2, "0")} · {s.tag}</span>
              <svg viewBox="0 0 40 40" className="skill-dial" aria-hidden>
                <circle cx="20" cy="20" r="16" />
                <circle cx="20" cy="20" r="16" className="arc" style={{ "--n": s.items.length } as React.CSSProperties} />
              </svg>
            </div>
            <h3>{s.title}</h3>
            <div className="chips">
              {s.items.map((it) => (
                <span key={it} className="chip">
                  {it}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <SectionHead index="05" title="CERTIFICATIONS" />
      <div className="certs">
        {site.certs.map((c) => (
          <a key={c.title} href={asset(c.image)} target="_blank" rel="noreferrer" className="panel cert reveal" data-cursor>
            <img src={asset(c.image)} alt={c.title} loading="lazy" />
            <div>
              <b>{c.title}</b>
              <span className="mono">{c.issuer}</span>
            </div>
          </a>
        ))}
      </div>

      <SectionHead index="06" title="FIELD RECON · SINGAPORE 2025" />
      <div className="strip">
        {site.gallery.map((g) => (
          <figure key={g.title} className="shot reveal" data-cursor>
            <img src={asset(g.image)} alt={g.caption} loading="lazy" />
            <figcaption>
              <b className="mono">{g.title}</b>
              <span>{g.caption}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ contact */

export function Contact() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(site.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };
  const links = [
    ["GitHub", site.links.github],
    ["LinkedIn", site.links.linkedin],
    ["LeetCode", site.links.leetcode],
    ["Résumé", asset(site.links.resume)],
  ];
  return (
    <section id="contact" className="section contact">
      <SectionHead index="07" title="OPEN A SECURE CHANNEL" />
      <div className="panel terminal reveal">
        <div className="term-bar mono">
          <i />
          <i />
          <i />
          <span>jarvis@hv:~/contact</span>
        </div>
        <div className="term-body mono">
          <p>
            <span className="prompt">$</span> whoami
          </p>
          <p className="out">{site.fullName} · {site.title}</p>
          <p>
            <span className="prompt">$</span> status
          </p>
          <p className="out hot">Open to internships, research and full-time roles.</p>
          <p>
            <span className="prompt">$</span> contact --email
          </p>
          <p className="out">
            <a href={`mailto:${site.email}`} data-cursor>
              {site.email}
            </a>{" "}
            <button className="copy" onClick={copy} data-cursor>
              [{copied ? "COPIED" : "COPY"}]
            </button>
          </p>
          <p>
            <span className="prompt">$</span> ls ~/links
          </p>
          <p className="out links">
            {links.map(([n, h]) => (
              <a key={n} href={h} target="_blank" rel="noreferrer" data-cursor>
                {n}/
              </a>
            ))}
          </p>
          <p>
            <span className="prompt">$</span> <span className="caret" />
          </p>
        </div>
      </div>
      <a href={`mailto:${site.email}`} className="big-cta reveal" data-cursor>
        <Scramble text="SAY HELLO" />
      </a>
      <footer className="foot mono">
        © {new Date().getFullYear()} {site.fullName} · Designed & built in Chennai
      </footer>
    </section>
  );
}
