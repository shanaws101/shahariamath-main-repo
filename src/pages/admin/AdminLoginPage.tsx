import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Mail, Lock, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function AdminLoginPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Login failed", description: error.message, variant: "destructive" });
        return;
      }
      sessionStorage.setItem('login_method', 'email');
      toast({ title: "Welcome!", description: "You have been logged in successfully." });
      navigate('/admin', { replace: true });
    } catch {
      toast({ title: "Error", description: "Login failed. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left decorative panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-primary/10 via-primary/5 to-background items-center justify-center p-12">
        <div className="max-w-sm text-center">
          <img src="/logo.png" alt="Shaharia Math" className="w-20 h-20 rounded-2xl object-contain mx-auto mb-6 shadow-lg" width={80} height={80} />
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight mb-3">Shaharia Math</h2>
          <p className="text-sm text-muted-foreground">Staff & Admin Portal — Manage courses, students, and analytics from one place.</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <img src="/logo.png" alt="Shaharia Math" className="w-12 h-12 rounded-xl object-contain" width={48} height={48} />
              <span className="font-bold text-xl text-foreground tracking-tight">Shaharia Math</span>
            </Link>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 md:p-8 shadow-sm">
            <div className="text-center mb-6">
              <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-xl font-extrabold tracking-tight">Staff Login</h1>
              <p className="text-sm text-muted-foreground mt-1">Sign in to access the admin panel</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 rounded-xl"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 rounded-xl"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-14 rounded-2xl text-base font-bold bg-gradient-brand hover:opacity-90" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Student Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
