"use client";

import { useEffect, useRef, useState } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/<>[]{}=+*";

/** Text that "decrypts" itself the first time it scrolls into view (or when `play` turns true). */
export default function Scramble({
  text,
  className,
  play,
  delay = 0,
  duration = 900,
  as: Tag = "span",
}: {
  text: string;
  className?: string;
  play?: boolean;
  delay?: number;
  duration?: number;
  as?: "span" | "h1" | "h2" | "h3" | "p";
}) {
  const ref = useRef<HTMLElement>(null);
  const [out, setOut] = useState(text.replace(/\S/g, " "));
  const started = useRef(false);

  useEffect(() => {
    const start = () => {
      if (started.current) return;
      started.current = true;
      const t0 = performance.now() + delay;
      let raf = 0;
      const step = (now: number) => {
        const k = Math.max(0, (now - t0) / duration);
        const revealed = Math.floor(k * text.length);
        let s = "";
        for (let i = 0; i < text.length; i++) {
          const c = text[i];
          if (c === " " || i < revealed) s += c;
          else if (k > 0 && i < revealed + 6) s += GLYPHS[(Math.random() * GLYPHS.length) | 0];
          else s += " ";
        }
        setOut(s);
        if (k < 1) raf = requestAnimationFrame(step);
        else setOut(text);
      };
      raf = requestAnimationFrame(step);
      return () => cancelAnimationFrame(raf);
    };

    if (play !== undefined) {
      if (play) start();
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        start();
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [play, text, delay, duration]);

  return (
    <Tag ref={ref as never} className={className} aria-label={text}>
      <span aria-hidden>{out}</span>
    </Tag>
  );
}
