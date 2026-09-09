import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function ReferralRedirectPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!code) { navigate('/'); return; }

    const handleReferral = async () => {
      try {
        const normalizedCode = code.toLowerCase().trim();
        if (!/^[a-z0-9-]{4,20}$/.test(normalizedCode)) {
          setError(true);
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        // Validate through a safe server-side lookup. Direct table reads are protected by RLS.
        const { data } = await (supabase as any).rpc('get_checkout_discount', { _code: normalizedCode });
        const codeData = Array.isArray(data) ? data[0] : data;

        if (!codeData) {
          setError(true);
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        // Store referral in localStorage + cookie
        const storedCode = codeData.short_code || codeData.code || normalizedCode;
        localStorage.setItem('referral_code_id', codeData.code_id);
        localStorage.setItem('referral_code', storedCode);
        document.cookie = `referral_code_id=${codeData.code_id}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;

        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          await supabase.functions.invoke('claim-referral', {
            body: { ref_slug: storedCode },
          }).catch(() => {});
        }

        // Log click
        await supabase.from('referral_clicks').insert({
          referral_code_id: codeData.code_id,
          ip: null, // Will be filled by edge function in Phase 2
          user_agent: navigator.userAgent,
        });

        // Create pending referral
        const fingerprint = await generateFingerprint();
        await supabase.from('pending_referrals').insert({
          referral_code_id: codeData.code_id,
          browser_fingerprint: fingerprint,
          ip: null,
        });

        navigate('/');
      } catch (err) {
        console.error('Referral redirect error:', err);
        navigate('/');
      }
    };

    handleReferral();
  }, [code, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-foreground">Invalid referral link</p>
          <p className="text-sm text-muted-foreground">Redirecting to homepage...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <p className="text-sm text-muted-foreground">Processing referral...</p>
      </div>
    </div>
  );
}

async function generateFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency?.toString() || '',
  ];
  const raw = components.join('|');
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
