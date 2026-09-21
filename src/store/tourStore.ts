import { create } from 'zustand';

/** Drives the guided app tour. `start()` can be called from anywhere (first-run auto start, or
 * "Replay app tour" in Settings); the AppTour overlay reacts to it. */
type TourState = {
  active: boolean;
  step: number;
  start: () => void;
  setStep: (step: number) => void;
  stop: () => void;
};

export const useTourStore = create<TourState>((set) => ({
  active: false,
  step: 0,
  start: () => set({ active: true, step: 0 }),
  setStep: (step) => set({ step }),
  stop: () => set({ active: false, step: 0 }),
}));
