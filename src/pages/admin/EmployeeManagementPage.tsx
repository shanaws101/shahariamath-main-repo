import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { UserPlus, Shield, Link2, Trash2, Mail, Eye, Settings, BookOpen, Layout, KeyRound, Copy, Check, Users, Calendar, BarChart, Image as ImageIcon, Monitor, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

type SubRole = 'super_admin' | 'editor' | 'content_writer';

interface EmployeePermissions {
  id: string;
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

interface EmployeeSession {
  id: string;
  device_fingerprint: string;
  device_label: string | null;
  ip_address: string | null;
  is_active: boolean;
  last_active_at: string;
  created_at: string;
}

interface Employee {
  id: string;
  user_id: string | null;
  status: string;
  invited_email: string;
  created_at: string;
  sub_role: SubRole;
  employee_permissions: EmployeePermissions[];
  sessions?: EmployeeSession[];
}

interface ReferralCode {
  id: string;
  code: string;
  short_code: string | null;
  owner_user_id: string | null;
}

const SUB_ROLE_LABELS: Record<SubRole, string> = {
  super_admin: "Super Admin",
  editor: "Editor",
  content_writer: "Content Writer",
};

const SUB_ROLE_COLORS: Record<SubRole, string> = {
  super_admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  editor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  content_writer: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const SUB_ROLE_PRESETS: Record<SubRole, Record<string, boolean>> = {
  super_admin: {
    can_view_revenue: true,
    can_view_clicks: true,
    can_view_signups: true,
    can_view_enrollments: true,
    can_manage_cms: true,
    can_manage_carousel: true,
    can_manage_students: true,
    can_manage_subjects: true,
    can_manage_enrollments: true,
    can_manage_calendar: true,
    can_manage_discount_codes: true,
    can_manage_referral_codes: true,
    can_manage_videos: true,
    can_manage_pdfs: true,
    can_manage_analytics: true,
    can_manage_gallery: true,
    can_manage_subject_cms: true,
  },
  editor: {
    can_view_revenue: false,
    can_view_clicks: true,
    can_view_signups: true,
    can_view_enrollments: true,
    can_manage_cms: true,
    can_manage_carousel: true,
    can_manage_students: true,
    can_manage_subjects: true,
    can_manage_enrollments: true,
    can_manage_calendar: true,
    can_manage_discount_codes: false,
    can_manage_referral_codes: false,
    can_manage_videos: true,
    can_manage_pdfs: true,
    can_manage_analytics: true,
    can_manage_gallery: true,
    can_manage_subject_cms: true,
  },
  content_writer: {
    can_view_revenue: false,
    can_view_clicks: false,
    can_view_signups: false,
    can_view_enrollments: false,
    can_manage_cms: true,
    can_manage_carousel: false,
    can_manage_students: false,
    can_manage_subjects: false,
    can_manage_enrollments: false,
    can_manage_calendar: false,
    can_manage_discount_codes: false,
    can_manage_referral_codes: false,
    can_manage_videos: true,
    can_manage_pdfs: true,
    can_manage_analytics: false,
    can_manage_gallery: true,
    can_manage_subject_cms: true,
  },
};

const PERMISSION_GROUPS = [
  {
    label: "Dashboard Analytics",
    icon: Eye,
    permissions: [
      { key: "can_view_clicks", label: "View Clicks" },
      { key: "can_view_signups", label: "View Signups" },
      { key: "can_view_enrollments", label: "View Enrollments" },
      { key: "can_view_revenue", label: "View Revenue (Sensitive)" },
    ],
  },
  {
    label: "Students & Enrollments",
    icon: Users,
    permissions: [
      { key: "can_manage_students", label: "Manage Students" },
      { key: "can_manage_enrollments", label: "Manage Enrollments" },
    ],
  },
  {
    label: "Course Content",
    icon: BookOpen,
    permissions: [
      { key: "can_manage_subjects", label: "Manage Subjects" },
      { key: "can_manage_subject_cms", label: "Manage Subject CMS" },
    ],
  },
  {
    label: "Resources",
    icon: Calendar,
    permissions: [
      { key: "can_manage_calendar", label: "Manage Calendar" },
      { key: "can_manage_pdfs", label: "Manage PDFs" },
      { key: "can_manage_videos", label: "Manage Free Videos" },
    ],
  },
  {
    label: "Promotions",
    icon: Settings,
    permissions: [
      { key: "can_manage_discount_codes", label: "Manage Discount Codes" },
      { key: "can_manage_referral_codes", label: "Manage Referral Codes" },
    ],
  },
  {
    label: "Carousel Banners",
    icon: ImageIcon,
    permissions: [
      { key: "can_manage_carousel", label: "Manage Carousel Banners" },
    ],
  },
  {
    label: "Content & Blog",
    icon: Layout,
    permissions: [
      { key: "can_manage_cms", label: "Manage CMS & Blog" },
      { key: "can_manage_gallery", label: "Manage Photo Gallery" },
    ],
  },
  {
    label: "Analytics",
    icon: BarChart,
    permissions: [
      { key: "can_manage_analytics", label: "Access Analytics" },
    ],
  },
];

export default function EmployeeManagementPage() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteSubRole, setInviteSubRole] = useState<SubRole>("content_writer");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createName, setCreateName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createSubRole, setCreateSubRole] = useState<SubRole>("content_writer");
  const [createPermissions, setCreatePermissions] = useState<Record<string, boolean>>(SUB_ROLE_PRESETS.content_writer);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const [invitePermissions, setInvitePermissions] = useState<Record<string, boolean>>(
    SUB_ROLE_PRESETS.content_writer
  );
  const [inviteReferralCodeId, setInviteReferralCodeId] = useState<string>("");

  const resetInviteForm = () => {
    setInviteEmail("");
    setInviteSubRole("content_writer");
    setInvitePermissions(SUB_ROLE_PRESETS.content_writer);
    setInviteReferralCodeId("");
  };

  const resetCreateForm = () => {
    setCreateEmail("");
    setCreateName("");
    setCreatePhone("");
    setCreatePassword("");
    setCreateSubRole("content_writer");
    setCreatePermissions(SUB_ROLE_PRESETS.content_writer);
    setShowPassword(false);
    setCopiedPassword(false);
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 12; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    setCreatePassword(pwd);
    setShowPassword(true);
  };

  const handleCreateSubRoleChange = (role: SubRole) => {
    setCreateSubRole(role);
    setCreatePermissions({ ...SUB_ROLE_PRESETS[role] });
  };

  const handleCreateAccount = async () => {
    if (!createEmail || !createPassword) return;
    setIsCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-employee-account`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            email: createEmail,
            password: createPassword,
            name: createName,
            phone: createPhone,
            sub_role: createSubRole,
            permissions: createPermissions,
          }),
        }
      );
      const result = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Account created", description: `Employee account created for ${createEmail}` });
        resetCreateForm();
        setCreateDialogOpen(false);
        fetchData();
      }
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
    setIsCreating(false);
  };

  const handleSubRoleChange = (role: SubRole) => {
    setInviteSubRole(role);
    setInvitePermissions({ ...SUB_ROLE_PRESETS[role] });
  };

  const fetchData = async () => {
    setIsLoading(true);
    const [empRes, refRes] = await Promise.all([
      supabase
        .from("employees")
        .select("*, employee_permissions(*)")
        .order("created_at", { ascending: false }),
      supabase
        .from("discount_codes")
        .select("id, code, short_code, owner_user_id")
        .eq("is_referral", true),
    ]);
    
    const emps = (empRes.data as any as Employee[]) || [];
    
    // Fetch sessions for all employees with user_ids
    const employeeUserIds = emps.filter(e => e.user_id).map(e => e.user_id!);
    if (employeeUserIds.length > 0) {
      const { data: sessionsData } = await supabase
        .from("user_sessions")
        .select("*")
        .in("user_id", employeeUserIds)
        .order("last_active_at", { ascending: false });
      
      // Map sessions to employees
      const sessionsByUser = new Map<string, EmployeeSession[]>();
      (sessionsData || []).forEach((s: any) => {
        const existing = sessionsByUser.get(s.user_id) || [];
        existing.push(s);
        sessionsByUser.set(s.user_id, existing);
      });
      
      emps.forEach(e => {
        if (e.user_id) {
          e.sessions = sessionsByUser.get(e.user_id) || [];
        }
      });
    }
    
    setEmployees(emps);
    if (refRes.data) setReferralCodes(refRes.data);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setIsInviting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-employee`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ 
            email: inviteEmail, 
            sub_role: inviteSubRole,
            permissions: invitePermissions,
          }),
        }
      );
      const result = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Employee invited", description: `Invitation sent to ${inviteEmail}` });
        resetInviteForm();
        setInviteDialogOpen(false);
        fetchData();
      }
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
    setIsInviting(false);
  };

  const handlePermissionToggle = async (
    employeeId: string,
    permId: string,
    field: string,
    value: boolean
  ) => {
    const { error } = await supabase
      .from("employee_permissions")
      .update({ [field]: value })
      .eq("id", permId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === employeeId
            ? {
                ...e,
                employee_permissions: e.employee_permissions.map((p) =>
                  p.id === permId ? { ...p, [field]: value } : p
                ),
              }
            : e
        )
      );
    }
  };

  const handleSubRoleUpdate = async (employeeId: string, newRole: SubRole) => {
    const { error } = await supabase
      .from("employees")
      .update({ sub_role: newRole })
      .eq("id", employeeId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setEmployees(prev => prev.map(e => e.id === employeeId ? { ...e, sub_role: newRole } : e));
      toast({ title: "Role updated" });
    }
  };

  const handleAssignReferral = async (employeeUserId: string, codeId: string) => {
    const { error } = await supabase
      .from("discount_codes")
      .update({ owner_user_id: employeeUserId, owner_type: "employee" })
      .eq("id", codeId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Referral assigned" });
      fetchData();
    }
  };

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`Permanently delete ${emp.invited_email}? This will remove their account entirely and cannot be undone.`)) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-employee`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ employee_id: emp.id }),
        }
      );
      const result = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Employee deleted", description: "Account fully removed from the system." });
        fetchData();
      }
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  const unassignedCodes = referralCodes.filter((r) => !r.owner_user_id);

  const PermissionToggles = ({ 
    permissions, 
    onToggle, 
    readOnly = false 
  }: { 
    permissions: Record<string, boolean>; 
    onToggle: (key: string, value: boolean) => void; 
    readOnly?: boolean;
  }) => (
    <div className="space-y-4">
      {PERMISSION_GROUPS.map((group) => (
        <div key={group.label} className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <group.icon className="h-3.5 w-3.5" />
            {group.label}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-1">
            {group.permissions.map((perm) => (
              <div key={perm.key} className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-muted/50">
                <span className="text-sm">{perm.label}</span>
                <Switch
                  checked={!!permissions[perm.key]}
                  onCheckedChange={(v) => onToggle(perm.key, v)}
                  disabled={readOnly}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Employees</h1>
            <p className="text-muted-foreground">Manage employee invitations, roles & permissions</p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={createDialogOpen} onOpenChange={(open) => { setCreateDialogOpen(open); if (!open) resetCreateForm(); }}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <KeyRound className="h-4 w-4 mr-2" />
                  Create Account
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] rounded-2xl border-0 bg-gradient-to-br from-card to-muted/30 shadow-xl p-0 overflow-hidden">
                <div className="bg-gradient-brand px-6 py-5">
                  <DialogTitle className="text-lg font-bold text-primary-foreground">
                    Create Employee Account
                  </DialogTitle>
                  <p className="text-primary-foreground/70 text-sm mt-1">Set up a new team member with credentials & permissions</p>
                </div>
                <ScrollArea className="max-h-[65vh]">
                  <div className="p-6 space-y-5">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                      <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Employee name" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</Label>
                      <Input type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} placeholder="employee@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone (optional)</Label>
                      <Input value={createPhone} onChange={(e) => setCreatePhone(e.target.value)} placeholder="01XXXXXXXXX" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
                      <div className="flex gap-2">
                        <Input type={showPassword ? "text" : "password"} value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} placeholder="Min 6 characters" className="font-mono" />
                        <Button type="button" variant="outline" onClick={generatePassword}>Generate</Button>
                        {createPassword && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(createPassword); setCopiedPassword(true); setTimeout(() => setCopiedPassword(false), 2000); }}>
                            {copiedPassword ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                      {createPassword && showPassword && (
                        <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">{createPassword}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</Label>
                      <Select value={createSubRole} onValueChange={(v) => handleCreateSubRoleChange(v as SubRole)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="super_admin">Super Admin — Full access</SelectItem>
                          <SelectItem value="editor">Editor — Content & management</SelectItem>
                          <SelectItem value="content_writer">Content Writer — Content only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Shield className="h-4 w-4" />
                        Permissions
                      </div>
                      <PermissionToggles permissions={createPermissions} onToggle={(key, value) => setCreatePermissions(p => ({ ...p, [key]: value }))} />
                    </div>
                    <Button onClick={handleCreateAccount} disabled={isCreating || !createEmail || !createPassword} className="w-full h-12 rounded-xl font-bold bg-gradient-brand hover:opacity-90 transition-opacity">
                      <KeyRound className="h-4 w-4 mr-2" />
                      {isCreating ? "Creating..." : "Create Account"}
                    </Button>
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
            <Dialog open={inviteDialogOpen} onOpenChange={(open) => { setInviteDialogOpen(open); if (!open) resetInviteForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Employee
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] rounded-2xl border-0 bg-gradient-to-br from-card to-muted/30 shadow-xl p-0 overflow-hidden">
              <div className="bg-gradient-brand px-6 py-5">
                <DialogTitle className="text-lg font-bold text-primary-foreground">
                  Invite Employee
                </DialogTitle>
                <p className="text-primary-foreground/70 text-sm mt-1">Send an invitation email with role & permissions</p>
              </div>
              <ScrollArea className="max-h-[65vh]">
                <div className="p-6 space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</Label>
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="employee@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</Label>
                    <Select value={inviteSubRole} onValueChange={(v) => handleSubRoleChange(v as SubRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin">Super Admin — Full access</SelectItem>
                        <SelectItem value="editor">Editor — Content & management (no finance)</SelectItem>
                        <SelectItem value="content_writer">Content Writer — Content only</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Selecting a role presets permissions below. You can customize them individually.
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Shield className="h-4 w-4" />
                      Permissions
                    </div>
                    <PermissionToggles
                      permissions={invitePermissions}
                      onToggle={(key, value) => setInvitePermissions(p => ({ ...p, [key]: value }))}
                    />
                  </div>

                  <Separator />

                  {unassignedCodes.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Link2 className="h-4 w-4" />
                        Assign Referral Code (optional)
                      </div>
                      <Select value={inviteReferralCodeId} onValueChange={setInviteReferralCodeId}>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select a referral code" />
                        </SelectTrigger>
                        <SelectContent>
                          {unassignedCodes.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.short_code || r.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Button onClick={handleInvite} disabled={isInviting || !inviteEmail} className="w-full h-12 rounded-xl font-bold bg-gradient-brand hover:opacity-90 transition-opacity">
                    <Mail className="h-4 w-4 mr-2" />
                    {isInviting ? "Sending..." : "Send Invitation"}
                  </Button>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="py-8"><div className="h-16 bg-muted rounded" /></CardContent>
              </Card>
            ))}
          </div>
        ) : employees.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No employees yet. Invite one to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {employees.map((emp) => {
              const perms = emp.employee_permissions?.[0];
              const assignedCode = referralCodes.find((r) => r.owner_user_id === emp.user_id);
              const subRole = (emp.sub_role || 'content_writer') as SubRole;

              return (
                <Card key={emp.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-wrap">
                        <CardTitle className="text-base">{emp.invited_email}</CardTitle>
                        <Badge variant={emp.status === "active" ? "default" : "secondary"}>
                          {emp.status}
                        </Badge>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SUB_ROLE_COLORS[subRole]}`}>
                          {SUB_ROLE_LABELS[subRole]}
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(emp)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Sub Role Selector */}
                    <div className="flex items-center gap-3">
                      <Label className="text-sm text-muted-foreground whitespace-nowrap">Role:</Label>
                      <Select value={subRole} onValueChange={(v) => handleSubRoleUpdate(emp.id, v as SubRole)}>
                        <SelectTrigger className="w-[200px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="content_writer">Content Writer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Permissions */}
                    {perms && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Shield className="h-4 w-4" />
                          Permissions
                        </div>
                        <PermissionToggles
                          permissions={perms as unknown as Record<string, boolean>}
                          onToggle={(key, value) => handlePermissionToggle(emp.id, perms.id, key, value)}
                        />
                      </div>
                    )}

                    <Separator />

                    {/* Referral Code */}
                    <div className="flex items-center gap-3">
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                      {assignedCode ? (
                        <Badge variant="outline" className="font-mono">
                          /ref/{assignedCode.short_code || assignedCode.code}
                        </Badge>
                      ) : emp.user_id ? (
                        <Select onValueChange={(v) => handleAssignReferral(emp.user_id!, v)}>
                          <SelectTrigger className="w-[200px] h-8 text-xs">
                            <SelectValue placeholder="Assign referral code" />
                          </SelectTrigger>
                          <SelectContent>
                            {unassignedCodes.map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.short_code || r.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Awaiting signup to assign referral
                        </span>
                      )}
                    </div>

                    {/* Employee Activity */}
                    {emp.sessions && emp.sessions.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Monitor className="h-4 w-4" />
                            Active Sessions & Devices
                          </div>
                          <div className="space-y-1.5">
                            {emp.sessions.slice(0, 5).map((sess) => (
                              <div key={sess.id} className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/50">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${sess.is_active ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
                                  <span className="font-medium">{sess.device_label || 'Unknown Device'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>{new Date(sess.last_active_at).toLocaleString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    {emp.user_id && (!emp.sessions || emp.sessions.length === 0) && (
                      <>
                        <Separator />
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <Monitor className="h-3.5 w-3.5" />
                          No login sessions recorded yet
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
