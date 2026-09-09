import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Phone, User, Check, GraduationCap, Tag, Loader2, Copy } from "lucide-react";
import { AuthMobileHero } from "@/components/auth/AuthMobileHero";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useReferral } from "@/hooks/useReferral";
import { courseTypeHasYears } from "@/lib/course-types";

const departments = [
  { value: 'management', label: 'Management', label_bn: 'ম্যানেজমেন্ট' },
  { value: 'marketing', label: 'Marketing', label_bn: 'মার্কেটিং' },
  { value: 'accounting', label: 'Accounting', label_bn: 'একাউন্টিং' },
  { value: 'finance', label: 'Finance', label_bn: 'ফাইন্যান্স' },
  { value: 'economics', label: 'Economics', label_bn: 'ইকোনমিক্স' },
  { value: 'statistics', label: 'Statistics', label_bn: 'পরিসংখ্যান' },
];

const courseTypes = [
  { value: 'bba', label: 'BBA', label_bn: 'বিবিএ' },
  { value: 'mba', label: 'MBA', label_bn: 'এমবিএ' },
  { value: 'bbs', label: 'BBS', label_bn: 'বিবিএস' },
  { value: 'job_preparation', label: 'Job Preparation', label_bn: 'চাকরি প্রস্তুতি' },
  { value: 'ssc', label: 'SSC', label_bn: 'এসএসসি' },
  { value: 'hsc', label: 'HSC', label_bn: 'এইচএসসি' },
];

const years = [
  { value: '1', label: '1st Year', label_bn: '১ম বর্ষ' },
  { value: '2', label: '2nd Year', label_bn: '২য় বর্ষ' },
  { value: '3', label: '3rd Year', label_bn: '৩য় বর্ষ' },
  { value: '4', label: '4th Year', label_bn: '৪র্থ বর্ষ' },
];

type Step = 'account' | 'otp' | 'details';

export default function JoinPage() {
  const { t, isEnglish } = useLanguage();
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { referral, attributeSignup } = useReferral();
  const [searchParams] = useSearchParams();
  const inviteEmail = searchParams.get('invite_email') || '';
  
  const [step, setStep] = useState<Step>('account');
  const [isLoading, setIsLoading] = useState(false);
  const [legacyStudent, setLegacyStudent] = useState<any>(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: inviteEmail,
    otp: '',
    department: '',
    year: '',
    courseType: '',
    session: '',
  });
  
  const [userId, setUserId] = useState<string | null>(null);
  const [resumeChecked, setResumeChecked] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Web OTP API: auto-read SMS code
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
        if (code.length === 6) {
          setFormData(prev => ({ ...prev, otp: code }));
        }
      }
    }).catch(() => { /* user dismissed, timeout, or unsupported */ });
  }, []);

  useEffect(() => {
    return () => { abortControllerRef.current?.abort(); };
  }, []);

  // Capture ?ref= slug from /join URL into localStorage so the existing
  // referral pipeline (useReferral + claim-referral) can attribute the signup.
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (!ref) return;
    const slug = ref.toLowerCase().trim();
    if (!/^[a-z0-9-]{4,20}$/.test(slug)) return;
    (async () => {
      const { data } = await supabase
        .from('discount_codes')
        .select('id, short_code, code')
        .or(`short_code.eq.${slug},code.eq.${slug.toUpperCase()}`)
        .eq('is_active', true)
        .eq('is_referral', true)
        .maybeSingle();
      if (data?.id) {
        localStorage.setItem('referral_code_id', data.id);
        localStorage.setItem('referral_code', data.short_code || data.code);
        document.cookie = `referral_code_id=${data.id}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      }
    })();
  }, [searchParams]);

  // Check if user has an incomplete signup (authenticated but no profile)
  useEffect(() => {
    const checkResume = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setResumeChecked(true);
        return;
      }

      // User is logged in — check if they have a profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (profile) {
        // Profile exists, redirect to dashboard
        navigate('/dashboard', { replace: true });
        return;
      }

      // No profile — resume at details step
      setUserId(session.user.id);
      setPhoneVerified(true);
      setFormData(prev => ({
        ...prev,
        name: session.user.user_metadata?.full_name || prev.name,
        phone: session.user.user_metadata?.phone || prev.phone,
        email: session.user.email || prev.email,
      }));
      setStep('details');
      toast({ title: "Welcome back!", description: "Please complete your registration." });
      setResumeChecked(true);
    };
    checkResume();
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

  const checkLegacyStudent = async (phone: string) => {
    const normalized = phone.replace(/\D/g, '').replace(/^880/, '0');
    if (normalized.length < 10) { setLegacyStudent(null); return; }

    const { data } = await supabase
      .from('legacy_students')
      .select('*')
      .eq('phone', normalized)
      .eq('is_claimed', false)
      .maybeSingle();

    if (data) {
      setLegacyStudent(data);
      setFormData(prev => ({
        ...prev,
        name: prev.name || data.full_name || '',
        email: prev.email || data.email || '',
        department: data.department || prev.department,
        year: data.year?.toString() || prev.year,
      }));
    } else {
      setLegacyStudent(null);
    }
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone || formData.phone.replace(/\D/g, '').length < 10) {
      toast({ title: "Invalid phone", description: "Please enter a valid phone number.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    try {
      const { data, ok } = await callOtpFunction({ phone: formData.phone, action: "send" });
      if (!ok) {
        toast({ title: "Error", description: data.error || "Failed to send OTP", variant: "destructive" });
      } else {
        setStep('otp');
        setCountdown(60);
        startWebOtpListener();
        toast({ title: t('auth.otpSent'), description: "Check your phone for the 6-digit code." });
      }
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast({ title: "Error", description: "Failed to send OTP. Please try again.", variant: "destructive" });
    }
    
    setIsLoading(false);
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, ok } = await callOtpFunction({ phone: formData.phone, action: "verify", code: formData.otp });
      
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

      // If user already exists, redirect to login
      if (data.user_exists) {
        toast({ title: "Account exists", description: "This phone is already registered. Redirecting to login...", variant: "destructive" });
        setTimeout(() => navigate('/login'), 1500);
        setIsLoading(false);
        return;
      }

      // Phone verified, now create the actual account
      setPhoneVerified(true);
      
      const mockEmail = `s${formData.phone.replace(/\D/g, '')}@shahariamath.com`;
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: mockEmail,
        password: formData.phone,
        options: {
          data: {
            full_name: formData.name,
            phone: formData.phone,
          }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          // Try signing in with existing credentials to resume
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: mockEmail,
            password: formData.phone,
          });

          if (signInError) {
            toast({ title: "Account exists", description: "This email is already registered. Please login.", variant: "destructive" });
            setTimeout(() => navigate('/login'), 1500);
            setIsLoading(false);
            return;
          }

          // Check if profile exists
          if (signInData.user) {
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('user_id', signInData.user.id)
              .maybeSingle();

            if (existingProfile) {
              toast({ title: "Welcome back!", description: "You already have an account." });
              navigate('/dashboard');
              setIsLoading(false);
              return;
            }

            // No profile — let them complete registration
            setUserId(signInData.user.id);
            setStep('details');
            toast({ title: "Welcome back!", description: "Please complete your registration." });
            setIsLoading(false);
            return;
          }
        }
        throw signUpError;
      }

      if (signUpData.user) {
        setUserId(signUpData.user.id);
      }

      setStep('details');
      toast({ title: "Phone verified!", description: "Now complete your academic details." });
    } catch (error: any) {
      console.error('Error:', error);
      toast({ title: "Error", description: error.message || "Verification failed.", variant: "destructive" });
    }

    setIsLoading(false);
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const needsYear = courseTypeHasYears(formData.courseType);
    if (!formData.department || (needsYear && !formData.year) || !formData.session) {
      toast({ title: "Required fields", description: needsYear ? "Please select your department, year, and session." : "Please select your department and session.", variant: "destructive" });
      return;
    }

    await createProfile();
  };

  const createProfile = async () => {
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('student_id')
        .eq('user_id', user.id)
        .maybeSingle();

      let studentId = legacyStudent?.student_id || existingProfile?.student_id || null;
      if (!studentId) {
        const { data: studentIdData, error: studentIdError } = await supabase.rpc('generate_student_id');
        if (studentIdError) throw studentIdError;
        studentId = studentIdData;
      }

      if (studentId) {
        studentId = studentId.replace(/^OSA-/, 'SMC-');
      }

      // Normalize phone to local format (0XXXXXXXXXX) for consistent storage
      const normalizedPhone = (() => {
        const digits = formData.phone.replace(/\D/g, '');
        if (digits.startsWith('880')) return '0' + digits.substring(3);
        if (digits.startsWith('0')) return digits;
        return '0' + digits;
      })();

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: formData.name,
          phone: normalizedPhone,
          email: '',
          student_id: studentId,
          department: formData.department as any,
          year: formData.year ? parseInt(formData.year) : null,
          session: formData.session || null,
          course_type: formData.courseType || null,
        } as any, { onConflict: 'user_id' });

      if (profileError) throw profileError;

      // Use upsert to avoid duplicate role errors
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({ user_id: user.id, role: 'student' }, { onConflict: 'user_id,role' });
      if (roleError) throw roleError;

      if (legacyStudent) {
        await supabase
          .from('legacy_students')
          .update({ is_claimed: true, claimed_by: user.id })
          .eq('id', legacyStudent.id);
      }

      await attributeSignup(user.id);
      await refreshProfile();

      toast({ title: "Welcome to Shaharia Math!", description: `Your Student ID: ${studentId}` });
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error creating profile:', error);
      toast({ title: "Error", description: error.message || "Failed to complete signup.", variant: "destructive" });
    }

    setIsLoading(false);
  };

  const handleResendOtp = useCallback(async () => {
    if (countdown > 0) return;
    setIsLoading(true);
    const { data, ok } = await callOtpFunction({ phone: formData.phone, action: "send" });
    if (ok) {
      toast({ title: "OTP resent", description: "Check your phone." });
      setFormData(prev => ({ ...prev, otp: '' }));
      setCountdown(60);
    } else {
      toast({ title: "Error", description: data.error, variant: "destructive" });
    }
    setIsLoading(false);
  }, [formData.phone, countdown]);

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
            {isEnglish ? "Join the academy.\nStart learning today." : "একাডেমিতে যোগ দিন।\nআজই শেখা শুরু করুন।"}
          </h2>
          <p className="text-white/70 text-sm leading-relaxed max-w-sm">
            {isEnglish
              ? "Phone OTP signup — no email needed. Create your student profile in under 60 seconds."
              : "ফোন OTP সাইনআপ — ইমেইল লাগবে না। ৬০ সেকেন্ডের মধ্যে আপনার স্টুডেন্ট প্রোফাইল তৈরি করুন।"}
          </p>
          <div className="space-y-3">
            {[
              { icon: Phone, en: "Phone OTP — no email needed", bn: "ফোন OTP — ইমেইল লাগবে না" },
              { icon: GraduationCap, en: "9 departments available", bn: "৯টি বিভাগ রয়েছে" },
              { icon: Check, en: "Free classes on signup", bn: "সাইনআপে ফ্রি ক্লাস" },
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
      <div className="flex-1 flex flex-col lg:items-center lg:justify-center lg:p-12 lg:overflow-y-auto">
        <AuthMobileHero
          title={isEnglish ? "Join the academy." : "একাডেমিতে যোগ দিন।"}
          subtitle={
            isEnglish
              ? "Phone OTP signup — no email needed. Under 60 seconds."
              : "ফোন OTP সাইনআপ — ইমেইল লাগবে না। ৬০ সেকেন্ডে।"
          }
          features={[
            { icon: Phone, label: isEnglish ? "Phone only" : "শুধু ফোন" },
            { icon: GraduationCap, label: isEnglish ? "9 departments" : "৯টি বিভাগ" },
            { icon: Check, label: isEnglish ? "Free classes" : "ফ্রি ক্লাস" },
          ]}
        />

        <div className="w-full max-w-lg mx-auto px-5 pt-6 pb-12 lg:px-0 lg:pt-0 lg:pb-0 space-y-6">

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2">
            {['account', 'otp', 'details'].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                  step === s
                    ? 'border-primary bg-primary text-primary-foreground'
                    : ['account', 'otp', 'details'].indexOf(step) > i
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-muted text-muted-foreground'
                }`}>
                  {['account', 'otp', 'details'].indexOf(step) > i ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < 2 && <div className={`w-10 h-0.5 transition-colors ${['account', 'otp', 'details'].indexOf(step) > i ? 'bg-primary' : 'bg-border'}`} />}
              </div>
            ))}
          </div>

          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
              {step === 'account' && (isEnglish ? 'Create Account' : 'অ্যাকাউন্ট তৈরি করুন')}
              {step === 'otp' && (isEnglish ? 'Verify Phone' : 'ফোন যাচাই করুন')}
              {step === 'details' && (isEnglish ? 'Academic Details' : 'একাডেমিক তথ্য')}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {step === 'account' && (isEnglish ? 'Enter your personal information' : 'আপনার ব্যক্তিগত তথ্য দিন')}
              {step === 'otp' && (isEnglish ? 'Enter the 6-digit code sent to your phone' : 'আপনার ফোনে পাঠানো ৬-সংখ্যার কোড দিন')}
              {step === 'details' && (isEnglish ? 'Select your department and current year' : 'আপনার বিভাগ এবং বর্তমান বর্ষ নির্বাচন করুন')}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm">
            {step === 'account' && (
              <form onSubmit={handleAccountSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('auth.name')}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder={t('auth.namePlaceholder')}
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('auth.phone')}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="01XXXXXXXXX"
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, phone: e.target.value }));
                        checkLegacyStudent(e.target.value);
                      }}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {legacyStudent && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                    <Check className="h-4 w-4 text-blue-600" />
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>{isEnglish ? "Welcome back!" : "আবার স্বাগতম!"}</strong>{" "}
                      {isEnglish
                        ? `We found your record as "${legacyStudent.full_name}".`
                        : `আমরা আপনার রেকর্ড "${legacyStudent.full_name}" হিসেবে পেয়েছি।`}
                    </p>
                  </div>
                )}

                <Button type="submit" className="btn-brand w-full h-14 rounded-2xl text-base font-bold gap-2" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" />{t('common.loading')}</> : <>{t('auth.continue')}<ArrowRight className="h-4 w-4" /></>}
                </Button>

                {referral && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                    <Tag className="h-4 w-4 text-green-600" />
                    <p className="text-sm text-green-700 dark:text-green-300">
                      <strong>{referral.discountPercentReceiver}% discount</strong> via referral code <code className="font-mono bg-green-100 dark:bg-green-900 px-1 rounded">{referral.code}</code>
                    </p>
                  </div>
                )}
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={handleOtpVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('auth.enterOtp')}</Label>
                  <div className="flex justify-center">
                    <InputOTP 
                      maxLength={6} 
                      value={formData.otp} 
                      onChange={(value) => setFormData(prev => ({ ...prev, otp: value }))}
                      autoComplete="one-time-code"
                      pasteTransformer={(text) => { const digits = text.replace(/\D/g, ''); return digits.slice(0, 6); }}
                    >
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
                   <p className="text-xs text-center text-muted-foreground mt-2">
                    OTP sent to <span className="font-medium text-foreground">{formData.phone}</span>
                  </p>
                </div>
                <Button type="submit" className="btn-brand w-full h-14 rounded-2xl text-base font-bold" disabled={isLoading || formData.otp.length !== 6}>
                  {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('common.loading')}</> : t('auth.verifyOtp')}
                </Button>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="flex-1 gap-2"
                    onClick={() => { setStep('account'); setFormData(prev => ({ ...prev, otp: '' })); setCountdown(0); }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t('auth.back')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    disabled={isLoading || countdown > 0}
                    onClick={handleResendOtp}
                  >
                    {countdown > 0 ? `Resend (${countdown}s)` : 'Resend OTP'}
                  </Button>
                </div>
              </form>
            )}

            {step === 'details' && (
              <form onSubmit={handleDetailsSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>{isEnglish ? 'Course Type' : 'কোর্সের ধরন'}</Label>
                  <Select 
                    value={formData.courseType} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, courseType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isEnglish ? 'Select course type' : 'কোর্সের ধরন নির্বাচন করুন'} />
                    </SelectTrigger>
                    <SelectContent>
                      {courseTypes.map(ct => (
                        <SelectItem key={ct.value} value={ct.value}>
                          {isEnglish ? ct.label : ct.label_bn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('auth.department')}</Label>
                  <Select 
                    value={formData.department} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('auth.selectDepartment')} />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept.value} value={dept.value}>
                          {isEnglish ? dept.label : dept.label_bn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {courseTypeHasYears(formData.courseType) && (
                  <div className="space-y-2">
                    <Label>{t('auth.year')}</Label>
                    <Select 
                      value={formData.year} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, year: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('auth.selectYear')} />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map(year => (
                          <SelectItem key={year.value} value={year.value}>
                            {isEnglish ? year.label : year.label_bn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{isEnglish ? 'Academic Session *' : 'একাডেমিক সেশন *'}</Label>
                  <Select 
                    value={formData.session} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, session: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isEnglish ? 'Select session' : 'সেশন নির্বাচন করুন'} />
                    </SelectTrigger>
                    <SelectContent>
                      {["17-18", "18-19", "19-20", "20-21", "21-22", "22-23", "23-24", "24-25", "25-26", "26-27"].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-start gap-3">
                    <GraduationCap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-foreground mb-1">
                        {isEnglish ? "You can enroll in courses later" : "আপনি পরে কোর্সে ভর্তি হতে পারবেন"}
                      </p>
                      <p className="text-muted-foreground">
                        {isEnglish 
                          ? "After signing up, browse available subjects and enroll from your dashboard."
                          : "সাইন আপ করার পরে, আপনার ড্যাশবোর্ড থেকে উপলব্ধ বিষয়গুলি ব্রাউজ করুন এবং ভর্তি হন।"}
                      </p>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="btn-brand w-full h-14 rounded-2xl text-base font-bold gap-2" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" />{t('common.loading')}</> : <>{isEnglish ? 'Complete Registration' : 'নিবন্ধন সম্পূর্ণ করুন'}<Check className="h-4 w-4" /></>}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full gap-2"
                  onClick={() => setStep('otp')}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('auth.back')}
                </Button>
              </form>
            )}

            <div className="mt-6 pt-4 border-t border-border text-center text-sm">
              <span className="text-muted-foreground">
                {isEnglish ? 'Already have an account?' : 'ইতিমধ্যে অ্যাকাউন্ট আছে?'}
              </span>{' '}
              <Link to="/login" className="text-primary hover:underline font-semibold">
                {t('auth.login')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}