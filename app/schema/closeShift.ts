import z from "zod";

export const closeShiftSchema = z.object({
  closingCash: z
    .coerce
    .number({ message: "Masukkan jumlah kas akhir yang valid" })
    .min(0, "Kas penutupan tidak boleh bernilai negatif"),
});
