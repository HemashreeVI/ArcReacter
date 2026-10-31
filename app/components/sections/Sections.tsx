"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { site, type Project } from "@/lib/site";
import { asset, live } from "@/lib/live";
import { useStore } from "@/lib/store";

function Head({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="head reveal">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {sub && <p>{sub}</p>}
    </div>
  );
}

const Arrow = () => (
  <svg viewBox="0 0 24 24" className="arrow" aria-hidden>
    <path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ------------------------------------------------------------------ hero */

function Count({ to, dec = 0, suffix = "", go }: { to: number; dec?: number; suffix?: string; go: boolean }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!go) return;
    const o = { v: 0 };
    const tw = gsap.to(o, { v: to, duration: 1.8, delay: 1.2, ease: "power3.out", onUpdate: () => setV(o.v) });
    return () => {
      tw.kill();
    };
  }, [go, to]);
  return (
    <>
      {v.toFixed(dec)}
      {suffix}
    </>
  );
}

export function Hero() {
  const ready = useStore((s) => s.ready);
  const words = ["See.", "Decide.", "Protect."];
  return (
    <section id="hero" className={`hero ${ready ? "go" : ""}`}>
      <div className="hero-copy">
        <span className="chip-pill rise" style={{ "--d": "0.1s" } as React.CSSProperties}>
          <i /> {site.title} · {site.college}
        </span>
        <h1>
          {words.map((w, i) => (
            <span key={w} className="line">
              <span style={{ "--d": `${0.2 + i * 0.12}s` } as React.CSSProperties}>{w}</span>
            </span>
          ))}
        </h1>
        <p className="lead rise" style={{ "--d": "0.65s" } as React.CSSProperties}>
          I&apos;m <b>Hemashree</b>. I build systems that see, decide and keep people safe: vision models, autonomous robots and backends
          that fix themselves.
        </p>
        <div className="cta rise" style={{ "--d": "0.8s" } as React.CSSProperties}>
          <a href="#district" className="pill white">
            Explore my work <Arrow />
          </a>
          <a href={asset(site.links.resume)} target="_blank" rel="noreferrer" className="pill ghost">
            Résumé
          </a>
        </div>
      </div>

      <div className="stats rise" style={{ "--d": "1s" } as React.CSSProperties}>
        {site.stats.map((s, i) => (
          <div key={s.label} className="stat">
            <b>
              <Count to={s.value} dec={s.decimals} suffix={s.suffix} go={ready} />
            </b>
            <span>{s.label}</span>
            {i < site.stats.length - 1 && <i className="sep" />}
          </div>
        ))}
      </div>
      <a href="#about" className="scroll-cue rise" style={{ "--d": "1.3s" } as React.CSSProperties} aria-label="Scroll down">
        <span />
      </a>
    </section>
  );
}

/* ------------------------------------------------------------------ about */

export function About() {
  return (
    <section id="about" className="section about">
      <div className="about-grid">
        <div className="glass about-card reveal">
          <div className="avatar">
            <img src={asset(site.photo)} alt={site.fullName} />
          </div>
          <h3>{site.fullName}</h3>
          <p className="muted">{site.degree}</p>
          <p className="muted">
            {site.college} · since {site.since} · {site.location}
          </p>
          <div className="socials">
            <a href={site.links.github} target="_blank" rel="noreferrer">GitHub</a>
            <a href={site.links.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
            <a href={site.links.leetcode} target="_blank" rel="noreferrer">LeetCode</a>
          </div>
        </div>
        <div className="about-body">
          <Head eyebrow="About me" title="Engineer by training, builder by habit." />
          <div className="glass bio reveal">
            {site.bio.map((b) => (
              <p key={b}>{b}</p>
            ))}
          </div>
          <div className="facts">
            {site.facts.map((f) => (
              <div key={f.title} className="glass fact reveal">
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

export function District() {
  return (
    <section id="district" className="section district">
      <Head eyebrow="Projects" title="Welcome to my city." sub="Every landmark is something I built. Tap a tower to step inside." />
      <div id="district-stage" className="stage">
        <span className="stage-hint">Tap a landmark · or scroll for the full list ↓</span>
      </div>
    </section>
  );
}

function Card({ p }: { p: Project }) {
  const open = useStore((s) => s.openProject);
  const ref = useRef<HTMLButtonElement>(null);
  const move = (e: React.PointerEvent) => {
    const el = ref.current!, r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - y) * 8}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * 10}deg`);
    el.style.setProperty("--gx", `${x * 100}%`);
    el.style.setProperty("--gy", `${y * 100}%`);
  };
  const leave = () => {
    ref.current?.style.setProperty("--rx", "0deg");
    ref.current?.style.setProperty("--ry", "0deg");
  };
  return (
    <button ref={ref} className="glass card reveal" onPointerMove={move} onPointerLeave={leave} onClick={() => open(p.id)}>
      <div className="card-img">
        {p.image ? <img src={asset(p.image)} alt="" loading="lazy" /> : <div className="card-ph">{p.title.slice(0, 1)}</div>}
        {p.badge && <span className="badge">{p.badge}</span>}
      </div>
      <div className="card-body">
        <span className="card-genre">{p.genre}</span>
        <h3>{p.title}</h3>
        <p>{p.logline}</p>
        <span className="card-more">
          View project <Arrow />
        </span>
      </div>
      <span className="glare" />
    </button>
  );
}

export function Work() {
  return (
    <section id="work" className="section">
      <Head eyebrow="All projects" title="Everything, in one place." />
      <div className="cards">
        {site.projects.map((p) => (
          <Card key={p.id} p={p} />
        ))}
      </div>
      <div className="glass building reveal">
        <h3>Under construction</h3>
        {site.building.map((b) => (
          <div key={b.title} className="build">
            <div className="build-top">
              {b.repo ? (
                <a href={b.repo} target="_blank" rel="noreferrer">
                  {b.title} <Arrow />
                </a>
              ) : (
                <b>{b.title}</b>
              )}
              <span>{b.status}</span>
            </div>
            <p>{b.note}</p>
            <div className="bar">
              <i style={{ "--p": b.progress } as React.CSSProperties} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Dossier() {
  const id = useStore((s) => s.activeProject);
  const close = useStore((s) => s.openProject);
  const p = site.projects.find((x) => x.id === id);
  const ref = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState(0);

  useEffect(() => {
    if (!p) {
      live.focus = null;
      return;
    }
    setImg(0);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close(null);
    window.addEventListener("keydown", onKey);
    gsap.fromTo(ref.current, { y: 40, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "expo.out" });
    return () => window.removeEventListener("keydown", onKey);
  }, [p, close]);

  if (!p) return null;
  const gallery = p.gallery ?? (p.image ? [[p.image, p.title] as [string, string]] : []);
  return (
    <div className="modal-wrap" onClick={() => close(null)} data-lenis-prevent>
      <div ref={ref} className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={p.title}>
        <button className="modal-x" onClick={() => close(null)} aria-label="Close">
          ✕
        </button>
        <span className="eyebrow">
          {p.genre} · {p.year}
        </span>
        <h2>{p.title}</h2>
        <p className="modal-lead">{p.logline}</p>
        {gallery.length > 0 && (
          <div className="gallery">
            <img src={asset(gallery[img][0])} alt={gallery[img][1]} />
            <span className="cap">{gallery[img][1]}</span>
            {gallery.length > 1 && (
              <div className="thumbs">
                {gallery.map(([src], i) => (
                  <button key={src} className={i === img ? "on" : ""} onClick={() => setImg(i)}>
                    <img src={asset(src)} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <p>{p.synopsis}</p>
        <h4>Highlights</h4>
        <ol className="steps">
          {p.log.map(([t, d], i) => (
            <li key={t}>
              <span>{i + 1}</span>
              <div>
                <b>{t}</b>
                <p>{d}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="chips">
          {p.stack.map((s) => (
            <span key={s} className="chip">
              {s}
            </span>
          ))}
        </div>
        {p.repo && (
          <a href={p.repo} target="_blank" rel="noreferrer" className="pill blue">
            View on GitHub <Arrow />
          </a>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ experience */

export function Experience() {
  return (
    <section id="experience" className="section">
      <Head eyebrow="Journey" title="Milestones so far." />
      <div className="timeline">
        <span className="tl-line">
          <i />
        </span>
        {site.experience.map((e) => (
          <div key={e.title} className="tl-item reveal">
            <span className="tl-dot" />
            <div className="glass tl-card">
              <div className="tl-meta">
                <span className="tag">{e.kicker}</span>
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
      <Head eyebrow="Skills" title="The toolkit." />
      <div className="skills">
        {site.skills.map((s) => (
          <div key={s.title} className="glass skill reveal">
            <span className="skill-tag">{s.tag}</span>
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
      <h3 className="sub-h reveal">Certifications</h3>
      <div className="certs">
        {site.certs.map((c) => (
          <a key={c.title} href={asset(c.image)} target="_blank" rel="noreferrer" className="glass cert reveal">
            <img src={asset(c.image)} alt={c.title} loading="lazy" />
            <div>
              <b>{c.title}</b>
              <span>{c.issuer}</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ gallery */

export function Gallery() {
  return (
    <section id="gallery" className="section">
      <Head eyebrow="Singapore 2025" title="Off the map." sub="NUS Industry 4.0, a visit to NTU and SuperAI at Marina Bay Sands." />
      <div className="strip reveal" data-lenis-prevent-wheel>
        {site.gallery.map((g) => (
          <figure key={g.title} className="glass shot">
            <img src={asset(g.image)} alt={g.caption} loading="lazy" />
            <figcaption>
              <b>{g.title}</b>
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
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Hello from ${name || "your portfolio"}`);
    const body = encodeURIComponent(msg);
    window.location.href = `mailto:${site.email}?subject=${subject}&body=${body}`;
  };
  return (
    <section id="contact" className="section contact">
      <div className="contact-grid">
        <div>
          <Head eyebrow="Contact" title="Let's build something." sub="Open to internships, research and full-time roles." />
          <a href={`mailto:${site.email}`} className="mail reveal">
            {site.email}
          </a>
        </div>
        <form className="contact-card reveal" onSubmit={send}>
          <h3>Send a message</h3>
          <label>
            <span>Your name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane from Acme" />
          </label>
          <label>
            <span>Message</span>
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={4} placeholder="Tell me about the role or project…" />
          </label>
          <button type="submit" className="pill blue">
            Send <Arrow />
          </button>
          <div className="round-links">
            <a href={site.links.github} target="_blank" rel="noreferrer" aria-label="GitHub">GH</a>
            <a href={site.links.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn">in</a>
            <a href={site.links.leetcode} target="_blank" rel="noreferrer" aria-label="LeetCode">LC</a>
            <a href={asset(site.links.resume)} target="_blank" rel="noreferrer" aria-label="Résumé">CV</a>
          </div>
        </form>
      </div>
      <footer className="foot">
        © {new Date().getFullYear()} {site.fullName}
      </footer>
    </section>
  );
}
