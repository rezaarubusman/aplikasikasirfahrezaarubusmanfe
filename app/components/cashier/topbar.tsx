import { Link, useNavigate, useLocation } from "react-router";
import { LogOut, ScanBarcode, History, PlayCircle, StopCircle } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useAuth } from "~/stores/auth";
import { useShift } from "~/stores/shift";
import { useCart } from "~/stores/cart";
import { toast } from "sonner";
import { axiosInstance } from "~/lib/axios";

const navItems = [
  { to: "/cashierpos", label: "POS", icon: ScanBarcode },
  { to: "/cashierhistory", label: "Riwayat", icon: History },
] as const;

export function CashierTopbar() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const active = useShift((s) => s.active);
  const { pathname } = useLocation();
  const setActiveShift = useShift((s) => s.setActive);
  const clearCart = useCart((s) => s.clear);

  async function handleLogout() {
    try {
      await axiosInstance.post("/auth/logout");
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      clearCart();
      setActiveShift(null);
      logout(); 
      toast.success("Berhasil keluar");
      navigate("/");
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-sidebar px-4 text-sidebar-foreground">
      <div className="flex items-center gap-6">
        <Link to="/cashierpos" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <ScanBarcode className="h-4 w-4" />
          </span>
          Aplikasi Kasir
        </Link>
        {active && (
          <nav className="flex items-center gap-1">
            {navItems.map((n) => {
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors " +
                    (pathname === n.to
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground")
                  }
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
      <div className="flex items-center gap-3">
        {active ? (
          <Button asChild size="sm" variant="destructive">
            <Link to="/cashierend">
              <StopCircle className="h-4 w-4" />
              Akhiri Shift
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm" variant="secondary">
            <Link to="/cashierstart">
              <PlayCircle className="h-4 w-4" />
              Mulai Shift
            </Link>
          </Button>
        )}
        <div className="hidden flex-col items-end text-xs leading-tight sm:flex">
          <span className="font-medium text-sidebar-foreground">{user?.name}</span>
          <span className="text-sidebar-foreground/60 capitalize">{user?.role?.toLowerCase()}</span>
        </div>
        <Button size="icon" variant="ghost" onClick={handleLogout} className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
