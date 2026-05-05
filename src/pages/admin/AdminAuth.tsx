import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Min 6 characters").max(72),
});

const AdminAuth = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Admin Login";
  }, []);

  if (!loading && user && isAdmin) return <Navigate to="/admin" replace />;
  if (!loading && user && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <h1 className="text-xl font-light">Access denied</h1>
        <p className="text-muted-foreground text-sm">Your account is not an admin.</p>
        <Button onClick={() => supabase.auth.signOut()} variant="outline">Sign out</Button>
      </div>
    );
  }

  const handleSubmit = async (mode: "signin" | "signup") => {
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        toast.success("Account created. Signing in…");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
      }
      navigate("/admin");
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-light text-center mb-2">Admin Access</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Authorized administrators only
        </p>
        <Tabs defaultValue="signin">
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          {(["signin", "signup"] as const).map((mode) => (
            <TabsContent key={mode} value={mode} className="space-y-4">
              <div>
                <Label htmlFor={`${mode}-email`}>Email</Label>
                <Input
                  id={`${mode}-email`}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div>
                <Label htmlFor={`${mode}-password`}>Password</Label>
                <Input
                  id={`${mode}-password`}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
              </div>
              <Button
                className="w-full"
                disabled={submitting}
                onClick={() => handleSubmit(mode)}
              >
                {submitting ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
              </Button>
            </TabsContent>
          ))}
        </Tabs>
      </Card>
    </div>
  );
};

export default AdminAuth;
