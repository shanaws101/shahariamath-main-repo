import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Mail, Lock, User, Phone, ArrowLeft, PartyPopper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function AdminSignupPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const inviteEmail = searchParams.get('email') || '';
  const isInvite = !!inviteEmail;
  
  const [formData, setFormData] = useState({
    name: '',
    email: inviteEmail,
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (inviteEmail) {
      setFormData(prev => ({ ...prev, email: inviteEmail }));
    }
  }, [inviteEmail]);

  if (!isInvite) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Password mismatch", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (formData.password.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { full_name: formData.name, phone: formData.phone, role: 'employee' },
          emailRedirectTo: 'https://olisaharacademy.com/admin',
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast({ title: "Account exists", description: "This email is already registered. Please login instead.", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        throw error;
      }

      if (data.user) {
        await supabase.from('profiles').insert({
          user_id: data.user.id,
          full_name: formData.name,
          phone: formData.phone,
          email: formData.email,
          student_id: null,
          department: null,
          year: null,
        });

        toast({
          title: "Account created!",
          description: "Please check your email to verify, then log in.",
        });
        navigate('/admin/login');
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create account.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left decorative panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-primary/10 via-primary/5 to-background items-center justify-center p-12">
        <div className="max-w-sm text-center">
          <img src="/logo.png" alt="Shaharia Math" className="w-20 h-20 rounded-2xl object-contain mx-auto mb-6 shadow-lg" width={80} height={80} />
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight mb-3">Welcome to the Team!</h2>
          <p className="text-sm text-muted-foreground">Complete your registration to join the Shaharia Math staff.</p>
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
              <h1 className="text-xl font-extrabold tracking-tight">Employee Registration</h1>
              <p className="text-sm text-muted-foreground mt-1">Create your account to access the admin panel</p>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="name" placeholder="Enter your full name" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} className="pl-10 h-12 rounded-xl" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" value={formData.email} className="pl-10 h-12 rounded-xl bg-muted cursor-not-allowed" readOnly required />
                </div>
                <p className="text-xs text-muted-foreground">This email was set by your admin and cannot be changed.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="phone" type="tel" placeholder="01XXXXXXXXX" value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} className="pl-10 h-12 rounded-xl" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type="password" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))} className="pl-10 h-12 rounded-xl" required minLength={6} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="confirmPassword" type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))} className="pl-10 h-12 rounded-xl" required minLength={6} />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-sm">
                <p className="font-semibold text-foreground flex items-center gap-1.5"><PartyPopper className="h-4 w-4 text-primary" /> Employee Invitation</p>
                <p className="text-xs mt-1 text-muted-foreground">
                  You've been invited to join the Shaharia Math team. Complete this form to activate your account.
                </p>
              </div>

              <Button type="submit" className="w-full h-14 rounded-2xl text-base font-bold bg-gradient-brand hover:opacity-90" disabled={isLoading}>
                {isLoading ? "Creating Account..." : "Create Employee Account"}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t space-y-2 text-center text-sm">
              <p className="text-muted-foreground">
                Already have an account?{' '}
                <Link to="/admin/login" className="text-primary hover:underline font-medium">Sign In</Link>
              </p>
              <Link to="/" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
