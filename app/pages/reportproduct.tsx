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
  return [{ title: "Laporan Produk — Aplikasi Kasir" }];
}

function ProductReport() {
  const [range, setRange] = useState(defaultRange());
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "report", "products", range],
    queryFn: () => adminApi.getProductReport(range),
  });

  return (
    <div className="px-6 py-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Produk Terlaris</h1>
        <p className="text-sm text-muted-foreground">Item terlaris berdasarkan pendapatan</p>
      </div>

      <DateRangeControls from={range.from} to={range.to} onChange={setRange} />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Produk</TableHead>
              <TableHead className="text-right">Unit Terjual</TableHead>
              <TableHead className="text-right">Pendapatan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Memuat…
                </TableCell>
              </TableRow>
            ) : !data || data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  Tidak ada penjualan dalam rentang ini.
                </TableCell>
              </TableRow>
            ) : (
              data.map((r, i) => (
                <TableRow key={r.productId}>
                  <TableCell className="text-muted-foreground font-mono">{i + 1}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-right font-mono">{r.qty}</TableCell>
                  <TableCell className="text-right font-mono">{rupiah(r.revenue)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

export default ProductReport;
