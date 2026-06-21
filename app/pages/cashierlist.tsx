import { useSearchParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "~/components/ui/alert-dialog";
import { axiosInstance } from "~/lib/axios"; 

export interface User {
  id: string;
  name: string;
  username: string;
  role: "ADMIN" | "CASHIER";
  createdAt: string;
}

const createCashierSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(60),
  username: z.string().trim().min(3, "Username minimal 3 karakter").max(30),
  password: z.string().min(8, "Password minimal 8 karakter"),
});

const updateCashierSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(60),
  username: z.string().optional(), // Hanya untuk display, tidak di-submit
  password: z.string().min(8, "Password minimal 8 karakter").optional().or(z.literal("")),
});

type CreateFormValues = z.infer<typeof createCashierSchema>;
type UpdateFormValues = z.infer<typeof updateCashierSchema>;

export function meta() {
  return [{ title: "Daftar Kasir — Aplikasi Kasir" }];
}

export default function CashiersPage() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const [query, setQuery] = useState(q);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const applyQuery = useCallback((next: string) => {
    if (next) {
      setSearchParams({ q: next }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [setSearchParams]);

  useEffect(() => {
    setQuery(q);
  }, [q]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query !== q) {
        applyQuery(query);
      }
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

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "cashiers", q],
    queryFn: async () => {
      const response = await axiosInstance.get('/users');
      let users: User[] = response.data.data;
      
      users = users.filter((u) => u.role === "CASHIER");
      
      if (q) {
        const lowerQ = q.toLowerCase();
        users = users.filter((u) => 
          u.name.toLowerCase().includes(lowerQ) || 
          u.username.toLowerCase().includes(lowerQ)
        );
      }
      return users;
    },
  });

  const createMut = useMutation({
    mutationFn: async (v: CreateFormValues) => {
      const response = await axiosInstance.post('/users', { ...v, role: "CASHIER" });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Kasir berhasil dibuat");
      qc.invalidateQueries({ queryKey: ["admin", "cashiers"] });
      setOpen(false);
    },
    onError: (e: any) => {
      const errMsg = e.response?.data?.message || "Gagal membuat kasir";
      toast.error(errMsg);
    },
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CreateFormValues> }) => {
      const response = await axiosInstance.patch(`/users/${id}`, patch);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Kasir berhasil diperbarui");
      qc.invalidateQueries({ queryKey: ["admin", "cashiers"] });
      setOpen(false);
    },
    onError: (e: any) => {
      const errMsg = e.response?.data?.message || "Gagal memperbarui kasir";
      toast.error(errMsg);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete(`/users/${id}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Kasir berhasil dihapus");
      qc.invalidateQueries({ queryKey: ["admin", "cashiers"] });
      setDeleteTarget(null);
    },
    onError: (e: any) => {
      const errMsg = e.response?.data?.message || "Gagal menghapus kasir";
      toast.error(errMsg);
    },
  });

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(c: User) {
    setEditing(c);
    setOpen(true);
  }

  return (
    <div className="px-6 py-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kasir</h1>
          <p className="text-sm text-muted-foreground">Kelola akun kasir</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Tambah kasir
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Cari berdasarkan nama atau username... (Ctrl+K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {q && (
          <Button variant="ghost" onClick={() => applyQuery("")}>
            Atur Ulang
          </Button>
        )}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Bergabung</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Memuat…
                </TableCell>
              </TableRow>
            ) : !data || data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  Kasir tidak ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.username}</TableCell>
                  <TableCell>
                    <Badge variant="default">Aktif</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(c.createdAt).toLocaleDateString("id-ID")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
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
      </Card>

      <CashierFormDialog
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
            <AlertDialogTitle>Hapus kasir?</AlertDialogTitle>
            <AlertDialogDescription>
              Ini akan menghapus <span className="font-medium">{deleteTarget?.name}</span> secara sistem (Soft Delete). Mereka tidak akan bisa masuk lagi ke dalam aplikasi.
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

const CashierFormDialog = ({
  open,
  onOpenChange,
  editing,
  onCreate,
  onUpdate,
  submitting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: User | null;
  onCreate: (v: CreateFormValues) => void;
  onUpdate: (id: string, patch: Partial<UpdateFormValues>) => void;
  submitting: boolean;
}) => {
  const isEditing = !!editing;
  const schema = isEditing ? updateCashierSchema : createCashierSchema;

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    values: {
      name: editing?.name ?? "",
      username: editing?.username ?? "",
      password: "",
    },
    mode: "onChange",
  });

  const onSubmit = (values: any) => {
    if (isEditing) {
      const updateData = {
        name: values.name,
        ...(values.password ? { password: values.password } : {})
      };
      onUpdate(editing.id, updateData);
    } else {
      onCreate(values as CreateFormValues);
    }
  }

  useEffect(() => {
    if (open) {
      form.reset({
        name: editing?.name ?? "",
        username: editing?.username ?? "",
        password: "",
      });
    }
  }, [open, editing, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit kasir" : "Tambah kasir"}</DialogTitle>
          <DialogDescription>
            {editing ? "Perbarui detail kasir di bawah ini." : "Buat akun kasir baru."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="name">Nama</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message as string}</p>
            )}
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input 
              id="username" 
              {...form.register("username")} 
              disabled={isEditing} 
              className={isEditing ? "bg-muted cursor-not-allowed" : ""}
            />
            {form.formState.errors.username && (
              <p className="text-xs text-destructive">{form.formState.errors.username.message as string}</p>
            )}
            {isEditing && (
              <p className="text-xs text-muted-foreground">Username tidak dapat diubah setelah dibuat.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password {isEditing && "(Kosongkan jika tidak diubah)"}</Label>
            <Input id="password" type="password" {...form.register("password")} placeholder="••••••••" />
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">{form.formState.errors.password.message as string}</p>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={submitting || !form.formState.isValid}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? "Simpan" : "Buat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}