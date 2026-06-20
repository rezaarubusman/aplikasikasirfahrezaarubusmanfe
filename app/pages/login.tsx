import { useNavigate } from "react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { BarChart3, Boxes, Eye, EyeOff, Loader2, LockKeyhole, ReceiptText, ScanBarcode, ShieldCheck, Store, UserRound, Zap} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { useAuth } from "~/stores/auth";
import { axiosInstance } from "~/lib/axios";

const schema = z.object({
  username: z.string().trim().min(3, "Username minimal 3 karakter").max(50, "Username maksimal 50 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

type FormValues = z.infer<typeof schema>;

export function meta() {
  return [{ title: "Masuk — Aplikasi Kasir" }];
}
const LoginPage = () => {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const setAuth = useAuth((s) => s.setAuth);
  
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "" },
    mode: "onChange",
  });

  useEffect(() => {
    if (!user) return;
    navigate(user.role === "CASHIER" ? "/cashierstart" : "/adminhome", { replace: true });
  }, [user, navigate]);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setFormError(null);
    try {
      const response = await axiosInstance.post("/auth/login", {
        username: values.username,
        password: values.password,
      });

      const { token, user } = response.data.data;
      
      setAuth(token, user);
      toast.success(`Selamat datang, ${user.name}`);
      navigate(user.role === "CASHIER" ? "/cashierstart" : "/adminhome");
      
    } catch (e: any) {
      const message = e.response?.data?.message || e.message || "Gagal masuk ke sistem";
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-gradient-to-br from-primary/10 via-background to-muted/70 px-4 py-8 md:px-6">
      <div className="pointer-events-none fixed -left-24 top-10 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none fixed -right-24 bottom-10 h-72 w-72 rounded-full bg-sidebar/20 blur-3xl" />

      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden space-y-6 lg:block">
          <Badge variant="outline" className="gap-1 bg-background/70">
            <Store className="h-3.5 w-3.5" />
            POS control center
          </Badge>

          <div className="space-y-4">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <ScanBarcode className="h-7 w-7" />
            </div>
            <div>
              <h1 className="max-w-xl text-4xl font-bold tracking-tight">
                Kelola transaksi, shift, dan laporan dalam satu alur kasir.
              </h1>
              <p className="mt-4 max-w-lg text-muted-foreground">
                Masuk sesuai peran untuk membuka dashboard yang tepat: POS cepat untuk kasir,
                kontrol operasional untuk admin.
              </p>
            </div>
          </div>

          <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
            <FeatureCard icon={<Zap className="h-5 w-5" />} title="POS cepat" text="Input penjualan lebih ringkas." />
            <FeatureCard icon={<BarChart3 className="h-5 w-5" />} title="Laporan shift" text="Pantau kas awal hingga akhir." />
            <FeatureCard icon={<Boxes className="h-5 w-5" />} title="Stok rapi" text="Produk dan persediaan terpantau." />
          </div>
        </section>

        <Card className="mx-auto w-full max-w-md border-0 shadow-2xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <ScanBarcode className="h-7 w-7" />
            </div>
            <div>
              <CardTitle className="text-2xl">Aplikasi Kasir</CardTitle>
              <CardDescription>Masuk untuk melanjutkan pekerjaan Anda</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
              {formError && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    autoComplete="username"
                    placeholder="Masukkan username Anda"
                    className="h-11 pl-9"
                    disabled={submitting}
                    {...form.register("username")}
                  />
                </div>
                {form.formState.errors.username && (
                  <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="h-11 pl-9 pr-10"
                    disabled={submitting}
                    {...form.register("password")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword((value) => !value)}
                    disabled={submitting}
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="h-11 w-full gap-2" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Masuk ke Sistem
              </Button>

              <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Sesi tersimpan aman di perangkat ini.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

const FeatureCard = ({ icon, title, text }: { icon: ReactNode; title: string; text: string }) => {
  return (
    <div className="rounded-2xl border bg-card/80 p-4 shadow-sm backdrop-blur">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export default LoginPage;