import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useSessionGuard } from '@/hooks/useSessionGuard';
import { SessionBlockedDialog } from '@/components/SessionBlockedDialog';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
  student_id: string | null;
  department: 'management' | 'marketing' | 'accounting' | 'finance' | 'economics' | 'ssc' | 'hsc' | null;
  year: number | null;
  is_blocked: boolean;
  onboarding_completed: boolean;
  session: string | null;
  course_type: string | null;
}

export interface EmployeePermissions {
  can_view_revenue: boolean;
  can_view_clicks: boolean;
  can_view_signups: boolean;
  can_view_enrollments: boolean;
  can_manage_cms: boolean;
  can_manage_carousel: boolean;
  can_manage_students: boolean;
  can_manage_subjects: boolean;
  can_manage_enrollments: boolean;
  can_manage_calendar: boolean;
  can_manage_discount_codes: boolean;
  can_manage_referral_codes: boolean;
  can_manage_videos: boolean;
  can_manage_pdfs: boolean;
  can_manage_analytics: boolean;
  can_manage_gallery: boolean;
  can_manage_subject_cms: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  isStudent: boolean;
  isSessionBlocked: boolean;
  employeeSubRole: string | null;
  employeePermissions: EmployeePermissions | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEmployee, setIsEmployee] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [employeeSubRole, setEmployeeSubRole] = useState<string | null>(null);
  const [employeePermissions, setEmployeePermissions] = useState<EmployeePermissions | null>(null);

  const profileLoadedForUserRef = useRef<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const explicitSignOutRef = useRef(false);

  const resetRoleState = () => {
    setProfile(null);
    setIsAdmin(false);
    setIsEmployee(false);
    setIsStudent(false);
    setEmployeeSubRole(null);
    setEmployeePermissions(null);
    profileLoadedForUserRef.current = null;
    currentUserIdRef.current = null;
  };

  const fetchProfile = async (userId: string) => {
    try {
      const [{ data: profileData, error: profileError }, { data: roles, error: rolesError }] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId),
      ]);

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }
      setProfile(profileData ? (profileData as Profile) : null);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      }

      const roleList = roles?.map((r) => r.role) || [];
      const hasEmployeeRole = roleList.includes('employee');

      setIsAdmin(roleList.includes('admin'));
      setIsEmployee(hasEmployeeRole);
      setIsStudent(roleList.includes('student'));

      if (hasEmployeeRole) {
        const { data: emp, error: employeeError } = await supabase
          .from('employees')
          .select('id, sub_role, employee_permissions(*)')
          .eq('user_id', userId)
          .maybeSingle();

        if (employeeError) {
          console.error('Error fetching employee permissions:', employeeError);
        }

        if (emp) {
          setEmployeeSubRole(emp.sub_role);
          // employee_permissions is a one-to-one relation, Supabase returns an object (not array)
          const permsRaw = (emp as any).employee_permissions;
          const perms = Array.isArray(permsRaw) ? permsRaw[0] : permsRaw;
          if (perms) {
            const { id: _id, employee_id: _eid, ...permFlags } = perms;
            setEmployeePermissions(permFlags as EmployeePermissions);
          } else {
            setEmployeePermissions(null);
          }
        } else {
          setEmployeeSubRole(null);
          setEmployeePermissions(null);
        }
      } else {
        setEmployeeSubRole(null);
        setEmployeePermissions(null);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      resetRoleState();
      return;
    }

    profileLoadedForUserRef.current = userId;
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const recoverSession = async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const {
        data: { session: recoveredSession },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('Error recovering session:', error);
      }

      if (recoveredSession) {
        return recoveredSession;
      }

      if (attempt < 4) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }

    return null;
  };

  useEffect(() => {
    let initialLoadDone = false;

    const applySessionState = async (
      nextSession: Session | null,
      forceProfileRefresh = false,
      event?: string
    ) => {
      let resolvedSession = nextSession;
      const shouldAttemptRecovery =
        !resolvedSession &&
        !!currentUserIdRef.current &&
        event !== 'INITIAL_GET_SESSION' &&
        !explicitSignOutRef.current;

      if (shouldAttemptRecovery) {
        const recoveredSession = await recoverSession();
        if (recoveredSession) {
          resolvedSession = recoveredSession;
        } else if (event !== 'SIGNED_OUT') {
          return;
        }
      }

      if (!resolvedSession) {
        if (event === 'SIGNED_OUT' && !explicitSignOutRef.current) {
          return;
        }

        explicitSignOutRef.current = false;
        setSession(null);
        setUser(null);
        resetRoleState();
        return;
      }

      explicitSignOutRef.current = false;
      setSession(resolvedSession);
      const nextUser = resolvedSession.user ?? null;
      currentUserIdRef.current = nextUser?.id ?? null;

      setUser((prevUser) => {
        if (prevUser?.id === nextUser?.id) return prevUser;
        return nextUser;
      });

      if (nextUser) {
        if (forceProfileRefresh || profileLoadedForUserRef.current !== nextUser.id) {
          await fetchProfile(nextUser.id);
        }
      } else {
        resetRoleState();
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        const previousUserId = currentUserIdRef.current;
        const nextUserId = nextSession?.user?.id ?? null;
        const isInitialLoad = !initialLoadDone;
        const isRealSignOut = event === 'SIGNED_OUT' && explicitSignOutRef.current;
        const isRealSignIn = event === 'SIGNED_IN' && nextUserId !== previousUserId;

        if (isInitialLoad || isRealSignIn || isRealSignOut) {
          setIsLoading(true);
        }

        const forceProfileRefresh =
          event === 'USER_UPDATED' ||
          nextUserId !== previousUserId ||
          (event === 'SIGNED_IN' && profileLoadedForUserRef.current !== nextUserId);

        void applySessionState(nextSession, forceProfileRefresh, event).finally(() => {
          setIsLoading(false);
          initialLoadDone = true;
        });
      }
    );

    setIsLoading(true);
    void supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        await applySessionState(session, true, 'INITIAL_GET_SESSION');
      })
      .finally(() => {
        setIsLoading(false);
        initialLoadDone = true;
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Session guard — only enforced for students
  const { isBlocked, blockReason, activeDeviceLabel } = useSessionGuard(
    user?.id ?? null,
    isStudent
  );

  const signOut = async () => {
    explicitSignOutRef.current = true;

    // Deactivate session in DB before signing out
    if (user) {
      const { generateDeviceFingerprint } = await import('@/lib/deviceFingerprint');
      const fp = generateDeviceFingerprint();
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('device_fingerprint', fp);
    }
    sessionStorage.removeItem('login_method');
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    resetRoleState();
  };

  const handleBlockedSignOut = async () => {
    explicitSignOutRef.current = true;
    sessionStorage.removeItem('login_method');
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    resetRoleState();
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      isLoading,
      isAdmin,
      isEmployee,
      isStudent,
      isSessionBlocked: isBlocked,
      employeeSubRole,
      employeePermissions,
      signOut,
      refreshProfile,
    }}>
      {children}
      <SessionBlockedDialog
        open={isBlocked}
        blockReason={blockReason}
        activeDeviceLabel={activeDeviceLabel}
        onSignOut={handleBlockedSignOut}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
