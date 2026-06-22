import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { Loader2 } from "lucide-react";
import { axiosInstance } from "~/lib/axios"; 
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { DateRangeControls, defaultRange } from "~/components/admin/date-range";

const rupiah = (number: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

export function meta() {
  return [{ title: "Laporan Penjualan — Aplikasi Kasir" }];
}

const SalesReport = () => {
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
    queryKey: ["admin", "report", "sales", range.from, range.to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (range.from) params.append("startDate", range.from);
      if (range.to) params.append("endDate", range.to);

      const response = await axiosInstance.get(`/reports/sales?${params.toString()}`);
      return response.data.data as SalesSummary;
    },
  });

  const max = Math.max(1, ...(data?.dailyReports.map((r) => r.totalRevenue) ?? [0]));

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
              {rupiah(data?.grandTotalRevenue ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold font-mono">
              {data?.totalTransactions ?? 0}
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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Memuat data dari database…
                </TableCell>
              </TableRow>
            ) : !data || data.dailyReports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  Tidak ada penjualan dalam rentang tanggal ini.
                </TableCell>
              </TableRow>
            ) : (
              data.dailyReports.map((r) => (
                <TableRow key={r.date}>
                  <TableCell className="font-mono text-sm">
                    {new Date(r.date).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric"
                    })}
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
          {data && data.dailyReports.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell className="font-medium">Total Keseluruhan</TableCell>
                <TableCell className="text-right font-mono">{data.totalTransactions}</TableCell>
                <TableCell className="text-right font-mono">{rupiah(data.grandTotalRevenue)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </Card>
    </div>
  );
};

export default SalesReport;