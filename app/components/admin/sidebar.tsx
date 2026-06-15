import { Link, useNavigate, useLocation } from "react-router";
import {
  LayoutDashboard,
  Users,
  Package,
  BarChart3,
  TrendingUp,
  ShoppingBag,
  LogOut,
  ScanBarcode,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { useAuth } from "~/stores/auth";
import { api } from "~/api/auth";
import { toast } from "sonner";

const navGroups = [
  {
    label: "Ikhtisar",
    items: [{ to: "/adminhome", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Kelola",
    items: [
      { to: "/cashierlist", label: "Kasir", icon: Users },
      { to: "/products", label: "Produk", icon: Package },
    ],
  },
  {
    label: "Laporan",
    items: [
      { to: "/reportsales", label: "Penjualan", icon: BarChart3 },
      { to: "/reportcashier", label: "Per Kasir", icon: TrendingUp },
      { to: "/reportproduct", label: "Per Produk", icon: ShoppingBag },
    ],
  },
] as const;

export function AdminSidebar() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const { pathname } = useLocation();

  async function handleLogout() {
    await api.logout();
    logout();
    toast.success("Berhasil keluar");
    navigate("/");
  }

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4 font-semibold">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <ScanBarcode className="h-4 w-4" />
        </span>
        Aplikasi Kasir
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
        {navGroups.map((g) => (
          <div key={g.label}>
            <p className="px-3 mb-1 text-[11px] uppercase tracking-wider text-sidebar-foreground/50">
              {g.label}
            </p>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = "exact" in it && it.exact ? pathname === it.to : pathname.startsWith(it.to);
                return (
                  <li key={it.to}>
                    <Link
                      to={it.to}
                      className={
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors " +
                        (active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground")
                      }
                    >
                      <it.icon className="h-4 w-4" />
                      {it.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-3 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{user?.name}</p>
          <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleLogout}
          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </aside>
  );
}
