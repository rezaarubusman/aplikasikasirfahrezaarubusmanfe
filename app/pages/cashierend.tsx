import { useNavigate } from "react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle, Banknote, Calculator, CheckCircle2, Clock, Loader2, LogOut, ReceiptText, ShieldCheck, StopCircle, WalletCards } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle} from "~/components/ui/alert-dialog";
import { shiftsApi } from "~/api/shifts";
import { api } from "~/api/auth";
import { rupiah } from "~/api";
import { useAuth } from "~/stores/auth";
import { useShift } from "~/stores/shift";
import { useCart } from "~/stores/cart";
import { cn } from "~/lib/utils";

const schema = z.object({
  closingCash: z.coerce.number({ message: "Masukkan jumlah" }).min(0, "Harus 0 atau lebih"),
});
type Values = z.infer<typeof schema>;

export function meta() {
  return [{ title: "Selesai Shift — Aplikasi Kasir" }];
}

const EndShiftPage = () => {
  const navigate = useNavigate();
  const shift = useShift((s) => s.active);
  const setActive = useShift((s) => s.setActive);
  const user = useAuth((s) => s.user);
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
  }, [summaryQ.data]);

  const handleConfirm = async () => {
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
  const expectedClosing = summaryQ.data?.expectedClosing ?? 0;
  const difference = Number(closing || 0) - expectedClosing;
  const differenceState = difference === 0 ? "balanced" : difference > 0 ? "over" : "short";
  const startedAt = useMemo(() => {
    if (!shift?.startedAt) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(shift.startedAt));
  }, [shift?.startedAt]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-destructive/5 via-background to-muted/40 p-4 md:p-6">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_420px]">
        <section className="space-y-6">
          <div className="rounded-2xl border bg-card/80 p-5 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Badge variant="outline" className="mb-3 gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Penutupan shift
                </Badge>
                <h1 className="text-2xl font-bold tracking-tight">Akhiri shift Anda</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cocokkan kas fisik dengan ekspektasi sebelum keluar dari sistem.
                </p>
              </div>
              <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <p className="font-medium">{user?.name ?? "Kasir"}</p>
                <p className="text-xs opacity-80">Mulai {startedAt}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {summaryQ.isLoading || !summaryQ.data ? (
              Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-28 rounded-2xl" />
              ))
            ) : (
              <>
                <SummaryCard
                  icon={<WalletCards className="h-5 w-5" />}
                  label="Modal awal"
                  value={rupiah(summaryQ.data.shift.openingCash)}
                />
                <SummaryCard
                  icon={<ReceiptText className="h-5 w-5" />}
                  label="Transaksi tunai"
                  value={rupiah(summaryQ.data.totalCashTransactions)}
                />
                <SummaryCard
                  icon={<Calculator className="h-5 w-5" />}
                  label="Ekspektasi tutup"
                  value={rupiah(summaryQ.data.expectedClosing)}
                  strong
                />
              </>
            )}
          </div>

          <Card className="overflow-hidden shadow-sm">
            <CardHeader className="border-b bg-muted/30">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <StopCircle className="h-5 w-5" />
              </div>
              <CardTitle className="mt-3">Hitung kas penutupan</CardTitle>
              <CardDescription>Masukkan uang tunai aktual di laci kas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <DifferencePanel difference={difference} state={differenceState} loading={!summaryQ.data} />

              <form
                onSubmit={form.handleSubmit(() => setConfirmOpen(true))}
                className="space-y-4"
                noValidate
              >
                <div className="space-y-2">
                  <Label htmlFor="closingCash">Kas penutupan (Rp)</Label>
                  <Input
                    id="closingCash"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1000}
                    className="h-11 text-base font-mono"
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
                  className="h-11 w-full gap-2"
                  disabled={!form.formState.isValid || submitting || summaryQ.isLoading}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  Akhiri shift
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Sebelum menutup shift</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Setelah dikonfirmasi, akun kasir akan logout dan keranjang dibersihkan.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <h2 className="font-semibold">Checklist penutupan</h2>
            <div className="mt-4 space-y-3">
              <ChecklistItem icon={<Banknote className="h-4 w-4" />} text="Hitung semua uang tunai di laci." />
              <ChecklistItem icon={<Calculator className="h-4 w-4" />} text="Bandingkan dengan ekspektasi sistem." />
              <ChecklistItem icon={<ReceiptText className="h-4 w-4" />} text="Simpan laporan atau struk akhir shift." />
            </div>
          </div>
        </aside>
      </div>

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

const SummaryCard = ({
  icon,
  label,
  value,
  strong,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  strong?: boolean;
}) => {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        {icon}
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-mono text-lg", strong && "font-bold text-foreground")}>{value}</p>
    </div>
  );
}

const DifferencePanel = ({
  difference,
  state,
  loading,
}: {
  difference: number;
  state: "balanced" | "over" | "short";
  loading: boolean;
}) => {
  if (loading) {
    return <Skeleton className="h-24 rounded-xl" />;
  }

  const config = {
    balanced: {
      icon: <CheckCircle2 className="h-5 w-5" />,
      title: "Kas sesuai",
      description: "Kas aktual cocok dengan ekspektasi sistem.",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    over: {
      icon: <AlertTriangle className="h-5 w-5" />,
      title: "Kas lebih",
      description: "Ada uang tunai lebih dari ekspektasi sistem.",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    },
    short: {
      icon: <AlertTriangle className="h-5 w-5" />,
      title: "Kas kurang",
      description: "Ada selisih kurang dari ekspektasi sistem.",
      className: "border-destructive/30 bg-destructive/10 text-destructive",
    },
  }[state];

  return (
    <div className={cn("rounded-xl border p-4", config.className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="mt-0.5">{config.icon}</div>
          <div>
            <p className="font-medium">{config.title}</p>
            <p className="mt-1 text-sm opacity-80">{config.description}</p>
          </div>
        </div>
        <p className="shrink-0 font-mono text-lg font-bold">{rupiah(Math.abs(difference))}</p>
      </div>
    </div>
  );
}

const ChecklistItem = ({ icon, text }: { icon: ReactNode; text: string }) => {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2 text-sm">
      <span className="text-destructive">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

export default EndShiftPage;