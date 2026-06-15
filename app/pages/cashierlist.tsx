import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { adminApi, type Cashier } from "~/api/admin";
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
  name: z.string().trim().min(2, "Minimal 2 karakter").max(60),
  email: z.string().trim().email("Masukkan email yang valid").max(120),
});
type FormValues = z.infer<typeof schema>;

export function meta() {
  return [{ title: "Daftar Kasir — Aplikasi Kasir" }];
}

function CashiersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Cashier | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Cashier | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "cashiers", q],
    queryFn: () => adminApi.getCashiers({ q }),
  });

  const createMut = useMutation({
    mutationFn: (v: FormValues) => adminApi.createCashier({ ...v, role: "cashier" }),
    onSuccess: () => {
      toast.success("Kasir berhasil dibuat");
      qc.invalidateQueries({ queryKey: ["admin", "cashiers"] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Cashier> }) =>
      adminApi.updateCashier(id, patch),
    onSuccess: () => {
      toast.success("Kasir berhasil diperbarui");
      qc.invalidateQueries({ queryKey: ["admin", "cashiers"] });
      setOpen(false);
    },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => adminApi.deleteCashier(id),
    onSuccess: () => {
      toast.success("Kasir berhasil dihapus");
      qc.invalidateQueries({ queryKey: ["admin", "cashiers"] });
      setDeleteTarget(null);
    },
  });

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(c: Cashier) {
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

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari berdasarkan nama atau email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
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
                  <TableCell className="text-muted-foreground">{c.email}</TableCell>
                  <TableCell>
                    <Badge variant={c.active ? "default" : "secondary"}>
                      {c.active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(c.createdAt).toLocaleDateString()}
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
              Ini akan menghapus <span className="font-medium">{deleteTarget?.name}</span>. Mereka tidak akan bisa masuk lagi.
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

function CashierFormDialog({
  open,
  onOpenChange,
  editing,
  onCreate,
  onUpdate,
  submitting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Cashier | null;
  onCreate: (v: FormValues) => void;
  onUpdate: (id: string, patch: Partial<Cashier>) => void;
  submitting: boolean;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: { name: editing?.name ?? "", email: editing?.email ?? "" },
    mode: "onChange",
  });
  const [active, setActive] = useState(editing?.active ?? true);

  function onSubmit(values: FormValues) {
    if (editing) onUpdate(editing.id, { ...values, active });
    else onCreate(values);
  }

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
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          {editing && (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="active">Aktif</Label>
                <p className="text-xs text-muted-foreground">Kasir nonaktif tidak dapat masuk.</p>
              </div>
              <Switch id="active" checked={active} onCheckedChange={setActive} />
            </div>
          )}
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

export default CashiersPage;
