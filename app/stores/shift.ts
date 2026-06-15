import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Shift } from "~/api/shifts";

interface ShiftState {
  active: Shift | null;
  setActive: (s: Shift | null) => void;
}

export const useShift = create<ShiftState>()(
  persist(
    (set) => ({
      active: null,
      setActive: (s) => set({ active: s }),
    }),
    { name: "pos.shift" },
  ),
);
