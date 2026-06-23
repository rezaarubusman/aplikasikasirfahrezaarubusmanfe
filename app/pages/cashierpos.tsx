import { useNavigate, useSearchParams } from "react-router";
import { useEffect, useMemo, useState, useRef, useCallback, type ReactNode } from "react";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Banknote, ChevronLeft, ChevronRight, Clock, CreditCard, Loader2, Minus, PackageSearch, Plus, Receipt, Search, ShoppingCart, Sparkles, Trash2, WalletCards } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "~/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { axiosInstance } from "~/lib/axios"
import { useCart } from "~/stores/cart";
import { useAuth } from "~/stores/auth";
import { useShift } from "~/stores/shift";
import { cn } from "~/lib/utils";

const PRODUCT_PAGE_SIZE = 8;

export interface Shift {
  id: string;
  cashierId: string;
  openingCash: number;
  closingCash?: number;
  startTime: string;
  endTime?: string;
  status: "active" | "closed";
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  image: string | null;
  category: string;
}

export interface Transaction {
  id: string;
  total: number;
  paymentType: "cash" | "debit";
  cashReceived?: number;
  change?: number;
  cardLast4?: string;
  items: {
    productId: string;
    name: string;
    price: number;
    qty: number;
  }[];
}

type PendingPayment = {
  paymentType: "cash" | "debit";
  cashReceived?: number;
  cardNumber?: string;
};

export function meta() {
  return [{ title: "POS — Aplikasi Kasir" }];
}

export const rupiah = (number: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(number);
};

const PosPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const user = useAuth((s) => s.user);
  const shift = useShift((s) => s.active);
  const qc = useQueryClient();

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
  const [category, setCategory] = useState("Semua");
  const [productPage, setProductPage] = useState(1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pendingPaymentRef = useRef<PendingPayment | null>(null);

  const [payOpen, setPayOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<"cash" | "debit">("cash");
  const [confirmPayOpen, setConfirmPayOpen] = useState(false);
  const [receipt, setReceipt] = useState<Transaction | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const productsQ = useQuery({
    queryKey: ["products", q],
    queryFn: async () => {
      const response = await axiosInstance.get("/products");
      const rawData = response.data?.data || response.data;
      
      let mappedProducts: Product[] = rawData.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        stock: p.stock,
        image: p.image,
        category: p.category?.name || "Lainnya",
      }));

      if (q) {
        const search = q.toLowerCase();
        mappedProducts = mappedProducts.filter(p => p.name.toLowerCase().includes(search));
      }

      return mappedProducts;
    },
  });

  const products = productsQ.data ?? [];

  const categories = useMemo(() => {
    return ["Semua", ...Array.from(new Set(products.map((product) => product.category))).sort()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return category === "Semua"
      ? products
      : products.filter((product) => product.category === category);
  }, [category, products]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCT_PAGE_SIZE));

  const paginatedProducts = useMemo(() => {
    const start = (productPage - 1) * PRODUCT_PAGE_SIZE;
    return filteredProducts.slice(start, start + PRODUCT_PAGE_SIZE);
  }, [filteredProducts, productPage]);

  const cartItemCount = items.reduce((sum, item) => sum + item.qty, 0);

  const shiftStartedAt = shift?.startTime
    ? new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(shift.startTime)) 
    : "-";

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
    setProductPage(1);
  }, [q, category]);

  useEffect(() => {
    if (productPage > totalPages) {
      setProductPage(totalPages);
    }
  }, [productPage, totalPages]);

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

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-primary/5 via-background to-muted/40 p-4 md:p-6">
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <section className="space-y-5">
          <div className="rounded-2xl border bg-card/80 p-5 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <Badge variant="outline" className="mb-3 gap-1"> 
                  <Sparkles className="h-3.5 w-3.5" /> Cashier workbench
                </Badge>
                <h1 className="text-2xl font-bold tracking-tight">POS Penjualan</h1>
                <p className="mt-1 text-sm text-muted-foreground">Tambahkan produk ke pesanan, lalu proses pembayaran dengan cepat.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <HeaderStat icon={<Clock className="h-4 w-4" />} label="Shift mulai" value={shiftStartedAt} />
                <HeaderStat icon={<ShoppingCart className="h-4 w-4" />} label="Item cart" value={String(cartItemCount)} />
                <HeaderStat icon={<WalletCards className="h-4 w-4" />} label="Kasir" value={user?.name ?? "-"} wide />
              </div>
            </div>
          </div>
          <Card className="overflow-hidden shadow-sm">
            <div className="space-y-4 border-b bg-muted/20 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input ref={searchInputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari produk... (Ctrl+K)" className="h-11 pl-9"/>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    {productsQ.isLoading ? "Memuat produk..." : `${filteredProducts.length} produk • halaman ${productPage}/${totalPages}`}
                  </p>
                  {q && (
                    <Button variant="ghost" onClick={() => applyQuery("")}>
                      Bersih
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {categories.map((item) => (
                  <Button key={item} type="button" variant={category === item ? "default" : "outline"} size="sm" onClick={() => setCategory(item)} className="shrink-0" > {item} </Button>
                ))}
              </div>
            </div>
            <CardContent className="p-4">
              {productsQ.isLoading ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: PRODUCT_PAGE_SIZE }).map((_, index) => (
                    <Skeleton key={index} className="h-52 rounded-2xl" />
                  ))}
                </div>
              ) : paginatedProducts.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {paginatedProducts.map((product) => (
                      <ProductCard key={product.id} product={product} onAdd={() => addToCart(product)} />
                    ))}
                  </div>
                  <PaginationControls page={productPage} totalPages={totalPages} totalItems={filteredProducts.length} pageSize={PRODUCT_PAGE_SIZE} onPageChange={setProductPage} />
                </>
              ) : (
                <EmptyState icon={<PackageSearch className="h-6 w-6" />} title="Produk tidak ditemukan" description={q ? `Tidak ada hasil untuk "${q}".` : "Produk akan muncul di sini."} />
              )}
            </CardContent>
          </Card>
        </section>
        <aside className="xl:sticky xl:top-[4.5rem] xl:self-start">
          <Card className="flex max-h-[calc(100vh-6rem)] overflow-hidden rounded-2xl shadow-sm xl:min-h-[calc(100vh-6rem)]">
            <div className="flex w-full flex-col">
              <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <ShoppingCart className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="font-semibold">Pesanan Saat Ini</h2>
                    <p className="text-xs text-muted-foreground">{cartItemCount} item dalam keranjang</p>
                  </div>
                </div>
                {items.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearCart}>
                    Bersih
                  </Button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="flex h-64 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
                    <ShoppingCart className="h-10 w-10 opacity-40" />
                    <p className="font-medium text-foreground">Keranjang kosong</p>
                    <p className="text-xs">Ketuk produk untuk menambah pesanan.</p>
                  </div>
                ) : (
                  <ul className="divide-y">
                    {items.map((item) => (
                      <li key={item.productId} className="flex items-start gap-3 p-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted font-semibold text-muted-foreground">
                          {item.name.slice(0, 1)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium leading-tight">{item.name}</p>
                          <p className="font-mono text-xs text-muted-foreground">{rupiah(item.price)}</p>
                          <div className="mt-2 flex items-center gap-1">
                            <Button size="icon-sm" variant="outline" onClick={() => setQty(item.productId, item.qty - 1)}> <Minus className="h-3 w-3" /> </Button>
                            <span className="w-8 text-center font-mono text-sm">{item.qty}</span>
                            <Button size="icon-sm" variant="outline" onClick={() => setQty(item.productId, item.qty + 1)} disabled={item.qty >= item.stock}> <Plus className="h-3 w-3" /> </Button>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <p className="font-mono text-sm font-semibold">{rupiah(item.price * item.qty)}</p>
                          <Button size="icon-sm" variant="ghost" className="text-destructive" onClick={() => setRemoveId(item.productId)}><Trash2 className="h-3.5 w-3.5" /> </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="space-y-3 border-t bg-background p-4">
                <div className="rounded-xl bg-muted/40 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-mono">{rupiah(cartTotal)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-medium">Total</span>
                    <span className="font-mono text-2xl font-bold">{rupiah(cartTotal)}</span>
                  </div>
                </div>
                <Button size="lg" className="h-11 w-full gap-2" disabled={items.length === 0} onClick={() => { setPaymentType("cash"); setPayOpen(true); }}><Receipt className="h-4 w-4"/> Bayar Sekarang </Button>
              </div>
            </div>
          </Card>
        </aside>
      </div>
      <AlertDialog open={!!removeId} onOpenChange={(open) => !open && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus item?</AlertDialogTitle>
            <AlertDialogDescription>Item ini akan dihapus dari pesanan saat ini.</AlertDialogDescription>
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
      <PaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        total={cartTotal}
        paymentType={paymentType}
        setPaymentType={setPaymentType}
        onSubmit={(payload) => {
          pendingPaymentRef.current = payload;
          setConfirmPayOpen(true);
        }}
      />
      <ConfirmPayment
        open={confirmPayOpen}
        onOpenChange={setConfirmPayOpen}
        onConfirm={async () => {
          const pending = pendingPaymentRef.current;
          if (!user || !shift || !pending) return;
          
          try {
            const body = {
              items: items.map((item) => ({
                productId: item.productId,
                quantity: item.qty, 
              })),
              paymentMethod: pending.paymentType.toUpperCase(),
              cashTendered: pending.paymentType === "cash" ? pending.cashReceived : undefined,
              debitCardNumber: pending.paymentType === "debit" ? pending.cardNumber : undefined,
            };

            const response = await axiosInstance.post("/transactions", body);
            const txData = response.data?.data || response.data; 

            const receipt: Transaction = {
              id: txData.invoiceNumber,
              total: Number(txData.totalAmount),
              paymentType: txData.paymentMethod === "CASH" ? "cash" : "debit",
              cashReceived: txData.cashTendered ? Number(txData.cashTendered) : undefined,
              change: txData.changeAmount ? Number(txData.changeAmount) : undefined,
              cardLast4: txData.debitCardNumber ? txData.debitCardNumber.slice(-4) : undefined,
              items: txData.transactionItems.map((ti: any) => ({
                productId: ti.productId,
                name: ti.product?.name || "Produk",
                price: Number(ti.priceAtTransaction),
                qty: ti.quantity,
              })),
            };

            setReceipt(receipt);
            clearCart();
            setPayOpen(false);
            qc.invalidateQueries({ queryKey: ["products"] });
            toast.success("Pembayaran berhasil");
          } catch (e: any) {
            toast.error(e.response?.data?.message || e.message || "Pembayaran gagal");
          } finally {
            setConfirmPayOpen(false);
            pendingPaymentRef.current = null;
          }
        }}
      />
      <ReceiptDialog tx={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
};

const HeaderStat = ({ icon, label, value, wide, }: { icon: ReactNode; label: string; value: string; wide?: boolean; }) => {
  return (
    <div className={cn("rounded-xl border bg-background/80 px-3 py-2", wide && "col-span-2 sm:col-span-1")}>
      <div className="mb-1 text-primary">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium">{value}</p>
    </div>
  );
};

const ProductCard = ({ product, onAdd }: { product: Product; onAdd: () => void }) => {
  const out = product.stock <= 0;
  const lowStock = product.stock > 0 && product.stock <= 5;
  return (
    <button
      onClick={onAdd}
      disabled={out}
      className={cn( "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition-all", out ? "cursor-not-allowed opacity-50" : "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:scale-[0.98]")}>
      <div className="relative flex aspect-square items-center justify-center bg-gradient-to-br from-primary/10 via-muted/70 to-muted">
        {product.image ?(
          <img
            src={product.image}
            alt={product.name}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <span className="text-4xl font-semibold text-primary/30">{product.name.slice(0, 1)}</span>
          )}
        <Badge variant="secondary" className="absolute left-3 top-3 bg-background/85">
          {product.category}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="line-clamp-2 text-sm font-semibold leading-tight">{product.name}</p>
        <div className="mt-auto space-y-3 pt-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-sm font-bold">{rupiah(product.price)}</span>
            <StockBadge stock={product.stock} lowStock={lowStock} out={out} />
          </div>
          <div className="flex items-center justify-center rounded-lg bg-primary/10 px-2 py-1.5 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Tambah ke pesanan
          </div>
        </div>
      </div>
    </button>
  );
};

const StockBadge = ({ stock, lowStock, out }: { stock: number; lowStock: boolean; out: boolean }) => {
  if (out) {
    return <Badge variant="destructive">Habis</Badge>;
  }
  return (
    <Badge variant="secondary" className={cn( "border-0", lowStock ? "bg-amber-500/15 text-amber-700" : "bg-emerald-500/15 text-emerald-700")}> {stock} tersisa </Badge>
  );
};

const PaginationControls = ({ page, totalPages, totalItems, pageSize, onPageChange}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) => {
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  return (
    <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Menampilkan {start}-{end} dari {totalItems} produk
      </p>
      <div className="flex items-center gap-2">
        <Button type="button"variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1}><ChevronLeft className="h-4 w-4" /> Sebelumnya </Button>
        <Badge variant="outline"> {page} / {totalPages} </Badge>
        <Button type="button" variant="outline" size="sm" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages}> Berikutnya <ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
};

const cashPaymentSchema = z.object({
  cashReceived: z
    .coerce
    .number({ message: "Masukkan jumlah uang yang valid" })
    .min(0, "Uang diterima tidak boleh bernilai negatif"),
});

const debitPaymentSchema = z.object({
  cardNumber: z
    .string()
    .trim()
    .regex(/^\d{16}$/, "Nomor kartu debit harus terdiri dari 16 digit angka"),
});
const PaymentDialog = ({ open, onOpenChange, total, paymentType, setPaymentType, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; total: number; paymentType: "cash" | "debit"; setPaymentType: (paymentType: "cash" | "debit") => void; onSubmit: (payment: PendingPayment) => void; }) => {
  const cashForm = useForm<{ cashReceived: number }>({
    resolver: zodResolver(cashPaymentSchema) as any,
    defaultValues: { cashReceived: total },
    mode: "onChange",
  });
  const debitForm = useForm<{ cardNumber: string }>({
    resolver: zodResolver(debitPaymentSchema),
    defaultValues: { cardNumber: "" },
    mode: "onChange",
  });

  useEffect(() => {
    if (open) {
      cashForm.reset({ cashReceived: total });
      debitForm.reset({ cardNumber: "" });
    }
  }, [open, total]);

  const cashReceived = cashForm.watch("cashReceived");
  const change = Math.max((Number(cashReceived) || 0) - total, 0);
  const cashValid = (Number(cashReceived) || 0) >= total;
  const quickCash = [total, roundUp(total, 50000), roundUp(total, 100000)].filter(
    (value, index, values) => value > 0 && values.indexOf(value) === index,
  );

  const handlePay = () => {
    if (paymentType === "cash") {
      if (!cashValid) {
        cashForm.setError("cashReceived", { message: "Harus setidaknya sebesar total" });
        return;
      }
      onSubmit({ paymentType: "cash", cashReceived: Number(cashReceived) });
    } else {
      debitForm.handleSubmit((values) =>
        onSubmit({ paymentType: "debit", cardNumber: values.cardNumber }),
      )();
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pembayaran</DialogTitle>
          <DialogDescription>Konfirmasi metode pembayaran untuk pesanan saat ini.</DialogDescription>
        </DialogHeader>
        <div className="rounded-2xl border bg-primary/10 p-4 text-primary">
          <p className="text-sm font-medium">Total tagihan</p>
          <p className="mt-1 font-mono text-3xl font-bold">{rupiah(total)}</p>
        </div>
        <Tabs value={paymentType} onValueChange={(value) => setPaymentType(value as "cash" | "debit")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cash" className="gap-2">
              <Banknote className="h-4 w-4" />
              Tunai
            </TabsTrigger>
            <TabsTrigger value="debit" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Debit
            </TabsTrigger>
          </TabsList>
          <TabsContent value="cash" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="cashReceived">Tunai diterima (Rp)</Label>
              <Input
                id="cashReceived"
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                className="h-11 font-mono"
                {...cashForm.register("cashReceived")}
              />
              {cashForm.formState.errors.cashReceived && (
                <p className="text-xs text-destructive">{cashForm.formState.errors.cashReceived.message}</p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {quickCash.map((value) => (
                <Button key={value} type="button" variant="outline" onClick={() => cashForm.setValue("cashReceived", value, { shouldDirty: true, shouldValidate: true })}>{value === total ? "Uang pas" : rupiah(value).replace("Rp ", "")}</Button>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-xl bg-muted p-3">
              <span className="text-sm text-muted-foreground">Kembalian</span>
              <span className="font-mono text-xl font-bold">{rupiah(change)}</span>
            </div>
          </TabsContent>
          <TabsContent value="debit" className="space-y-3 pt-4">
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Nomor kartu debit</Label>
              <Input
                id="cardNumber"
                inputMode="numeric"
                maxLength={16}
                placeholder="•••• •••• •••• ••••"
                className="h-11 font-mono tracking-widest"
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
};
const ConfirmPayment = ({ open, onOpenChange, onConfirm}: { open: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => Promise<void>; }) => {
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
          <AlertDialogAction disabled={busy} onClick={ async (event) => { event.preventDefault(); setBusy(true); await onConfirm(); setBusy(false); }}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Konfirmasi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const ReceiptDialog = ({ tx, onClose }: { tx: Transaction | null; onClose: () => void }) => {
  return (
    <Dialog open={!!tx} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700">
            <Receipt className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Pembayaran diterima</DialogTitle>
          <DialogDescription className="text-center font-mono text-xs">{tx?.id}</DialogDescription>
        </DialogHeader>
        {tx && (
          <div className="space-y-4 text-sm">
            <div className="rounded-2xl border bg-muted/20">
              <div className="divide-y">
                {tx.items.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span>
                      {item.name} <span className="text-muted-foreground">×{item.qty}</span>
                    </span>
                    <span className="font-mono">{rupiah(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>
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
          <Button className="w-full" onClick={onClose}> Transaksi Baru </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Row = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-right font-mono", strong && "text-lg font-bold text-primary")}>{value}</span>
    </div>
  );
};

const EmptyState = ({ icon, title, description }: { icon: ReactNode; title: string; description: string; }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
};

const roundUp = (value: number, step: number) => {
  if (value <= 0) return step;
  return Math.ceil(value / step) * step;
}

export default PosPage;