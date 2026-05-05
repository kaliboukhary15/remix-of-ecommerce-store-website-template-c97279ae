import { ReactNode, useEffect, useState } from "react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Package, ShoppingCart, Tag, BarChart3, LogOut, Bell } from "lucide-react";
import { toast } from "sonner";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/discounts", label: "Discounts", icon: Tag },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
];

const AdminLayout = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchPending = async () => {
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      setPendingCount(count ?? 0);
    };
    fetchPending();

    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        fetchPending();
        if (payload.eventType === "INSERT") {
          toast.success("New order received!", {
            description: `From ${(payload.new as any).customer_name}`,
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  if (!user) return <Navigate to="/admin/auth" replace />;
  if (!isAdmin) return <Navigate to="/admin/auth" replace />;

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/auth");
  };

  return (
    <div className="min-h-screen flex bg-muted/30">
      <aside className="w-64 bg-background border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-light">Admin Panel</h1>
          <p className="text-xs text-muted-foreground mt-1 truncate">{user.email}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-accent"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {item.label === "Orders" && pendingCount > 0 && (
                <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <Button variant="outline" className="w-full" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
