import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { Loader2, ChevronLeft, ChevronRight, ArrowLeft, ReceiptText } from "lucide-react";
import { axiosInstance } from "~/lib/axios"; 
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { DateRangeControls, defaultRange } from "~/components/admin/date-range";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

export const rupiah = (number: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(number);
};

interface DailyReport {
  date: string;
  totalRevenue: number;
  totalTransactions: number;
}

interface SalesSummary {
  grandTotalRevenue: number;
  totalTransactions: number;
  paymentBreakdown: { method: string; totalAmount: number }[];
  dailyReports: DailyReport[];
}

interface TransactionItem {
  id: string;
  quantity: number;
  priceAtTransaction: number | string;
  subtotal: number | string;
  product: { name: string };
}

interface TransactionDetail {
  id: string;
  invoiceNumber: string;
  totalAmount: number | string;
  paymentMethod: string;
  cashTendered?: number | string;
  changeAmount?: number | string;
  createdAt: string;
  shift: {
    cashier: { name: string };
  };
  transactionItems: TransactionItem[];
}

export function meta() {
  return [{ title: "Laporan Penjualan — Aplikasi Kasir" }];
}

const ITEMS_PER_PAGE_CLIENT = 5; 

const SalesReport = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  const [range, setRange] = useState<{ from: string; to: string }>({
    from: startDateParam || defaultRange().from,
    to: endDateParam || defaultRange().to,
  });

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedTx, setSelectedTx] = useState<TransactionDetail | null>(null);
  const [itemPage, setItemPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedTx(null);
    setItemPage(1);
  }, [selectedDate]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (range.from) params.set("startDate", range.from);
    else params.delete("startDate");

    if (range.to) params.set("endDate", range.to);
    else params.delete("endDate");

    setSearchParams(params, { replace: true });
  }, [range.from, range.to, setSearchParams]);

  const { data: salesData, isLoading: isLoadingSales } = useQuery({
    queryKey: ["admin", "report", "sales", range.from, range.to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (range.from) params.append("startDate", range.from);
      if (range.to) params.append("endDate", range.to);

      const response = await axiosInstance.get(`/reports/sales?${params.toString()}`);
      return response.data.data as SalesSummary;
    },
  });

  const { data: txResponse, isLoading: isLoadingTx } = useQuery({
    queryKey: ["admin", "transactions", "date", selectedDate, currentPage],
    queryFn: async () => {
      const response = await axiosInstance.get(
        `/transactions?date=${selectedDate}&page=${currentPage}&limit=10`
      );
      return response.data; 
    },
    enabled: !!selectedDate,
  });

  const max = Math.max(1, ...(salesData?.dailyReports.map((r) => r.totalRevenue) ?? [0]));
  const transactions = (txResponse?.data as TransactionDetail[]) || [];
  const meta = txResponse?.meta || { totalPages: 1, total: 0 };

  const txItems = selectedTx?.transactionItems || [];
  const totalItemPages = Math.max(1, Math.ceil(txItems.length / ITEMS_PER_PAGE_CLIENT));
  
  const paginatedItems = txItems.slice(
    (itemPage - 1) * ITEMS_PER_PAGE_CLIENT,
    itemPage * ITEMS_PER_PAGE_CLIENT
  );

  return (
    <div className="px-6 py-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Laporan Penjualan</h1>
        <p className="text-sm text-muted-foreground">Total harian dalam rentang yang dipilih</p>
      </div>

      <DateRangeControls from={range.from} to={range.to} onChange={setRange} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Penjualan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold font-mono">
              {rupiah(salesData?.grandTotalRevenue ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold font-mono">
              {salesData?.totalTransactions ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead className="text-right">Transaksi</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-1/3">Volume</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingSales ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Memuat data dari database…
                </TableCell>
              </TableRow>
            ) : !salesData || salesData.dailyReports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  Tidak ada penjualan dalam rentang tanggal ini.
                </TableCell>
              </TableRow>
            ) : (
              salesData.dailyReports.map((r) => (
                <TableRow key={r.date}>
                  <TableCell>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto font-mono text-sm font-semibold"
                      onClick={() => setSelectedDate(r.date)}
                    >
                      {new Date(r.date).toLocaleDateString("id-ID", {
                        day: "2-digit", month: "short", year: "numeric"
                      })}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right font-mono">{r.totalTransactions}</TableCell>
                  <TableCell className="text-right font-mono">{rupiah(r.totalRevenue)}</TableCell>
                  <TableCell>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${(r.totalRevenue / max) * 100}%` }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {salesData && salesData.dailyReports.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell className="font-medium">Total Keseluruhan</TableCell>
                <TableCell className="text-right font-mono">{salesData.totalTransactions}</TableCell>
                <TableCell className="text-right font-mono">{rupiah(salesData.grandTotalRevenue)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </Card>

      <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto flex flex-col">
          
          {selectedTx ? (
            <>
              <DialogHeader className="shrink-0 border-b pb-4">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setSelectedTx(null)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <DialogTitle className="flex items-center gap-2">
                      <ReceiptText className="h-5 w-5" /> Detail Struk: {selectedTx.invoiceNumber}
                    </DialogTitle>
                    <DialogDescription>
                      Dilayani oleh <span className="font-semibold text-foreground">{selectedTx.shift.cashier.name}</span> pada {new Date(selectedTx.createdAt).toLocaleString("id-ID")}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 py-4 space-y-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produk</TableHead>
                      <TableHead className="text-right">Harga</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.product.name}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">{rupiah(Number(item.priceAtTransaction))}</TableCell>
                        <TableCell className="text-right font-mono">{item.quantity}x</TableCell>
                        <TableCell className="text-right font-mono font-medium">{rupiah(Number(item.subtotal))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {totalItemPages > 1 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Hal. {itemPage} dari {totalItemPages} ({txItems.length} barang)
                    </span>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => setItemPage(p => Math.max(1, p - 1))} disabled={itemPage === 1}>
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setItemPage(p => Math.min(totalItemPages, p + 1))} disabled={itemPage === totalItemPages}>
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="bg-muted/30 p-4 rounded-lg space-y-2 text-sm border">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Metode Pembayaran</span>
                    <Badge variant={selectedTx.paymentMethod === "CASH" ? "default" : "secondary"}>{selectedTx.paymentMethod}</Badge>
                  </div>
                  <div className="flex justify-between font-semibold text-base pt-2 border-t">
                    <span>Total Keseluruhan</span>
                    <span className="font-mono">{rupiah(Number(selectedTx.totalAmount))}</span>
                  </div>
                  {selectedTx.paymentMethod === "CASH" && (
                    <>
                      <div className="flex justify-between text-muted-foreground pt-1">
                        <span>Tunai Diterima</span>
                        <span className="font-mono">{rupiah(Number(selectedTx.cashTendered || 0))}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Kembalian</span>
                        <span className="font-mono">{rupiah(Number(selectedTx.changeAmount || 0))}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader className="shrink-0">
                <DialogTitle>Daftar Transaksi</DialogTitle>
                <DialogDescription>
                  Transaksi pada tanggal {selectedDate ? new Date(selectedDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }) : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto py-4">
                {isLoadingTx ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    Tidak ada data transaksi ditemukan.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Waktu</TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Kasir</TableHead>
                        <TableHead>Metode</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx: TransactionDetail) => (
                        <TableRow key={tx.id}>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(tx.createdAt).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="link" 
                              className="p-0 h-auto font-mono font-medium text-primary"
                              onClick={() => {
                                setSelectedTx(tx);
                                setItemPage(1); 
                              }}
                            >
                              {tx.invoiceNumber}
                            </Button>
                          </TableCell>
                          <TableCell>{tx.shift?.cashier?.name || "Unknown"}</TableCell>
                          <TableCell>
                            <Badge variant={tx.paymentMethod === "CASH" ? "default" : "secondary"}>
                              {tx.paymentMethod}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {rupiah(Number(tx.totalAmount))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              {!isLoadingTx && meta.totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4 shrink-0">
                  <div className="text-sm text-muted-foreground">
                    Hal. {currentPage} dari {meta.totalPages} (Total {meta.total} transaksi)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                      <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, meta.totalPages))} disabled={currentPage === meta.totalPages}>
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesReport;