import z from "zod";

export const openShiftSchema = z.object({
  openingCash: z
    .coerce
    .number({ message: "Masukkan jumlah modal awal yang valid" })
    .min(1000, "Modal awal tidak boleh bernilai negatif"),
});
