import { delay, requireToken, uid } from "./index";
import type { User, Role } from "./auth";
import type { Transaction } from "./transactions";

export interface Cashier extends User {
  active: boolean;
  createdAt: string;
}

const USERS_KEY = "pos.cashiers";

const initialCashiers: Cashier[] = [
  { id: "u_cash1", name: "Sari Cashier", email: "cashier@pos.dev", role: "cashier", active: true, createdAt: new Date(Date.now() - 86400000 * 30).toISOString() },
  { id: "u_cash2", name: "Budi Cashier", email: "budi@pos.dev", role: "cashier", active: true, createdAt: new Date(Date.now() - 86400000 * 10).toISOString() },
];

function loadCashiers(): Cashier[] {
  if (typeof window === "undefined") return initialCashiers;
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    if (!raw) {
      window.localStorage.setItem(USERS_KEY, JSON.stringify(initialCashiers));
      return initialCashiers;
    }
    return JSON.parse(raw);
  } catch {
    return initialCashiers;
  }
}
function saveCashiers(list: Cashier[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(USERS_KEY, JSON.stringify(list));
}

function loadAllTx(): Transaction[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem("pos.transactions") || "[]");
  } catch {
    return [];
  }
}

export const adminApi = {
  // Cashiers
  async getCashiers(params?: { q?: string }) {
    requireToken();
    await delay();
    const q = (params?.q ?? "").trim().toLowerCase();
    return loadCashiers().filter((c) =>
      q ? c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) : true,
    );
  },
  async createCashier(input: { name: string; email: string; role: Role }) {
    requireToken();
    await delay();
    const list = loadCashiers();
    if (list.some((c) => c.email.toLowerCase() === input.email.toLowerCase())) {
      throw new Error("Email already in use");
    }
    const c: Cashier = {
      id: uid("u"),
      name: input.name,
      email: input.email,
      role: input.role,
      active: true,
      createdAt: new Date().toISOString(),
    };
    list.push(c);
    saveCashiers(list);
    return c;
  },
  async updateCashier(id: string, patch: Partial<Pick<Cashier, "name" | "email" | "active" | "role">>) {
    requireToken();
    await delay();
    const list = loadCashiers();
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Cashier not found");
    list[idx] = { ...list[idx], ...patch };
    saveCashiers(list);
    return list[idx];
  },
  async deleteCashier(id: string) {
    requireToken();
    await delay();
    saveCashiers(loadCashiers().filter((c) => c.id !== id));
    return { ok: true };
  },

  // Reports
  async getDashboardStats() {
    requireToken();
    await delay();
    const today = new Date().toISOString().slice(0, 10);
    const all = loadAllTx();
    const todayTx = all.filter((t) => t.createdAt.slice(0, 10) === today);
    const cashiers = loadCashiers();
    return {
      todaySales: todayTx.reduce((s, t) => s + t.total, 0),
      todayTxCount: todayTx.length,
      activeCashiers: cashiers.filter((c) => c.active).length,
      totalSales: all.reduce((s, t) => s + t.total, 0),
    };
  },

  async getSalesReport(params: { from: string; to: string }) {
    requireToken();
    await delay();
    const all = loadAllTx().filter(
      (t) => t.createdAt.slice(0, 10) >= params.from && t.createdAt.slice(0, 10) <= params.to,
    );
    // group by day
    const byDay = new Map<string, { date: string; total: number; count: number }>();
    for (const t of all) {
      const day = t.createdAt.slice(0, 10);
      const cur = byDay.get(day) ?? { date: day, total: 0, count: 0 };
      cur.total += t.total;
      cur.count += 1;
      byDay.set(day, cur);
    }
    return {
      rows: Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date)),
      total: all.reduce((s, t) => s + t.total, 0),
      count: all.length,
    };
  },

  async getCashierReport(params: { from: string; to: string }) {
    requireToken();
    await delay();
    const cashiers = loadCashiers();
    const all = loadAllTx().filter(
      (t) => t.createdAt.slice(0, 10) >= params.from && t.createdAt.slice(0, 10) <= params.to,
    );
    return cashiers.map((c) => {
      const txs = all.filter((t) => t.cashierId === c.id);
      return {
        cashierId: c.id,
        name: c.name,
        email: c.email,
        txCount: txs.length,
        total: txs.reduce((s, t) => s + t.total, 0),
      };
    });
  },

  async getProductReport(params: { from: string; to: string }) {
    requireToken();
    await delay();
    const all = loadAllTx().filter(
      (t) => t.createdAt.slice(0, 10) >= params.from && t.createdAt.slice(0, 10) <= params.to,
    );
    const byProduct = new Map<string, { productId: string; name: string; qty: number; revenue: number }>();
    for (const t of all) {
      for (const it of t.items) {
        const cur = byProduct.get(it.productId) ?? { productId: it.productId, name: it.name, qty: 0, revenue: 0 };
        cur.qty += it.qty;
        cur.revenue += it.qty * it.price;
        byProduct.set(it.productId, cur);
      }
    }
    return Array.from(byProduct.values()).sort((a, b) => b.revenue - a.revenue);
  },
};
