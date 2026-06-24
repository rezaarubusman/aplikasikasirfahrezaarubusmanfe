import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Loader2, Search, ImageIcon, Boxes, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { axiosInstance } from "~/lib/axios"; 
import { rupiah } from "~/api/index";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card } from "~/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "~/components/ui/alert-dialog";

export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number | string;
  stock: number;
  image?: string | null;
  categoryId?: number;
  category?: Category | null;
  isDeleted: boolean;
}

type StockMovementType = "IN" | "OUT" | "ADJUSTMENT";

const productSchema = z.object({
  name: z.string().trim().min(2, "Nama produk minimal 2 karakter").max(80, "Nama produk maksimal 80 karakter"),
  categoryId: z.coerce.number({ message: "Kategori wajib dipilih" }).int().min(1, "Kategori wajib dipilih"),
  price: z.coerce.number().min(0, "Harga tidak boleh bernilai negatif").max(100000000, "Harga maksimal Rp 100.000.000"),
  stock: z.coerce.number().int().min(0, "Stok tidak boleh bernilai negatif").max(1000000, "Stok maksimal 1.000.000"),
});
type ProductFormValues = z.infer<typeof productSchema>;

const stockSchema = z.object({
  type: z.enum(["IN", "ADJUSTMENT"], {
    message: "Jenis pergerakan wajib dipilih",
  }),
  qty: z.coerce
    .number({ message: "Jumlah wajib diisi" })
    .int({ message: "Jumlah harus berupa bilangan bulat" })
    .min(1, { message: "Jumlah minimal adalah 1" }),
  notes: z.string().optional(),
});
type StockFormValues = z.infer<typeof stockSchema>;

export function meta() {
  return [{ title: "Daftar Produk — Aplikasi Kasir" }];
}

const PAGE_SIZE = 10;

const ProductsPage = () => {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const pageParam = searchParams.get("page");
  const currentPage = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;

  const [query, setQuery] = useState(q);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [stockTarget, setStockTarget] = useState<Product | null>(null);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const res = await axiosInstance.get<{ data: Product[] }>("/products");
      return res.data.data || res.data;
    },
  });

  const filteredProducts = useMemo(() => {
    if (!productsData) return [];
    if (!q) return productsData;
    const lowerQ = q.toLowerCase();
    return productsData.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQ) ||
        p.category?.name.toLowerCase().includes(lowerQ)
    );
  }, [productsData, q]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set("page", totalPages.toString());
        return params;
      }, { replace: true });
    }
  }, [currentPage, totalPages, setSearchParams]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, currentPage]);

  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("page", newPage.toString());
      return params;
    });
  };

  const applyQuery = useCallback((next: string) => {
    setSearchParams((prevParams) => {
      const newParams = new URLSearchParams(prevParams);
      if (next) newParams.set("q", next);
      else newParams.delete("q");
      newParams.set("page", "1"); 
      return newParams;
    }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => { setQuery(q); }, [q]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query !== q) applyQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, q, applyQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const createMut = useMutation({
    mutationFn: async (input: FormData) => {
      const res = await axiosInstance.post("/products", input, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Produk berhasil dibuat");
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      setOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal membuat produk")
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      const res = await axiosInstance.patch(`/products/${id}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Produk berhasil diperbarui");
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      setOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal memperbarui produk")
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosInstance.delete(`/products/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Produk berhasil dihapus");
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal menghapus produk")
  });

  const stockMut = useMutation({
    mutationFn: async (data: { productId: string; qty: number; type: StockMovementType; notes?: string }) => {
      const res = await axiosInstance.post("/inventory", data);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Pergerakan stok berhasil dicatat");
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      setStockTarget(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal memperbarui stok")
  });

  return (
    <div className="px-6 py-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Produk</h1>
          <p className="text-sm text-muted-foreground">Kelola item menu, harga, dan stok</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Tambah produk
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          placeholder="Cari berdasarkan nama atau kategori... (Ctrl+K)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-14"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14"></TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">Harga</TableHead>
              <TableHead className="text-right">Stok</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Memuat…
                </TableCell>
              </TableRow>
            ) : paginatedProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Produk tidak ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              paginatedProducts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.category?.name || "-"}</TableCell>
                  <TableCell className="text-right font-mono">{rupiah(Number(p.price))}</TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={p.stock === 0 ? "text-destructive font-bold" : ""}>
                      {p.stock}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Kelola Stok"
                        onClick={() => setStockTarget(p)}
                      >
                        <Boxes className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Edit Produk"
                        onClick={() => {
                          setEditing(p);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Hapus Produk"
                        onClick={() => setDeleteTarget(p)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        {!isLoading && filteredProducts.length > 0 && (
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Menampilkan <span className="font-medium text-foreground">{(currentPage - 1) * PAGE_SIZE + 1}</span> hingga <span className="font-medium text-foreground">{Math.min(currentPage * PAGE_SIZE, filteredProducts.length)}</span> dari <span className="font-medium text-foreground">{filteredProducts.length}</span> produk
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <div className="text-sm font-medium px-2">
                Hal {currentPage} / {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <ProductFormDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onCreate={(v) => createMut.mutate(v)}
        onUpdate={(id, data) => updateMut.mutate({ id, data })}
        submitting={createMut.isPending || updateMut.isPending}
      />

      <StockMovementDialog
        open={!!stockTarget}
        onOpenChange={(o) => !o && setStockTarget(null)}
        product={stockTarget}
        onSubmit={(data) => {
          if (stockTarget) {
            stockMut.mutate({ productId: stockTarget.id, ...data });
          }
        }}
        submitting={stockMut.isPending}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus produk?</AlertDialogTitle>
            <AlertDialogDescription>
              Ini akan menghapus secara permanen <span className="font-medium">{deleteTarget?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const ProductFormDialog = ({
  open,
  onOpenChange,
  editing,
  onCreate,
  onUpdate,
  submitting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Product | null;
  onCreate: (v: FormData) => void;
  onUpdate: (id: string, data: FormData) => void;
  submitting: boolean;
}) => {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: { name: "", categoryId: 0, price: 0, stock: 0 },
    mode: "onChange",
  });

  const { data: categories } = useQuery({
      queryKey: ["admin", "categories"],
      queryFn: async () => {
        const res = await axiosInstance.get<{ data: Category[] }>("/categories");
        return res.data.data;
      },
    });

  const [imageUrl, setImageUrl] = useState<string | null | undefined>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setImageUrl(editing?.image);
      form.reset({
        name: editing?.name ?? "",
        categoryId: editing?.categoryId ?? 0,
        price: editing ? Number(editing.price) : 0,
        stock: editing?.stock ?? 0,
      });
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [open, editing, form]);

  function handleFile(file?: File) {
    if (!file) return;
    if (file.size > 2_000_000) {
      toast.error("Gambar harus di bawah 2MB");
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
  }

  function onSubmit(values: ProductFormValues) {
    const formData = new FormData();
    formData.append("name", values.name);
    formData.append("categoryId", values.categoryId.toString());
    formData.append("price", values.price.toString());
    
    if (!editing) {
      formData.append("stock", values.stock.toString());
    }

    const file = fileRef.current?.files?.[0];
    if (file) {
      formData.append("image", file);
    } else if (imageUrl === null) {
      formData.append("image", ""); 
    }

    if (editing) {
      onUpdate(editing.id, formData);
    } else {
      onCreate(formData);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit produk" : "Tambah produk"}</DialogTitle>
          <DialogDescription>
            {editing ? "Perbarui detail item. Stok dikelola melalui menu terpisah." : "Buat item menu baru dan tentukan stok awal."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0 border">
              {imageUrl ? (
                <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2 w-full">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg, image/png"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  {imageUrl ? "Ganti gambar" : "Unggah gambar"}
                </Button>
                {imageUrl && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => {
                    setImageUrl(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}>
                    Hapus
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Hanya format PNG / JPG, maksimum ukuran file 2MB.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="p-name">Nama Produk</Label>
              <Input id="p-name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="p-category">Kategori</Label>
              <select
                id="p-category"
                {...form.register("categoryId")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
              >
                <option value={0} disabled>Pilih Kategori</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {form.formState.errors.categoryId && (
                <p className="text-xs text-destructive">{form.formState.errors.categoryId.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-price">Harga (Rp)</Label>
              <Input id="p-price" type="number" inputMode="numeric" {...form.register("price")} />
              {form.formState.errors.price && (
                <p className="text-xs text-destructive">{form.formState.errors.price.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-stock">Stok Awal</Label>
              <Input 
                id="p-stock" 
                type="number" 
                inputMode="numeric" 
                {...form.register("stock")} 
                disabled={!!editing}
              />
              {form.formState.errors.stock && (
                <p className="text-xs text-destructive">{form.formState.errors.stock.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? "Simpan Perubahan" : "Buat Produk"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const StockMovementDialog = ({
  open,
  onOpenChange,
  product,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  product: Product | null;
  onSubmit: (data: StockFormValues) => void;
  submitting: boolean;
}) => {
  const form = useForm<StockFormValues>({
    resolver: zodResolver(stockSchema) as any,
    defaultValues: { type: "IN", qty: 1, notes: "" },
    mode: "onChange",
  });

  const currentStock = product?.stock || 0;

  useEffect(() => {
    if (open && product) {
      form.reset({ 
        type: product.stock === 0 ? "IN" : "ADJUSTMENT", qty: 1, notes: "" });
    }
  }, [open, product, form]);

  const movementType = form.watch("type");
  const qty = form.watch("qty");
  
  const estimatedStock = movementType === "IN" ? currentStock + (Number(qty) || 0) : 
                         currentStock + (Number(qty) || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kelola Stok Produk</DialogTitle>
          <DialogDescription>
            Catat pergerakan stok untuk <span className="font-semibold text-foreground">{product?.name}</span>.
            Stok saat ini: <span className="font-mono font-bold text-foreground">{currentStock}</span>
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="s-type">Jenis Pergerakan</Label>
              <select
                id="s-type"
                {...form.register("type")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {currentStock === 0 && (
                  <option value="IN">Stok Masuk (IN)</option>
                )}
                {currentStock > 0 && (
                  <option value="ADJUSTMENT">Penyesuaian (ADJUSTMENT)</option>
                )}
              </select>
              {form.formState.errors.type && (
                <p className="text-xs text-destructive">{form.formState.errors.type.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="s-qty">Jumlah</Label>
              <Input id="s-qty" type="number" inputMode="numeric" {...form.register("qty")} />
              {form.formState.errors.qty && (
                <p className="text-xs text-destructive">{form.formState.errors.qty.message}</p>
              )}
            </div>
            
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="s-notes">Catatan (Opsional)</Label>
              <Input id="s-notes" placeholder="Contoh: Barang retur, stok opname" {...form.register("notes")} />
            </div>
          </div>
          
          <div className="rounded-md bg-muted p-3">
            <p className="text-sm text-muted-foreground">
              Estimasi stok setelah disimpan: <span className={`font-mono font-bold ${estimatedStock < 0 ? "text-destructive" : "text-foreground"}`}>{estimatedStock}</span>
            </p>
            {estimatedStock < 0 && (
              <p className="text-xs text-destructive mt-1">Peringatan: Stok tidak boleh menjadi negatif.</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={submitting || estimatedStock < 0}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Catat Pergerakan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductsPage;