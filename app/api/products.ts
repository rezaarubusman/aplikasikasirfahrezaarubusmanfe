import { delay, requireToken, uid } from "./index";

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  imageUrl?: string;
  active: boolean;
}

const KEY = "pos.products";

const seed: Product[] = [
  ["Espresso", "Coffee", 18000, 50],
  ["Cappuccino", "Coffee", 28000, 35],
  ["Latte", "Coffee", 30000, 40],
  ["Americano", "Coffee", 22000, 60],
  ["Matcha Latte", "Tea", 32000, 25],
  ["Earl Grey", "Tea", 20000, 20],
  ["Croissant", "Bakery", 25000, 12],
  ["Chocolate Muffin", "Bakery", 22000, 8],
  ["Cheesecake", "Bakery", 38000, 6],
  ["Brownie", "Bakery", 24000, 0],
  ["Orange Juice", "Cold Drinks", 28000, 15],
  ["Lemonade", "Cold Drinks", 25000, 18],
  ["Iced Coffee", "Cold Drinks", 28000, 22],
  ["Smoothie Bowl", "Food", 55000, 5],
  ["Avocado Toast", "Food", 48000, 10],
  ["Caesar Salad", "Food", 52000, 7],
].map(([name, category, price, stock], i) => ({
  id: `p_${String(i + 1).padStart(3, "0")}`,
  name: String(name),
  category: String(category),
  price: Number(price),
  stock: Number(stock),
  active: true,
}));

function load(): Product[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      window.localStorage.setItem(KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw);
  } catch {
    return seed;
  }
}
function save(list: Product[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(list));
}

export const productsApi = {
  async getProducts(params?: { q?: string; includeInactive?: boolean }) {
    requireToken();
    await delay();
    const q = (params?.q ?? "").trim().toLowerCase();
    return load()
      .filter((p) => (params?.includeInactive ? true : p.active))
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true));
  },
  async getAllProducts(params?: { q?: string; category?: string }) {
    requireToken();
    await delay();
    const q = (params?.q ?? "").trim().toLowerCase();
    return load()
      .filter((p) => (q ? p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) : true))
      .filter((p) => (params?.category ? p.category === params.category : true));
  },
  async createProduct(input: Omit<Product, "id">) {
    requireToken();
    await delay();
    const list = load();
    const p: Product = { ...input, id: uid("p") };
    list.push(p);
    save(list);
    return p;
  },
  async updateProduct(id: string, patch: Partial<Omit<Product, "id">>) {
    requireToken();
    await delay();
    const list = load();
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Product not found");
    list[idx] = { ...list[idx], ...patch };
    save(list);
    return list[idx];
  },
  async deleteProduct(id: string) {
    requireToken();
    await delay();
    const list = load().filter((p) => p.id !== id);
    save(list);
    return { ok: true };
  },
  async getCategories() {
    requireToken();
    await delay(150);
    return Array.from(new Set(load().map((p) => p.category))).sort();
  },
};
