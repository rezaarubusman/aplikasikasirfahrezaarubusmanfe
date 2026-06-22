import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router"; 
import { Loader2 } from "lucide-react";
import { axiosInstance } from "~/lib/axios";
import { Card } from "~/components/ui/card";
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

interface TopProduct {
  productId: string;
  productName: string;
  category: string;
  totalQuantitySold: number;
  totalRevenue: number;
}

export function meta() {
  return [{ title: "Laporan Produk — Aplikasi Kasir" }];
}

const ProductReport = () => {
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
    queryKey: ["admin", "report", "products", range.from, range.to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (range.from) params.append("startDate", range.from);
      if (range.to) params.append("endDate", range.to);

      const response = await axiosInstance.get(`/reports/top-products?${params.toString()}`);
      return response.data.data.products as TopProduct[];
    },
  });

  return (
    <div className="px-6 py-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Produk Terlaris</h1>
        <p className="text-sm text-muted-foreground">Item terlaris berdasarkan pendapatan</p>
      </div>

      <DateRangeControls from={range.from} to={range.to} onChange={setRange} />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Produk</TableHead>
              <TableHead className="text-right">Unit Terjual</TableHead>
              <TableHead className="text-right">Pendapatan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Memuat data dari database…
                </TableCell>
              </TableRow>
            ) : !data || data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  Tidak ada penjualan dalam rentang tanggal ini.
                </TableCell>
              </TableRow>
            ) : (
              data.map((r, i) => (
                <TableRow key={r.productId}>
                  <TableCell className="text-muted-foreground font-mono text-center">
                    {i + 1}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{r.productName}</div>
                    <div className="text-xs text-muted-foreground">{r.category}</div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {r.totalQuantitySold}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {rupiah(r.totalRevenue)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default ProductReport;