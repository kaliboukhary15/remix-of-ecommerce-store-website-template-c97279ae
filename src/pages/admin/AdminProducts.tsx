import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, X, Upload } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  cost_price: number | null;
  quantity: number;
  type: "gold" | "diamond";
  sold_out: boolean;
  featured: boolean;
}

interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
}

const empty = {
  name: "",
  description: "",
  price: "",
  cost_price: "",
  quantity: "",
  type: "gold" as "gold" | "diamond",
  featured: false,
};

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<Record<string, ProductImage[]>>({});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(empty);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "Admin Products";
    load();
  }, []);

  const load = async () => {
    const { data: prods } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    setProducts((prods as Product[]) ?? []);
    if (prods?.length) {
      const { data: imgs } = await supabase
        .from("product_images")
        .select("*")
        .in("product_id", prods.map((p: any) => p.id));
      const map: Record<string, ProductImage[]> = {};
      (imgs ?? []).forEach((i: any) => {
        map[i.product_id] = [...(map[i.product_id] ?? []), i];
      });
      setImages(map);
    }
  };

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setPendingFiles([]);
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description ?? "",
      price: String(p.price),
      cost_price: String(p.cost_price ?? ""),
      quantity: String(p.quantity),
      type: p.type,
      featured: p.featured,
    });
    setPendingFiles([]);
    setOpen(true);
  };

  const uploadImages = async (productId: string, files: File[]) => {
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `${productId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: false });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      const sortOrder = (images[productId]?.length ?? 0);
      await supabase.from("product_images").insert({
        product_id: productId,
        image_url: urlData.publicUrl,
        sort_order: sortOrder,
        caption: file.name.replace(/\.[^.]+$/, ""),
      });
    }
  };

  const save = async () => {
    if (!form.name.trim() || !form.price) {
      toast.error("Name and price are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        cost_price: form.cost_price ? Number(form.cost_price) : 0,
        quantity: Number(form.quantity || 0),
        type: form.type,
        featured: form.featured,
      };
      let productId: string;
      if (editing) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (error) throw error;
        productId = editing.id;
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;
        productId = data.id;
      }
      if (pendingFiles.length) await uploadImages(productId, pendingFiles);
      toast.success(editing ? "Product updated" : "Product created");
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Product) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const removeImage = async (img: ProductImage) => {
    const { error } = await supabase.from("product_images").delete().eq("id", img.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-light">Products</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Add Product</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p) => {
          const imgs = images[p.id] ?? [];
          return (
            <Card key={p.id} className="overflow-hidden">
              <div className="aspect-square bg-muted relative">
                {imgs[0] ? (
                  <img src={imgs[0].image_url} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                    No image
                  </div>
                )}
                {p.sold_out && (
                  <Badge className="absolute top-2 right-2" variant="destructive">Sold Out</Badge>
                )}
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{p.name}</h3>
                    <p className="text-sm text-muted-foreground capitalize">{p.type}</p>
                  </div>
                  <p className="font-light">${Number(p.price).toFixed(2)}</p>
                </div>
                <p className="text-xs text-muted-foreground">Stock: {p.quantity}</p>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => remove(p)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {imgs.length > 1 && (
                  <div className="flex gap-1 pt-2 flex-wrap">
                    {imgs.slice(1).map((img) => (
                      <div key={img.id} className="relative w-12 h-12">
                        <img src={img.image_url} className="w-full h-full object-cover rounded" alt="" />
                        <button
                          onClick={() => removeImage(img)}
                          className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Product" : "New Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Description / Caption</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price ($)</Label>
                <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <Label>Cost Price ($)</Label>
                <Input type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity</Label>
                <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v: "gold" | "diamond") => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="diamond">Diamond</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Add Images</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setPendingFiles(Array.from(e.target.files ?? []))}
              />
              {pendingFiles.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{pendingFiles.length} file(s) selected</p>
              )}
            </div>
            <Button onClick={save} disabled={saving} className="w-full">
              <Upload className="h-4 w-4 mr-2" /> {saving ? "Saving…" : "Save Product"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProducts;
