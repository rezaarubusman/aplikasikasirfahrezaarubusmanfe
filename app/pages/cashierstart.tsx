import { useNavigate } from "react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Banknote, Calculator, Clock, Loader2, PlayCircle, ReceiptText, ShieldCheck, Store, WalletCards} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "~/components/ui/alert-dialog";
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

const StartShiftPage = () => {
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

  const handleConfirm = async () => {
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
    } catch (e: any) {
      const errorMessage = e.response?.data?.message || e.message || "Gagal memulai shift";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  }

  const amount = form.watch("openingCash");
  const quickAmounts = [100000, 200000, 500000];
  const today = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-primary/5 via-background to-muted/40 p-4 md:p-6">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-6">
          <div className="rounded-2xl border bg-card/80 p-5 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Badge variant="outline" className="mb-3 gap-1">
                  <Store className="h-3.5 w-3.5" />
                  Shift kasir
                </Badge>
                <h1 className="text-2xl font-bold tracking-tight">
                  Selamat datang, {user?.name ?? "Kasir"}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Siapkan modal awal sebelum masuk ke halaman POS.
                </p>
              </div>
              <div className="rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">
                <div className="flex items-center gap-2 font-medium">
                  <Clock className="h-4 w-4" />
                  {today}
                </div>
              </div>
            </div>
          </div>

          <Card className="overflow-hidden shadow-sm">
            <CardHeader className="border-b bg-muted/30">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <PlayCircle className="h-5 w-5" />
              </div>
              <CardTitle className="mt-3">Mulai shift Anda</CardTitle>
              <CardDescription>Hitung laci kas dan masukkan jumlah awal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <div className="rounded-xl border bg-background p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <WalletCards className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Preview modal awal</p>
                    <p className="font-mono text-xl font-bold">{rupiah(Number(amount) || 0)}</p>
                  </div>
                </div>
              </div>

              <form
                onSubmit={form.handleSubmit(() => setConfirmOpen(true))}
                className="space-y-4"
                noValidate
              >
                <div className="space-y-2">
                  <Label htmlFor="openingCash">Modal awal (Rp)</Label>
                  <Input
                    id="openingCash"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1000}
                    className="h-11 text-base font-mono"
                    {...form.register("openingCash")}
                  />
                  {form.formState.errors.openingCash && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.openingCash.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {quickAmounts.map((value) => (
                    <Button
                      key={value}
                      type="button"
                      variant="outline"
                      onClick={() =>
                        form.setValue("openingCash", value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    >
                      {rupiah(value).replace("Rp ", "")}
                    </Button>
                  ))}
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full gap-2"
                  disabled={!form.formState.isValid || submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PlayCircle className="h-4 w-4" />
                  )}
                  Mulai shift
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4">
          <InfoCard
            icon={<Calculator className="h-5 w-5" />}
            title="Checklist sebelum mulai"
            description="Pastikan modal awal sesuai kas fisik di laci."
          />
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <h2 className="font-semibold">Persiapan cepat</h2>
            <div className="mt-4 space-y-3">
              <ChecklistItem icon={<Banknote className="h-4 w-4" />} text="Hitung uang tunai pembuka." />
              <ChecklistItem icon={<ReceiptText className="h-4 w-4" />} text="Pastikan printer dan struk siap." />
              <ChecklistItem icon={<ShieldCheck className="h-4 w-4" />} text="Mulai hanya saat kas sudah cocok." />
            </div>
          </div>
        </aside>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mulai shift?</AlertDialogTitle>
            <AlertDialogDescription>
              Mulai shift dengan{" "}
              <span className="font-mono font-semibold text-foreground">
                {rupiah(Number(amount) || 0)}
              </span>{" "}
              modal awal?
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

const InfoCard = ({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) => {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

const ChecklistItem = ({ icon, text }: { icon: ReactNode; text: string }) => {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2 text-sm">
      <span className="text-primary">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

export default StartShiftPage;