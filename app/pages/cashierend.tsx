import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { StopCircle, Loader2 } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
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
import { api } from "~/api/auth";
import { rupiah } from "~/api";
import { useAuth } from "~/stores/auth";
import { useShift } from "~/stores/shift";
import { useCart } from "~/stores/cart";

const schema = z.object({
  closingCash: z.coerce.number({ message: "Enter an amount" }).min(0),
});
type Values = z.infer<typeof schema>;

export function meta() {
  return [{ title: "Selesai Shift — Aplikasi Kasir" }];
}

function EndShiftPage() {
  const navigate = useNavigate();
  const shift = useShift((s) => s.active);
  const setActive = useShift((s) => s.setActive);
  const logout = useAuth((s) => s.logout);
  const clearCart = useCart((s) => s.clear);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!shift) navigate("/cashierstart");
  }, [shift, navigate]);

  const summaryQ = useQuery({
    queryKey: ["shift-summary", shift?.id],
    queryFn: () => shiftsApi.getShiftSummary(shift!.id),
    enabled: !!shift,
  });

  const form = useForm<Values>({
    resolver: zodResolver(schema) as any,
    defaultValues: { closingCash: 0 },
    mode: "onChange",
  });

  useEffect(() => {
    if (summaryQ.data) {
      form.reset({ closingCash: summaryQ.data.expectedClosing });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryQ.data]);

  async function handleConfirm() {
    if (!shift) return;
    setSubmitting(true);
    try {
      await shiftsApi.endShift({
        shiftId: shift.id,
        closingCash: form.getValues("closingCash"),
      });
      await api.logout();
      setActive(null);
      clearCart();
      logout();
      toast.success("Shift berakhir");
      navigate("/");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengakhiri shift");
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  }

  const closing = form.watch("closingCash");

  return (
    <div className="mx-auto max-w-md p-6">
      <Card>
        <CardHeader>
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <StopCircle className="h-5 w-5" />
          </div>
          <CardTitle className="mt-3">Akhiri shift Anda</CardTitle>
          <CardDescription>Hitung laci dan masukkan jumlah penutupan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border divide-y text-sm">
            {summaryQ.isLoading || !summaryQ.data ? (
              <div className="space-y-2 p-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <>
                <SummaryRow label="Modal awal" value={rupiah(summaryQ.data.shift.openingCash)} />
                <SummaryRow
                  label="Total transaksi tunai"
                  value={rupiah(summaryQ.data.totalCashTransactions)}
                />
                <SummaryRow
                  label="Ekspektasi penutupan"
                  value={rupiah(summaryQ.data.expectedClosing)}
                  strong
                />
              </>
            )}
          </div>

          <form
            onSubmit={form.handleSubmit(() => setConfirmOpen(true))}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="closingCash">Kas penutupan (Rp)</Label>
              <Input
                id="closingCash"
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                {...form.register("closingCash")}
              />
              {form.formState.errors.closingCash && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.closingCash.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              variant="destructive"
              className="w-full"
              disabled={!form.formState.isValid || submitting}
            >
              Akhiri shift
            </Button>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Akhiri shift?</AlertDialogTitle>
            <AlertDialogDescription>
              Akhiri shift dengan{" "}
              <span className="font-mono font-semibold text-foreground">
                {rupiah(Number(closing) || 0)}
              </span>{" "}
              kas penutupan? Anda akan dikeluarkan dari sistem.
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

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={"font-mono " + (strong ? "font-bold" : "")}>{value}</span>
    </div>
  );
}

export default EndShiftPage;