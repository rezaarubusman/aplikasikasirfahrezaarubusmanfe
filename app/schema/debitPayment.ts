import z from "zod";

const debitPaymentSchema = z.object({
  cardNumber: z
    .string()
    .trim()
    .regex(/^\d{16}$/, "Nomor kartu debit harus terdiri dari 16 digit angka"),
});
