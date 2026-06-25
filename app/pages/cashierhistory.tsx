import { useNavigate, useSearchParams } from "react-router";
import { useEffect, useState, useRef, useCallback, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Banknote, CalendarDays, CreditCard, Hash, Receipt, Search, ShoppingBag, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "~/components/ui/dialog";
import { axiosInstance } from "~/lib/axios";
import { useAuth } from "~/stores/auth";
import { cn } from "~/lib/utils";

type PaymentType = "cash" | "debit";

interface TransactionItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
}

interface Transaction {
  id: string;
  cashierId: string;
  shiftId: string;
  items: TransactionItem[];
  total: number;
  paymentType: PaymentType;
  cashReceived?: number;
  change?: number;
  cardLast4?: string;
  status: "completed";
  createdAt: string;
}

interface CashierTransactionItem {
  productId: string;
  quantity: number;
  priceAtTransaction: number | string;
  product?: {
    name?: string;
  };
}

interface CashierTransaction {
  id: string;
  invoiceNumber?: string;
  shiftId: string;
  totalAmount: number | string;
  paymentMethod: "CASH" | "DEBIT";
  cashTendered?: number | string | null;
  changeAmount?: number | string | null;
  debitCardNumber?: string | null;
  createdAt: string;
  shift?: {
    cashierId?: string;
  };
  transactionItems?: CashierTransactionItem[];
}

export const rupiah = (number: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(number);
};

const mapTransaction = (transaction: CashierTransaction): Transaction => {
  const paymentType: PaymentType = transaction.paymentMethod === "CASH" ? "cash" : "debit";

  return {
    id: transaction.invoiceNumber ?? transaction.id,
    cashierId: transaction.shift?.cashierId ?? "",
    shiftId: transaction.shiftId,
    items: (transaction.transactionItems ?? []).map((item) => ({
      productId: item.productId,
      name: item.product?.name ?? "Produk",
      price: Number(item.priceAtTransaction),
      qty: item.quantity,
    })),
    total: Number(transaction.totalAmount),
    paymentType,
    cashReceived: paymentType === "cash" ? Number(transaction.cashTendered ?? 0) : undefined,
    change: paymentType === "cash" ? Number(transaction.changeAmount ?? 0) : undefined,
    cardLast4: paymentType === "debit" ? transaction.debitCardNumber?.slice(-4) : undefined,
    status: "completed",
    createdAt: transaction.createdAt,
  };
};

export function meta() {
  return [{ title: "Transaksi Hari Ini — Aplikasi Kasir" }];
}

const PAGE_SIZE = 10;

const HistoryPage = () => {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const pageParam = searchParams.get("page");
  const currentPage = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;

  const [query, setQuery] = useState(q);
  const [openTx, setOpenTx] = useState<Transaction | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const today = new Date().toISOString().slice(0, 10);
  const readableToday = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const txQ = useQuery({
    queryKey: ["cashier-tx", user?.id, today, q, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", currentPage.toString());
      params.set("limit", PAGE_SIZE.toString());
      params.set("date", today);
      if (q) params.set("search", q);

      const response = await axiosInstance.get(`/transactions?${params.toString()}`);
      return response.data;
    },
    enabled: !!user,
  });

  const rawTransactions = txQ.data?.data ?? [];
  const transactions: Transaction[] = rawTransactions.map(mapTransaction);
  
  const totalItems = txQ.data?.meta?.total ?? 0;
  const totalPages = txQ.data?.meta?.totalPages ?? 1;
  const summary = txQ.data?.meta?.summary ?? { total: 0, items: 0, cash: 0, debit: 0 };

  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("page", newPage.toString());
      return params;
    });
  };

  const applyQuery = useCallback((next: string) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (next) params.set("q", next);
      else params.delete("q");
      params.set("page", "1"); 
      return params;
    }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set("page", totalPages.toString());
        return params;
      }, { replace: true });
    }
  }, [currentPage, totalPages, setSearchParams]);

  useEffect(() => {
    setQuery(q);
  }, [q]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query !== q) applyQuery(query);
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
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border bg-card/80 p-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <Badge variant="outline" className="mb-3 gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                Transaksi hari ini
              </Badge>
              <h1 className="text-2xl font-bold tracking-tight">Riwayat transaksi</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Semua penjualan yang diproses oleh {user?.name ?? "kasir"} pada {readableToday}.
              </p>
            </div>
            <Button className="gap-2" onClick={() => navigate("/cashierpos")}>
              <ShoppingBag className="h-4 w-4" />
              Ke POS
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {txQ.isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-2xl" />
            ))
          ) : (
            <>
              <SummaryCard icon={<Receipt className="h-5 w-5" />} label="Transaksi" value={String(totalItems)} />
              <SummaryCard icon={<TrendingUp className="h-5 w-5" />} label="Omzet" value={rupiah(summary.total)} strong />
              <SummaryCard icon={<ShoppingBag className="h-5 w-5" />} label="Item terjual" value={String(summary.items)} />
              <SummaryCard
                icon={<Banknote className="h-5 w-5" />}
                label="Tunai / Debit"
                value={`${summary.cash} / ${summary.debit}`}
              />
            </>
          )}
        </div>

        <Card className="overflow-hidden shadow-sm">
          <div className="flex flex-col gap-3 border-b bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari ID transaksi... (Ctrl+K)"
                className="h-11 pl-9 font-mono"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {txQ.isLoading ? "Memuat transaksi..." : `${totalItems} transaksi • halaman ${currentPage}/${totalPages}`}
              </p>
              {q && (
                <Button variant="ghost" onClick={() => applyQuery("")}>
                  Atur ulang
                </Button>
              )}
            </div>
          </div>
          <CardContent className="p-0">
            {txQ.isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : transactions.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Transaksi</TableHead>
                      <TableHead>Waktu</TableHead>
                      <TableHead className="text-right">Item</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Pembayaran</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow
                        key={tx.id}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() => setOpenTx(tx)}
                      >
                        <TableCell className="font-mono text-xs">{tx.id}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(tx.createdAt).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {tx.items.reduce((sum, item) => sum + item.qty, 0)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {rupiah(tx.total)}
                        </TableCell>
                        <TableCell>
                          <PaymentBadge type={tx.paymentType} />
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="border-0 bg-emerald-500/15 text-emerald-700">
                            Selesai
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {totalItems > 0 && (
                  <div className="flex items-center justify-between px-4 py-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Menampilkan <span className="font-medium text-foreground">{(currentPage - 1) * PAGE_SIZE + 1}</span> hingga <span className="font-medium text-foreground">{Math.min(currentPage * PAGE_SIZE, totalItems)}</span> dari <span className="font-medium text-foreground">{totalItems}</span> transaksi
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                      </Button>
                      <div className="text-sm font-medium px-2">
                        Hal {currentPage} / {totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                      >
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Receipt className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">{q ? "Pencarian tidak ditemukan" : "Belum ada transaksi"}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {q ? "Coba gunakan kata kunci atau ID lain." : "Penjualan yang selesai hari ini akan muncul di sini."}
                  </p>
                </div>
                {!q && (
                  <Button className="gap-2" onClick={() => navigate("/cashierpos")}>
                    <ShoppingBag className="h-4 w-4" />
                    Mulai transaksi
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <TransactionDialog tx={openTx} onClose={() => setOpenTx(null)} />
      </div>
    </div>
  );
};

const SummaryCard = ({ icon, label, value, strong,}: { icon: ReactNode; label: string; value: string; strong?: boolean; }) => {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-mono text-lg", strong && "font-bold text-foreground")}>{value}</p>
    </div>
  );
};

const PaymentBadge = ({ type }: { type: PaymentType }) => {
  const isCash = type === "cash";
  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1 border-0",
        isCash ? "bg-emerald-500/15 text-emerald-700" : "bg-blue-500/15 text-blue-700",
      )}
    >
      {isCash ? <Banknote className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
      {isCash ? "Tunai" : "Debit"}
    </Badge>
  );
};

const TransactionDialog = ({ tx, onClose }: { tx: Transaction | null; onClose: () => void }) => {
  const itemCount = tx?.items.reduce((sum, item) => sum + item.qty, 0) ?? 0;

  return (
    <Dialog open={!!tx} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Receipt className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Detail transaksi</DialogTitle>
          <DialogDescription className="text-center font-mono text-xs">{tx?.id}</DialogDescription>
        </DialogHeader>
        {tx && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <MiniStat icon={<Hash className="h-4 w-4" />} label="Item" value={`${itemCount} item`} />
              <MiniStat
                icon={tx.paymentType === "cash" ? <Banknote className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                label="Bayar"
                value={tx.paymentType === "cash" ? "Tunai" : "Debit"}
              />
            </div>

            <div className="rounded-xl border bg-muted/20">
              <div className="border-b px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Rincian item
              </div>
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
              <RowDetail label="Total" value={rupiah(tx.total)} strong />
              <RowDetail
                label="Pembayaran"
                value={tx.paymentType === "cash" ? "Tunai" : `Debit •••• ${tx.cardLast4}`}
              />
              {tx.paymentType === "cash" && (
                <>
                  <RowDetail label="Diterima" value={rupiah(tx.cashReceived ?? 0)} />
                  <RowDetail label="Kembalian" value={rupiah(tx.change ?? 0)} />
                </>
              )}
              <RowDetail label="Waktu" value={new Date(tx.createdAt).toLocaleString("id-ID")} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const MiniStat = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => {
  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="mb-2 text-muted-foreground">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
};

const RowDetail = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-right font-mono", strong && "text-lg font-bold text-primary")}>{value}</span>
    </div>
  );
};

export default HistoryPage;