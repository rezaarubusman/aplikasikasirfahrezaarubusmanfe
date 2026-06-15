import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { adminApi } from "~/api/admin";
import { rupiah } from "~/api/index";
import { DollarSign, Receipt, Users, TrendingUp, Loader2 } from "lucide-react";

export function meta() {
  return [{ title: "Dashboard — Aplikasi Kasir" }];
}

function Stat({ icon: Icon, label, value }: { icon: typeof DollarSign; label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight font-mono">{value}</div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => adminApi.getDashboardStats(),
  });

  return (
    <div className="px-6 py-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Ikhtisar aktivitas hari ini</p>
      </div>

      {isLoading || !data ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat icon={DollarSign} label="Penjualan Hari Ini" value={rupiah(data.todaySales)} />
          <Stat icon={Receipt} label="Transaksi Hari Ini" value={String(data.todayTxCount)} />
          <Stat icon={Users} label="Kasir Aktif" value={String(data.activeCashiers)} />
          <Stat icon={TrendingUp} label="Total Penjualan" value={rupiah(data.totalSales)} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tautan cepat</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>· Kelola akun kasir di bagian <span className="font-medium text-foreground">Kasir</span>.</p>
          <p>· Tambah atau edit item menu di bagian <span className="font-medium text-foreground">Produk</span>.</p>
          <p>· Tinjau performa di bagian <span className="font-medium text-foreground">Laporan</span>.</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default Dashboard;
