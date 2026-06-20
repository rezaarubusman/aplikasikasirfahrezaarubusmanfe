import z from "zod";

const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama produk minimal 2 karakter")
    .max(80, "Nama produk maksimal 80 karakter"),
  categoryId: z
    .coerce
    .number({ message: "Kategori wajib dipilih" })
    .int()
    .min(1, "Kategori wajib dipilih"),
  price: z
    .coerce
    .number()
    .min(0, "Harga tidak boleh bernilai negatif")
    .max(100000000, "Harga maksimal Rp 100.000.000"),
  stock: z
    .coerce
    .number()
    .int()
    .min(0, "Stok tidak boleh bernilai negatif")
    .max(1000000, "Stok maksimal 1.000.000"),
});
