import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  ArrowLeft, ArrowRight, Phone, Loader2, ShieldCheck, ShieldAlert,
  Smartphone, GraduationCap, Lock, Eye, EyeOff, KeyRound, AlertTriangle, CheckCircle2
} from "lucide-react";
import { AuthMobileHero } from "@/components/auth/AuthMobileHero";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { generateDeviceFingerprint, getDeviceLabel } from "@/lib/deviceFingerprint";

type LoginStep = 'phone' | 'password' | 'otp' | 'set_password';

export default function LoginPage() {
  const { t, isEnglish } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState<LoginStep>('phone');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Set/Reset password step states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isResetFlow, setIsResetFlow] = useState(false);

  // OTP states
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Device & Account state
  const [authEmail, setAuthEmail] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [blockedInfo, setBlockedInfo] = useState<{ activeDevice: string; message: string } | null>(null);

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
      const serverData = (error as any)?.context && typeof (error as any).context.json === "function"
        ? await (error as any).context.json().catch(() => null)
        : null;
      return { data: serverData || { error: error.message }, ok: false };
    }
    return { data, ok: true };
  };

  const redirectAfterLogin = async (userId: string) => {
    // Record current device fingerprint into trusted_devices
    try {
      const fp = generateDeviceFingerprint();
      const label = getDeviceLabel();
      await supabase.from('trusted_devices').upsert({
        user_id: userId,
        device_fingerprint: fp,
        device_label: label,
        last_used_at: new Date().toISOString(),
        is_revoked: false,
      }, { onConflict: 'user_id,device_fingerprint' });
    } catch (e) {
      console.warn("Device registration notice:", e);
    }

    const redirectParam = new URLSearchParams(window.location.search).get('redirect');
    if (redirectParam && redirectParam.startsWith('/')) {
      navigate(redirectParam);
      return;
    }

    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', userId);
    const roleList = roles?.map(r => r.role) || [];
    if (roleList.includes('student')) {
      navigate('/dashboard');
    } else if (roleList.includes('admin')) {
      navigate('/admin');
    } else if (roleList.includes('employee')) {
      const { data: emp } = await supabase.from('employees').select('id, employee_permissions(*)').eq('user_id', userId).maybeSingle();
      const perms = (emp as any)?.employee_permissions?.[0];
      const hasAdminAccess = perms && Object.entries(perms).some(([key, val]) => key.startsWith('can_manage_') && val === true);
      navigate(hasAdminAccess ? '/admin' : '/employee');
    } else {
      navigate('/dashboard');
    }
  };

  // Step 1: Pre-check device & password status BEFORE sending any SMS
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      toast({ title: "Invalid phone", description: "Please enter a valid phone number.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setBlockedInfo(null);

    try {
      const fp = generateDeviceFingerprint();
      const { data: check, error: checkErr } = await supabase.rpc('check_student_device', {
        p_phone: phone,
        p_device_fp: fp,
      });

      if (checkErr) {
        console.error("Device check error:", checkErr);
        toast({ title: "Check failed", description: "Unable to verify device. Please try again.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      // Check device status
      if (check?.device_status === 'blocked') {
        setBlockedInfo({
          activeDevice: check.active_device || 'another device',
          message: check.message || 'This account is locked to your registered device.'
        });
        setIsLoading(false);
        return;
      }

      if (!check?.user_exists) {
        toast({
          title: "Account not found",
          description: "No account found with this phone number. Please sign up first.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      const email = check.auth_email || `s${cleanDigits}@shahariamath.com`;
      setAuthEmail(email);
      setHasPassword(Boolean(check.has_password));

      if (check.has_password) {
        // User has a password — prompt for password (0 SMS sent!)
        setStep('password');
      } else {
        // Legacy student without password — trigger OTP (1 SMS) and prompt to set password after login
        const { data: otpData, ok } = await callOtpFunction({
          phone,
          action: "send",
          device_fingerprint: fp,
        });

        if (!ok) {
          if (otpData?.device_blocked) {
            setBlockedInfo({
              activeDevice: otpData.active_device || 'another device',
              message: otpData.error || 'Device not authorized.',
            });
          } else {
            toast({ title: "Error", description: otpData.error || "Failed to send OTP", variant: "destructive" });
          }
        } else {
          setStep('otp');
          setCountdown(60);
          startWebOtpListener();
          toast({
            title: isEnglish ? "OTP sent to your phone" : "ফোনে OTP পাঠানো হয়েছে",
            description: isEnglish ? "Enter the 6-digit code to log in and set your password." : "লগইন করে পাসওয়ার্ড সেট করতে ৬ সংখ্যার কোডটি লিখুন।"
          });
        }
      }
    } catch (err: any) {
      console.error("Login initiation error:", err);
      toast({ title: "Error", description: "Failed to verify account. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2A: Password Login (Zero SMS!)
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast({ title: "Password required", description: "Please enter your password.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: password,
      });

      if (error) {
        toast({
          title: isEnglish ? "Login failed" : "লগইন ব্যর্থ হয়েছে",
          description: isEnglish ? "Incorrect password. Please try again or log in with SMS OTP." : "ভুল পাসওয়ার্ড। আবার চেষ্টা করুন অথবা SMS OTP দিয়ে লগইন করুন।",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      if (data.user) {
        sessionStorage.setItem('login_method', 'password');
        toast({ title: isEnglish ? "Welcome back!" : "আবার স্বাগতম!", description: isEnglish ? "Logged in successfully." : "সফলভাবে লগইন হয়েছে।" });
        await redirectAfterLogin(data.user.id);
      }
    } catch (err: any) {
      console.error("Password login error:", err);
      toast({ title: "Error", description: "Login failed. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Switch from Password to SMS OTP (for forgot password or backup)
  const handleRequestOtpFallback = async () => {
    setIsLoading(true);
    try {
      const fp = generateDeviceFingerprint();
      const { data, ok } = await callOtpFunction({
        phone,
        action: "send",
        device_fingerprint: fp,
      });

      if (!ok) {
        if (data?.device_blocked) {
          setBlockedInfo({
            activeDevice: data.active_device || 'another device',
            message: data.error || 'Device not authorized.',
          });
          setStep('phone');
        } else {
          toast({ title: "Error", description: data.error || "Failed to send OTP", variant: "destructive" });
        }
      } else {
        setIsResetFlow(true);
        setStep('otp');
        setCountdown(60);
        startWebOtpListener();
        toast({ title: t('auth.otpSent'), description: "Check your phone for the 6-digit code." });
      }
    } catch {
      toast({ title: "Error", description: "Failed to send OTP. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2B: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data, ok } = await callOtpFunction({ phone, action: "verify", code: otp });
      if (!ok) {
        toast({ title: "Error", description: data.error || "Verification failed", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      if (!data.verified) {
        toast({ title: "Invalid OTP", description: "Please enter the correct OTP.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      if (!data.user_exists) {
        toast({ title: "Account not found", description: "No account found with this phone. Please sign up first.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      if (data.token_hash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' });
        if (verifyError) {
          toast({ title: "Login failed", description: "Authentication failed. Please try again.", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        sessionStorage.setItem('login_method', 'phone');
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // If legacy student without password OR in forgot password flow, prompt to set password
          if (!hasPassword || isResetFlow) {
            setStep('set_password');
            setIsLoading(false);
            return;
          }

          toast({ title: "Welcome back!", description: "You have been logged in successfully." });
          await redirectAfterLogin(user.id);
        }
      }
    } catch {
      toast({ title: "Error", description: "Verification failed. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Set / Reset Password
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({
        title: isEnglish ? "Password too short" : "পাসওয়ার্ড খুব ছোট",
        description: isEnglish ? "Password must be at least 6 characters." : "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।",
        variant: "destructive"
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: isEnglish ? "Passwords do not match" : "পাসওয়ার্ড মিলছে না",
        description: isEnglish ? "Please make sure both passwords match." : "দয়া করে উভয় পাসওয়ার্ড নিশ্চিত করুন।",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated session found");

      // 1. Update password in Supabase Auth
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) throw updateErr;

      // 2. Mark has_password = true in public.profiles
      const { error: rpcErr } = await supabase.rpc('mark_password_set', { p_user_id: user.id });
      if (rpcErr) console.warn("Failed to mark password set:", rpcErr);

      toast({
        title: isEnglish ? "Password saved!" : "পাসওয়ার্ড সংরক্ষিত হয়েছে!",
        description: isEnglish ? "You can now log in anytime with your phone and password." : "পরবর্তী সময়ে ফোন ও পাসওয়ার্ড দিয়ে সহজে লগইন করতে পারবেন।"
      });

      await redirectAfterLogin(user.id);
    } catch (err: any) {
      console.error("Error setting password:", err);
      toast({ title: "Error", description: err.message || "Failed to save password.", variant: "destructive" });
      setIsLoading(false);
    }
  };

  const handleSkipSetPassword = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await redirectAfterLogin(user.id);
    } else {
      navigate('/dashboard');
    }
  };

  const handleResendOtp = useCallback(async () => {
    if (countdown > 0) return;
    setIsLoading(true);
    const fp = generateDeviceFingerprint();
    const { data, ok } = await callOtpFunction({
      phone,
      action: "send",
      device_fingerprint: fp,
    });
    if (ok) {
      toast({ title: "OTP resent", description: "Check your phone for the new code." });
      setOtp('');
      setCountdown(60);
    } else {
      toast({ title: "Error", description: data.error, variant: "destructive" });
    }
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
          <p className="text-white/80 text-sm leading-relaxed max-w-sm">
            {isEnglish
              ? "Fast, secure login with your password or verified phone. Pick up right where you left off."
              : "আপনার পাসওয়ার্ড অথবা ভেরিফাইড ফোন দিয়ে দ্রুত ও নিরাপদ লগইন। যেখান থেকে ছেড়েছিলেন সেখান থেকেই শুরু করুন।"}
          </p>
          <div className="space-y-3">
            {[
              { icon: ShieldCheck, en: "Protected single-device access", bn: "সুরক্ষিত সিঙ্গেল-ডিভাইস এক্সেস" },
              { icon: Smartphone, en: "Instant password login", bn: "ইনস্ট্যান্ট পাসওয়ার্ড লগইন" },
              { icon: GraduationCap, en: "Academic video & lecture tracks", bn: "একাডেমিক ভিডিও ও লেকচার ট্র্যাক" },
            ].map((item) => (
              <div key={item.en} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <item.icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-white/90 text-sm">{isEnglish ? item.en : item.bn}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/50 text-xs">© 2026 Shaharia Math. All rights reserved.</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col lg:items-center lg:justify-center lg:p-12">
        <AuthMobileHero
          title={isEnglish ? "Welcome back." : "আবার স্বাগতম।"}
          subtitle={
            isEnglish
              ? "Log in to your student dashboard."
              : "আপনার স্টুডেন্ট ড্যাশবোর্ডে লগইন করুন।"
          }
          features={[
            { icon: ShieldCheck, label: isEnglish ? "Single Device" : "নিরাপদ ডিভাইস" },
            { icon: Lock, label: isEnglish ? "Fast Password" : "সহজ পাসওয়ার্ড" },
            { icon: GraduationCap, label: isEnglish ? "Courses" : "কোর্সসমূহ" },
          ]}
        />

        <div className="w-full max-w-md mx-auto px-5 pt-6 pb-10 lg:px-0 lg:pt-0 lg:pb-0 space-y-7">
          <div>
            <h1 className="text-[1.65rem] leading-tight font-extrabold tracking-tight text-foreground md:text-3xl">
              {step === 'set_password'
                ? (isEnglish ? "Set Account Password" : "অ্যাকাউন্ট পাসওয়ার্ড সেট করুন")
                : (isEnglish ? "Log in to your account" : "আপনার অ্যাকাউন্টে লগইন করুন")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {step === 'phone' && (isEnglish ? "Enter your phone number to continue" : "এগিয়ে যেতে আপনার ফোন নম্বর দিন")}
              {step === 'password' && (isEnglish ? "Enter your password to sign in" : "সাইন ইন করতে আপনার পাসওয়ার্ড লিখুন")}
              {step === 'otp' && (isEnglish ? "Enter the 6-digit code sent to your phone" : "আপনার ফোনে পাঠানো ৬-সংখ্যার কোড দিন")}
              {step === 'set_password' && (isEnglish ? "Set a password so you can log in instantly next time without SMS OTP" : "একটি পাসওয়ার্ড তৈরি করুন যাতে পরবর্তীতে SMS ছাড়া সাথে সাথে লগইন করতে পারেন")}
            </p>
          </div>

          {/* DEVICE BLOCKED WARNING BANNER */}
          {blockedInfo && (
            <div className="p-4 rounded-2xl border border-destructive/30 bg-destructive/10 space-y-3 animate-in fade-in">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm text-destructive">
                    {isEnglish ? "Device Not Authorized" : "এই ডিভাইসটি অনুমোদিত নয়"}
                  </h4>
                  <p className="text-xs text-foreground/80 leading-relaxed">
                    {isEnglish
                      ? `Your account is strictly locked to your registered device (${blockedInfo.activeDevice}). You cannot log in from this device.`
                      : `আপনার অ্যাকাউন্টটি শুধুমাত্র নিবন্ধিত ডিভাইসে (${blockedInfo.activeDevice}) অনুমোদিত। এই ডিভাইস থেকে লগইন করা সম্ভব নয়।`}
                  </p>
                  <p className="text-[11px] text-muted-foreground pt-1">
                    {isEnglish
                      ? "If you recently switched to a new phone, please contact the academy administration to reset your device binding."
                      : "আপনি যদি নতুন ফোনে পরিবর্তিত হয়ে থাকেন, তবে ডিভাইস রিসেট করতে একাডেমি অ্যাডমিনের সাথে যোগাযোগ করুন।"}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-xs h-9 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={() => { setBlockedInfo(null); setPhone(''); }}
              >
                {isEnglish ? "Try another phone number" : "অন্য নম্বর দিয়ে চেষ্টা করুন"}
              </Button>
            </div>
          )}

          {/* STEP 1: PHONE NUMBER */}
          {step === 'phone' && !blockedInfo && (
            <form onSubmit={handlePhoneSubmit} className="space-y-5">
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
                    autoFocus
                  />
                </div>
              </div>
              <Button type="submit" className="btn-brand w-full h-14 rounded-2xl text-base font-bold gap-2" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />{t('common.loading')}</>
                ) : (
                  <>{isEnglish ? "Continue" : "এগিয়ে যান"}<ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            </form>
          )}

          {/* STEP 2A: PASSWORD INPUT (ZERO SMS) */}
          {step === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-5">
              <div className="p-3 rounded-xl bg-muted/50 border flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-foreground">{phone}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => { setStep('phone'); setPassword(''); }}
                >
                  {isEnglish ? "Change" : "পরিবর্তন"}
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  {isEnglish ? "Password" : "পাসওয়ার্ড"}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={isEnglish ? "Enter your password" : "আপনার পাসওয়ার্ড দিন"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 pr-11 h-12 rounded-xl border-border"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="btn-brand w-full h-14 rounded-2xl text-base font-bold gap-2" disabled={isLoading || !password}>
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />{t('common.loading')}</>
                ) : (
                  <>{isEnglish ? "Log In" : "লগইন করুন"}<ArrowRight className="h-4 w-4" /></>
                )}
              </Button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleRequestOtpFallback}
                  disabled={isLoading}
                  className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1.5"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  {isEnglish ? "Forgot Password? Log in with SMS OTP" : "পাসওয়ার্ড ভুলে গেছেন? SMS OTP দিয়ে লগইন করুন"}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2B: OTP VERIFICATION */}
          {step === 'otp' && (
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
                  {isEnglish ? "OTP sent to " : "OTP পাঠানো হয়েছে "}<span className="font-semibold text-foreground">{phone}</span>
                </p>
              </div>

              <Button type="submit" className="btn-brand w-full h-14 rounded-2xl text-base font-bold" disabled={isLoading || otp.length !== 6}>
                {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" />{t('common.loading')}</> : (isEnglish ? "Verify & Continue" : "যাচাই করুন ও এগিয়ে যান")}
              </Button>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-12 rounded-xl gap-2"
                  onClick={() => { setStep(hasPassword ? 'password' : 'phone'); setOtp(''); setCountdown(0); }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('auth.back')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-12 rounded-xl"
                  disabled={isLoading || countdown > 0}
                  onClick={handleResendOtp}
                >
                  {countdown > 0 ? `Resend (${countdown}s)` : (isEnglish ? 'Resend OTP' : 'পুনরায় পাঠান')}
                </Button>
              </div>
            </form>
          )}

          {/* STEP 3: SET ACCOUNT PASSWORD (AFTER INITIAL OTP OR PASSWORD RESET) */}
          {step === 'set_password' && (
            <form onSubmit={handleSetPassword} className="space-y-5">
              <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 space-y-1">
                <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isEnglish ? "Fast & Secure Login" : "সহজ ও নিরাপদ লগইন"}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isEnglish
                    ? "Next time, simply enter this password to log in instantly without waiting for an SMS code."
                    : "পরবর্তী সময়ে SMS কোডের অপেক্ষা ছাড়াই এই পাসওয়ার্ড দিয়ে সরাসরি লগইন করতে পারবেন।"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm font-medium">
                  {isEnglish ? "New Password (min 6 characters)" : "নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)"}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder={isEnglish ? "Enter password" : "পাসওয়ার্ড দিন"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-11 pr-11 h-12 rounded-xl border-border"
                    required
                    minLength={6}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm font-medium">
                  {isEnglish ? "Confirm Password" : "পাসওয়ার্ড নিশ্চিত করুন"}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder={isEnglish ? "Confirm password" : "আবার পাসওয়ার্ড লিখুন"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-11 h-12 rounded-xl border-border"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button type="submit" className="btn-brand w-full h-14 rounded-2xl text-base font-bold gap-2" disabled={isLoading || newPassword.length < 6}>
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />{t('common.loading')}</>
                ) : (
                  <>{isEnglish ? "Save Password & Continue" : "পাসওয়ার্ড সংরক্ষণ করে এগিয়ে যান"}<ArrowRight className="h-4 w-4" /></>
                )}
              </Button>

              {!isResetFlow && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={handleSkipSetPassword}
                    className="text-xs text-muted-foreground hover:text-foreground font-medium underline"
                  >
                    {isEnglish ? "Skip for now" : "এখন বাদ দিন"}
                  </button>
                </div>
              )}
            </form>
          )}

          {/* FOOTER LINK */}
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