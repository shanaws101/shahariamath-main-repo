import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft, ArrowRight, Phone, Loader2, ShieldCheck, Smartphone, GraduationCap, Copy, Check } from "lucide-react";
import { AuthMobileHero } from "@/components/auth/AuthMobileHero";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const { t, isEnglish } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startWebOtpListener = useCallback(() => {
    if (!('OTPCredential' in window)) return;
    abortControllerRef.current?.abort();
    const ac = new AbortController();
    abortControllerRef.current = ac;
    navigator.credentials.get({
      // @ts-ignore - Web OTP API types
      otp: { transport: ['sms'] },
      signal: ac.signal,
    } as any).then((credential: any) => {
      if (credential && credential.code) {
        const code = String(credential.code).trim();
        if (code.length === 6) setOtp(code);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    return () => { abortControllerRef.current?.abort(); };
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const callOtpFunction = async (body: Record<string, string>) => {
    const { data, error } = await supabase.functions.invoke("send-otp", { body });
    if (error) {
      // Edge function returned non-2xx; try to extract server-provided error
      const serverData = (error as any)?.context && typeof (error as any).context.json === "function"
        ? await (error as any).context.json().catch(() => null)
        : null;
      return { data: serverData || { error: error.message }, ok: false };
    }
    return { data, ok: true };
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      toast({ title: "Invalid phone", description: "Please enter a valid phone number.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { data, ok } = await callOtpFunction({ phone, action: "send" });
      if (!ok) {
        toast({ title: "Error", description: data.error || "Failed to send OTP", variant: "destructive" });
      } else {
        setStep('otp');
        setCountdown(60);
        startWebOtpListener();
        toast({ title: t('auth.otpSent'), description: "Check your phone for the 6-digit code." });
      }
    } catch {
      toast({ title: "Error", description: "Failed to send OTP. Please try again.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data, ok } = await callOtpFunction({ phone, action: "verify", code: otp });
      if (!ok) { toast({ title: "Error", description: data.error || "Verification failed", variant: "destructive" }); setIsLoading(false); return; }
      if (!data.verified) { toast({ title: "Invalid OTP", description: "Please enter the correct OTP.", variant: "destructive" }); setIsLoading(false); return; }
      if (!data.user_exists) { toast({ title: "Account not found", description: "No account found with this phone. Please sign up first.", variant: "destructive" }); setIsLoading(false); return; }

      if (data.token_hash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' });
        if (verifyError) { toast({ title: "Login failed", description: "Authentication failed. Please try again.", variant: "destructive" }); setIsLoading(false); return; }
        sessionStorage.setItem('login_method', 'phone');
        toast({ title: "Welcome back!", description: "You have been logged in successfully." });
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const redirectParam = new URLSearchParams(window.location.search).get('redirect');
          if (redirectParam && redirectParam.startsWith('/')) {
            navigate(redirectParam);
            return;
          }

          const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
          const roleList = roles?.map(r => r.role) || [];
          if (roleList.includes('student')) { navigate('/dashboard'); }
          else if (roleList.includes('admin')) { navigate('/admin'); }
          else if (roleList.includes('employee')) {
            const { data: emp } = await supabase.from('employees').select('id, employee_permissions(*)').eq('user_id', user.id).maybeSingle();
            const perms = (emp as any)?.employee_permissions?.[0];
            const hasAdminAccess = perms && Object.entries(perms).some(([key, val]) => key.startsWith('can_manage_') && val === true);
            navigate(hasAdminAccess ? '/admin' : '/employee');
          } else { navigate('/dashboard'); }
        }
      }
    } catch {
      toast({ title: "Error", description: "Verification failed. Please try again.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleResendOtp = useCallback(async () => {
    if (countdown > 0) return;
    setIsLoading(true);
    const { data, ok } = await callOtpFunction({ phone, action: "send" });
    if (ok) {
      toast({ title: "OTP resent", description: "Check your phone for the new code." });
      setOtp(''); setCountdown(60);
    } else { toast({ title: "Error", description: data.error, variant: "destructive" }); }
    setIsLoading(false);
  }, [phone, countdown]);

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Left decorative panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-brand relative overflow-hidden flex-col justify-between p-10">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-white/5 blur-3xl" />

        <Link to="/" className="relative z-10 inline-flex items-center gap-2.5">
          <img src="/logo.png" alt="Shaharia Math" className="w-12 h-12 rounded-xl object-contain bg-white/20 backdrop-blur p-1" width={48} height={48} />
          <span className="font-bold text-xl text-white tracking-tight">Shaharia Math</span>
        </Link>

        <div className="relative z-10 space-y-8">
          <h2 className="text-3xl font-extrabold text-white leading-tight tracking-tight">
            {isEnglish ? "Welcome back to your academy." : "আপনার একাডেমিতে আবার স্বাগতম।"}
          </h2>
          <p className="text-white/70 text-sm leading-relaxed max-w-sm">
            {isEnglish
              ? "Log in with your phone OTP — fast, secure, and seamless. Pick up right where you left off."
              : "ফোন OTP দিয়ে লগইন করুন — দ্রুত, নিরাপদ এবং স্মুথ। যেখানে ছেড়েছিলেন সেখান থেকেই শুরু করুন।"}
          </p>
          <div className="space-y-3">
            {[
              { icon: ShieldCheck, en: "Secure OTP login", bn: "নিরাপদ OTP লগইন" },
              { icon: Smartphone, en: "Works on any phone", bn: "যেকোনো ফোনে কাজ করে" },
              { icon: GraduationCap, en: "9 academic tracks", bn: "৯টি একাডেমিক ট্র্যাক" },
            ].map((item) => (
              <div key={item.en} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <item.icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-white/80 text-sm">{isEnglish ? item.en : item.bn}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/40 text-xs">© 2026 Shaharia Math</p>
      </div>

      {/* Right form panel — mobile gets gradient hero on top */}
      <div className="flex-1 flex flex-col lg:items-center lg:justify-center lg:p-12">
        <AuthMobileHero
          title={isEnglish ? "Welcome back." : "আবার স্বাগতম।"}
          subtitle={
            isEnglish
              ? "Log in with your phone — fast, secure, seamless."
              : "ফোন দিয়ে লগইন করুন — দ্রুত, নিরাপদ, সহজ।"
          }
          features={[
            { icon: ShieldCheck, label: isEnglish ? "Secure OTP" : "নিরাপদ OTP" },
            { icon: Smartphone, label: isEnglish ? "Any phone" : "যেকোনো ফোন" },
            { icon: GraduationCap, label: isEnglish ? "9 tracks" : "৯টি ট্র্যাক" },
          ]}
        />

        <div className="w-full max-w-md mx-auto px-5 pt-6 pb-10 lg:px-0 lg:pt-0 lg:pb-0 space-y-7">
          <div>
            <h1 className="text-[1.65rem] leading-tight font-extrabold tracking-tight text-foreground md:text-3xl">
              {isEnglish ? "Log in to your account" : "আপনার অ্যাকাউন্টে লগইন করুন"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {step === 'phone'
                ? (isEnglish ? 'Enter your phone number to receive an OTP' : 'OTP পেতে আপনার ফোন নম্বর দিন')
                : (isEnglish ? 'Enter the 6-digit code sent to your phone' : 'আপনার ফোনে পাঠানো ৬-সংখ্যার কোড দিন')}
            </p>
          </div>


          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">{t('auth.phone')}</Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="01XXXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-11 h-12 rounded-xl border-border"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="btn-brand w-full h-14 rounded-2xl text-base font-bold gap-2" disabled={isLoading}>
                {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" />{t('common.loading')}</> : <>{isEnglish ? "Send OTP" : "OTP পাঠান"}<ArrowRight className="h-4 w-4" /></>}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="space-y-3">
                <Label className="text-sm font-medium">{t('auth.enterOtp')}</Label>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp} autoComplete="one-time-code" pasteTransformer={(text) => text.replace(/\D/g, '').slice(0, 6)}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  OTP sent to <span className="font-semibold text-foreground">{phone}</span>
                </p>
              </div>
              <Button type="submit" className="btn-brand w-full h-14 rounded-2xl text-base font-bold" disabled={isLoading || otp.length !== 6}>
                {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" />{t('common.loading')}</> : (isEnglish ? "Verify & Login" : "যাচাই করুন ও লগইন করুন")}
              </Button>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl gap-2" onClick={() => { setStep('phone'); setOtp(''); setCountdown(0); }}>
                  <ArrowLeft className="h-4 w-4" />
                  {t('auth.back')}
                </Button>
                <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl" disabled={isLoading || countdown > 0} onClick={handleResendOtp}>
                  {countdown > 0 ? `Resend (${countdown}s)` : 'Resend OTP'}
                </Button>
              </div>
            </form>
          )}

          <div className="text-center text-sm text-muted-foreground">
            {isEnglish ? "Don't have an account?" : "অ্যাকাউন্ট নেই?"}{' '}
            <Link to="/join" className="text-primary hover:underline font-semibold">
              {isEnglish ? "Sign up" : "সাইন আপ"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}