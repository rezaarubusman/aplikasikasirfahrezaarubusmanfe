import z from "zod";

export const createCashierSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(60),
  username: z.string().trim().min(3, "Username minimal 3 karakter").max(30),
  password: z.string().min(8, "Password minimal 8 karakter"),
});
