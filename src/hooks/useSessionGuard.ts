import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateDeviceFingerprint, getDeviceLabel } from '@/lib/deviceFingerprint';

// Cache the access token for use in keepalive requests
let cachedAccessToken: string | null = null;
supabase.auth.onAuthStateChange((_event, session) => {
  cachedAccessToken = session?.access_token ?? null;
});

interface SessionGuardResult {
  isBlocked: boolean;
  blockReason: 'untrusted_device' | 'concurrent_session' | null;
  activeDeviceLabel: string | null;
  clearBlock: () => void;
}

/**
 * Device-locking session guard:
 * 1. On first ever login → device is auto-trusted
 * 2. On subsequent logins → device MUST be in trusted list
 * 3. If trusted list is full (maxDevices) → BLOCK with "untrusted_device"
 * 4. Also checks concurrent sessions (heartbeat-based)
 */
export function useSessionGuard(userId: string | null, isStudent: boolean): SessionGuardResult {
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState<'untrusted_device' | 'concurrent_session' | null>(null);
  const [activeDeviceLabel, setActiveDeviceLabel] = useState<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fingerprintRef = useRef<string | null>(null);
  const initDoneRef = useRef(false);

  const getFingerprint = useCallback(() => {
    if (!fingerprintRef.current) {
      fingerprintRef.current = generateDeviceFingerprint();
    }
    return fingerprintRef.current;
  }, []);

  // Fetch platform settings
  const getSettings = useCallback(async () => {
    const { data } = await supabase
      .from('platform_settings')
      .select('max_devices_per_student, session_timeout_minutes, device_lock_enabled')
      .eq('id', 'default')
      .maybeSingle();
    return {
      maxDevices: data?.max_devices_per_student ?? 1,
      sessionTimeoutMin: data?.session_timeout_minutes ?? 5,
      deviceLockEnabled: data?.device_lock_enabled ?? true,
    };
  }, []);

  // Core device check + session registration
  const checkAndRegisterDevice = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    const fp = getFingerprint();
    const label = getDeviceLabel();
    const settings = await getSettings();

    if (!settings.deviceLockEnabled) {
      // Device lock disabled — just register session for heartbeat
      await upsertSession(userId, fp, label);
      return false;
    }

    // 1. Check trusted devices for this user
    const { data: trustedDevices } = await supabase
      .from('trusted_devices')
      .select('id, device_fingerprint, device_label, is_revoked')
      .eq('user_id', userId)
      .eq('is_revoked', false);

    const trusted = trustedDevices || [];
    const isCurrentDeviceTrusted = trusted.some(d => d.device_fingerprint === fp);

    if (isCurrentDeviceTrusted) {
      // Device is trusted — update last_used and proceed
      await supabase
        .from('trusted_devices')
        .update({ last_used_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('device_fingerprint', fp);
      await upsertSession(userId, fp, label);
      return false; // not blocked
    }

    // Device is NOT trusted
    if (trusted.length >= settings.maxDevices) {
      // Same-label rebind: if every trusted slot has the SAME human label as the
      // current device (e.g. "Chrome on macOS"), treat this as the same physical
      // device whose fingerprint shifted (browser update, cache clear, etc.) and
      // refresh the fingerprint instead of blocking. This prevents legitimate
      // users from being locked out by fingerprint drift.
      const allSameLabel = trusted.every(d => (d.device_label || '') === label);
      if (allSameLabel && label) {
        // Replace the oldest trusted slot with the current fingerprint
        const oldest = trusted[0];
        await supabase
          .from('trusted_devices')
          .update({
            device_fingerprint: fp,
            device_label: label,
            last_used_at: new Date().toISOString(),
          })
          .eq('id', oldest.id);
        await upsertSession(userId, fp, label);
        return false; // not blocked — silently rebound
      }

      // Genuinely different device — BLOCK
      setIsBlocked(true);
      setBlockReason('untrusted_device');
      setActiveDeviceLabel(trusted[0]?.device_label || 'Original device');

      await supabase.from('session_violations').insert({
        user_id: userId,
        violation_type: 'untrusted_device',
        blocked_device_fingerprint: fp,
        blocked_device_label: label,
        active_device_fingerprint: trusted[0]?.device_fingerprint || null,
        active_device_label: trusted[0]?.device_label || null,
      });

      return true; // blocked
    }

    // Trusted list has room — auto-trust this device
    await supabase.from('trusted_devices').upsert({
      user_id: userId,
      device_fingerprint: fp,
      device_label: label,
      last_used_at: new Date().toISOString(),
      is_revoked: false,
    }, { onConflict: 'user_id,device_fingerprint' });

    await upsertSession(userId, fp, label);
    return false; // not blocked

  }, [userId, getFingerprint, getSettings]);

  // Also check concurrent sessions
  const checkConcurrentSessions = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    const fp = getFingerprint();
    const settings = await getSettings();
    const staleThreshold = new Date(Date.now() - settings.sessionTimeoutMin * 60 * 1000).toISOString();

    const { data: sessions } = await supabase
      .from('user_sessions')
      .select('device_fingerprint, device_label, last_active_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gte('last_active_at', staleThreshold);

    const otherActive = (sessions || []).filter(s => s.device_fingerprint !== fp);

    if (otherActive.length > 0) {
      setIsBlocked(true);
      setBlockReason('concurrent_session');
      setActiveDeviceLabel(otherActive[0].device_label || 'Another device');

      await supabase.from('session_violations').insert({
        user_id: userId,
        violation_type: 'concurrent_session',
        blocked_device_fingerprint: fp,
        blocked_device_label: getDeviceLabel(),
        active_device_fingerprint: otherActive[0].device_fingerprint,
        active_device_label: otherActive[0].device_label,
      });

      return true;
    }
    return false;
  }, [userId, getFingerprint, getSettings]);

  // Heartbeat — also re-checks concurrent sessions periodically
  const sendHeartbeat = useCallback(async () => {
    if (!userId) return;
    const fp = getFingerprint();
    await supabase
      .from('user_sessions')
      .update({ last_active_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('device_fingerprint', fp);
  }, [userId, getFingerprint]);

  // Deactivate session — uses sendBeacon for reliability on page close
  const deactivateSession = useCallback((useSendBeacon = false) => {
    if (!userId) return;
    const fp = getFingerprint();

    if (useSendBeacon && navigator.sendBeacon) {
      // sendBeacon is reliable during beforeunload/visibilitychange
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_sessions?user_id=eq.${userId}&device_fingerprint=eq.${encodeURIComponent(fp)}`;
      // Use keepalive fetch for reliable PATCH during page close
      fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${cachedAccessToken || ''}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ is_active: false }),
        keepalive: true,
      }).catch(() => {});
      return;
    }

    // Normal async deactivation
    supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('device_fingerprint', fp)
      .then(() => {});
  }, [userId, getFingerprint]);

  useEffect(() => {
    if (!userId || !isStudent) return;
    if (initDoneRef.current) return;
    initDoneRef.current = true;

    let cancelled = false;

    const init = async () => {
      // Step 1: Check device trust
      const deviceBlocked = await checkAndRegisterDevice();
      if (deviceBlocked || cancelled) return;

      // Step 2: Check concurrent sessions
      const concurrentBlocked = await checkConcurrentSessions();
      if (concurrentBlocked || cancelled) return;

      // Step 3: Start heartbeat (every 2 min)
      heartbeatRef.current = setInterval(sendHeartbeat, 2 * 60 * 1000);
    };

    init();

    const handleBeforeUnload = () => {
      deactivateSession(true); // use keepalive fetch
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        deactivateSession(true); // more reliable than beforeunload on mobile
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      deactivateSession();
      initDoneRef.current = false;
    };
  }, [userId, isStudent, checkAndRegisterDevice, checkConcurrentSessions, sendHeartbeat, deactivateSession]);

  const clearBlock = useCallback(() => {
    setIsBlocked(false);
    setBlockReason(null);
    setActiveDeviceLabel(null);
  }, []);

  return { isBlocked, blockReason, activeDeviceLabel, clearBlock };
}

// Helper to upsert session record
async function upsertSession(userId: string, fp: string, label: string) {
  await supabase
    .from('user_sessions')
    .upsert({
      user_id: userId,
      device_fingerprint: fp,
      device_label: label,
      last_active_at: new Date().toISOString(),
      is_active: true,
    }, { onConflict: 'user_id,device_fingerprint' });
}
