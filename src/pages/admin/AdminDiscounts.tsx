import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Discount {
  id: string;
  name: string;
  percent_off: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

const AdminDiscounts = () => {
  const [list, setList] = useState<Discount[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [form, setForm] = useState({ name: "", percent_off: "", active: true });

  useEffect(() => { document.title = "Admin Discounts"; load(); }, []);

  const load = async () => {
    const { data } = await supabase.from("discounts").select("*").order("created_at", { ascending: false });
    setList((data as Discount[]) ?? []);
  };

  const openNew = () => { setEditing(null); setForm({ name: "", percent_off: "", active: true }); setOpen(true); };
  const openEdit = (d: Discount) => {
    setEditing(d);
    setForm({ name: d.name, percent_off: String(d.percent_off), active: d.active });
    setOpen(true);
  };

  const save = async () => {
    const pct = Number(form.percent_off);
    if (!form.name || !pct || pct <= 0 || pct > 100) return toast.error("Invalid input");
    const payload = { name: form.name, percent_off: pct, active: form.active };
    const { error } = editing
      ? await supabase.from("discounts").update(payload).eq("id", editing.id)
      : await supabase.from("discounts").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setOpen(false);
    load();
  };

  const remove = async (d: Discount) => {
    if (!confirm(`Delete "${d.name}"?`)) return;
    const { error } = await supabase.from("discounts").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-light">Discounts</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Add Discount</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((d) => (
          <Card key={d.id} className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{d.name}</h3>
                <p className="text-2xl font-light mt-2">{d.percent_off}% off</p>
                <p className="text-xs text-muted-foreground mt-1">{d.active ? "Active" : "Inactive"}</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => openEdit(d)}><Pencil className="h-3 w-3" /></Button>
                <Button size="sm" variant="outline" onClick={() => remove(d)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Discount</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Percent off (1-100)</Label><Input type="number" value={form.percent_off} onChange={(e) => setForm({ ...form, percent_off: e.target.value })} /></div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={form.active} onCheckedChange={(c) => setForm({ ...form, active: c })} />
            </div>
            <Button onClick={save} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDiscounts;
