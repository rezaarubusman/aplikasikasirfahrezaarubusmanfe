import { create } from "zustand";
import type { Product } from "~/api/products";

export interface CartLine {
  productId: string;
  name: string;
  price: number;
  qty: number;
  stock: number;
}

interface CartState {
  items: CartLine[];
  add: (p: Product) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  total: () => number;
}

export const useCart = create<CartState>((set, get) => ({
  items: [],
  add: (p) =>
    set((s) => {
      const existing = s.items.find((i) => i.productId === p.id);
      if (existing) {
        if (existing.qty >= p.stock) return s;
        return {
          items: s.items.map((i) =>
            i.productId === p.id ? { ...i, qty: i.qty + 1 } : i,
          ),
        };
      }
      return {
        items: [...s.items, { productId: p.id, name: p.name, price: p.price, qty: 1, stock: p.stock }],
      };
    }),
  setQty: (productId, qty) =>
    set((s) => ({
      items: s.items
        .map((i) => (i.productId === productId ? { ...i, qty: Math.min(Math.max(qty, 0), i.stock) } : i))
        .filter((i) => i.qty > 0),
    })),
  remove: (productId) => set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),
  clear: () => set({ items: [] }),
  total: () => get().items.reduce((s, i) => s + i.price * i.qty, 0),
}));
