import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Loader2, Search, ImageIcon } from "lucide-react";
import { toast } from "sonner";

import { productsApi, type Product } from "~/api/products";
import { rupiah } from "~/api/index";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Switch } from "~/components/ui/switch";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  category: z.string().trim().min(2).max(40),
  price: z.coerce.number().int().min(0).max(100_000_000),
  stock: z.coerce.number().int().min(0).max(1_000_000),
});
type FormValues = z.infer<typeof schema>;

export function meta() {
  return [{ title: "Daftar Produk — Aplikasi Kasir" }];
}

function ProductsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "products", q],
    queryFn: () => productsApi.getAllProducts({ q }),
  });

  const createMut = useMutation({
    mutationFn: (input: Omit<Product, "id">) => productsApi.createProduct(input),
    onSuccess: () => {
      toast.success("Produk berhasil dibuat");
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      setOpen(false);
    },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Product> }) =>
      productsApi.updateProduct(id, patch),
    onSuccess: () => {
      toast.success("Produk berhasil diperbarui");
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      setOpen(false);
    },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => productsApi.deleteProduct(id),
    onSuccess: () => {
      toast.success("Produk berhasil dihapus");
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      setDeleteTarget(null);
    },
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
          <Plus className="h-4 w-4" /> Tambah produk
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari berdasarkan nama atau kategori"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
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
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Memuat…
                </TableCell>
              </TableRow>
            ) : !data || data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Produk tidak ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.category}</TableCell>
                  <TableCell className="text-right font-mono">{rupiah(p.price)}</TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={p.stock === 0 ? "text-destructive font-bold" : ""}>
                      {p.stock}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.active ? "default" : "secondary"}>
                      {p.active ? "Aktif" : "Tersembunyi"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
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
      </Card>

      <ProductFormDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onCreate={(v) => createMut.mutate(v)}
        onUpdate={(id, patch) => updateMut.mutate({ id, patch })}
        submitting={createMut.isPending || updateMut.isPending}
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
}

function ProductFormDialog({
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
  onCreate: (v: Omit<Product, "id">) => void;
  onUpdate: (id: string, patch: Partial<Product>) => void;
  submitting: boolean;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    values: {
      name: editing?.name ?? "",
      category: editing?.category ?? "",
      price: editing?.price ?? 0,
      stock: editing?.stock ?? 0,
    },
    mode: "onChange",
  });
  const [active, setActive] = useState(editing?.active ?? true);
  const [imageUrl, setImageUrl] = useState<string | undefined>(editing?.imageUrl);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file?: File) {
    if (!file) return;
    if (file.size > 2_000_000) {
      toast.error("Gambar harus di bawah 2MB");
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
  }

  function onSubmit(values: FormValues) {
    const payload = { ...values, active, imageUrl };
    if (editing) onUpdate(editing.id, payload);
    else onCreate(payload);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit produk" : "Tambah produk"}</DialogTitle>
          <DialogDescription>
            {editing ? "Perbarui detail item di bawah ini." : "Buat item menu baru."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 rounded-md bg-muted flex items-center justify-center overflow-hidden">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                {imageUrl ? "Ganti gambar" : "Unggah gambar"}
              </Button>
              {imageUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setImageUrl(undefined)}>
                  Hapus
                </Button>
              )}
              <p className="text-xs text-muted-foreground">PNG / JPG, maks 2MB</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="p-name">Nama</Label>
              <Input id="p-name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="p-category">Kategori</Label>
              <Input id="p-category" {...form.register("category")} />
              {form.formState.errors.category && (
                <p className="text-xs text-destructive">{form.formState.errors.category.message}</p>
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
              <Label htmlFor="p-stock">Stok</Label>
              <Input id="p-stock" type="number" inputMode="numeric" {...form.register("stock")} />
              {form.formState.errors.stock && (
                <p className="text-xs text-destructive">{form.formState.errors.stock.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="p-active">Aktif</Label>
              <p className="text-xs text-muted-foreground">Produk tersembunyi tidak muncul di POS.</p>
            </div>
            <Switch id="p-active" checked={active} onCheckedChange={setActive} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={submitting || !form.formState.isValid}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Simpan" : "Buat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ProductsPage;
