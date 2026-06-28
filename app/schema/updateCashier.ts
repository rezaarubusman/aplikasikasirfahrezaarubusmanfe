import z from "zod";

export const updateCashierSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(60),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .optional()
    .or(z.literal("")), 
});
