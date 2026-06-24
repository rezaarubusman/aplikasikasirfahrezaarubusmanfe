import { useNavigate } from "react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ScanBarcode, Loader2, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { useAuth } from "~/stores/auth";
import { axiosInstance } from "~/lib/axios";

const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username minimal 3 karakter")
    .max(50, "Username maksimal 50 karakter"),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter"),
});

type Values = z.infer<typeof loginSchema>;

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

  const form = useForm<Values>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
    mode: "onChange",
  });

  useEffect(() => {
    if (!user) return;
    navigate(user.role === "CASHIER" ? "/cashierstart" : "/adminhome", { replace: true });
  }, [user, navigate]);

  const onSubmit = async (values: Values) => {
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
          <div className="space-y-4">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <ScanBarcode className="h-7 w-7" />
            </div>
            <div>
              <h1 className="max-w-xl text-4xl font-bold tracking-tight">
                Kelola aplikasi kasir dalam satu alur.
              </h1>
              <p className="mt-4 max-w-lg text-muted-foreground">
                Masuk sesuai peran yang sesuai.
              </p>
            </div>
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    disabled={submitting}
                    className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                  >
                    {showPassword ? "Sembunyikan Password" : "Tampilkan Password"}
                  </button>
                </div>
                
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="h-11 pl-9" 
                    disabled={submitting}
                    {...form.register("password")}
                  />
                </div>
                {form.formState.errors.password && (
                  <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>
                {form.formState.errors.password && (
                  <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                )}
              <Button type="submit" className="h-11 w-full gap-2" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Masuk ke Sistem
              </Button>

            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default LoginPage;