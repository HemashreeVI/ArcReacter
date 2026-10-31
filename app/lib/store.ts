import { create } from "zustand";

export type Mode = "hud" | "lab";

type State = {
  mode: Mode;
  booted: boolean;
  switching: boolean;
  activeProject: string | null;
  section: string;
  setMode: (m: Mode) => void;
  setBooted: (b: boolean) => void;
  setSwitching: (b: boolean) => void;
  openProject: (id: string | null) => void;
  setSection: (s: string) => void;
};

export const useStore = create<State>((set) => ({
  mode: "hud",
  booted: false,
  switching: false,
  activeProject: null,
  section: "hero",
  setMode: (mode) => set({ mode }),
  setBooted: (booted) => set({ booted }),
  setSwitching: (switching) => set({ switching }),
  openProject: (activeProject) => set({ activeProject }),
  setSection: (section) => set({ section }),
}));
