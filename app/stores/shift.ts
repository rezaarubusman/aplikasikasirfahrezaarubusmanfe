import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Shift {
  id: string;
  cashierId: string;
  startTime: string; 
  endTime: string | null;
  initialCash: number;
  finalCash: number | null;
}

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