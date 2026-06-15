import { delay, requireToken, uid } from "./index";

export type PaymentType = "cash" | "debit";

export interface TxItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
}

export interface Transaction {
  id: string;
  cashierId: string;
  shiftId: string;
  items: TxItem[];
  total: number;
  paymentType: PaymentType;
  cashReceived?: number;
  change?: number;
  cardLast4?: string;
  status: "completed";
  createdAt: string; // ISO
}

// In-memory store; persisted to localStorage to survive refreshes.
const KEY = "pos.transactions";
function load(): Transaction[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
function save(list: Transaction[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(list));
}

export const txApi = {
  async createTransaction(input: {
    items: TxItem[];
    paymentType: PaymentType;
    cashReceived?: number;
    cardNumber?: string;
    shiftId: string;
    cashierId: string;
  }) {
    requireToken();
    await delay();
    const total = input.items.reduce((s, i) => s + i.price * i.qty, 0);
    if (input.paymentType === "cash" && (input.cashReceived ?? 0) < total) {
      throw new Error("Cash received is less than total");
    }
    const tx: Transaction = {
      id: uid("TX"),
      cashierId: input.cashierId,
      shiftId: input.shiftId,
      items: input.items,
      total,
      paymentType: input.paymentType,
      cashReceived: input.paymentType === "cash" ? input.cashReceived : undefined,
      change: input.paymentType === "cash" ? (input.cashReceived ?? 0) - total : undefined,
      cardLast4: input.paymentType === "debit" ? input.cardNumber?.slice(-4) : undefined,
      status: "completed",
      createdAt: new Date().toISOString(),
    };
    const list = load();
    list.unshift(tx);
    save(list);
    return tx;
  },

  async getCashierTransactions(params: { date: string; cashierId: string; q?: string }) {
    requireToken();
    await delay();
    const q = (params.q ?? "").trim().toLowerCase();
    return load()
      .filter((t) => t.cashierId === params.cashierId)
      .filter((t) => t.createdAt.slice(0, 10) === params.date)
      .filter((t) => (q ? t.id.toLowerCase().includes(q) : true));
  },
};
