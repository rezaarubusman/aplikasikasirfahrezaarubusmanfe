import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { adminApi } from "~/api/admin";
import { rupiah } from "~/api/index";
import { Card } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { DateRangeControls, defaultRange } from "~/components/admin/date-range";

export function meta() {
  return [{ title: "Laporan Kasir — Aplikasi Kasir" }];
}

function CashierReport() {
  const [range, setRange] = useState(defaultRange());
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "report", "cashiers", range],
    queryFn: () => adminApi.getCashierReport(range),
  });

  const sorted = [...(data ?? [])].sort((a, b) => b.total - a.total);

  return (
    <div className="px-6 py-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Performa Kasir</h1>
        <p className="text-sm text-muted-foreground">Total penjualan dikelompokkan berdasarkan kasir</p>
      </div>

      <DateRangeControls from={range.from} to={range.to} onChange={setRange} />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kasir</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Transaksi</TableHead>
              <TableHead className="text-right">Total Penjualan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Memuat…
                </TableCell>
              </TableRow>
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  Belum ada data.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((r) => (
                <TableRow key={r.cashierId}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.email}</TableCell>
                  <TableCell className="text-right font-mono">{r.txCount}</TableCell>
                  <TableCell className="text-right font-mono">{rupiah(r.total)}</TableCell>
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
