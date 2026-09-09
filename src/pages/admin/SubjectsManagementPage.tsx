import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BookOpen, Plus, Edit, Trash2, Eye, EyeOff, Copy, Link, Check, Users, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InstructorManager } from "@/components/admin/InstructorManager";
import { AiWriterButton } from "@/components/admin/AiWriterButton";
import { courseTypeHasYears } from "@/lib/course-types";
import { COURSE_TYPES, DEPARTMENTS, DEPARTMENT_LABELS, formatDepartment } from "@/lib/constants";

interface Subject {
  id: string;
  name: string;
  name_bn: string;
  description: string | null;
  description_bn: string | null;
  price: number;
  original_price: number | null;
  slug: string;
  compatible_years: number[] | null;
  is_visible: boolean;
  facebook_group_url: string | null;
  whatsapp_support_url: string | null;
  department: string | null;
  course_type: string | null;
  subject_type: string | null;
  demo_video_url: string | null;
  instructor_avatars: string[] | null;
}

const courseTypeOptions = [...COURSE_TYPES];
const departmentOptions = [...DEPARTMENTS];
const subjectTypeOptions = ['Theory', 'Math', 'Theory+Graph', 'N/A'];

const defaultSubject: Partial<Subject> = {
  name: '', name_bn: '', description: '', description_bn: '', price: 0, original_price: 0, slug: '',
  compatible_years: [1, 2, 3, 4], is_visible: true, facebook_group_url: '', whatsapp_support_url: '',
  department: 'accounting', course_type: 'BBA', subject_type: 'Theory', demo_video_url: '', instructor_avatars: [],
};

export function SubjectsManagementPageContent() {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Partial<Subject>>(defaultSubject);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');

  const copyEnrollmentLink = (slug: string, id: string) => {
    const link = `https://olisaharacademy.com/subjects/${slug}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Link copied", description: "Enrollment link copied to clipboard." });
  };

  useEffect(() => { fetchSubjects(); }, []);

  const fetchSubjects = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('subjects').select('*').order('name');
    if (!error && data) setSubjects(data);
    setIsLoading(false);
  };

  const generateSlug = (name: string, dept?: string, courseType?: string) => {
    const prefix = courseType ? courseType.toLowerCase().replace(/[^a-z]+/g, '-') : '';
    const deptPart = dept || '';
    const namePart = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return [prefix, deptPart, namePart].filter(Boolean).join('-');
  };

  const handleSave = async () => {
    if (!editingSubject.name || !editingSubject.name_bn) {
      toast({ title: "Error", description: "Name is required in both languages.", variant: "destructive" });
      return;
    }
    const slug = editingSubject.slug || generateSlug(editingSubject.name, editingSubject.department || undefined, editingSubject.course_type || undefined);
    const subjectData = {
      name: editingSubject.name, name_bn: editingSubject.name_bn,
      description: editingSubject.description || null, description_bn: editingSubject.description_bn || null,
      price: editingSubject.price || 0, slug,
      compatible_years: courseTypeHasYears(editingSubject.course_type) ? (editingSubject.compatible_years || [1, 2, 3, 4]) : null,
      is_visible: editingSubject.is_visible ?? true,
      facebook_group_url: editingSubject.facebook_group_url || null,
      whatsapp_support_url: editingSubject.whatsapp_support_url || null,
      department: editingSubject.department || null,
      course_type: editingSubject.course_type || 'BBA',
      subject_type: editingSubject.subject_type || 'Theory',
      original_price: editingSubject.original_price || 0,
      demo_video_url: editingSubject.demo_video_url || null,
      instructor_avatars: editingSubject.instructor_avatars || [],
    };

    if (isEditing && editingSubject.id) {
      const { error } = await supabase.from('subjects').update(subjectData).eq('id', editingSubject.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Subject updated" });
    } else {
      const { error } = await supabase.from('subjects').insert(subjectData);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Subject created" });
    }
    setIsDialogOpen(false); setEditingSubject(defaultSubject); setIsEditing(false); fetchSubjects();
  };

  const handleEdit = (subject: Subject) => { setEditingSubject(subject); setIsEditing(true); setIsDialogOpen(true); };
  const handleToggleVisibility = async (subject: Subject) => {
    const { error } = await supabase.from('subjects').update({ is_visible: !subject.is_visible }).eq('id', subject.id);
    if (!error) { toast({ title: subject.is_visible ? "Hidden" : "Visible" }); fetchSubjects(); }
  };
  const handleDelete = async (subject: Subject) => {
    if (!confirm(`Delete "${subject.name}"?`)) return;
    const { error } = await supabase.from('subjects').delete().eq('id', subject.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Deleted" }); fetchSubjects();
  };
  const toggleYear = (year: number) => {
    const years = editingSubject.compatible_years || [];
    setEditingSubject({ ...editingSubject, compatible_years: years.includes(year) ? years.filter(y => y !== year) : [...years, year].sort() });
  };

  const filteredSubjects = subjects.filter(s => {
    if (filterCourse !== 'all' && s.course_type !== filterCourse) return false;
    if (filterDept !== 'all' && s.department !== filterDept) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.name_bn.includes(searchQuery);
    }
    return true;
  });

  const deptLabel = (d: string | null) => formatDepartment(d);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Subjects</h1>
            <p className="text-muted-foreground">Manage {subjects.length} course subjects</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingSubject(defaultSubject); setIsEditing(false); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Subject</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isEditing ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name (English)</Label>
                    <Input value={editingSubject.name || ''} onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value, slug: generateSlug(e.target.value, editingSubject.department || undefined, editingSubject.course_type || undefined) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Name (বাংলা)</Label>
                    <Input value={editingSubject.name_bn || ''} onChange={(e) => setEditingSubject({ ...editingSubject, name_bn: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Course Type</Label>
                    <Select value={editingSubject.course_type || 'BBA'} onValueChange={(v) => setEditingSubject({ ...editingSubject, course_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{courseTypeOptions.map(ct => <SelectItem key={ct} value={ct}>{ct}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select value={editingSubject.department || 'accounting'} onValueChange={(v) => setEditingSubject({ ...editingSubject, department: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{departmentOptions.map(d => <SelectItem key={d} value={d}>{deptLabel(d)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Subject Type</Label>
                    <Select value={editingSubject.subject_type || 'Theory'} onValueChange={(v) => setEditingSubject({ ...editingSubject, subject_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{subjectTypeOptions.map(st => <SelectItem key={st} value={st}>{st}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input value={editingSubject.slug || ''} onChange={(e) => setEditingSubject({ ...editingSubject, slug: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Description (EN)</Label>
                      <AiWriterButton type="course_description" context={`Course: ${editingSubject.name || ''}, Type: ${editingSubject.course_type || 'BBA'}, Dept: ${editingSubject.department || ''}`} defaultPrompt="Write a compelling course description in English" onApply={(t) => setEditingSubject({...editingSubject, description: t})} />
                    </div>
                    <Textarea value={editingSubject.description || ''} onChange={(e) => setEditingSubject({ ...editingSubject, description: e.target.value })} rows={2} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Description (BN)</Label>
                      <AiWriterButton type="course_description" context={`Course: ${editingSubject.name || ''}, Type: ${editingSubject.course_type || 'BBA'}`} defaultPrompt="Write a compelling course description in Bangla (বাংলা)" label="AI বাংলা" onApply={(t) => setEditingSubject({...editingSubject, description_bn: t})} />
                    </div>
                    <Textarea value={editingSubject.description_bn || ''} onChange={(e) => setEditingSubject({ ...editingSubject, description_bn: e.target.value })} rows={2} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Price (৳)</Label>
                    <Input type="number" value={editingSubject.price || 0} onChange={(e) => setEditingSubject({ ...editingSubject, price: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Original Price (৳)</Label>
                    <Input type="number" value={editingSubject.original_price || 0} onChange={(e) => setEditingSubject({ ...editingSubject, original_price: Number(e.target.value) })} placeholder="Strikethrough price" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Demo Video URL (Bunny Stream)</Label>
                  <Input value={editingSubject.demo_video_url || ''} onChange={(e) => setEditingSubject({ ...editingSubject, demo_video_url: e.target.value })} placeholder="https://player.mediadelivery.net/embed/<libraryId>/<videoId>" />
                </div>

                {/* Instructor Management - only show when editing existing subject */}
                {isEditing && editingSubject.id && (
                  <InstructorManager subjectId={editingSubject.id} />
                )}

                {courseTypeHasYears(editingSubject.course_type) && (
                  <div className="space-y-2">
                    <Label>Compatible Years</Label>
                    <div className="flex gap-4">
                      {[1, 2, 3, 4].map(year => (
                        <div key={year} className="flex items-center gap-2">
                          <Checkbox id={`year-${year}`} checked={editingSubject.compatible_years?.includes(year)} onCheckedChange={() => toggleYear(year)} />
                          <Label htmlFor={`year-${year}`} className="text-sm">Year {year}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Facebook Group URL</Label>
                    <Input value={editingSubject.facebook_group_url || ''} onChange={(e) => setEditingSubject({ ...editingSubject, facebook_group_url: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp URL</Label>
                    <Input value={editingSubject.whatsapp_support_url || ''} onChange={(e) => setEditingSubject({ ...editingSubject, whatsapp_support_url: e.target.value })} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox id="is_visible" checked={editingSubject.is_visible} onCheckedChange={(checked) => setEditingSubject({ ...editingSubject, is_visible: !!checked })} />
                  <Label htmlFor="is_visible">Visible to students</Label>
                </div>

                <Button onClick={handleSave} className="w-full">{isEditing ? 'Update Subject' : 'Create Subject'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search subjects..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterCourse} onValueChange={setFilterCourse}>
            <SelectTrigger className="w-[160px]"><Filter className="h-3 w-3 mr-2" /><SelectValue placeholder="Course Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courseTypeOptions.map(ct => <SelectItem key={ct} value={ct}>{ct}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Depts</SelectItem>
              {departmentOptions.map(d => <SelectItem key={d} value={d}>{deptLabel(d)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Badge variant="secondary">{filteredSubjects.length} subjects</Badge>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Dept</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Years</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : filteredSubjects.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No subjects found.</TableCell></TableRow>
                ) : (
                  filteredSubjects.map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{subject.name}</p>
                          <p className="text-xs text-muted-foreground">{subject.name_bn}</p>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{subject.course_type || '—'}</Badge></TableCell>
                      <TableCell><span className="text-xs capitalize">{subject.department || '—'}</span></TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{subject.subject_type || '—'}</Badge></TableCell>
                      <TableCell className="font-medium text-sm">৳{subject.price}</TableCell>
                      <TableCell>
                        <div className="flex gap-0.5">
                          {subject.compatible_years?.map(y => <Badge key={y} variant="outline" className="text-[10px] px-1">Y{y}</Badge>) || <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell>{subject.is_visible ? <Badge variant="secondary" className="text-xs">Visible</Badge> : <Badge variant="outline" className="text-xs">Hidden</Badge>}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyEnrollmentLink(subject.slug, subject.id)} title="Copy link">
                            {copiedId === subject.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Link className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(subject)}><Edit className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleVisibility(subject)}>
                            {subject.is_visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(subject)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
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

export default function SubjectsManagementPage() {
  return <AdminLayout requiredPermission="can_manage_subjects"><SubjectsManagementPageContent /></AdminLayout>;
}
