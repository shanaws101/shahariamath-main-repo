import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Ticket, Plus, Edit, Trash2, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  subject_id: string | null;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  owner_user_id: string | null;
  owner_type: string | null;
  subjects?: { name: string } | null;
}

interface Subject {
  id: string;
  name: string;
}

interface EmployeeOption {
  id: string;
  user_id: string | null;
  invited_email: string;
  status: string;
  sub_role?: string | null;
  full_name?: string | null;
}

const SUB_ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  editor: 'Editor',
  content_writer: 'Content Writer',
};

const defaultCode: Partial<DiscountCode> = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 10,
  max_uses: null,
  is_active: true,
  valid_until: null,
  owner_user_id: null,
  owner_type: null,
};

export function DiscountCodesPageContent() {
  const { toast } = useToast();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<Partial<DiscountCode>>(defaultCode);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    
    const [codesRes, subjectsRes, empRes] = await Promise.all([
      supabase
        .from('discount_codes')
        .select('*, subjects(name)')
        .order('created_at', { ascending: false }),
      supabase.from('subjects').select('id, name'),
      supabase.from('employees').select('id, user_id, invited_email, status, sub_role'),
    ]);

    if (codesRes.data) setCodes(codesRes.data as unknown as DiscountCode[]);
    if (subjectsRes.data) setSubjects(subjectsRes.data);
    if (empRes.data) {
      const emps = empRes.data as EmployeeOption[];
      const userIds = emps.map(e => e.user_id).filter(Boolean) as string[];
      let nameMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        (profs || []).forEach(p => { if (p.user_id) nameMap[p.user_id] = p.full_name; });
      }
      setEmployees(emps.map(e => ({ ...e, full_name: e.user_id ? nameMap[e.user_id] || null : null })));
    }

    setIsLoading(false);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'SMC-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setEditingCode({ ...editingCode, code });
  };

  const handleSave = async () => {
    if (!editingCode.code) {
      toast({
        title: "Error",
        description: "Code is required.",
        variant: "destructive",
      });
      return;
    }

    const codeData = {
      code: editingCode.code.toUpperCase(),
      description: editingCode.description || null,
      discount_type: editingCode.discount_type || 'percentage',
      discount_value: editingCode.discount_value || 0,
      max_uses: editingCode.max_uses || null,
      subject_id: editingCode.subject_id || null,
      is_active: editingCode.is_active ?? true,
      valid_until: editingCode.valid_until || null,
      owner_user_id: editingCode.owner_user_id || null,
      owner_type: editingCode.owner_user_id ? 'employee' : editingCode.owner_type || null,
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
      toast({ title: "Code updated" });
    } else {
      const { error } = await supabase
        .from('discount_codes')
        .insert(codeData);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Code created" });
    }

    setIsDialogOpen(false);
    setEditingCode(defaultCode);
    setIsEditing(false);
    fetchData();
  };

  const handleEdit = (code: DiscountCode) => {
    setEditingCode(code);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleToggleActive = async (code: DiscountCode) => {
    const { error } = await supabase
      .from('discount_codes')
      .update({ is_active: !code.is_active })
      .eq('id', code.id);

    if (!error) {
      toast({ title: code.is_active ? "Code deactivated" : "Code activated" });
      fetchData();
    }
  };

  const handleDelete = async (code: DiscountCode) => {
    if (!confirm(`Delete code "${code.code}"?`)) return;

    const { error } = await supabase
      .from('discount_codes')
      .delete()
      .eq('id', code.id);

    if (!error) {
      toast({ title: "Code deleted" });
      fetchData();
    }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Discount Codes</h1>
            <p className="text-muted-foreground">Create and manage coupon & referral codes</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingCode(defaultCode);
              setIsEditing(false);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Code
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg rounded-2xl border-0 bg-gradient-to-br from-card to-muted/30 shadow-xl p-0 overflow-hidden">
              <div className="bg-gradient-brand px-6 py-5">
                <DialogTitle className="text-lg font-bold text-primary-foreground">
                  {isEditing ? 'Edit Discount Code' : 'Create Discount Code'}
                </DialogTitle>
                <p className="text-primary-foreground/70 text-sm mt-1">
                  {isEditing ? 'Update code details below' : 'Set up a new discount code for your students'}
                </p>
              </div>
              <div className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code</Label>
                  <div className="flex gap-2">
                    <Input
                      value={editingCode.code || ''}
                      onChange={(e) => setEditingCode({ ...editingCode, code: e.target.value.toUpperCase() })}
                      placeholder="SMC-SAVE20"
                      className="font-mono"
                    />
                    <Button type="button" variant="outline" onClick={generateCode}>
                      Generate
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
                  <Input
                    value={editingCode.description || ''}
                    onChange={(e) => setEditingCode({ ...editingCode, description: e.target.value })}
                    placeholder="Summer sale discount"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Discount Type</Label>
                    <Select
                      value={editingCode.discount_type}
                      onValueChange={(value: 'percentage' | 'fixed') => 
                        setEditingCode({ ...editingCode, discount_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount (৳)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Value</Label>
                    <Input
                      type="number"
                      value={editingCode.discount_value || 0}
                      onChange={(e) => setEditingCode({ ...editingCode, discount_value: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Apply to Subject (optional)</Label>
                  <Select
                    value={editingCode.subject_id || 'all'}
                    onValueChange={(value) => 
                      setEditingCode({ ...editingCode, subject_id: value === 'all' ? null : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All subjects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      {subjects.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assign to Employee (optional)</Label>
                  <Select
                    value={editingCode.owner_user_id || 'none'}
                    onValueChange={(value) =>
                      setEditingCode({ ...editingCode, owner_user_id: value === 'none' ? null : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No employee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Employee</SelectItem>
                      {employees.filter(e => e.user_id).map(emp => {
                        const label = emp.full_name || emp.invited_email;
                        const roleLabel = emp.sub_role ? (SUB_ROLE_LABELS[emp.sub_role] || emp.sub_role) : null;
                        return (
                          <SelectItem key={emp.id} value={emp.user_id!}>
                            <span className="font-medium">{label}</span>
                            {roleLabel && <span className="text-muted-foreground ml-2">· {roleLabel}</span>}
                            {emp.full_name && <span className="text-muted-foreground ml-2 text-xs">({emp.invited_email})</span>}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max Uses (optional)</Label>
                    <Input
                      type="number"
                      value={editingCode.max_uses || ''}
                      onChange={(e) => setEditingCode({ 
                        ...editingCode, 
                        max_uses: e.target.value ? Number(e.target.value) : null 
                      })}
                      placeholder="Unlimited"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valid Until (optional)</Label>
                    <Input
                      type="date"
                      value={editingCode.valid_until?.split('T')[0] || ''}
                      onChange={(e) => setEditingCode({ 
                        ...editingCode, 
                        valid_until: e.target.value || null 
                      })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="is_active"
                    checked={editingCode.is_active}
                    onCheckedChange={(checked) => setEditingCode({ ...editingCode, is_active: !!checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>

                <Button onClick={handleSave} className="w-full h-12 rounded-xl font-bold bg-gradient-brand hover:opacity-90 transition-opacity">
                  {isEditing ? 'Update Code' : 'Create Code'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Codes Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                  </TableRow>
                ) : codes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No discount codes yet. Create your first code.
                    </TableCell>
                  </TableRow>
                ) : (
                  codes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-bold bg-muted px-2 py-1 rounded">
                            {code.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyCode(code.code, code.id)}
                          >
                            {copiedId === code.id ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        {code.description && (
                          <p className="text-xs text-muted-foreground mt-1">{code.description}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {code.discount_type === 'percentage' 
                            ? `${code.discount_value}% OFF`
                            : `৳${code.discount_value} OFF`
                          }
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {code.subjects?.name || 'All Subjects'}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {code.current_uses} / {code.max_uses || '∞'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {code.is_active ? (
                          <Badge className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(code)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleToggleActive(code)}
                          >
                            <Ticket className={`h-4 w-4 ${code.is_active ? 'text-green-500' : 'text-muted-foreground'}`} />
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
      </div>
    </>
  );
}

export default function DiscountCodesPage() {
  return <AdminLayout requiredPermission="can_manage_discount_codes"><DiscountCodesPageContent /></AdminLayout>;
}
