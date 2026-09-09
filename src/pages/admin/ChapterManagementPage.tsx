import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  BookOpen, Plus, Pencil, Trash2, ArrowUp, ArrowDown,
  Video, Lock, Unlock, GripVertical, ChevronDown, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SubjectPicker } from "@/components/admin/SubjectPicker";

interface Subject {
  id: string;
  name: string;
  name_bn: string;
  department: string | null;
  course_type: string | null;
  compatible_years: number[] | null;
}

interface ChapterClass {
  id: string;
  chapter_id: string;
  title: string;
  title_bn: string | null;
  youtube_url: string;
  is_free: boolean;
  display_order: number;
  created_at: string;
}

interface Chapter {
  id: string;
  subject_id: string;
  title: string;
  title_bn: string | null;
  description: string | null;
  description_bn: string | null;
  youtube_url: string | null;
  is_free: boolean;
  display_order: number;
  created_at: string;
}

const emptyChapter = { title: "", title_bn: "", description: "", description_bn: "" };
const emptyClass = { title: "", title_bn: "", youtube_url: "", is_free: false };

export function ChapterManagementPageContent() {
  const { isEnglish } = useLanguage();
  const { toast } = useToast();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [classesMap, setClassesMap] = useState<Record<string, ChapterClass[]>>({});
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Chapter dialog
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [chapterForm, setChapterForm] = useState(emptyChapter);

  // Class dialog
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ChapterClass | null>(null);
  const [classForm, setClassForm] = useState(emptyClass);
  const [activeChapterId, setActiveChapterId] = useState("");

  useEffect(() => {
    supabase.from("subjects").select("id, name, name_bn, department, course_type, compatible_years").order("name").then(({ data }) => {
      if (data) setSubjects(data as Subject[]);
    });
  }, []);

  useEffect(() => {
    if (selectedSubjectId) fetchChapters();
  }, [selectedSubjectId]);

  const fetchChapters = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("subject_chapters")
      .select("*")
      .eq("subject_id", selectedSubjectId)
      .order("display_order");
    const chaps = (data || []) as Chapter[];
    setChapters(chaps);

    // Fetch all classes for these chapters
    if (chaps.length > 0) {
      const chapterIds = chaps.map(c => c.id);
      const { data: classData } = await supabase
        .from("chapter_classes")
        .select("*")
        .in("chapter_id", chapterIds)
        .order("display_order");
      const map: Record<string, ChapterClass[]> = {};
      (classData || []).forEach((cl: ChapterClass) => {
        if (!map[cl.chapter_id]) map[cl.chapter_id] = [];
        map[cl.chapter_id].push(cl);
      });
      setClassesMap(map);
    } else {
      setClassesMap({});
    }
    setIsLoading(false);
  };

  const toggleExpand = (id: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Chapter CRUD ──
  const openAddChapter = () => { setEditingChapter(null); setChapterForm(emptyChapter); setChapterDialogOpen(true); };
  const openEditChapter = (ch: Chapter) => {
    setEditingChapter(ch);
    setChapterForm({ title: ch.title, title_bn: ch.title_bn || "", description: ch.description || "", description_bn: ch.description_bn || "" });
    setChapterDialogOpen(true);
  };

  const saveChapter = async () => {
    if (!chapterForm.title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    if (editingChapter) {
      await supabase.from("subject_chapters").update({
        title: chapterForm.title, title_bn: chapterForm.title_bn || null,
        description: chapterForm.description || null, description_bn: chapterForm.description_bn || null,
      }).eq("id", editingChapter.id);
      toast({ title: "Chapter updated" });
    } else {
      const maxOrder = chapters.length > 0 ? Math.max(...chapters.map(c => c.display_order)) + 1 : 0;
      await supabase.from("subject_chapters").insert({
        subject_id: selectedSubjectId, title: chapterForm.title, title_bn: chapterForm.title_bn || null,
        description: chapterForm.description || null, description_bn: chapterForm.description_bn || null,
        youtube_url: null, is_free: false, display_order: maxOrder,
      });
      toast({ title: "Chapter added" });
    }
    setChapterDialogOpen(false);
    fetchChapters();
  };

  const deleteChapter = async (id: string) => {
    if (!confirm("Delete this chapter and all its classes?")) return;
    await supabase.from("subject_chapters").delete().eq("id", id);
    toast({ title: "Chapter deleted" });
    fetchChapters();
  };

  const reorderChapter = async (id: string, direction: "up" | "down") => {
    const idx = chapters.findIndex(c => c.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= chapters.length) return;
    await Promise.all([
      supabase.from("subject_chapters").update({ display_order: chapters[swapIdx].display_order }).eq("id", chapters[idx].id),
      supabase.from("subject_chapters").update({ display_order: chapters[idx].display_order }).eq("id", chapters[swapIdx].id),
    ]);
    fetchChapters();
  };

  // ── Class CRUD ──
  const openAddClass = (chapterId: string) => {
    setActiveChapterId(chapterId);
    setEditingClass(null);
    setClassForm(emptyClass);
    setClassDialogOpen(true);
  };
  const openEditClass = (cl: ChapterClass) => {
    setActiveChapterId(cl.chapter_id);
    setEditingClass(cl);
    setClassForm({ title: cl.title, title_bn: cl.title_bn || "", youtube_url: cl.youtube_url, is_free: cl.is_free });
    setClassDialogOpen(true);
  };

  const saveClass = async () => {
    if (!classForm.title.trim() || !classForm.youtube_url.trim()) {
      toast({ title: "Title and Bunny Stream URL are required", variant: "destructive" }); return;
    }
    if (editingClass) {
      await supabase.from("chapter_classes").update({
        title: classForm.title, title_bn: classForm.title_bn || null,
        youtube_url: classForm.youtube_url, is_free: classForm.is_free,
      }).eq("id", editingClass.id);
      toast({ title: "Class updated" });
    } else {
      const existing = classesMap[activeChapterId] || [];
      const maxOrder = existing.length > 0 ? Math.max(...existing.map(c => c.display_order)) + 1 : 0;
      await supabase.from("chapter_classes").insert({
        chapter_id: activeChapterId, title: classForm.title, title_bn: classForm.title_bn || null,
        youtube_url: classForm.youtube_url, is_free: classForm.is_free, display_order: maxOrder,
      });
      toast({ title: "Class added" });
    }
    setClassDialogOpen(false);
    fetchChapters();
  };

  const deleteClass = async (id: string) => {
    if (!confirm("Delete this class?")) return;
    await supabase.from("chapter_classes").delete().eq("id", id);
    toast({ title: "Class deleted" });
    fetchChapters();
  };

  const toggleClassFree = async (cl: ChapterClass) => {
    await supabase.from("chapter_classes").update({ is_free: !cl.is_free }).eq("id", cl.id);
    fetchChapters();
  };

  const reorderClass = async (cl: ChapterClass, direction: "up" | "down") => {
    const classes = classesMap[cl.chapter_id] || [];
    const idx = classes.findIndex(c => c.id === cl.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= classes.length) return;
    await Promise.all([
      supabase.from("chapter_classes").update({ display_order: classes[swapIdx].display_order }).eq("id", classes[idx].id),
      supabase.from("chapter_classes").update({ display_order: classes[idx].display_order }).eq("id", classes[swapIdx].id),
    ]);
    fetchChapters();
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Chapter Management</h1>
          <p className="text-sm text-muted-foreground">Manage chapters and classes per subject</p>
        </div>

        <SubjectPicker
          subjects={subjects}
          selectedId={selectedSubjectId}
          onSelect={setSelectedSubjectId}
          emptyHint="No subjects match these filters."
        />

        {selectedSubjectId && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" /> Chapters ({chapters.length})
              </CardTitle>
              <Button size="sm" onClick={openAddChapter}><Plus className="h-4 w-4 mr-1" /> Add Chapter</Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : chapters.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Video className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No chapters yet. Add your first chapter.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {chapters.map((ch, idx) => {
                    const classes = classesMap[ch.id] || [];
                    const isExpanded = expandedChapters.has(ch.id);
                    return (
                      <div key={ch.id} className="border rounded-lg overflow-hidden">
                        {/* Chapter row */}
                        <div className="flex items-center gap-3 p-3 bg-card hover:bg-muted/50 transition-colors">
                          <button onClick={() => toggleExpand(ch.id)} className="shrink-0">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{ch.title}</p>
                            {ch.title_bn && <p className="text-xs text-muted-foreground truncate">{ch.title_bn}</p>}
                          </div>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {classes.length} {classes.length === 1 ? "class" : "classes"}
                          </Badge>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === 0} onClick={() => reorderChapter(ch.id, "up")}><ArrowUp className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === chapters.length - 1} onClick={() => reorderChapter(ch.id, "down")}><ArrowDown className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditChapter(ch)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteChapter(ch.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>

                        {/* Expanded classes */}
                        {isExpanded && (
                          <div className="bg-muted/20 border-t px-4 py-3 space-y-2">
                            {classes.map((cl, clIdx) => (
                              <div key={cl.id} className="flex items-center gap-2 p-2 rounded-md bg-card border text-sm">
                                <span className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{clIdx + 1}</span>
                                <Video className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="truncate font-medium">{cl.title}</p>
                                  {cl.title_bn && <p className="text-xs text-muted-foreground truncate">{cl.title_bn}</p>}
                                </div>
                                <button onClick={() => toggleClassFree(cl)} className="shrink-0">
                                  {cl.is_free ? (
                                    <Badge variant="outline" className="border-green-300 text-green-600 gap-1 cursor-pointer text-xs"><Unlock className="h-3 w-3" /> Free</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="gap-1 cursor-pointer text-xs"><Lock className="h-3 w-3" /> Paid</Badge>
                                  )}
                                </button>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled={clIdx === 0} onClick={() => reorderClass(cl, "up")}><ArrowUp className="h-3 w-3" /></Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled={clIdx === classes.length - 1} onClick={() => reorderClass(cl, "down")}><ArrowDown className="h-3 w-3" /></Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditClass(cl)}><Pencil className="h-3 w-3" /></Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteClass(cl.id)}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                              </div>
                            ))}
                            <Button variant="outline" size="sm" className="w-full mt-1" onClick={() => openAddClass(ch.id)}>
                              <Plus className="h-3.5 w-3.5 mr-1" /> Add Class
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Chapter Dialog */}
      <Dialog open={chapterDialogOpen} onOpenChange={setChapterDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingChapter ? "Edit Chapter" : "Add Chapter"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title (English) *</Label><Input value={chapterForm.title} onChange={e => setChapterForm({ ...chapterForm, title: e.target.value })} /></div>
            <div><Label>Title (Bengali)</Label><Input value={chapterForm.title_bn} onChange={e => setChapterForm({ ...chapterForm, title_bn: e.target.value })} /></div>
            <div><Label>Description (English)</Label><Textarea value={chapterForm.description} onChange={e => setChapterForm({ ...chapterForm, description: e.target.value })} rows={2} /></div>
            <div><Label>Description (Bengali)</Label><Textarea value={chapterForm.description_bn} onChange={e => setChapterForm({ ...chapterForm, description_bn: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChapterDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveChapter}>{editingChapter ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Class Dialog */}
      <Dialog open={classDialogOpen} onOpenChange={setClassDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingClass ? "Edit Class" : "Add Class"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Class Title (English) *</Label><Input value={classForm.title} onChange={e => setClassForm({ ...classForm, title: e.target.value })} /></div>
            <div><Label>Class Title (Bengali)</Label><Input value={classForm.title_bn} onChange={e => setClassForm({ ...classForm, title_bn: e.target.value })} /></div>
            <div><Label>Bunny Stream URL *</Label><Input value={classForm.youtube_url} onChange={e => setClassForm({ ...classForm, youtube_url: e.target.value })} placeholder="https://player.mediadelivery.net/embed/<libraryId>/<videoId>" /></div>
            <div className="flex items-center gap-3">
              <Switch checked={classForm.is_free} onCheckedChange={v => setClassForm({ ...classForm, is_free: v })} />
              <Label>Free class (visible to everyone)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClassDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveClass}>{editingClass ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function ChapterManagementPage() {
  return <AdminLayout><ChapterManagementPageContent /></AdminLayout>;
}
