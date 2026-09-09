import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Package, Plus, Pencil, Trash2, BookOpen, Search, Save, X, Image 
} from 'lucide-react';

interface Bundle {
  id: string;
  title: string;
  title_bn: string | null;
  department: string | null;
  year: number | null;
  price: number;
  original_price: number | null;
  cover_image_url: string | null;
  description: string | null;
  description_bn: string | null;
  is_visible: boolean;
  display_order: number;
  subject_ids: string[];
}

interface Subject {
  id: string;
  name: string;
  name_bn: string;
  price: number;
  department: string | null;
  subject_type: string | null;
  course_type: string | null;
  compatible_years: number[] | null;
}

const departments = [
  { value: 'management', label: 'Management' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'finance', label: 'Finance' },
  { value: 'economics', label: 'Economics' },
];

const emptyForm: Omit<Bundle, 'id' | 'subject_ids'> & { subject_ids: string[] } = {
  title: '',
  title_bn: null,
  department: null,
  year: null,
  price: 0,
  original_price: null,
  cover_image_url: null,
  description: null,
  description_bn: null,
  is_visible: true,
  display_order: 0,
  subject_ids: [],
};

export function BundleManagementPageContent() {
  const { toast } = useToast();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    const [{ data: bundlesData }, { data: subjectsData }] = await Promise.all([
      supabase.from('bundles').select('*').order('display_order'),
      supabase.from('subjects').select('id, name, name_bn, price, department, subject_type, course_type, compatible_years').order('name'),
    ]);

    if (bundlesData) {
      // Fetch subject IDs for each bundle
      const bundlesWithSubjects = await Promise.all(
        bundlesData.map(async (b: any) => {
          const { data: bs } = await supabase
            .from('bundle_subjects')
            .select('subject_id')
            .eq('bundle_id', b.id);
          return { ...b, subject_ids: bs?.map(x => x.subject_id) || [] };
        })
      );
      setBundles(bundlesWithSubjects);
    }
    if (subjectsData) setAllSubjects(subjectsData);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setCoverFile(null);
    setDialogOpen(true);
  };

  const openEdit = (bundle: Bundle) => {
    setEditingId(bundle.id);
    setForm({
      title: bundle.title,
      title_bn: bundle.title_bn,
      department: bundle.department,
      year: bundle.year,
      price: bundle.price,
      original_price: bundle.original_price,
      cover_image_url: bundle.cover_image_url,
      description: bundle.description,
      description_bn: bundle.description_bn,
      is_visible: bundle.is_visible,
      display_order: bundle.display_order,
      subject_ids: bundle.subject_ids,
    });
    setCoverFile(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    setIsSaving(true);

    try {
      let coverUrl = form.cover_image_url;

      // Upload cover image if provided
      if (coverFile) {
        const ext = coverFile.name.split('.').pop();
        const path = `bundle-covers/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('blog-images')
          .upload(path, coverFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('blog-images').getPublicUrl(path);
        coverUrl = publicUrl;
      }

      const bundleData = {
        title: form.title,
        title_bn: form.title_bn,
        department: form.department,
        year: form.year,
        price: form.price,
        original_price: form.original_price,
        cover_image_url: coverUrl,
        description: form.description,
        description_bn: form.description_bn,
        is_visible: form.is_visible,
        display_order: form.display_order,
      };

      let bundleId = editingId;

      if (editingId) {
        const { error } = await supabase.from('bundles').update(bundleData).eq('id', editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('bundles').insert(bundleData).select().single();
        if (error) throw error;
        bundleId = data.id;
      }

      // Update bundle subjects
      if (bundleId) {
        await supabase.from('bundle_subjects').delete().eq('bundle_id', bundleId);
        if (form.subject_ids.length > 0) {
          const rows = form.subject_ids.map(sid => ({ bundle_id: bundleId!, subject_id: sid }));
          await supabase.from('bundle_subjects').insert(rows);
        }
      }

      toast({ title: editingId ? 'Bundle updated' : 'Bundle created' });
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error saving bundle', description: error.message, variant: 'destructive' });
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this bundle?')) return;
    await supabase.from('bundles').delete().eq('id', id);
    toast({ title: 'Bundle deleted' });
    fetchData();
  };

  const toggleSubject = (subjectId: string) => {
    setForm(prev => ({
      ...prev,
      subject_ids: prev.subject_ids.includes(subjectId)
        ? prev.subject_ids.filter(id => id !== subjectId)
        : [...prev.subject_ids, subjectId],
    }));
  };

  // Filter subjects in dialog
  const filteredSubjects = allSubjects.filter(s => {
    // Filter by department
    if (form.department && s.department !== form.department) return false;
    // Filter by year
    if (form.year && s.compatible_years && !s.compatible_years.includes(form.year)) return false;
    // Filter by search
    if (subjectSearch) {
      const q = subjectSearch.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.name_bn.includes(subjectSearch);
    }
    return true;
  });

  // Auto-calculate original price from selected subjects
  const selectedSubjectsTotal = form.subject_ids.reduce((sum, sid) => {
    const s = allSubjects.find(x => x.id === sid);
    return sum + (s ? Number(s.price) : 0);
  }, 0);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Bundle Management</h1>
            <p className="text-muted-foreground">Create and manage course bundles</p>
          </div>
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Create Bundle
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map(i => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : bundles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No bundles yet. Create your first bundle!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bundles.map(bundle => (
              <Card key={bundle.id} className={`${!bundle.is_visible ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {bundle.cover_image_url ? (
                      <img src={bundle.cover_image_url} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Package className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold truncate">{bundle.title}</h3>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {bundle.department && <Badge variant="secondary" className="text-xs capitalize">{bundle.department}</Badge>}
                            {bundle.year && <Badge variant="outline" className="text-xs">Year {bundle.year}</Badge>}
                            <Badge variant="outline" className="text-xs gap-1">
                              <BookOpen className="h-3 w-3" />
                              {bundle.subject_ids.length} subjects
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(bundle)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(bundle.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-lg font-bold text-primary">৳{bundle.price}</span>
                        {bundle.original_price && bundle.original_price > bundle.price && (
                          <span className="text-sm line-through text-muted-foreground">৳{bundle.original_price}</span>
                        )}
                        {!bundle.is_visible && <Badge variant="destructive" className="text-xs">Hidden</Badge>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Bundle' : 'Create Bundle'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title (English) *</Label>
                  <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Title (Bangla)</Label>
                  <Input value={form.title_bn || ''} onChange={e => setForm(p => ({ ...p, title_bn: e.target.value || null }))} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={form.department || 'none'} onValueChange={v => setForm(p => ({ ...p, department: v === 'none' ? null : v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">All Departments</SelectItem>
                      {departments.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select value={form.year?.toString() || 'none'} onValueChange={v => setForm(p => ({ ...p, year: v === 'none' ? null : parseInt(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">All Years</SelectItem>
                      {[1, 2, 3, 4].map(y => <SelectItem key={y} value={y.toString()}>Year {y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Original Price (৳)</Label>
                  <Input type="number" value={form.original_price || ''} onChange={e => setForm(p => ({ ...p, original_price: e.target.value ? Number(e.target.value) : null }))} placeholder="Auto from subjects or manual" />
                  {selectedSubjectsTotal > 0 && !form.original_price && (
                    <p className="text-xs text-muted-foreground">Auto: ৳{selectedSubjectsTotal}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Bundle Price (৳) *</Label>
                  <Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} />
                  {(form.original_price || selectedSubjectsTotal) > 0 && form.price > 0 && (
                    <p className="text-xs text-green-600 font-medium">
                      {Math.round(((form.original_price || selectedSubjectsTotal) - form.price) / (form.original_price || selectedSubjectsTotal) * 100)}% off
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Description (EN)</Label>
                  <Textarea value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value || null }))} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Description (BN)</Label>
                  <Textarea value={form.description_bn || ''} onChange={e => setForm(p => ({ ...p, description_bn: e.target.value || null }))} rows={3} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Image className="h-4 w-4" /> Cover Image
                </Label>
                <Input type="file" accept="image/*" onChange={e => setCoverFile(e.target.files?.[0] || null)} />
                {form.cover_image_url && !coverFile && (
                  <img src={form.cover_image_url} alt="" className="h-20 rounded-lg object-cover" />
                )}
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={form.is_visible} onCheckedChange={v => setForm(p => ({ ...p, is_visible: v }))} />
                <Label>Visible to students</Label>
              </div>

              {/* Subject Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Select Subjects ({form.subject_ids.length} selected)</Label>
                  <span className="text-xs text-muted-foreground">
                    Individual total: ৳{selectedSubjectsTotal}
                  </span>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search subjects..."
                    value={subjectSearch}
                    onChange={e => setSubjectSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="border rounded-lg max-h-60 overflow-y-auto p-2 space-y-1">
                  {filteredSubjects.map(s => (
                    <div
                      key={s.id}
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-muted transition-colors ${
                        form.subject_ids.includes(s.id) ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => toggleSubject(s.id)}
                    >
                      <Checkbox checked={form.subject_ids.includes(s.id)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {s.department} · {s.subject_type} · ৳{s.price}
                        </p>
                      </div>
                    </div>
                  ))}
                  {filteredSubjects.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No subjects found</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

export default function BundleManagementPage() {
  return <AdminLayout><BundleManagementPageContent /></AdminLayout>;
}

