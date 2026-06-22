import z from "zod";

export const cashPaymentSchema = z.object({
  cashReceived: z
    .coerce
    .number({ message: "Masukkan jumlah uang yang valid" })
    .min(0, "Uang diterima tidak boleh bernilai negatif"),
});
