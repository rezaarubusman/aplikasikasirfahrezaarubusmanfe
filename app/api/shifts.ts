import { delay, requireToken, uid } from "./index";
import { txApi } from "./transactions";

export interface Shift {
  id: string;
  cashierId: string;
  openingCash: number;
  closingCash?: number;
  startedAt: string;
  endedAt?: string;
  status: "active" | "closed";
}

const KEY = "pos.shifts";
function load(): Shift[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
function save(list: Shift[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(list));
}

export const shiftsApi = {
  async getActiveShift(cashierId: string): Promise<Shift | null> {
    requireToken();
    await delay(200);
    return load().find((s) => s.cashierId === cashierId && s.status === "active") ?? null;
  },

  async startShift(input: { cashierId: string; openingCash: number }) {
    requireToken();
    await delay();
    const list = load();
    const existing = list.find((s) => s.cashierId === input.cashierId && s.status === "active");
    if (existing) return existing;
    const shift: Shift = {
      id: uid("SHIFT"),
      cashierId: input.cashierId,
      openingCash: input.openingCash,
      startedAt: new Date().toISOString(),
      status: "active",
    };
    list.push(shift);
    save(list);
    return shift;
  },

  async endShift(input: { shiftId: string; closingCash: number }) {
    requireToken();
    await delay();
    const list = load();
    const idx = list.findIndex((s) => s.id === input.shiftId);
    if (idx === -1) throw new Error("Shift not found");
    list[idx] = {
      ...list[idx],
      closingCash: input.closingCash,
      endedAt: new Date().toISOString(),
      status: "closed",
    };
    save(list);
    return list[idx];
  },

  async getShiftSummary(shiftId: string) {
    requireToken();
    await delay(200);
    const shift = load().find((s) => s.id === shiftId);
    if (!shift) throw new Error("Shift not found");
    // Sum cash transactions for this shift
    const txs = await txApi.getCashierTransactions({
      date: shift.startedAt.slice(0, 10),
      cashierId: shift.cashierId,
    });
    const cashTx = txs.filter((t) => t.shiftId === shiftId && t.paymentType === "cash");
    const totalCash = cashTx.reduce((s, t) => s + t.total, 0);
    return {
      shift,
      totalCashTransactions: totalCash,
      expectedClosing: shift.openingCash + totalCash,
    };
  },
};
