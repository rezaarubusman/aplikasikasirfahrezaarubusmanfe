import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { DollarSign, Receipt, Users, TrendingUp, Loader2 } from "lucide-react";
import { axiosInstance } from "~/lib/axios"; 

export function meta() {
  return [{ title: "Dashboard — Aplikasi Kasir" }];
}

export const rupiah = (number: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(number);
};

const Stat = ({ icon: Icon, label, value }: { icon: typeof DollarSign; label: string; value: string }) => {
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

const Dashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const response = await axiosInstance.get("/reports/dashboard");
      return response.data.data;
    },
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
          <p>· Kelola akun kasir di bagian{" "}
            <Link 
              to="/cashierlist"
              className="font-medium text-foreground hover:underline transition-colors"
            > Kasir
            </Link>.
          </p>
          <p>· Tambah atau edit item menu di bagian{" "}
            <Link 
              to="/products"
              className="font-medium text-foreground hover:underline transition-colors"
            > Produk
            </Link>.
          </p>
          <p>· Tinjau performa penjualan di bagian{" "}
            <Link 
              to="/reportsales"
              className="font-medium text-foreground hover:underline transition-colors"
            > Laporan Penjualan
            </Link>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default Dashboard;