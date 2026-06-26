import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { Loader2, AlertCircle, CheckCircle2, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { axiosInstance } from "~/lib/axios"; 
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { DateRangeControls, defaultRange } from "~/components/admin/date-range";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";

export const rupiah = (number: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(number);
};

interface ShiftReport {
  shiftId: string;
  cashierName: string;
  startTime: string;
  endTime: string | null;
  initialCash: number;
  finalCash: number;
  totalCashSales: number;
  totalDebitSales: number;
  totalTransactions: number;
  expectedFinalCash: number;
  discrepancy: number;
  isMatch: boolean;
}

interface TransactionItem {
  id: string;
  quantity: number;
  subtotal: number | string;
  product: { name: string };
}

interface TransactionDetail {
  id: string;
  invoiceNumber: string;
  totalAmount: number | string;
  paymentMethod: string;
  createdAt: string;
  transactionItems: TransactionItem[];
}

export function meta() {
  return [{ title: "Laporan Shift & Kasir — Aplikasi Kasir" }];
}

const PAGE_SIZE = 10;

const CashierReport = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const cashierIdParam = searchParams.get("cashierId");
  const pageParam = searchParams.get("page");
  
  const currentPage = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
  
  const [range, setRange] = useState<{ from: string; to: string }>({
    from: startDateParam || defaultRange().from,
    to: endDateParam || defaultRange().to,
  });

  const [selectedCashier, setSelectedCashier] = useState<string>(cashierIdParam || "all");
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);

  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("page", newPage.toString());
      return params;
    });
  };

  useEffect(() => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (range.from) params.set("startDate", range.from);
      else params.delete("startDate");
      
      if (range.to) params.set("endDate", range.to);
      else params.delete("endDate");

      if (selectedCashier && selectedCashier !== "all") params.set("cashierId", selectedCashier);
      else params.delete("cashierId");
      
      return params;
    }, { replace: true });
  }, [range.from, range.to, selectedCashier, setSearchParams]);

  const { data: cashiersList, isLoading: isLoadingCashiers } = useQuery({
    queryKey: ["admin", "users-cashiers"],
    queryFn: async () => {
      const response = await axiosInstance.get("/users");
      return response.data.data.filter((u: any) => u.role === "CASHIER");
    },
  });

  const { data: shiftData, isLoading: isLoadingShifts } = useQuery({
    queryKey: ["admin", "report", "shifts", range.from, range.to, selectedCashier],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (range.from) params.append("startDate", range.from);
      if (range.to) params.append("endDate", range.to);
      if (selectedCashier !== "all") params.append("cashierId", selectedCashier);
      
      const response = await axiosInstance.get(`/reports/shift-discrepancies?${params.toString()}`);
      return response.data.data.report as ShiftReport[];
    },
  });

  const { data: transactionData, isLoading: isLoadingTransactions } = useQuery<TransactionDetail[]>({
    queryKey: ["admin", "transactions", selectedShiftId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/transactions?shiftId=${selectedShiftId}`);
      return (response.data.data || response.data) as TransactionDetail[]; 
    },
    enabled: !!selectedShiftId, 
  });

  const shiftList = shiftData || [];
  const totalItems = shiftList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  
  const paginatedShifts = shiftList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      handlePageChange(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="px-6 py-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Laporan Shift & Discrepancy</h1>
        <p className="text-sm text-muted-foreground">
          Pantau uang awal, akhir, metode pembayaran, dan ketidaksesuaian data tiap shift kasir.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-end bg-card p-4 rounded-xl border shadow-sm">
        <DateRangeControls 
          from={range.from} 
          to={range.to} 
          onChange={(newRange) => {
            setRange(newRange);
            handlePageChange(1); // Reset ke hal 1 saat filter diubah
          }} 
        />
        
        <div className="space-y-1.5 min-w-[200px]">
          <label className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Filter Kasir
          </label>
          <Select 
            value={selectedCashier} 
            onValueChange={(val) => {
              setSelectedCashier(val);
              handlePageChange(1); // Reset ke hal 1 saat filter diubah
            }} 
            disabled={isLoadingCashiers}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih Kasir" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kasir</SelectItem>
              {cashiersList?.map((cashier: any) => (
                <SelectItem key={cashier.id} value={cashier.id}>
                  {cashier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="overflow-x-auto">
        <Table className="min-w-max">
          <TableHeader>
            <TableRow>
              <TableHead>Waktu Shift</TableHead>
              <TableHead>Kasir</TableHead>
              <TableHead className="text-center">Total Tx</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Penjualan Cash</TableHead>
              <TableHead className="text-right">Uang Awal</TableHead>
              <TableHead className="text-right bg-muted/50">Akhir (Sistem)</TableHead>
              <TableHead className="text-right font-semibold">Akhir (Aktual)</TableHead>
              <TableHead className="text-right">Selisih</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingShifts ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Memuat data dari database…
                </TableCell>
              </TableRow>
            ) : totalItems === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-10 text-muted-foreground">
                  Belum ada data shift pada filter saat ini.
                </TableCell>
              </TableRow>
            ) : (
              paginatedShifts.map((r) => (
                <TableRow key={r.shiftId}>
                  <TableCell className="text-sm">
                    <div className="font-medium">
                      {new Date(r.startTime).toLocaleDateString("id-ID", { day: '2-digit', month: 'short' })}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {new Date(r.startTime).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })} - 
                      {r.endTime ? new Date(r.endTime).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }) : " Berjalan"}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{r.cashierName}</TableCell>
                  <TableCell className="text-center font-mono">{r.totalTransactions}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{rupiah(r.totalDebitSales)}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{rupiah(r.totalCashSales)}</TableCell>
                  <TableCell className="text-right font-mono">{rupiah(r.initialCash)}</TableCell>
                  <TableCell className="text-right font-mono bg-muted/50">{rupiah(r.expectedFinalCash)}</TableCell>
                  <TableCell className="text-right font-mono font-medium">{rupiah(r.finalCash)}</TableCell>
                  <TableCell className={`text-right font-mono font-bold ${r.discrepancy < 0 ? 'text-destructive' : r.discrepancy > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {r.discrepancy > 0 ? '+' : ''}{rupiah(r.discrepancy)}
                  </TableCell>
                  <TableCell className="text-center">
                    {r.isMatch ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Sesuai
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20">
                        <AlertCircle className="h-3 w-3 mr-1" /> Selisih
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedShiftId(r.shiftId)}
                      title="Lihat Detail Transaksi"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        {!isLoadingShifts && totalItems > 0 && (
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Menampilkan <span className="font-medium text-foreground">{(currentPage - 1) * PAGE_SIZE + 1}</span> hingga <span className="font-medium text-foreground">{Math.min(currentPage * PAGE_SIZE, totalItems)}</span> dari <span className="font-medium text-foreground">{totalItems}</span> laporan
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
      </Card>

      <Dialog open={!!selectedShiftId} onOpenChange={(open) => !open && setSelectedShiftId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Transaksi Shift</DialogTitle>
            <DialogDescription>
              Rincian seluruh struk transaksi yang terjadi pada shift ini.
            </DialogDescription>
          </DialogHeader>

          {isLoadingTransactions ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !transactionData || transactionData.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Tidak ada transaksi pada shift ini.
            </div>
          ) : (
            <div className="space-y-4">
              {transactionData.map((tx: TransactionDetail) => (
                <Card key={tx.id} className="p-4 bg-muted/30">
                  <div className="flex justify-between items-start mb-3 border-b pb-2">
                    <div>
                      <div className="font-semibold">{tx.invoiceNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleString("id-ID")}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={tx.paymentMethod === "CASH" ? "default" : "secondary"}>
                        {tx.paymentMethod}
                      </Badge>
                      <div className="font-bold font-mono mt-1">{rupiah(Number(tx.totalAmount))}</div>
                    </div>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    {tx.transactionItems.map((item: TransactionItem) => (
                      <div key={item.id} className="flex justify-between text-muted-foreground">
                        <span>{item.quantity}x {item.product.name}</span>
                        <span className="font-mono">{rupiah(Number(item.subtotal))}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CashierReport;