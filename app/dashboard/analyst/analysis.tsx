"use client";

import { TrendingUp } from "lucide-react";
import {
  LabelList,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useMemo, useState } from "react";
import { getUser } from "../../../lib/authService";
import { getTransactionSheet } from "../../../lib/transactionService";
import Menu from "../../ui/menu";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../../components/ui/chart";

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

export default function Analysis() {
  const [email, setEmail] = useState("guest@local");
  const [displayName, setDisplayName] = useState("Guest User");
  const [role, setRole] = useState("viewer");
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<TransactionEntry[]>([]);
  const [activeChart, setActiveChart] = useState<"income" | "expense">(
    "income",
  );
  const [barChartType, setBarChartType] = useState<"stacked" | "grouped">(
    "stacked",
  );

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
        console.error("Failed to load transactions:", error);
        return;
      }

      setTransactions(data as TransactionEntry[]);
    }

    loadTransactions();
  }, []);

  const categoryData = useMemo(() => {
    const categoryMap = new Map<string, number>();

    transactions.forEach((entry) => {
      const current = categoryMap.get(entry.category) || 0;
      categoryMap.set(entry.category, current + Number(entry.amount || 0));
    });

    const categories = [...categoryMap.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    // Enhanced color palette with more variety
    const colors = [
      "hsl(220, 70%, 50%)", // Blue
      "hsl(160, 60%, 45%)", // Green
      "hsl(30, 80%, 55%)", // Orange
      "hsl(280, 65%, 60%)", // Purple
      "hsl(340, 75%, 55%)", // Pink
      "hsl(190, 70%, 50%)", // Cyan
      "hsl(50, 85%, 60%)", // Yellow
      "hsl(10, 75%, 55%)", // Red
      "hsl(120, 60%, 45%)", // Lime
      "hsl(260, 70%, 55%)", // Indigo
    ];

    const total = categories.reduce((sum, item) => sum + item.amount, 0);

    return categories.map((item, index) => ({
      category: item.category,
      amount: item.amount,
      percentage: total > 0 ? ((item.amount / total) * 100).toFixed(1) : "0",
      fill: colors[index % colors.length],
      count: transactions.filter((t) => t.category === item.category).length,
    }));
  }, [transactions]);

  const chartConfig = useMemo(() => {
    const config: Record<string, any> = {
      amount: {
        label: "Amount",
      },
    };

    categoryData.forEach((item, index) => {
      config[item.category.toLowerCase().replace(/\s+/g, "")] = {
        label: item.category,
        color: item.fill,
      };
    });

    return config;
  }, [categoryData]);

  const totalAmount = useMemo(() => {
    return categoryData.reduce((sum, item) => sum + item.amount, 0);
  }, [categoryData]);

  const transactionStats = useMemo(() => {
    const income = transactions.filter((t) => t.type === "income").length;
    const expenses = transactions.filter((t) => t.type === "expense").length;
    const totalTransactions = transactions.length;

    return {
      income,
      expenses,
      total: totalTransactions,
      avgAmount: totalAmount / totalTransactions || 0,
    };
  }, [transactions, totalAmount]);

  const barChartData = useMemo(() => {
    const monthlyData = new Map<string, { income: number; expense: number }>();

    transactions.forEach((t) => {
      const date = new Date(t.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const current = monthlyData.get(monthKey) || { income: 0, expense: 0 };
      if (t.type === "income") {
        current.income += t.amount;
      } else {
        current.expense += t.amount;
      }
      monthlyData.set(monthKey, current);
    });

    return Array.from(monthlyData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        income: data.income,
        expense: data.expense,
      }));
  }, [transactions]);

  const barChartConfig = {
    income: {
      label: "Income",
      color: "hsl(142, 76%, 36%)",
    },
    expense: {
      label: "Expense",
      color: "hsl(0, 84%, 60%)",
    },
  };

  const barTotal = useMemo(
    () => ({
      income: barChartData.reduce((acc, curr) => acc + curr.income, 0),
      expense: barChartData.reduce((acc, curr) => acc + curr.expense, 0),
    }),
    [barChartData],
  );

  const radialChartData = useMemo(() => {
    return categoryData.slice(0, 5).map((item, index) => ({
      category: item.category,
      amount: item.amount,
      percentage: item.percentage,
      fill: item.fill,
    }));
  }, [categoryData]);

  const topCategories = useMemo(() => {
    return categoryData.slice(0, 3);
  }, [categoryData]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070b14] p-4 text-zinc-100 md:p-8">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-zinc-400">Loading...</div>
        </div>
      </main>
    );
  }

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
                  Analytics Dashboard
                </h2>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <Card className="flex flex-col bg-[#0b1220] border-white/10 text-zinc-100">
                <CardHeader className="items-center pb-0">
                  <CardTitle className="text-zinc-100 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-purple-500"></div>
                    Category Distribution
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    Transaction amounts by category with percentages
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 pb-0">
                  <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square max-h-[350px] [&_.recharts-text]:fill-zinc-100"
                  >
                    <PieChart>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            nameKey="amount"
                            hideLabel
                            formatter={(value: any, name: any, props: any) => [
                              `${money.format(Number(value))}`,
                              `${props.payload?.category} (${props.payload?.percentage}%)`,
                            ]}
                          />
                        }
                      />
                      <Pie
                        data={categoryData}
                        dataKey="amount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={40}
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth={2}
                      >
                        <LabelList
                          dataKey="percentage"
                          position="inside"
                          className="fill-white font-semibold"
                          fontSize={11}
                          formatter={(value: any) => `${value}%`}
                        />
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                </CardContent>
                <CardFooter className="flex-col gap-2 text-sm">
                  <div className="flex items-center gap-2 leading-none font-medium text-zinc-100">
                    Total: {money.format(totalAmount)}
                    <TrendingUp className="h-4 w-4 text-green-400" />
                  </div>
                  <div className="leading-none text-zinc-400">
                    {categoryData.length} categories • {transactions.length}{" "}
                    transactions
                  </div>
                </CardFooter>
              </Card>

              <Card className="flex flex-col bg-[#0b1220] border-white/10 text-zinc-100">
                <CardHeader className="items-center pb-0">
                  <CardTitle className="text-zinc-100 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500"></div>
                    Category Details
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    Detailed breakdown with transaction counts
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-3 max-h-[350px] overflow-y-auto">
                    {categoryData.map((item, index) => (
                      <div
                        key={item.category}
                        className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-white/[0.02] to-white/[0.05] border border-white/[0.05] hover:border-white/[0.1] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full shadow-sm"
                            style={{ backgroundColor: item.fill }}
                          />
                          <div>
                            <p className="font-medium text-zinc-100 text-sm">
                              {item.category}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {item.count} transactions
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-zinc-100 text-sm">
                            {money.format(item.amount)}
                          </p>
                          <p className="text-xs text-zinc-400">
                            {item.percentage}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="text-xs text-zinc-500">
                  Click categories in the chart for detailed view
                </CardFooter>
              </Card>

              <Card className="flex flex-col bg-[#0b1220] border-white/10 text-zinc-100">
                <CardHeader className="items-center pb-0">
                  <CardTitle className="text-zinc-100 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-400 to-red-500"></div>
                    Top Categories Radial
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    Radial view of top 5 categories by amount
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 pb-0">
                  <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square max-h-[300px] [&_.recharts-text]:fill-zinc-100"
                  >
                    <RadialBarChart
                      data={radialChartData}
                      startAngle={-90}
                      endAngle={380}
                      innerRadius={30}
                      outerRadius={110}
                    >
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            hideLabel
                            nameKey="category"
                            formatter={(value: any, name: any, props: any) => [
                              `${money.format(Number(props.payload?.amount))}`,
                              `${value} (${props.payload?.percentage}%)`,
                            ]}
                          />
                        }
                      />
                      <RadialBar
                        dataKey="amount"
                        background
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth={1}
                      >
                        <LabelList
                          position="insideStart"
                          dataKey="category"
                          className="fill-white capitalize mix-blend-luminosity"
                          fontSize={10}
                          formatter={(value: any) =>
                            value.length > 8
                              ? value.substring(0, 8) + "..."
                              : value
                          }
                        />
                      </RadialBar>
                    </RadialBarChart>
                  </ChartContainer>
                </CardContent>
                <CardFooter className="flex-col gap-2 text-sm">
                  <div className="flex items-center gap-2 leading-none font-medium text-zinc-100">
                    Top 5 Categories
                    <TrendingUp className="h-4 w-4 text-orange-400" />
                  </div>
                  <div className="leading-none text-zinc-400">
                    Radial visualization of spending patterns
                  </div>
                </CardFooter>
              </Card>
            </div>

            {/* Additional Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-[#0b1220] border-white/10 text-zinc-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    Top Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-zinc-100">
                    {topCategories[0]?.category || "N/A"}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    {topCategories[0]
                      ? `${topCategories[0].percentage}% of total`
                      : "No data"}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#0b1220] border-white/10 text-zinc-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    Transaction Types
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-400">
                        {transactionStats.income}
                      </div>
                      <p className="text-xs text-zinc-500">Income</p>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-400">
                        {transactionStats.expenses}
                      </div>
                      <p className="text-xs text-zinc-500">Expenses</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#0b1220] border-white/10 text-zinc-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                    Average Amount
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-zinc-100">
                    {money.format(transactionStats.avgAmount)}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">Per transaction</p>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Trends Bar Chart */}
            <Card className="flex flex-col bg-[#0b1220] border-white/10 text-zinc-100 mt-6">
              <CardHeader className="items-center pb-0">
                <div className="flex items-center justify-between w-full">
                  <div>
                    <CardTitle className="text-zinc-100 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-400 to-red-500"></div>
                      Monthly Trends
                    </CardTitle>
                    <CardDescription className="text-zinc-400">
                      Income vs Expenses over time
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setBarChartType("stacked")}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        barChartType === "stacked"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-white/5 text-zinc-400 hover:bg-white/10"
                      }`}
                    >
                      Stacked
                    </button>
                    <button
                      onClick={() => setBarChartType("grouped")}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        barChartType === "grouped"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-white/5 text-zinc-400 hover:bg-white/10"
                      }`}
                    >
                      Grouped
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 pb-0">
                <ChartContainer
                  config={barChartConfig}
                  className="mx-auto aspect-auto h-[450px] w-full"
                >
                  <BarChart
                    accessibilityLayer
                    data={barChartData}
                    margin={{
                      left: 12,
                      right: 12,
                      top: 20,
                      bottom: 20,
                    }}
                    barCategoryGap={barChartType === "grouped" ? "20%" : "10%"}
                  >
                    <CartesianGrid
                      vertical={false}
                      stroke="rgba(255,255,255,0.1)"
                    />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      tick={{ fill: "#a1a1aa", fontSize: 12 }}
                      tickFormatter={(value) => {
                        const [year, month] = value.split("-");
                        const date = new Date(
                          parseInt(year),
                          parseInt(month) - 1,
                        );
                        return date.toLocaleDateString("en-US", {
                          month: "short",
                        });
                      }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#a1a1aa", fontSize: 12 }}
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          className="w-[250px] bg-[#1a1a2e] border-white/20"
                          labelFormatter={(value: any) => {
                            const [year, month] = value.split("-");
                            const date = new Date(
                              parseInt(year),
                              parseInt(month) - 1,
                            );
                            return date.toLocaleDateString("en-US", {
                              month: "long",
                              year: "numeric",
                            });
                          }}
                          formatter={(value: any, name: any, props: any) => {
                            const numValue = Number(value);
                            const monthData = props?.payload;
                            const net = monthData
                              ? monthData.income - monthData.expense
                              : 0;
                            return [
                              <div key={name} className="flex flex-col gap-1">
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-zinc-300">
                                    {name === "income" ? "Income" : "Expenses"}:
                                  </span>
                                  <span
                                    className={`font-semibold ${name === "income" ? "text-emerald-400" : "text-red-400"}`}
                                  >
                                    {money.format(numValue)}
                                  </span>
                                </div>
                                {name === "expense" && (
                                  <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-1">
                                    <span className="text-zinc-400 text-xs">
                                      Net:
                                    </span>
                                    <span
                                      className={`font-semibold text-xs ${net >= 0 ? "text-emerald-400" : "text-red-400"}`}
                                    >
                                      {money.format(net)}
                                    </span>
                                  </div>
                                )}
                              </div>,
                            ];
                          }}
                        />
                      }
                    />
                    <Bar
                      dataKey="income"
                      fill="var(--color-income)"
                      stackId={barChartType === "stacked" ? "a" : undefined}
                      radius={
                        barChartType === "stacked" ? [0, 0, 4, 4] : [2, 2, 0, 0]
                      }
                      name="income"
                    />
                    <Bar
                      dataKey="expense"
                      fill="var(--color-expense)"
                      stackId={barChartType === "stacked" ? "a" : undefined}
                      radius={
                        barChartType === "stacked" ? [4, 4, 0, 0] : [2, 2, 0, 0]
                      }
                      name="expense"
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="flex-col gap-2 text-sm">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-4 leading-none font-medium text-zinc-100">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: "hsl(142, 76%, 36%)" }}
                      ></div>
                      <span>Total Income: {money.format(barTotal.income)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: "hsl(0, 84%, 60%)" }}
                      ></div>
                      <span>
                        Total Expenses: {money.format(barTotal.expense)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-semibold ${barTotal.income - barTotal.expense >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      Net: {money.format(barTotal.income - barTotal.expense)}
                    </div>
                  </div>
                </div>
                <div className="leading-none text-zinc-400 text-center">
                  {barChartType === "stacked"
                    ? "Stacked view: Total height shows combined income + expenses"
                    : "Grouped view: Side-by-side comparison of income vs expenses"}
                </div>
              </CardFooter>
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}
