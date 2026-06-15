import { Outlet } from "react-router";
import { CashierTopbar } from "~/components/cashier/topbar";

export default function CashierLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CashierTopbar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}