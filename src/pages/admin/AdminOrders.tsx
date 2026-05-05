import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: string;
  status: "pending" | "confirmed" | "cancelled";
  total: number;
  created_at: string;
  notes: string | null;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<Record<string, OrderItem[]>>({});
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "cancelled">("all");

  useEffect(() => {
    document.title = "Admin Orders";
    load();
    const ch = supabase
      .channel("orders-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const load = async () => {
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    setOrders((data as Order[]) ?? []);
    if (data?.length) {
      const { data: oi } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", data.map((o: any) => o.id));
      const map: Record<string, OrderItem[]> = {};
      (oi ?? []).forEach((i: any) => {
        map[i.order_id] = [...(map[i.order_id] ?? []), i];
      });
      setItems(map);
    }
  };

  const updateStatus = async (id: string, status: "confirmed" | "cancelled") => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Order ${status}`);
    load();
  };

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-light mb-6">Orders</h1>
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-4">
        {filtered.length === 0 && <p className="text-muted-foreground">No orders.</p>}
        {filtered.map((o) => (
          <Card key={o.id} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="font-medium">{o.customer_name}</p>
                <p className="text-sm text-muted-foreground">{o.customer_email}</p>
                {o.customer_phone && <p className="text-sm text-muted-foreground">{o.customer_phone}</p>}
                <p className="text-sm text-muted-foreground">{o.shipping_address}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(o.created_at).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <Badge variant={o.status === "confirmed" ? "default" : o.status === "cancelled" ? "destructive" : "secondary"}>
                  {o.status}
                </Badge>
                <p className="text-lg font-light mt-2">${Number(o.total).toFixed(2)}</p>
              </div>
            </div>
            <div className="border-t pt-4 space-y-1">
              {(items[o.id] ?? []).map((it) => (
                <div key={it.id} className="flex justify-between text-sm">
                  <span>{it.product_name} × {it.quantity}</span>
                  <span>${(Number(it.unit_price) * it.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            {o.status === "pending" && (
              <div className="flex gap-2 mt-4">
                <Button size="sm" onClick={() => updateStatus(o.id, "confirmed")}>Confirm</Button>
                <Button size="sm" variant="outline" onClick={() => updateStatus(o.id, "cancelled")}>Cancel</Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminOrders;
