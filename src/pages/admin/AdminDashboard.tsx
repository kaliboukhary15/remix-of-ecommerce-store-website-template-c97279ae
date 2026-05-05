import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Package, ShoppingCart, AlertCircle, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ products: 0, pending: 0, soldOut: 0, revenue: 0 });

  useEffect(() => {
    document.title = "Admin Dashboard";
    const load = async () => {
      const [{ count: products }, { count: pending }, { count: soldOut }, { data: confirmed }] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("sold_out", true),
        supabase.from("orders").select("total").eq("status", "confirmed"),
      ]);
      const revenue = (confirmed ?? []).reduce((s, o: any) => s + Number(o.total ?? 0), 0);
      setStats({
        products: products ?? 0,
        pending: pending ?? 0,
        soldOut: soldOut ?? 0,
        revenue,
      });
    };
    load();
  }, []);

  const cards = [
    { label: "Products", value: stats.products, icon: Package, to: "/admin/products" },
    { label: "Pending Orders", value: stats.pending, icon: ShoppingCart, to: "/admin/orders" },
    { label: "Sold Out", value: stats.soldOut, icon: AlertCircle, to: "/admin/products" },
    { label: "Revenue", value: `$${stats.revenue.toFixed(2)}`, icon: DollarSign, to: "/admin/reports" },
  ];

  return (
    <div className="p-8">
      <h1 className="text-3xl font-light mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to}>
            <Card className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <c.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-2xl font-light">{c.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{c.label}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
