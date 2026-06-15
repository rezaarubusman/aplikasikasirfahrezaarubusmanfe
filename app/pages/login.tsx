import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { toast } from "sonner";
import { ScanBarcode, Loader2 } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { api } from "~/api/auth";
import { useAuth } from "~/stores/auth";

const schema = z.object({
  email: z.string().trim().email("Masukkan email yang valid"),
  password: z.string().min(6, "Minimal 6 karakter"),
});
type FormValues = z.infer<typeof schema>;

export function meta() {
  return [{ title: "Masuk — Aplikasi Kasir" }];
}

function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuth((s) => s.setAuth);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
    mode: "onChange",
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const { token, user } = await api.login(values.email, values.password);
      setAuth(token, user);
      toast.success(`Selamat datang, ${user.name}`);
      if (user.role === "cashier") navigate("/cashierstart");
      else navigate("/adminhome");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal masuk");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-sidebar to-sidebar/80 flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm shadow-2xl border-0">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ScanBarcode className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-2xl">Aplikasi Kasir</CardTitle>
            <CardDescription>Masuk untuk memulai shift Anda</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" placeholder="cashier@pos.dev" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" {...form.register("password")} />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={submitting || !form.formState.isValid}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </Button>
            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Demo accounts</p>
              <p>Cashier — <span className="font-mono">cashier@pos.dev</span> / <span className="font-mono">password123</span></p>
              <p>Admin — <span className="font-mono">admin@pos.dev</span> / <span className="font-mono">password123</span></p>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

export default LoginPage;
