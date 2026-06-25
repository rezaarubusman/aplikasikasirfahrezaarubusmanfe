import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, Loader2, Search, Tags, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { axiosInstance } from "~/lib/axios"; 
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card } from "~/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "~/components/ui/alert-dialog";
import { categorySchema, type CategoryFormValues } from "~/schema/category"; 

export interface Category {
  id: number;
  name: string;
}

export function meta() {
  return [{ title: "Daftar Kategori — Aplikasi Kasir" }];
}

const PAGE_SIZE = 10;

const CategoriesPage = () => {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const pageParam = searchParams.get("page");
  const currentPage = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;

  const [query, setQuery] = useState(q);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const { data: fetchResult, isLoading } = useQuery({
    queryKey: ["admin", "categories", q, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", currentPage.toString());
      params.set("limit", PAGE_SIZE.toString());
      if (q) params.set("search", q);

      const res = await axiosInstance.get(`/categories?${params.toString()}`);
      return res.data;
    },
  });

  const categoriesData: Category[] = fetchResult?.data || [];
  const totalPages = fetchResult?.meta?.totalPages || 1;
  const totalItems = fetchResult?.meta?.total || 0;

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set("page", totalPages.toString());
        return params;
      }, { replace: true });
    }
  }, [currentPage, totalPages, setSearchParams]);

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
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const createMut = useMutation({
    mutationFn: async (data: CategoryFormValues) => {
      const res = await axiosInstance.post("/categories", data);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Kategori berhasil dibuat");
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      setOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal membuat kategori"),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CategoryFormValues }) => {
      const res = await axiosInstance.patch(`/categories/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Kategori berhasil diperbarui");
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      setOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal memperbarui kategori"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await axiosInstance.delete(`/categories/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Kategori berhasil dihapus");
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      qc.invalidateQueries({ queryKey: ["admin", "products"] }); 
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal menghapus kategori"),
  });

  return (
    <div className="px-6 py-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kategori Produk</h1>
          <p className="text-sm text-muted-foreground">Kelola pengelompokan item menu kasir</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Tambah kategori
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          placeholder="Cari nama kategori... (Ctrl+K)"
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
              <TableHead>Nama Kategori</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Memuat…
                </TableCell>
              </TableRow>
            ) : categoriesData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                  Kategori tidak ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              categoriesData.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center overflow-hidden">
                      <Tags className="h-5 w-5" />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-base">{c.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Edit Kategori"
                        onClick={() => {
                          setEditing(c);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Hapus Kategori"
                        onClick={() => setDeleteTarget(c)}
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

        {!isLoading && totalItems > 0 && (
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Menampilkan <span className="font-medium text-foreground">{(currentPage - 1) * PAGE_SIZE + 1}</span> hingga <span className="font-medium text-foreground">{Math.min(currentPage * PAGE_SIZE, totalItems)}</span> dari <span className="font-medium text-foreground">{totalItems}</span> kategori
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

      <CategoryFormDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onCreate={(v) => createMut.mutate(v)}
        onUpdate={(id, data) => updateMut.mutate({ id, data })}
        submitting={createMut.isPending || updateMut.isPending}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus kategori?</AlertDialogTitle>
            <AlertDialogDescription>
              Ini akan menghapus secara permanen kategori <span className="font-medium">{deleteTarget?.name}</span>. 
              Produk yang menggunakan kategori ini mungkin tidak akan memiliki kategori.
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

const CategoryFormDialog = ({
  open,
  onOpenChange,
  editing,
  onCreate,
  onUpdate,
  submitting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Category | null;
  onCreate: (v: CategoryFormValues) => void;
  onUpdate: (id: number, data: CategoryFormValues) => void;
  submitting: boolean;
}) => {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema) as any,
    defaultValues: { name: "" },
    mode: "onChange",
  });

  useEffect(() => {
    if (open) {
      form.reset({ name: editing?.name ?? "" });
    }
  }, [open, editing, form]);

  function onSubmit(values: CategoryFormValues) {
    if (editing) onUpdate(editing.id, values);
    else onCreate(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit kategori" : "Tambah kategori"}</DialogTitle>
          <DialogDescription>
            {editing ? "Ubah nama kategori yang sudah ada." : "Buat pengelompokan baru untuk produk Anda."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="c-name">Nama Kategori</Label>
            <Input 
              id="c-name" 
              placeholder="Contoh: Makanan, Minuman, Snack..." 
              {...form.register("name")} 
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? "Simpan Perubahan" : "Buat Kategori"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CategoriesPage;