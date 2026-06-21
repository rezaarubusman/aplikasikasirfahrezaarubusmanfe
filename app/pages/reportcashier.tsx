import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { axiosInstance } from "~/lib/axios"; 
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { DateRangeControls, defaultRange } from "~/components/admin/date-range";

const rupiah = (number: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

export function meta() {
  return [{ title: "Laporan Shift & Kasir — Aplikasi Kasir" }];
}

const CashierReport = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  
  const [range, setRange] = useState<{ from: string; to: string }>({
    from: startDateParam || defaultRange().from,
    to: endDateParam || defaultRange().to,
  });

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (range.from) {
      params.set("startDate", range.from);
    } else {
      params.delete("startDate");
    }
    
    if (range.to) {
      params.set("endDate", range.to);
    } else {
      params.delete("endDate");
    }
    
    setSearchParams(params, { replace: true });
  }, [range.from, range.to, setSearchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "report", "shifts", range.from, range.to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (range.from) params.append("startDate", range.from);
      if (range.to) params.append("endDate", range.to);
      
      const response = await axiosInstance.get(`/reports/shift-discrepancies?${params.toString()}`);
      return response.data.data.report as ShiftReport[];
    },
  });

  return (
    <div className="px-6 py-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Laporan Shift & Discrepancy</h1>
        <p className="text-sm text-muted-foreground">
          Pantau uang awal, akhir, metode pembayaran, dan ketidaksesuaian data tiap shift kasir.
        </p>
      </div>

      <DateRangeControls from={range.from} to={range.to} onChange={setRange} />

      <Card className="overflow-x-auto">
        <Table className="min-w-max">
          <TableHeader>
            <TableRow>
              <TableHead>Waktu Shift</TableHead>
              <TableHead>Kasir</TableHead>
              <TableHead className="text-center">Total Transaksi</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Penjualan Cash</TableHead>
              <TableHead className="text-right">Uang Awal</TableHead>
              <TableHead className="text-right bg-muted/50">Uang Akhir (Sistem)</TableHead>
              <TableHead className="text-right font-semibold">Uang Akhir (Aktual)</TableHead>
              <TableHead className="text-right">Selisih</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Memuat data dari database…
                </TableCell>
              </TableRow>
            ) : !data || data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                  Belum ada data shift pada rentang tanggal ini.
                </TableCell>
              </TableRow>
            ) : (
              data.map((r) => (
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
                        <AlertCircle className="h-3 w-3 mr-1" /> Tidak Sesuai
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

export default CashierReport;