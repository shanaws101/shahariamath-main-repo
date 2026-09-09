import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FileText, Plus, Trash2, Eye, EyeOff, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CoursePdf {
  id: string;
  title: string;
  title_bn: string | null;
  subject_id: string | null;
  department: string | null;
  target_years: number[] | null;
  file_url: string;
  file_size_bytes: number | null;
  is_free: boolean;
  is_visible: boolean;
  display_order: number;
  created_at: string;
}

interface Subject {
  id: string;
  name: string;
  name_bn: string;
}

const departmentOptions = ['accounting', 'management', 'finance', 'marketing', 'economics', 'general', 'statistics'];

export function PDFManagementPageContent() {
  const { toast } = useToast();
  const [pdfs, setPdfs] = useState<CoursePdf[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [titleBn, setTitleBn] = useState("");
  const [subjectId, setSubjectId] = useState<string>("none");
  const [department, setDepartment] = useState<string>("all");
  const [targetYears, setTargetYears] = useState<number[]>([1, 2, 3, 4]);
  const [isFree, setIsFree] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchPdfs();
    fetchSubjects();
  }, []);

  const fetchPdfs = async () => {
    setIsLoading(true);
    const { data } = await supabase.from("course_pdfs").select("*").order("created_at", { ascending: false });
    if (data) setPdfs(data as CoursePdf[]);
    setIsLoading(false);
  };

  const fetchSubjects = async () => {
    const { data } = await supabase.from("subjects").select("id, name, name_bn").order("name");
    if (data) setSubjects(data);
  };

  const handleUpload = async () => {
    if (!title || !selectedFile) {
      toast({ title: "Error", description: "Title and PDF file are required.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const fileName = `${Date.now()}-${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("course-pdfs")
        .upload(fileName, selectedFile, { contentType: "application/pdf" });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("course-pdfs").getPublicUrl(fileName);

      const newPdfId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}`;
      const { error: insertError } = await supabase.from("course_pdfs").insert({
        id: newPdfId,
        title,
        title_bn: titleBn || null,
        subject_id: subjectId === "none" ? null : subjectId,
        department: department === "all" ? null : department,
        target_years: targetYears,
        file_url: fileName,
        file_size_bytes: selectedFile.size,
        is_free: isFree,
        is_visible: true,
      });

      if (insertError) throw insertError;

      // Also sync to pdf_suggestions for universal website visibility
      try {
        const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const slug = baseSlug.endsWith('-pdf-suggestion') ? baseSlug : `${baseSlug}-pdf-suggestion`;
        await (supabase as any).from('pdf_suggestions').upsert({
          id: newPdfId,
          subject_id: subjectId === "none" ? null : subjectId,
          title,
          title_bn: titleBn || title,
          slug,
          department: department === "all" ? 'accounting' : (department || 'accounting'),
          course_type: 'BBA',
          compatible_years: targetYears && targetYears.length > 0 ? targetYears : [1, 2, 3, 4],
          subject_type: 'Theory',
          is_free: isFree,
          price: isFree ? 0 : 20,
          original_price: isFree ? 0 : 100,
          file_url: fileName,
          file_name: selectedFile.name,
          file_size_bytes: selectedFile.size,
          free_pdf_url: isFree ? fileName : null,
          free_pdf_name: isFree ? selectedFile.name : null,
          free_pdf_size_bytes: isFree ? selectedFile.size : 0,
          paid_pdf_url: !isFree ? fileName : null,
          paid_pdf_name: !isFree ? selectedFile.name : null,
          paid_pdf_size_bytes: !isFree ? selectedFile.size : 0,
          is_free_available: isFree,
          is_paid_available: !isFree,
          is_visible: true,
          display_order: 0,
        }, { onConflict: 'id' });
      } catch (syncErr) {
        console.warn('pdf_suggestions dual sync notice:', syncErr);
      }

      toast({ title: "PDF uploaded successfully" });
      setIsDialogOpen(false);
      resetForm();
      fetchPdfs();
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setTitleBn("");
    setSubjectId("none");
    setDepartment("all");
    setTargetYears([1, 2, 3, 4]);
    setIsFree(false);
    setSelectedFile(null);
  };

  const toggleVisibility = async (pdf: CoursePdf) => {
    await supabase.from("course_pdfs").update({ is_visible: !pdf.is_visible }).eq("id", pdf.id);
    fetchPdfs();
  };

  const deletePdf = async (pdf: CoursePdf) => {
    if (!confirm(`Delete "${pdf.title}"?`)) return;
    await supabase.storage.from("course-pdfs").remove([pdf.file_url]);
    await supabase.from("course_pdfs").delete().eq("id", pdf.id);
    toast({ title: "PDF deleted" });
    fetchPdfs();
  };

  const toggleYear = (year: number) => {
    setTargetYears((prev) => prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year].sort());
  };

  const getSubjectName = (id: string | null) => {
    if (!id) return "All / Free";
    return subjects.find((s) => s.id === id)?.name || "Unknown";
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6" /> PDF Management
            </h1>
            <p className="text-muted-foreground">Upload and manage course PDFs for students</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Upload PDF</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Upload New PDF</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title (English)</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chapter 1 Notes" />
                  </div>
                  <div className="space-y-2">
                    <Label>Title (বাংলা)</Label>
                    <Input value={titleBn} onChange={(e) => setTitleBn(e.target.value)} placeholder="অধ্যায় ১ নোট" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Subject (optional)</Label>
                  <Select value={subjectId} onValueChange={setSubjectId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific subject (Free PDF)</SelectItem>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departmentOptions.map((d) => (
                        <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Target Years</Label>
                  <div className="flex gap-4">
                    {[1, 2, 3, 4].map((year) => (
                      <div key={year} className="flex items-center gap-2">
                        <Checkbox id={`pdf-year-${year}`} checked={targetYears.includes(year)} onCheckedChange={() => toggleYear(year)} />
                        <Label htmlFor={`pdf-year-${year}`} className="text-sm">Year {year}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Switch id="is-free" checked={isFree} onCheckedChange={setIsFree} />
                  <Label htmlFor="is-free">Free PDF (visible to all students)</Label>
                </div>

                <div className="space-y-2">
                  <Label>PDF File</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label htmlFor="pdf-upload" className="cursor-pointer">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      {selectedFile ? (
                        <p className="text-sm text-foreground font-medium">{selectedFile.name} ({formatSize(selectedFile.size)})</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Click to select PDF file</p>
                      )}
                    </label>
                  </div>
                </div>

                <Button onClick={handleUpload} className="w-full" disabled={uploading}>
                  {uploading ? "Uploading..." : "Upload PDF"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Dept</TableHead>
                  <TableHead>Years</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : pdfs.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No PDFs uploaded yet.</TableCell></TableRow>
                ) : (
                  pdfs.map((pdf) => (
                    <TableRow key={pdf.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{pdf.title}</p>
                          {pdf.title_bn && <p className="text-xs text-muted-foreground">{pdf.title_bn}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{getSubjectName(pdf.subject_id)}</TableCell>
                      <TableCell className="text-xs capitalize">{pdf.department || "All"}</TableCell>
                      <TableCell>
                        <div className="flex gap-0.5">
                          {pdf.target_years?.map((y) => (
                            <Badge key={y} variant="outline" className="text-[10px] px-1">Y{y}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{formatSize(pdf.file_size_bytes)}</TableCell>
                      <TableCell>
                        <Badge variant={pdf.is_free ? "secondary" : "outline"} className="text-xs">
                          {pdf.is_free ? "Free" : "Paid"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={pdf.is_visible ? "secondary" : "outline"} className="text-xs">
                          {pdf.is_visible ? "Visible" : "Hidden"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleVisibility(pdf)}>
                            {pdf.is_visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deletePdf(pdf)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
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

export default function PDFManagementPage() {
  return <AdminLayout requiredPermission="can_manage_pdfs"><PDFManagementPageContent /></AdminLayout>;
}
