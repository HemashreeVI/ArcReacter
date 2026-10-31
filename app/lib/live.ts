/**
 * Mutable, per-frame values shared between the DOM and the WebGL scene.
 * Kept outside React state so updating them never triggers a re-render.
 */
export const live = {
  /** 0..1 page scroll progress */
  scroll: 0,
  /** pointer in normalised device coords (-1..1) */
  mouseX: 0,
  mouseY: 0,
  /** 0..1 how much the project landmarks are highlighted */
  pins: 0,
  /** 0 = day, 1 = night, eased */
  night: 0,
  /** seconds since the city started building itself (-1 = not started) */
  buildT: -1,
  /** landmark the camera should fly to */
  focus: null as null | [number, number, number],
};

export const asset = (p: string) =>
  `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${p.startsWith("/") ? p : `/${p}`}`;
