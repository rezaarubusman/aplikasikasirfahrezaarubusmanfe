import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { Loader2, ArrowLeft, Search, ChevronLeft, ChevronRight, ReceiptText } from "lucide-react";
import { axiosInstance } from "~/lib/axios";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";

export function meta() {
    return [{ title: " Detail Transaksi Shift per Kasir — Aplikasi Kasir"}];
}

export const rupiah = (number: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(number);
};

interface TransactionItem {
  id: string;
  quantity: number;
  subtotal: number | string;
  priceAtTransaction: number | string;
  product: { name: string };
}

interface TransactionDetail {
  id: string;
  invoiceNumber: string;
  totalAmount: number | string;
  paymentMethod: string;
  createdAt: string;
  shift: {
    cashier: { name: string };
  };
  transactionItems: TransactionItem[];
}

const ITEMS_PER_PAGE = 10;

const ShiftTransactions = () => {
  const { shiftId } = useParams<{ shiftId: string }>();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); 
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: transactions, isLoading } = useQuery<TransactionDetail[]>({
    queryKey: ["admin", "transactions", "shift", shiftId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/transactions?shiftId=${shiftId}&limit=100`);
      return (response.data.data || response.data) as TransactionDetail[];
    },
    enabled: !!shiftId,
  });

  const allTransactions = transactions || [];
  const filteredTransactions = allTransactions.filter((tx) =>
    tx.invoiceNumber.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE));
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="px-6 py-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Detail Transaksi Shift</h1>
          <p className="text-sm text-muted-foreground">Menampilkan semua transaksi pada sesi shift terkait.</p>
        </div>
      </div>

      <Card className="p-4 border shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Cari No. Invoice... (Ctrl+K)"
              className="pl-9 pr-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Waktu</TableHead>
              <TableHead>Metode Pembayaran</TableHead>
              <TableHead>Produk Dibeli</TableHead>
              <TableHead className="text-right">Total Nominal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Memuat data...
                </TableCell>
              </TableRow>
            ) : filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  {debouncedSearch ? "Pencarian tidak ditemukan." : "Tidak ada transaksi di shift ini."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedTransactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium font-mono text-primary flex items-center gap-2 mt-2">
                    <ReceiptText className="h-4 w-4" /> {tx.invoiceNumber}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(tx.createdAt).toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={tx.paymentMethod === "CASH" ? "default" : "secondary"}>
                      {tx.paymentMethod}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <ul className="list-disc list-inside">
                      {tx.transactionItems.map(item => (
                        <li key={item.id}>{item.quantity}x {item.product.name}</li>
                      ))}
                    </ul>
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {rupiah(Number(tx.totalAmount))}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {!isLoading && filteredTransactions.length > 0 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} dari {filteredTransactions.length} hasil
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <div className="text-sm font-medium px-2">Hal {currentPage} / {totalPages}</div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ShiftTransactions;