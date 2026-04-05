"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getUser } from "../../lib/authService";
import { getTransactionSheet, addTransaction, deleteTransaction, createNotification } from "../../lib/transactionService";
import Menu from "../ui/menu";
import NotificationCenter from "../components/notification-center";
import jsPDF from "jspdf";

const DAY_MS = 24 * 60 * 60 * 1000;
const RANGE_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "thisWeek", label: "This Week" },
  { key: "last7Days", label: "Last 7 Days" },
  { key: "last28Days", label: "Last 28 Days" },
  { key: "thisMonth", label: "This Month" },
  { key: "lastMonth", label: "Last Month" },
  { key: "thisYear", label: "This Year" },
] as const;

const roleColors = {
  viewer: "text-cyan-300 border-cyan-400/40 bg-cyan-400/10",
  analyst: "text-indigo-300 border-indigo-400/40 bg-indigo-400/10",
  admin: "text-amber-300 border-amber-400/40 bg-amber-400/10",
};

type TransactionEntry = {
  id: string;
  amount: number;
  type: string;
  category: string;
  transaction_date: string;
  notes: string | null;
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const ROWS_PER_PAGE = 25;

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const getDateRange = (rangeKey: (typeof RANGE_OPTIONS)[number]["key"]) => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  switch (rangeKey) {
    case "today":
      return { start: todayStart, end: todayEnd };
    case "yesterday": {
      const yesterday = new Date(todayStart.getTime() - DAY_MS);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    }
    case "thisWeek": {
      const weekStart = new Date(todayStart);
      weekStart.setDate(todayStart.getDate() - todayStart.getDay());
      return { start: startOfDay(weekStart), end: todayEnd };
    }
    case "last7Days": {
      const start = new Date(todayStart.getTime() - 6 * DAY_MS);
      return { start, end: todayEnd };
    }
    case "last28Days": {
      const start = new Date(todayStart.getTime() - 27 * DAY_MS);
      return { start, end: todayEnd };
    }
    case "thisMonth": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: startOfDay(start), end: todayEnd };
    }
    case "lastMonth": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: startOfDay(start), end: endOfDay(end) };
    }
    case "thisYear": {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start: startOfDay(start), end: todayEnd };
    }
    default:
      return { start: todayStart, end: todayEnd };
  }
};

const formatRangeDate = (date: Date) => {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const generatePDF = (transactions: TransactionEntry[], rangeLabel: string, selectedCategory: string | null) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text("Transaction Report", 20, 20);
  
  // Date range
  doc.setFontSize(12);
  doc.text(`Date Range: ${rangeLabel}`, 20, 35);
  
  if (selectedCategory) {
    doc.text(`Category: ${selectedCategory}`, 20, 45);
  }
  
  // Summary
  const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const net = income - expenses;
  
  doc.text(`Total Income: ${money.format(income)}`, 20, selectedCategory ? 55 : 45);
  doc.text(`Total Expenses: ${money.format(expenses)}`, 20, selectedCategory ? 65 : 55);
  doc.text(`Net Balance: ${money.format(net)}`, 20, selectedCategory ? 75 : 65);
  doc.text(`Total Transactions: ${transactions.length}`, 20, selectedCategory ? 85 : 75);
  
  // Table headers
  const startY = selectedCategory ? 100 : 90;
  doc.setFontSize(10);
  doc.text("Transaction", 20, startY);
  doc.text("Category", 80, startY);
  doc.text("Date", 130, startY);
  doc.text("Type", 160, startY);
  doc.text("Amount", 180, startY);
  
  // Draw line under headers
  doc.line(20, startY + 2, 190, startY + 2);
  
  // Table rows
  let y = startY + 10;
  transactions.forEach((transaction, index) => {
    if (y > 270) { // New page if needed
      doc.addPage();
      y = 20;
    }
    
    const transactionName = (transaction.notes || transaction.category)
      .replace(/\s*#\d+\b/g, "")
      .trim() || transaction.category;
    
    const date = new Date(transaction.transaction_date).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    
    doc.text(transactionName.substring(0, 20), 20, y);
    doc.text(transaction.category.substring(0, 15), 80, y);
    doc.text(date, 130, y);
    doc.text(transaction.type, 160, y);
    doc.text(money.format(transaction.amount), 180, y);
    
    y += 8;
  });
  
  // Save the PDF
  const fileName = `transactions_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

export default function Dashboard() {
  const router = useRouter();
  const [email, setEmail] = useState("guest@local");
  const [displayName, setDisplayName] = useState("Guest User");
  const [role, setRole] = useState("viewer");
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<TransactionEntry[]>([]);
  const [transactionError, setTransactionError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isDateCardOpen, setIsDateCardOpen] = useState(false);
  const [selectedRangeKey, setSelectedRangeKey] =
    useState<(typeof RANGE_OPTIONS)[number]["key"]>("last28Days");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    amount: "",
    type: "expense" as "income" | "expense",
    category: "",
    transaction_date: new Date().toISOString().split('T')[0],
    notes: "",
  });
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set());

  const roleBadge = useMemo(() => {
    return roleColors[role as keyof typeof roleColors] || roleColors.viewer;
  }, [role]);

  useEffect(() => {
    async function loadUser() {
      const { data } = await getUser();
      const currentUser = data?.user;
      if (!currentUser) {
        setLoading(false);
        return;
      }
      setEmail(currentUser.email || "guest@local");
      setDisplayName(
        currentUser.user_metadata?.full_name ||
          currentUser.user_metadata?.name ||
          currentUser.email?.split("@")[0] ||
          "User",
      );
      setRole(currentUser.user_metadata?.role || "viewer");
      setLoading(false);
    }
    loadUser();
  }, []);

  useEffect(() => {
    async function loadTransactions() {
      const { data, error } = await getTransactionSheet();
      if (error) {
        setTransactionError(error.message || "Failed to load transactions.");
        return;
      }
      setTransactions(data as TransactionEntry[]);
      setTransactionError("");
    }
    loadTransactions();
  }, []);

  const totals = useMemo(() => {
    const income = transactions
      .filter((entry) => entry.type === "income")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const expenses = transactions
      .filter((entry) => entry.type === "expense")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    return { income, expenses, net: income - expenses };
  }, [transactions]);

  const categoryWiseTotals = useMemo(() => {
    const categoryMap = new Map<string, number>();
    transactions.forEach((entry) => {
      const current = categoryMap.get(entry.category) || 0;
      categoryMap.set(entry.category, current + Number(entry.amount || 0));
    });
    const categoryTotals = [...categoryMap.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
    const maxCategoryAmount = categoryTotals[0]?.amount || 0;
    return {
      categoryCount: categoryMap.size,
      categoryTotals,
      maxCategoryAmount,
    };
  }, [transactions]);

  const activeRange = useMemo(
    () => getDateRange(selectedRangeKey),
    [selectedRangeKey],
  );

  const dateFilteredTransactions = useMemo(() => {
    const start = activeRange.start.getTime();
    const end = activeRange.end.getTime();
    return transactions.filter((entry) => {
      const ts = new Date(entry.transaction_date).getTime();
      return ts >= start && ts <= end;
    });
  }, [transactions, activeRange]);

  const categoryFilteredTransactions = useMemo(() => {
    if (!selectedCategory) return dateFilteredTransactions;
    return dateFilteredTransactions.filter((entry) => entry.category === selectedCategory);
  }, [dateFilteredTransactions, selectedCategory]);

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return categoryFilteredTransactions;
    return categoryFilteredTransactions.filter((entry) => {
      const name = (entry.notes || entry.category)
        .replace(/\s*#\d+\b/g, "")
        .trim();
      const dateText = new Date(entry.transaction_date).toLocaleString(
        "en-US",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        },
      );
      return [name, entry.category, entry.type, dateText]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [categoryFilteredTransactions, searchQuery]);

  const rangeLabel = useMemo(
    () =>
      `${formatRangeDate(activeRange.start)} - ${formatRangeDate(activeRange.end)}`,
    [activeRange],
  );

  const calendarDays = useMemo(() => {
    const start = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      1,
    );
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return {
        key: date.toISOString(),
        date,
        day: date.getDate(),
        inMonth: date.getMonth() === calendarMonth.getMonth(),
      };
    });
  }, [calendarMonth]);

  const calendarTitle = useMemo(() => {
    return calendarMonth.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [calendarMonth]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredTransactions.length / ROWS_PER_PAGE)),
    [filteredTransactions.length],
  );

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredTransactions.slice(start, start + ROWS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  const handleAddTransaction = async () => {
    if (!newTransaction.amount || !newTransaction.category) {
      alert("Please fill in amount and category");
      return;
    }

    const transaction = {
      amount: parseFloat(newTransaction.amount),
      type: newTransaction.type,
      category: newTransaction.category,
      transaction_date: newTransaction.transaction_date,
      notes: newTransaction.notes || null,
    };

    const { error } = await addTransaction(transaction);
    
    if (error) {
      alert("Failed to add transaction: " + error.message);
      return;
    }

    // Reset form
    setNewTransaction({
      amount: "",
      type: "expense" as "income" | "expense",
      category: "",
      transaction_date: new Date().toISOString().split('T')[0],
      notes: "",
    });
    
    setIsAddTransactionModalOpen(false);
    
    // Create notification for all users
    await createNotification(
      'transaction_added',
      `Admin added a new ${transaction.type} transaction: ${transaction.category} - $${transaction.amount}`,
      email
    );
    
    // Refresh transactions
    const { data } = await getTransactionSheet({ force: true });
    if (data) {
      setTransactions(data as TransactionEntry[]);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) {
      return;
    }

    const { error } = await deleteTransaction(id);
    
    if (error) {
      alert("Failed to delete transaction: " + error.message);
      return;
    }

    // Close dropdown
    setOpenDropdownId(null);
    
    // Create notification for all users
    await createNotification(
      'transaction_deleted',
      `Admin soft-deleted a transaction`,
      email
    );
    
    // Refresh transactions
    const { data } = await getTransactionSheet({ force: true });
    if (data) {
      setTransactions(data as TransactionEntry[]);
    }
  };

  const handleSelectTransaction = (id: string, checked: boolean) => {
    setSelectedTransactionIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTransactionIds(new Set(paginatedTransactions.map(t => t.id)));
    } else {
      setSelectedTransactionIds(new Set());
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTransactionIds.size === 0) return;

    const count = selectedTransactionIds.size;
    if (!confirm(`Are you sure you want to delete ${count} transaction${count > 1 ? 's' : ''}?`)) {
      return;
    }

    let successCount = 0;
    let errorMessages: string[] = [];

    for (const id of selectedTransactionIds) {
      const { error } = await deleteTransaction(id);
      if (error) {
        errorMessages.push(`Failed to delete transaction ${id}: ${error.message}`);
      } else {
        successCount++;
      }
    }

    // Clear selections
    setSelectedTransactionIds(new Set());

    // Create notification for all users if successful deletions occurred
    if (successCount > 0) {
      await createNotification(
        'bulk_delete',
        `Admin soft-deleted ${successCount} transaction${successCount > 1 ? 's' : ''}`,
        email
      );
    }

    // Show results
    if (errorMessages.length > 0) {
      alert(`Deleted ${successCount} transaction(s).\n\nErrors:\n${errorMessages.join('\n')}`);
    } else {
      alert(`Successfully deleted ${successCount} transaction(s).`);
    }

    // Refresh transactions
    const { data } = await getTransactionSheet({ force: true });
    if (data) {
      setTransactions(data as TransactionEntry[]);
    }
  };

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRangeKey]);

  useEffect(() => {
    setSelectedCategory(null);
  }, [selectedRangeKey]);

  // Clear selections when page or filters change
  useEffect(() => {
    setSelectedTransactionIds(new Set());
  }, [currentPage, selectedRangeKey, selectedCategory, searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId && !(event.target as Element).closest('.relative')) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  return (
    <main className="min-h-screen bg-[#070b14] p-4 text-zinc-100 md:p-8 [font-family:Space_Grotesk,Manrope,sans-serif]">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[260px_1fr]">
        <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <Menu userName={displayName} userEmail={email} userRole={role} />
        </div>

        <div className="space-y-6">
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-cyan-300"></p>
                <h2 className="mt-2 text-4xl font-bold tracking-tight text-zinc-100">
                  Finance Dashboard
                </h2>
              </div>
              <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search transaction, category, type, or date"
                  className="w-full bg-transparent text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none"
                />
              </div>
            </div>

            {/* ── CARDS ── */}
            <div className="mt-6 grid gap-4 lg:grid-cols-6">
              {/* Income */}
              <article className="group relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-[#0b1220] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-emerald-400/40 lg:col-span-1">
                {/* top accent line */}
                <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl bg-emerald-400/60" />

                <div className="mb-4 flex items-center justify-between">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      <polyline points="17 6 23 6 23 12" />
                    </svg>
                  </span>
                  <span className="rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                    +12.5%
                  </span>
                </div>

                <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300/60 mb-1">
                  Total Income
                </p>
                <p className="text-xs text-zinc-500 mb-3">
                  Within selected range
                </p>
              <p className="text-xl font-bold tracking-tight tabular-nums text-zinc-50">
                  {money.format(totals.income || 0)}
                </p>

                <div className="mt-4 h-px bg-white/5" />
                <p className="mt-3 text-[11px] text-zinc-500">
                  <span className="font-semibold text-emerald-400">
                    {transactions.filter((t) => t.type === "income").length}
                  </span>{" "}
                  income entries
                </p>
              </article>

              {/* Expenses */}
              <article className="group relative overflow-hidden rounded-2xl border border-rose-500/20 bg-[#0b1220] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-rose-400/40 lg:col-span-1">
                <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl bg-rose-400/60" />

                <div className="mb-4 flex items-center justify-between">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-400/10 text-rose-300">
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                      <polyline points="17 18 23 18 23 12" />
                    </svg>
                  </span>
                  <span className="rounded-full bg-rose-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-rose-300">
                    -5.5%
                  </span>
                </div>

                <p className="text-[11px] font-semibold uppercase tracking-widest text-rose-300/60 mb-1">
                  Total Expenses
                </p>
                <p className="text-xs text-zinc-500 mb-3">
                  Within selected range
                </p>
                <p className="text-xl font-bold tracking-tight tabular-nums text-zinc-50">
                  {money.format(totals.expenses || 0)}
                </p>

                <div className="mt-4 h-px bg-white/5" />
                <p className="mt-3 text-[11px] text-zinc-500">
                  <span className="font-semibold text-rose-400">
                    {transactions.filter((t) => t.type === "expense").length}
                  </span>{" "}
                  expense entries
                </p>
              </article>

              {/* Net Balance */}
              <article className="group relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-[#0b1220] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-400/40 lg:col-span-1">
                <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl bg-cyan-400/60" />

                <div className="mb-4 flex items-center justify-between">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </span>
                  <span className="rounded-full bg-cyan-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-300">
                    +8.5%
                  </span>
                </div>

                <p className="text-[11px] font-semibold uppercase tracking-widest text-cyan-300/60 mb-1">
                  Net Balance
                </p>
                <p className="text-xs text-zinc-500 mb-3">
                  Within selected range
                </p>
                <p className="text-xl font-bold tracking-tight tabular-nums text-zinc-50">
                  {money.format(totals.net || 0)}
                </p>

                <div className="mt-4 h-px bg-white/5" />
                <p className="mt-3 text-[11px] text-zinc-500">
                  <span
                    className={`font-semibold ${totals.net >= 0 ? "text-cyan-400" : "text-rose-400"}`}
                  >
                    {totals.net >= 0 ? "Surplus" : "Deficit"}
                  </span>{" "}
                  this period
                </p>
              </article>

              {/* Category Totals — unchanged logic, restyled shell */}
              <article className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-[#0b1220] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-amber-400/40 lg:col-span-3">
                <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl bg-amber-400/60" />

                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
                      <svg
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-300/60">
                        Category Wise Totals
                      </p>
                      <p className="text-xs text-zinc-500">
                        All categories and their totals
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                    {categoryWiseTotals.categoryCount} cats
                  </span>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                  <div className="max-h-[150px] overflow-y-auto pr-1">
                    {categoryWiseTotals.categoryTotals.length === 0 ? (
                      <p className="py-3 text-sm text-zinc-500">
                        No categories yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {categoryWiseTotals.categoryTotals.map((item) => {
                          const percent =
                            categoryWiseTotals.maxCategoryAmount > 0
                              ? Math.max(
                                  8,
                                  (item.amount /
                                    categoryWiseTotals.maxCategoryAmount) *
                                    100,
                                )
                              : 0;
                          return (
                            <div
                              key={item.category}
                              className={`space-y-1 rounded-xl px-3 py-2 transition-colors ${
                                selectedCategory === item.category
                                  ? "bg-amber-400/10 border border-amber-400/20"
                                  : "bg-[#090f1d] hover:bg-[#0a111f]"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedCategory(
                                        selectedCategory === item.category
                                          ? null
                                          : item.category,
                                      )
                                    }
                                    className="flex items-center gap-1 text-zinc-400 hover:text-amber-300 transition-colors"
                                  >
                                    <svg
                                      width="12"
                                      height="12"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      viewBox="0 0 24 24"
                                      className={`transition-transform ${
                                        selectedCategory === item.category
                                          ? "rotate-180"
                                          : ""
                                      }`}
                                    >
                                      <polyline points="6,9 12,15 18,9" />
                                    </svg>
                                  </button>
                                  <p className="text-sm font-medium text-zinc-100">
                                    {item.category}
                                  </p>
                                </div>
                                <p className="text-sm font-semibold text-amber-300">
                                  {money.format(item.amount)}
                                </p>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            </div>
          </section>

          {/* ── TABLE SECTION — completely untouched ── */}
          <section>
            <article className="rounded-2xl border border-white/10 bg-[#0b1220] p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Transaction Sheet</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    {selectedCategory
                      ? `Showing transactions for category: ${selectedCategory}`
                      : "Amount, type, category, date, and notes for all authenticated users."}
                  </p>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDateCardOpen((open) => !open)}
                    className="inline-flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 transition hover:bg-white/[0.08]"
                  >
                    <span className="text-zinc-400">📅</span>
                    <span>{rangeLabel}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => generatePDF(filteredTransactions, rangeLabel, selectedCategory)}
                    className="ml-3 inline-flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 transition hover:bg-white/[0.08]"
                    title="Download transactions as PDF"
                  >
                    <span className="text-zinc-400">📄</span>
                    <span>Download PDF</span>
                  </button>

                  {role === "admin" && (
                    <button
                      type="button"
                      onClick={() => setIsAddTransactionModalOpen(true)}
                      className="ml-3 inline-flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300 transition hover:bg-emerald-500/20"
                      title="Add new transaction"
                    >
                      <span className="text-emerald-400">➕</span>
                      <span>Add Transaction</span>
                    </button>
                  )}

                  {role === "admin" && selectedTransactionIds.size > 0 && (
                    <button
                      type="button"
                      onClick={handleBulkDelete}
                      className="ml-3 inline-flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300 transition hover:bg-rose-500/20"
                      title={`Delete ${selectedTransactionIds.size} selected transaction(s)`}
                    >
                      <span className="text-rose-400">🗑️</span>
                      <span>Delete ({selectedTransactionIds.size})</span>
                    </button>
                  )}

                  <div className="ml-3">
                    <NotificationCenter />
                  </div>

                  {isDateCardOpen ? (
                    <div className="absolute right-0 z-20 mt-2 grid w-[480px] max-w-[92vw] grid-cols-[170px_1fr] overflow-hidden rounded-2xl border border-white/15 bg-[#070c16] shadow-[0_12px_35px_rgba(0,0,0,0.45)]">
                      <div className="border-r border-white/10 bg-[#060a12] p-4">
                        <div className="space-y-1">
                          {RANGE_OPTIONS.map((option) => (
                            <button
                              key={option.key}
                              type="button"
                              onClick={() => {
                                setSelectedRangeKey(option.key);
                                setIsDateCardOpen(false);
                              }}
                              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                                selectedRangeKey === option.key
                                  ? "border border-white/30 bg-white/10 text-zinc-100"
                                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() =>
                              setCalendarMonth(
                                (m) =>
                                  new Date(
                                    m.getFullYear(),
                                    m.getMonth() - 1,
                                    1,
                                  ),
                              )
                            }
                            className="rounded-lg px-2 py-1 text-zinc-300 transition hover:bg-white/10"
                          >
                            ‹
                          </button>
                          <p className="font-semibold text-zinc-100">
                            {calendarTitle}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              setCalendarMonth(
                                (m) =>
                                  new Date(
                                    m.getFullYear(),
                                    m.getMonth() + 1,
                                    1,
                                  ),
                              )
                            }
                            className="rounded-lg px-2 py-1 text-zinc-300 transition hover:bg-white/10"
                          >
                            ›
                          </button>
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-500">
                          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(
                            (label) => (
                              <span key={label} className="py-1">
                                {label}
                              </span>
                            ),
                          )}
                        </div>

                        <div className="mt-1 grid grid-cols-7 gap-1">
                          {calendarDays.map((item) => (
                            <span
                              key={item.key}
                              className={`rounded-md py-2 text-center text-sm ${item.inMonth ? "text-zinc-200" : "text-zinc-600"}`}
                            >
                              {item.day}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {transactionError ? (
                <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                  {transactionError}
                </p>
              ) : null}

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-zinc-400">
                      {role === "admin" && (
                        <th className="pb-3 font-medium">
                          <input
                            type="checkbox"
                            checked={selectedTransactionIds.size === paginatedTransactions.length && paginatedTransactions.length > 0}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500"
                          />
                        </th>
                      )}
                      <th className="pb-3 font-medium">Transaction</th>
                      <th className="pb-3 font-medium">Category</th>
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Type</th>
                      <th className="pb-3 text-right font-medium">Amount</th>
                      {role === "admin" && <th className="pb-3 text-right font-medium">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={role === "admin" ? 7 : 5}
                          className="py-6 text-center text-zinc-500"
                        >
                          {searchQuery
                            ? "No transactions match your search."
                            : "No transaction rows yet. Run data/transactions.psql in Supabase SQL Editor."}
                        </td>
                      </tr>
                    ) : (
                      paginatedTransactions.map((entry) => {
                        const isIncome = entry.type === "income";
                        const transactionName =
                          (entry.notes || entry.category)
                            .replace(/\s*#\d+\b/g, "")
                            .trim() || entry.category;
                        return (
                          <tr
                            key={entry.id}
                            className="border-b border-white/10 last:border-b-0"
                          >
                            {role === "admin" && (
                              <td className="py-3 pr-3">
                                <input
                                  type="checkbox"
                                  checked={selectedTransactionIds.has(entry.id)}
                                  onChange={(e) => handleSelectTransaction(entry.id, e.target.checked)}
                                  className="rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500"
                                />
                              </td>
                            )}
                            <td className="py-3 pr-3">
                              <p className="font-medium text-zinc-100">
                                {transactionName}
                              </p>
                            </td>
                            <td className="py-3 pr-3 text-zinc-300">
                              {entry.category}
                            </td>
                            <td className="py-3 pr-3 text-zinc-300">
                              {new Date(entry.transaction_date).toLocaleString(
                                "en-US",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                },
                              )}
                            </td>
                            <td className="py-3 pr-3">
                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
                                  isIncome
                                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                                    : "border-zinc-500/40 bg-zinc-700/20 text-zinc-300"
                                }`}
                              >
                                {entry.type}
                              </span>
                            </td>
                            <td
                              className={`py-3 text-right font-semibold ${isIncome ? "text-emerald-300" : "text-rose-300"}`}
                            >
                              {isIncome
                                ? money.format(Number(entry.amount || 0))
                                : `-${money.format(Number(entry.amount || 0))}`}
                            </td>
                            {role === "admin" && (
                              <td className="py-3 text-right">
                                <div className="relative">
                                  <button
                                    onClick={() => setOpenDropdownId(openDropdownId === entry.id ? null : entry.id)}
                                    className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                                  >
                                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                    </svg>
                                  </button>
                                  {openDropdownId === entry.id && (
                                    <div className="absolute right-0 z-10 mt-1 w-32 rounded-lg border border-white/20 bg-[#0b1220] py-1 shadow-lg">
                                      <button
                                        onClick={() => {
                                          // TODO: Implement edit functionality
                                          setOpenDropdownId(null);
                                          alert("Edit functionality coming soon!");
                                        }}
                                        className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/10"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDeleteTransaction(entry.id)}
                                        className="block w-full px-3 py-2 text-left text-sm text-rose-300 hover:bg-rose-500/10"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-sm text-zinc-400">
                <p>
                  Page {totalPages === 0 ? 0 : currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-zinc-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage >= totalPages}
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-zinc-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </article>
          </section>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {isAddTransactionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-[#0b1220] p-6 shadow-2xl">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-zinc-100">Add New Transaction</h3>
              <p className="text-sm text-zinc-400">Fill in the details below to add a transaction</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-400 focus:outline-none"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Type</label>
                <select
                  value={newTransaction.type}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, type: e.target.value as "income" | "expense" }))}
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-zinc-100 focus:border-emerald-400 focus:outline-none"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Category</label>
                <input
                  type="text"
                  value={newTransaction.category}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-400 focus:outline-none"
                  placeholder="e.g., Food, Salary, Transport"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Date</label>
                <input
                  type="date"
                  value={newTransaction.transaction_date}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, transaction_date: e.target.value }))}
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-zinc-100 focus:border-emerald-400 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Notes (Optional)</label>
                <textarea
                  value={newTransaction.notes}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-400 focus:outline-none resize-none"
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setIsAddTransactionModalOpen(false)}
                className="flex-1 rounded-lg border border-white/20 bg-white/5 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTransaction}
                className="flex-1 rounded-lg bg-emerald-500 py-2 text-sm font-medium text-white transition hover:bg-emerald-600"
              >
                Add Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
