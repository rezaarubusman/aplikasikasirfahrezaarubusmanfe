import { delay } from "./index";

export type Role = "cashier" | "admin";
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

const MOCK_USERS: Array<User & { password: string }> = [
  { id: "u_admin", name: "Admin User", email: "admin@pos.dev", password: "password123", role: "admin" },
  { id: "u_cash1", name: "Sari Cashier", email: "cashier@pos.dev", password: "password123", role: "cashier" },
  { id: "u_cash2", name: "Budi Cashier", email: "budi@pos.dev", password: "password123", role: "cashier" },
];

export const api = {
  async login(email: string, password: string) {
    await delay();
    const u = MOCK_USERS.find((x) => x.email.toLowerCase() === email.toLowerCase() && x.password === password);
    if (!u) throw new Error("Invalid email or password");
    const { password: _pw, ...user } = u;
    const token = `mock.${u.id}.${Date.now()}`;
    return { token, user };
  },
  async logout() {
    await delay(150);
    return { ok: true };
  },
};
