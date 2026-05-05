import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Period = "daily" | "weekly" | "monthly" | "yearly";

const periodStart = (p: Period) => {
  const d = new Date();
  if (p === "daily") d.setHours(0, 0, 0, 0);
  else if (p === "weekly") d.setDate(d.getDate() - 7);
  else if (p === "monthly") d.setMonth(d.getMonth() - 1);
  else d.setFullYear(d.getFullYear() - 1);
  return d.toISOString();
};

const AdminReports = () => {
  const [period, setPeriod] = useState<Period>("monthly");
  const [orders, setOrders] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [soldOutCount, setSoldOutCount] = useState(0);

  useEffect(() => { document.title = "Admin Reports"; }, []);

  useEffect(() => {
    (async () => {
      const start = periodStart(period);
      const { data: ords } = await supabase
        .from("orders")
        .select("id,total,status,created_at")
        .gte("created_at", start)
        .eq("status", "confirmed");
      setOrders(ords ?? []);

      if (ords?.length) {
        const { data: oi } = await supabase
          .from("order_items")
          .select("product_name,quantity,unit_price,cost_price,product_type")
          .in("order_id", ords.map((o: any) => o.id));
        setItems(oi ?? []);
      } else {
        setItems([]);
      }

      const { count } = await supabase.from("products").select("*", { count: "exact", head: true }).eq("sold_out", true);
      setSoldOutCount(count ?? 0);
    })();
  }, [period]);

  const stats = useMemo(() => {
    const totalSales = orders.reduce((s, o) => s + Number(o.total ?? 0), 0);
    const totalProfit = items.reduce(
      (s, i) => s + (Number(i.unit_price) - Number(i.cost_price ?? 0)) * Number(i.quantity),
      0
    );
    const productSales: Record<string, number> = {};
    const typeSales: Record<string, number> = {};
    items.forEach((i) => {
      productSales[i.product_name] = (productSales[i.product_name] ?? 0) + Number(i.quantity);
      if (i.product_type) typeSales[i.product_type] = (typeSales[i.product_type] ?? 0) + Number(i.quantity);
    });
    const topProducts = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const bestCategory = Object.entries(typeSales).sort((a, b) => b[1] - a[1])[0];
    return { totalSales, totalProfit, totalOrders: orders.length, topProducts, bestCategory };
  }, [orders, items]);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-light mb-6">Reports</h1>
      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)} className="mb-8">
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="yearly">Yearly</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Total Sales</p>
          <p className="text-2xl font-light mt-2">${stats.totalSales.toFixed(2)}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Total Profit</p>
          <p className="text-2xl font-light mt-2">${stats.totalProfit.toFixed(2)}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Orders</p>
          <p className="text-2xl font-light mt-2">{stats.totalOrders}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Sold Out Products</p>
          <p className="text-2xl font-light mt-2">{soldOutCount}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="font-medium mb-4">Most Sold Products</h3>
          {stats.topProducts.length === 0 && <p className="text-sm text-muted-foreground">No data</p>}
          <div className="space-y-2">
            {stats.topProducts.map(([name, qty]) => (
              <div key={name} className="flex justify-between text-sm">
                <span>{name}</span>
                <span className="text-muted-foreground">{qty} sold</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-medium mb-4">Best Selling Category</h3>
          {stats.bestCategory ? (
            <div>
              <p className="text-2xl font-light capitalize">{stats.bestCategory[0]}</p>
              <p className="text-sm text-muted-foreground">{stats.bestCategory[1]} units sold</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data</p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminReports;
