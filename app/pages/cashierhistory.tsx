import { useNavigate, useSearchParams } from "react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Search, Receipt } from "lucide-react";

import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

import { txApi, type Transaction } from "~/api/transactions";
import { rupiah } from "~/api";
import { useAuth } from "~/stores/auth";

const searchSchema = z.object({
  q: z.string().optional().default(""),
});

export function meta() {
  return [{ title: "Transaksi Hari Ini — Aplikasi Kasir" }];
}

function HistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const [query, setQuery] = useState(q);
  const [openTx, setOpenTx] = useState<Transaction | null>(null);
  useEffect(() => setQuery(q), [q]);

  const today = new Date().toISOString().slice(0, 10);
  const txQ = useQuery({
    queryKey: ["cashier-tx", user?.id, today, q],
    queryFn: () =>
      txApi.getCashierTransactions({ date: today, cashierId: user!.id, q }),
    enabled: !!user,
  });

  function setQ(next: string) {
    if (next) {
      setSearchParams({ q: next }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transaksi Hari Ini</h1>
        <p className="text-sm text-muted-foreground">Semua penjualan yang Anda proses hari ini.</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setQ(e.target.value);
            }}
            placeholder="Cari ID transaksi"
            className="pl-9 font-mono"
          />
        </div>
        {q && (
          <Button variant="ghost" onClick={() => setQ("")}>
            Atur Ulang
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {txQ.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : txQ.data && txQ.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Transaksi</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead className="text-right">Item</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Pembayaran</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txQ.data.map((t) => (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer"
                    onClick={() => setOpenTx(t)}
                  >
                    <TableCell className="font-mono text-xs">{t.id}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(t.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {t.items.reduce((s, i) => s + i.qty, 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {rupiah(t.total)}
                    </TableCell>
                    <TableCell className="capitalize text-sm">{t.paymentType}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-success/15 text-success border-0">
                        {t.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Receipt className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">Belum ada transaksi</h3>
              <p className="text-sm text-muted-foreground">
                Penjualan yang selesai hari ini akan muncul di sini.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!openTx} onOpenChange={(o) => !o && setOpenTx(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Detail transaksi</DialogTitle>
            <DialogDescription className="font-mono text-xs">{openTx?.id}</DialogDescription>
          </DialogHeader>
          {openTx && (
            <div className="space-y-3 text-sm">
              <div className="rounded-md border divide-y">
                {openTx.items.map((i) => (
                  <div
                    key={i.productId}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <span>
                      {i.name} <span className="text-muted-foreground">×{i.qty}</span>
                    </span>
                    <span className="font-mono">{rupiah(i.price * i.qty)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <RowDetail label="Total" value={rupiah(openTx.total)} strong />
                <RowDetail
                  label="Pembayaran"
                  value={
                    openTx.paymentType === "cash"
                      ? "Tunai"
                      : `Debit •••• ${openTx.cardLast4}`
                  }
                />
                {openTx.paymentType === "cash" && (
                  <>
                    <RowDetail label="Diterima" value={rupiah(openTx.cashReceived ?? 0)} />
                    <RowDetail label="Kembalian" value={rupiah(openTx.change ?? 0)} />
                  </>
                )}
                <RowDetail
                  label="Waktu"
                  value={new Date(openTx.createdAt).toLocaleString()}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RowDetail({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={"font-mono " + (strong ? "font-bold text-lg text-primary" : "")}>{value}</span>
    </div>
  );
}

export default HistoryPage;
