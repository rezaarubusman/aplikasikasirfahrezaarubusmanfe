import { useNavigate, useSearchParams } from "react-router";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Loader2, Receipt, ShoppingCart } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";

import { productsApi, type Product } from "~/api/products";
import { txApi, type Transaction } from "~/api/transactions";
import { rupiah } from "~/api";
import { useCart } from "~/stores/cart";
import { useAuth } from "~/stores/auth";
import { useShift } from "~/stores/shift";

const searchSchema = z.object({
  q: z.string().optional().default(""),
});

export function meta() {
  return [{ title: "POS — Aplikasi Kasir" }];
}

function PosPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const user = useAuth((s) => s.user);
  const shift = useShift((s) => s.active);

  // Redirect away if no active shift
  useEffect(() => {
    if (!shift) navigate("/");
  }, [shift, navigate]);

  const items = useCart((s) => s.items);
  const addToCart = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const removeItem = useCart((s) => s.remove);
  const clearCart = useCart((s) => s.clear);
  const cartTotal = useCart((s) => s.total());

  const [query, setQuery] = useState(q);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sinkronisasi state lokal dengan parameter URL jika berubah dari luar (misal: tombol Bersih)
  useEffect(() => {
    setQuery(q);
  }, [q]);

  const productsQ = useQuery({
    queryKey: ["products", q],
    queryFn: () => productsApi.getProducts({ q }),
  });

  const applyQuery = useCallback((next: string) => {
    if (next) {
      setSearchParams({ q: next }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [setSearchParams]);

  // Implementasi Debounced Search: Update URL hanya setelah user berhenti mengetik selama 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query !== q) {
        applyQuery(query);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, q, applyQuery]);

  // Implementasi Shortcut Ctrl+K untuk fokus ke search bar
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

  // Payment modal state
  const [payOpen, setPayOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<"cash" | "debit">("cash");
  const [confirmPayOpen, setConfirmPayOpen] = useState(false);
  const [receipt, setReceipt] = useState<Transaction | null>(null);

  const [removeId, setRemoveId] = useState<string | null>(null);

  return (
    <div className="grid gap-4 p-4 md:grid-cols-[1fr_400px] md:p-6">
      {/* Products */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari produk... (Ctrl+K)"
              className="pl-9"
            />
          </div>
          {q && (
            <Button variant="ghost" onClick={() => applyQuery("")}>
            Bersih
            </Button>
          )}
        </div>

        {productsQ.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        ) : productsQ.data && productsQ.data.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {productsQ.data.map((p) => (
              <ProductCard key={p.id} product={p} onAdd={() => addToCart(p)} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Search className="h-6 w-6" />}
            title="Produk tidak ditemukan"
            description={q ? `Tidak ada hasil untuk "${q}".` : "Produk akan muncul di sini."}
          />
        )}
      </section>

      {/* Cart */}
      <aside className="md:sticky md:top-[4.5rem] md:self-start">
        <Card className="flex max-h-[calc(100vh-6rem)] flex-col">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">Pesanan Saat Ini</h2>
            </div>
            {items.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart}>
                Bersih
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                <ShoppingCart className="h-8 w-8 opacity-40" />
                <p>Keranjang kosong</p>
                <p className="text-xs">Ketuk produk untuk menambah</p>
              </div>
            ) : (
              <ul className="divide-y">
                {items.map((i) => (
                  <li key={i.productId} className="flex items-start gap-3 p-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-tight">{i.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{rupiah(i.price)}</p>
                      <div className="mt-2 flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => setQty(i.productId, i.qty - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-mono">{i.qty}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => setQty(i.productId, i.qty + 1)}
                          disabled={i.qty >= i.stock}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-sm font-semibold font-mono">{rupiah(i.price * i.qty)}</p>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => setRemoveId(i.productId)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3 border-t p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-2xl font-bold font-mono">{rupiah(cartTotal)}</span>
            </div>
            <Button
              size="lg"
              className="w-full"
              disabled={items.length === 0}
              onClick={() => {
                setPaymentType("cash");
                setPayOpen(true);
              }}
            >
            Bayar Sekarang
            </Button>
          </div>
        </Card>
      </aside>

      {/* Remove item confirmation */}
      <AlertDialog open={!!removeId} onOpenChange={(o) => !o && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus item?</AlertDialogTitle>
            <AlertDialogDescription>
              Item ini akan dihapus dari pesanan saat ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeId) removeItem(removeId);
                setRemoveId(null);
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment modal */}
      <PaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        total={cartTotal}
        paymentType={paymentType}
        setPaymentType={setPaymentType}
        onSubmit={(payload) => {
          setPendingPayment(payload);
          setConfirmPayOpen(true);
        }}
      />

      {/* Final confirmation + processing */}
      <ConfirmPayment
        open={confirmPayOpen}
        onOpenChange={setConfirmPayOpen}
        onConfirm={async () => {
          const pending = pendingPaymentRef.current;
          if (!user || !shift || !pending) return;
          try {
            const tx = await txApi.createTransaction({
              items: items.map((i) => ({
                productId: i.productId,
                name: i.name,
                price: i.price,
                qty: i.qty,
              })),
              shiftId: shift.id,
              cashierId: user.id,
              ...pending,
            });
            setReceipt(tx);
            clearCart();
            setPayOpen(false);
            toast.success("Pembayaran berhasil");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Pembayaran gagal");
          } finally {
            setConfirmPayOpen(false);
            pendingPaymentRef.current = null;
          }
        }}
      />

      <ReceiptDialog tx={receipt} onClose={() => setReceipt(null)} />
    </div>
  );

  function setPendingPayment(p: PendingPayment | null) {
    pendingPaymentRef.current = p;
  }
}

type PendingPayment = {
  paymentType: "cash" | "debit";
  cashReceived?: number;
  cardNumber?: string;
};
const pendingPaymentRef: { current: PendingPayment | null } = { current: null };

function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  const out = product.stock <= 0;
  return (
    <button
      onClick={onAdd}
      disabled={out}
      className={
        "group relative flex h-full flex-col overflow-hidden rounded-lg border bg-card text-left shadow-sm transition-all " +
        (out
          ? "cursor-not-allowed opacity-50"
          : "hover:border-primary/40 hover:shadow-md active:scale-[0.98]")
      }
    >
      <div className="aspect-square bg-gradient-to-br from-muted to-muted/40 flex items-center justify-center">
        <span className="text-3xl font-semibold text-muted-foreground/40">
          {product.name.slice(0, 1)}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-sm font-medium leading-tight line-clamp-2">{product.name}</p>
        <p className="text-xs text-muted-foreground">{product.category}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-sm font-semibold font-mono">{rupiah(product.price)}</span>
          {out ? (
            <Badge variant="destructive" className="text-[10px]">Habis</Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px]">{product.stock} tersisa</Badge>
          )}
        </div>
      </div>
    </button>
  );
}

const cashSchema = z.object({
  cashReceived: z.coerce.number({ message: "Masukkan jumlah" }).min(0),
});
const debitSchema = z.object({
  cardNumber: z
    .string()
    .trim()
    .regex(/^\d{16}$/, "Harus 16 digit"),
});

function PaymentDialog({
  open,
  onOpenChange,
  total,
  paymentType,
  setPaymentType,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  total: number;
  paymentType: "cash" | "debit";
  setPaymentType: (p: "cash" | "debit") => void;
  onSubmit: (p: PendingPayment) => void;
}) {
  const cashForm = useForm<{ cashReceived: number }>({
    resolver: zodResolver(cashSchema) as any,
    defaultValues: { cashReceived: total },
    mode: "onChange",
  });
  const debitForm = useForm<{ cardNumber: string }>({
    resolver: zodResolver(debitSchema),
    defaultValues: { cardNumber: "" },
    mode: "onChange",
  });

  useEffect(() => {
    if (open) {
      cashForm.reset({ cashReceived: total });
      debitForm.reset({ cardNumber: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, total]);

  const cashReceived = cashForm.watch("cashReceived");
  const change = Math.max((Number(cashReceived) || 0) - total, 0);
  const cashValid = (Number(cashReceived) || 0) >= total;

  function handlePay() {
    if (paymentType === "cash") {
      if (!cashValid) {
        cashForm.setError("cashReceived", { message: "Harus setidaknya sebesar total" });
        return;
      }
      onSubmit({ paymentType: "cash", cashReceived: Number(cashReceived) });
    } else {
      debitForm.handleSubmit((v) =>
        onSubmit({ paymentType: "debit", cardNumber: v.cardNumber }),
      )();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pembayaran</DialogTitle>
          <DialogDescription>
            Total tagihan: <span className="font-mono font-semibold text-foreground">{rupiah(total)}</span>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={paymentType} onValueChange={(v) => setPaymentType(v as "cash" | "debit")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cash" className="gap-2"><Banknote className="h-4 w-4" />Tunai</TabsTrigger>
            <TabsTrigger value="debit" className="gap-2"><CreditCard className="h-4 w-4" />Debit</TabsTrigger>
          </TabsList>

          <TabsContent value="cash" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="cashReceived">Tunai diterima (Rp)</Label>
              <Input
                id="cashReceived"
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                {...cashForm.register("cashReceived")}
              />
              {cashForm.formState.errors.cashReceived && (
                <p className="text-xs text-destructive">{cashForm.formState.errors.cashReceived.message}</p>
              )}
            </div>
            <div className="rounded-md bg-muted p-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Kembalian</span>
              <span className="text-lg font-bold font-mono">{rupiah(change)}</span>
            </div>
          </TabsContent>

          <TabsContent value="debit" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="cardNumber">Nomor kartu debit</Label>
              <Input
                id="cardNumber"
                inputMode="numeric"
                maxLength={16}
                placeholder="•••• •••• •••• ••••"
                className="font-mono tracking-widest"
                {...debitForm.register("cardNumber")}
              />
              {debitForm.formState.errors.cardNumber && (
                <p className="text-xs text-destructive">{debitForm.formState.errors.cardNumber.message}</p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handlePay}>Konfirmasi Pembayaran</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmPayment({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Proses pembayaran?</AlertDialogTitle>
          <AlertDialogDescription>
            Ini akan mencatat transaksi dan mengosongkan keranjang.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={async (e) => {
              e.preventDefault();
              setBusy(true);
              await onConfirm();
              setBusy(false);
            }}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Konfirmasi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ReceiptDialog({ tx, onClose }: { tx: Transaction | null; onClose: () => void }) {
  return (
    <Dialog open={!!tx} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
            <Receipt className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Pembayaran diterima</DialogTitle>
          <DialogDescription className="text-center font-mono text-xs">{tx?.id}</DialogDescription>
        </DialogHeader>
        {tx && (
          <div className="space-y-3 text-sm">
            <div className="rounded-md border divide-y">
              {tx.items.map((i) => (
                <div key={i.productId} className="flex items-center justify-between px-3 py-2">
                  <span>
                    {i.name} <span className="text-muted-foreground">×{i.qty}</span>
                  </span>
                  <span className="font-mono">{rupiah(i.price * i.qty)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <Row label="Total" value={rupiah(tx.total)} strong />
              <Row label="Pembayaran" value={tx.paymentType === "cash" ? "Tunai" : `Debit •••• ${tx.cardLast4}`} />
              {tx.paymentType === "cash" && (
                <>
                  <Row label="Diterima" value={rupiah(tx.cashReceived ?? 0)} />
                  <Row label="Kembalian" value={rupiah(tx.change ?? 0)} />
                </>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button className="w-full" onClick={onClose}>Selesai</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={"font-mono " + (strong ? "font-bold text-base" : "")}>{value}</span>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default PosPage;
