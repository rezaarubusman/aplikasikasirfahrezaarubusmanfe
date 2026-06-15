import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, PlayCircle } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
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
import { shiftsApi } from "~/api/shifts";
import { useAuth } from "~/stores/auth";
import { useShift } from "~/stores/shift";
import { rupiah } from "~/api";

const schema = z.object({
  openingCash: z.coerce.number({ message: "Masukkan jumlah" }).min(0, "Harus 0 atau lebih"),
});
type Values = z.infer<typeof schema>;

export function meta() {
  return [{ title: "Mulai Shift — Aplikasi Kasir" }];
}

function StartShiftPage() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const active = useShift((s) => s.active);
  const setActive = useShift((s) => s.setActive);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema) as any,
    defaultValues: { openingCash: 0 },
    mode: "onChange",
  });

  // Auto-redirect if a shift is already active
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    shiftsApi.getActiveShift(user.id).then((s) => {
      if (cancelled) return;
      if (s) {
        setActive(s);
        navigate("/cashierpos");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user, navigate, setActive]);

  useEffect(() => {
    if (active) navigate("/cashierpos");
  }, [active, navigate]);

  async function handleConfirm() {
    if (!user) return;
    setSubmitting(true);
    try {
      const shift = await shiftsApi.startShift({
        cashierId: user.id,
        openingCash: form.getValues("openingCash"),
      });
      setActive(shift);
      toast.success("Shift dimulai");
      navigate("/cashierpos");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memulai shift");
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  }

  const amount = form.watch("openingCash");

  return (
    <div className="mx-auto max-w-md p-6">
      <Card>
        <CardHeader>
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <PlayCircle className="h-5 w-5" />
          </div>
          <CardTitle className="mt-3">Mulai shift Anda</CardTitle>
          <CardDescription>Hitung laci kas dan masukkan jumlah awal.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(() => setConfirmOpen(true))}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="openingCash">Modal awal (Rp)</Label>
              <Input
                id="openingCash"
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                {...form.register("openingCash")}
              />
              {form.formState.errors.openingCash && (
                <p className="text-xs text-destructive">{form.formState.errors.openingCash.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={!form.formState.isValid || submitting}>
              Mulai shift
            </Button>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mulai shift?</AlertDialogTitle>
            <AlertDialogDescription>
              Mulai shift dengan <span className="font-mono font-semibold text-foreground">{rupiah(Number(amount) || 0)}</span> modal awal?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Konfirmasi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default StartShiftPage;
