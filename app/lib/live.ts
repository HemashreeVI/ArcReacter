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
  /** reactor power, eased towards powerTarget each frame */
  power: 0,
  powerTarget: 0,
  /** 0..1 burst of light used for mode switches; decays every frame */
  flare: 0,
};

export const asset = (p: string) =>
  `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${p.startsWith("/") ? p : `/${p}`}`;
