import { create } from "zustand";

export type Mode = "day" | "night";

type State = {
  mode: Mode;
  ready: boolean;
  activeProject: string | null;
  section: string;
  setMode: (m: Mode) => void;
  setReady: (b: boolean) => void;
  openProject: (id: string | null) => void;
  setSection: (s: string) => void;
};

export const useStore = create<State>((set) => ({
  mode: "day",
  ready: false,
  activeProject: null,
  section: "hero",
  setMode: (mode) => set({ mode }),
  setReady: (ready) => set({ ready }),
  openProject: (activeProject) => set({ activeProject }),
  setSection: (section) => set({ section }),
}));
