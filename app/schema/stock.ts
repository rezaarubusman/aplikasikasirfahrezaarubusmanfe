import { z } from "zod";

export const stockSchema = z.object({
  type: z.enum(["IN", "OUT", "ADJUSTMENT"], {
    message: "Jenis pergerakan wajib dipilih",
  }),
  qty: z.coerce
    .number({ message: "Jumlah wajib diisi" })
    .int("Jumlah harus berupa bilangan bulat")
    .min(1, "Jumlah minimal adalah 1"),
  notes: z.string().optional(),
});
