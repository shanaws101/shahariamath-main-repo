import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Edit, Trash2, Copy, Check, Link2, MousePointerClick,
  UserPlus, TrendingUp, Users, Crown, BarChart3,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReferralCode {
  id: string;
  code: string;
  short_code: string | null;
  description: string | null;
  discount_type: string;
  discount_value: number;
  discount_percent_receiver: number;
  discount_percent_owner: number;
  owner_user_id: string | null;
  owner_type: string;
  is_referral: boolean;
  is_active: boolean;
  max_uses: number | null;
  current_uses: number;
  subject_id: string | null;
  valid_until: string | null;
  subjects?: { name: string } | null;
  owner_profile?: { full_name: string; email: string } | null;
  click_count?: number;
  conversion_count?: number;
}

interface EmployeeUser {
  user_id: string;
  full_name: string;
  email: string;
}

const defaultReferral: Partial<ReferralCode> = {
  code: '',
  short_code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 0,
  discount_percent_receiver: 10,
  discount_percent_owner: 5,
  owner_type: 'system',
  is_referral: true,
  is_active: true,
  max_uses: null,
  valid_until: null,
  subject_id: null,
  owner_user_id: null,
};

export function ReferralManagementPageContent() {
  const { toast } = useToast();
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [employees, setEmployees] = useState<EmployeeUser[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<Partial<ReferralCode>>(defaultReferral);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({});
  const [conversionCounts, setConversionCounts] = useState<Record<string, number>>({});

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    const [codesRes, employeesRes, subjectsRes] = await Promise.all([
      supabase
        .from('discount_codes')
        .select('*, subjects(name)')
        .eq('is_referral', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'employee'),
      supabase.from('subjects').select('id, name'),
    ]);

    const referralCodes = (codesRes.data || []) as unknown as ReferralCode[];
    setCodes(referralCodes);
    if (subjectsRes.data) setSubjects(subjectsRes.data);

    // Fetch employee profiles
    if (employeesRes.data && employeesRes.data.length > 0) {
      const userIds = employeesRes.data.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);
      if (profiles) setEmployees(profiles);
    }

    // Fetch click & conversion counts for referral codes
    if (referralCodes.length > 0) {
      const codeIds = referralCodes.map(c => c.id);

      const [clicksRes, conversionsRes] = await Promise.all([
        supabase
          .from('referral_clicks')
          .select('referral_code_id')
          .in('referral_code_id', codeIds),
        supabase
          .from('referral_conversions')
          .select('referral_code_id')
          .in('referral_code_id', codeIds),
      ]);

      const clicks: Record<string, number> = {};
      (clicksRes.data || []).forEach((c: any) => {
        clicks[c.referral_code_id] = (clicks[c.referral_code_id] || 0) + 1;
      });
      setClickCounts(clicks);

      const convs: Record<string, number> = {};
      (conversionsRes.data || []).forEach((c: any) => {
        convs[c.referral_code_id] = (convs[c.referral_code_id] || 0) + 1;
      });
      setConversionCounts(convs);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const generateCode = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 10; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setEditingCode({ ...editingCode, short_code: code, code: code.toUpperCase() });
  };

  const handleSave = async () => {
    if (!editingCode.code) {
      toast({ title: "Error", description: "Code is required.", variant: "destructive" });
      return;
    }

    const codeData = {
      code: editingCode.code!.toUpperCase(),
      short_code: editingCode.short_code || editingCode.code!.toLowerCase(),
      description: editingCode.description || null,
      discount_type: editingCode.discount_type || 'percentage',
      discount_value: editingCode.discount_percent_receiver || 0,
      discount_percent_receiver: editingCode.discount_percent_receiver || 0,
      discount_percent_owner: editingCode.discount_percent_owner || 0,
      owner_user_id: editingCode.owner_user_id || null,
      owner_type: editingCode.owner_type || 'system',
      is_referral: true,
      is_active: editingCode.is_active ?? true,
      max_uses: editingCode.max_uses || null,
      subject_id: editingCode.subject_id || null,
      valid_until: editingCode.valid_until || null,
    };

    if (isEditing && editingCode.id) {
      const { error } = await supabase
        .from('discount_codes')
        .update(codeData)
        .eq('id', editingCode.id);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Referral code updated" });
    } else {
      const { error } = await supabase
        .from('discount_codes')
        .insert(codeData);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Referral code created" });
    }

    setIsDialogOpen(false);
    setEditingCode(defaultReferral);
    setIsEditing(false);
    fetchData();
  };

  const handleEdit = (code: ReferralCode) => {
    setEditingCode(code);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleToggleActive = async (code: ReferralCode) => {
    await supabase.from('discount_codes').update({ is_active: !code.is_active }).eq('id', code.id);
    toast({ title: code.is_active ? "Code deactivated" : "Code activated" });
    fetchData();
  };

  const handleDelete = async (code: ReferralCode) => {
    if (!confirm(`Delete referral code "${code.code}"?`)) return;
    await supabase.from('discount_codes').delete().eq('id', code.id);
    toast({ title: "Code deleted" });
    fetchData();
  };

  const copyLink = (shortCode: string, id: string) => {
    const link = `https://olisaharacademy.com/ref/${shortCode}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalClicks = Object.values(clickCounts).reduce((a, b) => a + b, 0);
  const totalConversions = Object.values(conversionCounts).reduce((a, b) => a + b, 0);
  const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : '0';

  // Leaderboard: sorted by conversions
  const leaderboard = codes
    .filter(c => c.owner_user_id && c.owner_type === 'employee')
    .map(c => ({
      ...c,
      clicks: clickCounts[c.id] || 0,
      conversions: conversionCounts[c.id] || 0,
    }))
    .sort((a, b) => b.conversions - a.conversions);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Referral Management</h1>
            <p className="text-muted-foreground">Create and manage referral codes, track performance</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) { setEditingCode(defaultReferral); setIsEditing(false); }
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Create Referral Code</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg rounded-2xl border-0 bg-gradient-to-br from-card to-muted/30 shadow-xl p-0 overflow-hidden max-h-[90vh]">
              <div className="bg-gradient-brand px-6 py-5">
                <DialogTitle className="text-lg font-bold text-primary-foreground">
                  {isEditing ? 'Edit Referral Code' : 'Create Referral Code'}
                </DialogTitle>
                <p className="text-primary-foreground/70 text-sm mt-1">
                  {isEditing ? 'Update referral code details' : 'Set up a new referral link for tracking'}
                </p>
              </div>
              <div className="p-6 space-y-5 overflow-y-auto max-h-[65vh]">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Short Code (used in link)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={editingCode.short_code || ''}
                      onChange={(e) => {
                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
                        setEditingCode({ ...editingCode, short_code: val, code: val.toUpperCase() });
                      }}
                      placeholder="john483920"
                      className="font-mono"
                    />
                    <Button type="button" variant="outline" onClick={generateCode}>Generate</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Link: https://olisaharacademy.com/ref/{editingCode.short_code || '...'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
                  <Input
                    value={editingCode.description || ''}
                    onChange={(e) => setEditingCode({ ...editingCode, description: e.target.value })}
                    placeholder="Employee referral - John"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Owner Type</Label>
                  <Select
                    value={editingCode.owner_type}
                    onValueChange={(val) => setEditingCode({ ...editingCode, owner_type: val, owner_user_id: null })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System (Admin Created)</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editingCode.owner_type === 'employee' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assign to Employee</Label>
                    <Select
                      value={editingCode.owner_user_id || 'none'}
                      onValueChange={(val) => setEditingCode({ ...editingCode, owner_user_id: val === 'none' ? null : val })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {employees.map(emp => (
                          <SelectItem key={emp.user_id} value={emp.user_id}>
                            {emp.full_name} ({emp.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {employees.length === 0 && (
                      <p className="text-xs text-muted-foreground">No employees found. Assign the 'employee' role to users first.</p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Receiver Discount %</Label>
                    <Input
                      type="number"
                      value={editingCode.discount_percent_receiver || 0}
                      onChange={(e) => setEditingCode({ ...editingCode, discount_percent_receiver: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Owner Reward %</Label>
                    <Input
                      type="number"
                      value={editingCode.discount_percent_owner || 0}
                      onChange={(e) => setEditingCode({ ...editingCode, discount_percent_owner: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Apply to Subject (optional)</Label>
                  <Select
                    value={editingCode.subject_id || 'all'}
                    onValueChange={(val) => setEditingCode({ ...editingCode, subject_id: val === 'all' ? null : val })}
                  >
                    <SelectTrigger><SelectValue placeholder="All subjects" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      {subjects.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max Uses (optional)</Label>
                    <Input
                      type="number"
                      value={editingCode.max_uses || ''}
                      onChange={(e) => setEditingCode({ ...editingCode, max_uses: e.target.value ? Number(e.target.value) : null })}
                      placeholder="Unlimited"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valid Until (optional)</Label>
                    <Input
                      type="date"
                      value={editingCode.valid_until?.split('T')[0] || ''}
                      onChange={(e) => setEditingCode({ ...editingCode, valid_until: e.target.value || null })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="ref_active"
                    checked={editingCode.is_active}
                    onCheckedChange={(checked) => setEditingCode({ ...editingCode, is_active: !!checked })}
                  />
                  <Label htmlFor="ref_active">Active</Label>
                </div>

                <Button onClick={handleSave} className="w-full h-12 rounded-xl font-bold bg-gradient-brand hover:opacity-90 transition-opacity">
                  {isEditing ? 'Update Code' : 'Create Referral Code'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Link2 className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{codes.length}</p>
                <p className="text-xs text-muted-foreground">Active Codes</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><MousePointerClick className="h-5 w-5 text-blue-500" /></div>
              <div>
                <p className="text-2xl font-bold">{totalClicks}</p>
                <p className="text-xs text-muted-foreground">Total Clicks</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><UserPlus className="h-5 w-5 text-green-500" /></div>
              <div>
                <p className="text-2xl font-bold">{totalConversions}</p>
                <p className="text-xs text-muted-foreground">Conversions</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10"><TrendingUp className="h-5 w-5 text-amber-500" /></div>
              <div>
                <p className="text-2xl font-bold">{conversionRate}%</p>
                <p className="text-xs text-muted-foreground">Conversion Rate</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="codes">
          <TabsList>
            <TabsTrigger value="codes">Referral Codes</TabsTrigger>
            <TabsTrigger value="leaderboard">Employee Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="codes">
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code / Link</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Clicks</TableHead>
                      <TableHead>Conversions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                      </TableRow>
                    ) : codes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No referral codes yet. Create your first referral code.
                        </TableCell>
                      </TableRow>
                    ) : (
                      codes.map((code) => (
                        <TableRow key={code.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="font-mono font-bold bg-muted px-2 py-1 rounded text-sm">
                                {code.short_code || code.code}
                              </code>
                              <Button
                                variant="ghost" size="icon" className="h-6 w-6"
                                onClick={() => copyLink(code.short_code || code.code.toLowerCase(), code.id)}
                              >
                                {copiedId === code.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                              </Button>
                            </div>
                            {code.description && <p className="text-xs text-muted-foreground mt-1">{code.description}</p>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {code.owner_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs space-y-1">
                              <div>Receiver: <span className="font-medium">{code.discount_percent_receiver}%</span></div>
                              <div>Owner: <span className="font-medium">{code.discount_percent_owner}%</span></div>
                            </div>
                          </TableCell>
                          <TableCell>{clickCounts[code.id] || 0}</TableCell>
                          <TableCell>{conversionCounts[code.id] || 0}</TableCell>
                          <TableCell>
                            {code.is_active ? (
                              <Badge className="bg-green-500">Active</Badge>
                            ) : (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(code)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleToggleActive(code)}>
                                <Link2 className={`h-4 w-4 ${code.is_active ? 'text-green-500' : 'text-muted-foreground'}`} />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(code)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaderboard">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  Employee Performance Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table className="min-w-[500px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Clicks</TableHead>
                      <TableHead>Conversions</TableHead>
                      <TableHead>Conv. Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No employee referral codes yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      leaderboard.map((entry, i) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <span className={`font-bold ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-zinc-400' : i === 2 ? 'text-amber-700' : ''}`}>
                              {i + 1}
                            </span>
                          </TableCell>
                          <TableCell>
                            <code className="font-mono font-bold">{entry.short_code || entry.code}</code>
                            {entry.description && <p className="text-xs text-muted-foreground">{entry.description}</p>}
                          </TableCell>
                          <TableCell>{entry.clicks}</TableCell>
                          <TableCell>{entry.conversions}</TableCell>
                          <TableCell>
                            {entry.clicks > 0 ? ((entry.conversions / entry.clicks) * 100).toFixed(1) : 0}%
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

export default function ReferralManagementPage() {
  return <AdminLayout requiredPermission="can_manage_referral_codes"><ReferralManagementPageContent /></AdminLayout>;
}
