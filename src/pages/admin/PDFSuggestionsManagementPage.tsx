import { useEffect, useState, useMemo } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  FileText, Plus, Edit, Trash2, Eye, EyeOff, Search, Upload, Check,
  ExternalLink, Sparkles, Wand2, BookOpen, Layers, X, CheckCircle2,
  Filter, ChevronDown, RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { COURSE_TYPES, DEPARTMENTS, DEPARTMENT_LABELS, DEFAULT_PDF_READING_TERMS_TITLE, DEFAULT_PDF_READING_TERMS_CONTENT } from "@/lib/constants";

interface PdfSuggestionRecord {
  id: string;
  subject_id?: string | null;
  title: string;
  title_bn: string;
  slug: string;
  department: string;
  course_type: string;
  compatible_years: number[] | null;
  subject_type: string | null;
  is_free: boolean;
  price: number;
  original_price: number | null;
  description: string | null;
  description_bn: string | null;
  whats_included: { text: string; textBn: string }[];
  file_url?: string | null;
  file_name?: string | null;
  file_size_bytes?: number | null;
  free_pdf_url: string | null;
  free_pdf_name?: string | null;
  free_pdf_size_bytes?: number | null;
  paid_pdf_url: string | null;
  paid_pdf_name?: string | null;
  paid_pdf_size_bytes?: number | null;
  is_free_available?: boolean | null;
  is_paid_available?: boolean | null;
  is_visible: boolean;
  reading_terms_title?: string | null;
  reading_terms?: string | null;
  display_order?: number | null;
  created_at?: string;
  updated_at?: string;
}

interface SubjectRef {
  id: string;
  name: string;
  name_bn: string;
  department: string | null;
  course_type: string | null;
  compatible_years: number[] | null;
  slug: string;
  price: number;
}

const defaultIncludedPresets = [
  { text: 'Chapter-wise 99% common questions with high exam probability', textBn: 'অধ্যায়ভিত্তিক ৯৯% কমন আসার মতো অতি গুরুত্বপূর্ণ প্রশ্নাবলি' },
  { text: 'Complete short & broad question solutions with accurate explanations', textBn: 'সংক্ষিপ্ত ও রচনামূলক সকল প্রশ্নের নির্ভুল ও সহজবোধ্য উত্তরমালা' },
  { text: 'Previous years university question analysis and pattern breakdown', textBn: 'বিগত ৫ বছরের বোর্ড ও বিশ্ববিদ্যালয় পরীক্ষার প্রশ্ন বিশ্লেষণ' },
  { text: 'Special formula sheet & quick exam revision memory hacks', textBn: 'সকল গাণিতিক সূত্র তালিকা এবং দ্রুত রিভিশনের এক্সক্লুসিভ টেকনিক' },
  { text: 'Exam writing format guidelines by Shaharia Sir', textBn: 'পরীক্ষায় সর্বোচ্চ নম্বর পাওয়ার স্ট্র্যাটেজি ও খাতা উপস্থাপনের নিয়ম' },
];

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const generateSlug = (text: string) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const defaultItem: Partial<PdfSuggestionRecord> = {
  title: '',
  title_bn: '',
  slug: '',
  department: 'accounting',
  course_type: 'BBA',
  compatible_years: [1, 2, 3, 4],
  subject_type: 'Theory',
  is_free: false,
  price: 20, // Standard Offer Price 20 Taka
  original_price: 100, // Standard Original Price 100 Taka
  description: '',
  description_bn: '',
  whats_included: [...defaultIncludedPresets],
  file_url: null,
  free_pdf_url: null,
  paid_pdf_url: null,
  is_visible: true,
  is_free_available: true,
  is_paid_available: true,
  reading_terms_title: DEFAULT_PDF_READING_TERMS_TITLE,
  reading_terms: DEFAULT_PDF_READING_TERMS_CONTENT,
};

export function PDFSuggestionsManagementPageContent() {
  const { toast } = useToast();
  const [items, setItems] = useState<PdfSuggestionRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<PdfSuggestionRecord>>(defaultItem);

  // Subject Search & Filter States for Modal
  const [isSubjectPickerOpen, setIsSubjectPickerOpen] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectDeptFilter, setSubjectDeptFilter] = useState('all');
  const [subjectCourseFilter, setSubjectCourseFilter] = useState('all');
  const [subjectYearFilter, setSubjectYearFilter] = useState('all');

  // File Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [pdfSourceMode, setPdfSourceMode] = useState<'upload' | 'google_drive'>('upload');
  const [googleDriveLink, setGoogleDriveLink] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all'); // all, free, paid
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');

  const LOCAL_STORAGE_KEY = 'oli_pdf_suggestions_local';

  const getLocalSuggestions = (): PdfSuggestionRecord[] => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const saveLocalSuggestions = (list: PdfSuggestionRecord[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    } catch {}
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    let localList = getLocalSuggestions();
    const fetchedItems: PdfSuggestionRecord[] = [];

    try {
      // 1. Fetch from pdf_suggestions
      const { data: suggestionsData, error: sugError } = await (supabase as any)
        .from('pdf_suggestions')
        .select('*')
        .order('created_at', { ascending: false });

      if (!sugError && suggestionsData && suggestionsData.length > 0) {
        suggestionsData.forEach((s: any) => {
          fetchedItems.push({
            ...s,
            is_free: s.is_free ?? (s.price === 0),
            price: Number(s.price) || 0,
            original_price: Number(s.original_price) || 0,
          });
        });
      }
    } catch (e) {
      console.warn('pdf_suggestions query notice:', e);
    }

    try {
      // 2. Also fetch from course_pdfs to ensure zero lost data
      const { data: coursePdfsData, error: cpError } = await supabase
        .from('course_pdfs')
        .select('*')
        .order('created_at', { ascending: false });

      if (!cpError && coursePdfsData && coursePdfsData.length > 0) {
        coursePdfsData.forEach((cp: any) => {
          if (!fetchedItems.some(f => f.id === cp.id || (f.file_url && f.file_url === cp.file_url))) {
            const baseSlug = generateSlug(cp.title);
            fetchedItems.push({
              id: cp.id,
              subject_id: cp.subject_id,
              title: cp.title,
              title_bn: cp.title_bn || cp.title,
              slug: baseSlug.endsWith('-pdf-suggestion') ? baseSlug : `${baseSlug}-pdf-suggestion`,
              department: cp.department || 'accounting',
              course_type: 'BBA',
              compatible_years: cp.target_years || [1, 2, 3, 4],
              subject_type: 'Theory',
              is_free: Boolean(cp.is_free),
              price: cp.is_free ? 0 : 20,
              original_price: cp.is_free ? 0 : 100,
              description: null,
              description_bn: null,
              whats_included: defaultIncludedPresets,
              file_url: cp.file_url,
              file_name: cp.file_url ? cp.file_url.split('/').pop() : null,
              file_size_bytes: cp.file_size_bytes || 0,
              free_pdf_url: cp.is_free ? cp.file_url : null,
              paid_pdf_url: !cp.is_free ? cp.file_url : null,
              is_visible: cp.is_visible ?? true,
              is_free_available: Boolean(cp.is_free),
              is_paid_available: !cp.is_free,
              created_at: cp.created_at,
              updated_at: cp.updated_at,
            });
          }
        });
      }
    } catch (e) {
      console.warn('course_pdfs query notice:', e);
    }

    if (fetchedItems.length > 0) {
      setItems(fetchedItems);
      saveLocalSuggestions(fetchedItems);
    } else {
      setItems(localList);
    }

    try {
      // Fetch all subjects for reference and 1-click generator
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('id, name, name_bn, department, course_type, compatible_years, slug, price')
        .order('name');

      if (subjectsData) {
        setSubjects(subjectsData);
      }
    } catch (e) {
      console.error('Error loading subjects:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubjectSelect = (subjectId: string) => {
    if (subjectId === 'none' || !subjectId) {
      setFormData(prev => ({ ...prev, subject_id: null }));
      setIsSubjectPickerOpen(false);
      return;
    }
    const found = subjects.find(s => s.id === subjectId);
    if (!found) return;

    const baseSlug = found.slug || generateSlug(found.name);
    const autoSlug = baseSlug.endsWith('-pdf-suggestion') ? baseSlug : `${baseSlug}-pdf-suggestion`;

    setFormData(prev => ({
      ...prev,
      subject_id: found.id,
      title: `${found.name} ${prev.is_free ? 'Free' : ''} PDF Suggestion`,
      title_bn: `${found.name_bn || found.name} ${prev.is_free ? 'ফ্রি' : ''} পিডিএফ সাজেশন`,
      department: found.department || prev.department || 'accounting',
      course_type: found.course_type || prev.course_type || 'BBA',
      compatible_years: found.compatible_years || prev.compatible_years || [1, 2, 3, 4],
      slug: autoSlug,
      price: prev.is_free ? 0 : 20, // Standard 20 Taka offer price for paid
      original_price: prev.is_free ? 0 : 100, // Standard 100 Taka original price for paid
    }));

    setIsSubjectPickerOpen(false);
    toast({
      title: `Linked: ${found.name}`,
      description: "Subject details, title, and slug auto-populated.",
    });
  };

  const handleTitleChange = (newTitle: string) => {
    setFormData(prev => {
      const prevGeneratedSlug = prev.title ? `${generateSlug(prev.title)}-pdf-suggestion` : '';
      const shouldAutoUpdateSlug = !prev.slug || prev.slug === prevGeneratedSlug || prev.slug === generateSlug(prev.title);
      const newSlug = shouldAutoUpdateSlug && newTitle ? `${generateSlug(newTitle)}-pdf-suggestion` : prev.slug;

      return {
        ...prev,
        title: newTitle,
        slug: newSlug,
      };
    });
  };

  const filteredSubjectsForPicker = useMemo(() => {
    const q = subjectSearch.trim().toLowerCase();
    return subjects.filter(s => {
      const matchCourse = subjectCourseFilter === 'all' || (s.course_type && s.course_type.toLowerCase() === subjectCourseFilter.toLowerCase());
      const matchDept = subjectDeptFilter === 'all' || (s.department && s.department.toLowerCase() === subjectDeptFilter.toLowerCase());
      const matchYear = subjectYearFilter === 'all' || (s.compatible_years && s.compatible_years.includes(parseInt(subjectYearFilter)));
      const matchQuery = !q ||
        s.name.toLowerCase().includes(q) ||
        (s.name_bn && s.name_bn.toLowerCase().includes(q)) ||
        (s.department && s.department.toLowerCase().includes(q)) ||
        (s.slug && s.slug.toLowerCase().includes(q));

      return matchCourse && matchDept && matchYear && matchQuery;
    });
  }, [subjects, subjectSearch, subjectCourseFilter, subjectDeptFilter, subjectYearFilter]);

  const selectedSubject = useMemo(() => {
    if (!formData.subject_id) return null;
    return subjects.find(s => s.id === formData.subject_id) || null;
  }, [subjects, formData.subject_id]);

  const handleUploadFile = async (file: File, folder: 'free' | 'paid'): Promise<{ path: string; name: string; size: number } | null> => {
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `pdf-suggestions/${folder}/${Date.now()}_${cleanFileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('course-pdfs')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.warn(`Storage notice (${folder}):`, uploadError.message);
      }
    } catch {}

    return {
      path: filePath,
      name: file.name,
      size: file.size,
    };
  };

  const handleSave = async () => {
    if (!formData.title || !formData.title_bn) {
      toast({ title: 'Error', description: 'Title is required in both languages.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      let finalFileUrl = formData.file_url || (formData.is_free ? formData.free_pdf_url : formData.paid_pdf_url) || null;
      let finalFileName = formData.file_name || (formData.is_free ? formData.free_pdf_name : formData.paid_pdf_name) || null;
      let finalFileSize = formData.file_size_bytes || 0;

      // Handle PDF source: Google Drive Link OR File Upload
      if (pdfSourceMode === 'google_drive' && googleDriveLink.trim()) {
        finalFileUrl = googleDriveLink.trim();
        finalFileName = `Google Drive PDF (${formData.title})`;
        finalFileSize = 0;
      } else if (selectedFile) {
        const uploaded = await handleUploadFile(selectedFile, formData.is_free ? 'free' : 'paid');
        if (uploaded) {
          finalFileUrl = uploaded.path;
          finalFileName = uploaded.name;
          finalFileSize = uploaded.size;
        }
      }

      const isFreeSuggestion = Boolean(formData.is_free);
      const price = isFreeSuggestion ? 0 : (Number(formData.price) || 20);
      const originalPrice = isFreeSuggestion ? 0 : (Number(formData.original_price) || 100);
      const slug = formData.slug || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const id = (formData.id && formData.id.length > 10) ? formData.id : generateUUID();
      const sanitizedSubjectId = (formData.subject_id && formData.subject_id !== 'none' && formData.subject_id.trim() !== '') ? formData.subject_id : null;
      const sanitizedDept = (formData.department || 'accounting').toLowerCase().trim();

      const payload: PdfSuggestionRecord = {
        id,
        subject_id: sanitizedSubjectId,
        title: formData.title.trim(),
        title_bn: (formData.title_bn || formData.title).trim(),
        slug,
        department: sanitizedDept,
        course_type: formData.course_type || 'BBA',
        compatible_years: formData.compatible_years && formData.compatible_years.length > 0 ? formData.compatible_years : [1, 2, 3, 4],
        subject_type: formData.subject_type || 'Theory',
        is_free: isFreeSuggestion,
        price,
        original_price: originalPrice,
        description: formData.description || null,
        description_bn: formData.description_bn || null,
        whats_included: isFreeSuggestion ? [] : (formData.whats_included || defaultIncludedPresets),
        file_url: finalFileUrl,
        file_name: finalFileName,
        file_size_bytes: finalFileSize,
        free_pdf_url: isFreeSuggestion ? finalFileUrl : null,
        free_pdf_name: isFreeSuggestion ? finalFileName : null,
        free_pdf_size_bytes: isFreeSuggestion ? finalFileSize : 0,
        paid_pdf_url: !isFreeSuggestion ? finalFileUrl : null,
        paid_pdf_name: !isFreeSuggestion ? finalFileName : null,
        paid_pdf_size_bytes: !isFreeSuggestion ? finalFileSize : 0,
        is_free_available: isFreeSuggestion,
        is_paid_available: !isFreeSuggestion,
        is_visible: formData.is_visible ?? true,
        reading_terms_title: formData.reading_terms_title || DEFAULT_PDF_READING_TERMS_TITLE,
        reading_terms: formData.reading_terms || DEFAULT_PDF_READING_TERMS_CONTENT,
        updated_at: new Date().toISOString(),
        created_at: formData.created_at || new Date().toISOString(),
      };

      // 1. Immediately update Local Storage and React State
      let currentLocal = getLocalSuggestions();
      if (isEditing && formData.id) {
        currentLocal = currentLocal.map(p => p.id === formData.id ? { ...p, ...payload } : p);
      } else {
        currentLocal = [payload, ...currentLocal.filter(p => p.id !== id)];
      }
      saveLocalSuggestions(currentLocal);
      setItems(currentLocal);

      // 2. Sync to Supabase pdf_suggestions (Atomic Upsert with sanitized columns)
      const { reading_terms, reading_terms_title, ...dbPayload } = payload;
      try {
        const { error: upsertErr } = await (supabase as any)
          .from('pdf_suggestions')
          .upsert(dbPayload, { onConflict: 'id' });

        if (upsertErr) {
          console.error('pdf_suggestions upsert error:', upsertErr.message);
          toast({
            title: 'Notice on Cloud Sync',
            description: `Database sync message: ${upsertErr.message}`,
            variant: 'destructive',
          });
        }
      } catch (dbErr: any) {
        console.warn('pdf_suggestions sync notice:', dbErr);
      }

      // 3. Dual-sync to course_pdfs in Supabase
      try {
        await supabase.from('course_pdfs').upsert({
          id,
          title: payload.title,
          title_bn: payload.title_bn,
          subject_id: payload.subject_id,
          department: payload.department,
          target_years: payload.compatible_years,
          file_url: payload.file_url || '',
          file_size_bytes: payload.file_size_bytes || 0,
          is_free: payload.is_free,
          is_visible: payload.is_visible,
          display_order: 0,
        });
      } catch (cpErr) {
        console.warn('course_pdfs sync notice:', cpErr);
      }

      toast({ 
        title: isEditing ? 'PDF Suggestion updated successfully' : 'PDF Suggestion created and published successfully!' 
      });

      setIsDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: 'Notice', description: err.message });
    } finally {
      setUploading(false);
    }
  };

  const toggleVisibility = async (item: PdfSuggestionRecord) => {
    const updated = items.map(p => p.id === item.id ? { ...p, is_visible: !p.is_visible } : p);
    setItems(updated);
    saveLocalSuggestions(updated);
    toast({ title: !item.is_visible ? 'Visible on website' : 'Hidden from website' });

    try {
      await (supabase as any)
        .from('pdf_suggestions')
        .update({ is_visible: !item.is_visible })
        .eq('id', item.id);
    } catch {}

    try {
      await supabase
        .from('course_pdfs')
        .update({ is_visible: !item.is_visible })
        .eq('id', item.id);
    } catch {}
  };

  const deleteItem = async (item: PdfSuggestionRecord) => {
    if (!confirm(`Are you sure you want to delete "${item.title}"?`)) return;
    const updated = items.filter(p => p.id !== item.id);
    setItems(updated);
    saveLocalSuggestions(updated);
    toast({ title: 'Deleted successfully' });

    try {
      await (supabase as any)
        .from('pdf_suggestions')
        .delete()
        .eq('id', item.id);
    } catch {}

    try {
      await supabase
        .from('course_pdfs')
        .delete()
        .eq('id', item.id);
    } catch {}
  };

  const resetForm = () => {
    setFormData({
      ...defaultItem,
      is_free: false,
      price: 20,
      original_price: 100,
      reading_terms_title: DEFAULT_PDF_READING_TERMS_TITLE,
      reading_terms: DEFAULT_PDF_READING_TERMS_CONTENT,
    });
    setSelectedFile(null);
    setPdfSourceMode('upload');
    setGoogleDriveLink('');
    setIsEditing(false);
    setIsSubjectPickerOpen(false);
    setSubjectSearch('');
    setSubjectDeptFilter('all');
    setSubjectCourseFilter('all');
    setSubjectYearFilter('all');
  };

  const editItem = (item: PdfSuggestionRecord) => {
    setFormData({
      ...item,
      reading_terms_title: item.reading_terms_title || DEFAULT_PDF_READING_TERMS_TITLE,
      reading_terms: item.reading_terms || DEFAULT_PDF_READING_TERMS_CONTENT,
    });
    setSelectedFile(null);
    const existingUrl = item.file_url || item.free_pdf_url || item.paid_pdf_url || '';
    if (existingUrl.includes('drive.google.com') || existingUrl.includes('google.com')) {
      setPdfSourceMode('google_drive');
      setGoogleDriveLink(existingUrl);
    } else {
      setPdfSourceMode('upload');
      setGoogleDriveLink('');
    }
    setIsEditing(true);
    setIsSubjectPickerOpen(false);
    setSubjectSearch('');
    setSubjectDeptFilter('all');
    setSubjectCourseFilter('all');
    setSubjectYearFilter('all');
    setIsDialogOpen(true);
  };

  const addIncludedItem = () => {
    setFormData(prev => ({
      ...prev,
      whats_included: [...(prev.whats_included || []), { text: '', textBn: '' }],
    }));
  };

  const updateIncludedItem = (index: number, field: 'text' | 'textBn', val: string) => {
    setFormData(prev => {
      const list = [...(prev.whats_included || [])];
      if (list[index]) {
        list[index][field] = val;
      }
      return { ...prev, whats_included: list };
    });
  };

  const removeIncludedItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      whats_included: (prev.whats_included || []).filter((_, i) => i !== index),
    }));
  };

  const toggleYear = (year: number) => {
    setFormData(prev => {
      const current = prev.compatible_years || [];
      const updated = current.includes(year) ? current.filter(y => y !== year) : [...current, year];
      return { ...prev, compatible_years: updated.sort() };
    });
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchType = filterType === 'all' || (filterType === 'free' ? item.is_free : !item.is_free);
      const matchCourse = filterCourse === 'all' || item.course_type.toLowerCase() === filterCourse.toLowerCase();
      const matchDept = filterDept === 'all' || item.department.toLowerCase() === filterDept.toLowerCase();
      const matchYear = filterYear === 'all' || (item.compatible_years && item.compatible_years.includes(parseInt(filterYear)));
      const matchSearch = !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.title_bn.includes(searchQuery) ||
        item.slug.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchCourse && matchDept && matchYear && matchSearch;
    });
  }, [items, filterType, filterCourse, filterDept, filterYear, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-purple-600" />
            PDF Suggestions Manager
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage exam suggestion packages, upload Free/Paid PDFs, set pricing, and configure student access.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={fetchData}
            variant="outline"
            size="sm"
            className="rounded-xl border-border gap-1.5 h-10"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="btn-brand rounded-xl gap-2 h-10">
                <Plus className="h-4 w-4" />
                Add PDF Suggestion
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  {isEditing ? 'Edit PDF Suggestion' : 'Create New PDF Suggestion'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5 pt-2">
                {/* 1. Free vs Paid Suggestion Type Selector */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Suggestion Package Type *
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({
                        ...p,
                        is_free: true,
                        price: 0,
                        original_price: 0,
                        title: p.title ? p.title.replace(/ Paid/gi, ' Free') : '',
                        title_bn: p.title_bn ? p.title_bn.replace(/ পেইড/gi, ' ফ্রি') : '',
                      }))}
                      className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                        formData.is_free
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 shadow-sm'
                          : 'border-border/70 hover:border-border hover:bg-muted/30 text-muted-foreground'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                        formData.is_free ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-muted-foreground/40'
                      }`}>
                        {formData.is_free && <Check className="h-3 w-3" />}
                      </div>
                      <div>
                        <span className="font-bold text-xs sm:text-sm block text-foreground flex items-center gap-1.5">
                          Free Suggestion (বিনামূল্যে)
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] px-1.5 py-0 border-0">
                            ৳0
                          </Badge>
                        </span>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Free for all students in this program, department & year. No checkout required.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData(p => ({
                        ...p,
                        is_free: false,
                        price: p.price && p.price > 0 ? p.price : 20,
                        original_price: p.original_price && p.original_price > 0 ? p.original_price : 100,
                      }))}
                      className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                        !formData.is_free
                          ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-100 shadow-sm'
                          : 'border-border/70 hover:border-border hover:bg-muted/30 text-muted-foreground'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                        !formData.is_free ? 'border-purple-600 bg-purple-600 text-white' : 'border-muted-foreground/40'
                      }`}>
                        {!formData.is_free && <Check className="h-3 w-3" />}
                      </div>
                      <div>
                        <span className="font-bold text-xs sm:text-sm block text-foreground flex items-center gap-1.5">
                          Paid Package (পেইড সাজেশন)
                          <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[10px] px-1.5 py-0 border-0">
                            ৳20
                          </Badge>
                        </span>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Students purchase via bKash to unlock in their dashboard reader.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. Searchable Subject Linker */}
                <div className="space-y-2.5 bg-gradient-to-br from-purple-500/10 via-primary/5 to-muted/40 p-3.5 rounded-2xl border border-purple-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        Link to Existing Subject / Course
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Auto-fills Title, Bengali Title, URL Slug, Program & Academic Years
                      </p>
                    </div>
                    {selectedSubject && (
                      <Badge variant="outline" className="bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-200 border-purple-300 text-[11px] font-medium">
                        Linked
                      </Badge>
                    )}
                  </div>

                  {/* Current Selected Subject Card */}
                  {selectedSubject ? (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-purple-200 dark:border-purple-800/60 shadow-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs sm:text-sm text-foreground truncate">
                            {selectedSubject.name}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{selectedSubject.name_bn}</span>
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 uppercase font-mono">
                              {selectedSubject.department}
                            </Badge>
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                              {selectedSubject.course_type || 'BBA'}
                            </Badge>
                            {selectedSubject.compatible_years && (
                              <span className="text-[9px] text-muted-foreground font-medium">
                                Y{selectedSubject.compatible_years.join(', Y')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsSubjectPickerOpen(prev => !prev)}
                          className="h-8 text-xs rounded-lg gap-1 border-purple-300"
                        >
                          <Search className="h-3 w-3" />
                          {isSubjectPickerOpen ? 'Hide Search' : 'Change'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSubjectSelect('none')}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-lg"
                          title="Unlink subject"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsSubjectPickerOpen(prev => !prev)}
                      className="w-full h-11 justify-between rounded-xl bg-card border-dashed border-purple-300 hover:border-purple-500 text-xs font-medium"
                    >
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Search className="h-4 w-4 text-purple-600" />
                        {isSubjectPickerOpen ? "Searching subjects..." : "Click to Search & Link a Subject..."}
                      </span>
                      <Badge variant="secondary" className="text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                        {subjects.length} subjects
                      </Badge>
                    </Button>
                  )}

                  {/* Searchable Picker Panel */}
                  {isSubjectPickerOpen && (
                    <div className="mt-2 space-y-2.5 p-3 rounded-xl bg-card border border-border shadow-md animate-in fade-in-50 duration-200">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          value={subjectSearch}
                          onChange={e => setSubjectSearch(e.target.value)}
                          placeholder="Search by subject name, Bengali name, department..."
                          className="pl-8.5 pr-8 h-9 text-xs rounded-lg"
                          autoFocus
                        />
                        {subjectSearch && (
                          <button
                            type="button"
                            onClick={() => setSubjectSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Select value={subjectCourseFilter} onValueChange={setSubjectCourseFilter}>
                          <SelectTrigger className="w-28 h-7 text-[11px] rounded-md">
                            <SelectValue placeholder="Program" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all" className="text-xs">All Programs</SelectItem>
                            {COURSE_TYPES.map(c => (
                              <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select value={subjectDeptFilter} onValueChange={setSubjectDeptFilter}>
                          <SelectTrigger className="w-32 h-7 text-[11px] rounded-md">
                            <SelectValue placeholder="Department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all" className="text-xs">All Depts</SelectItem>
                            {DEPARTMENTS.map(d => (
                              <SelectItem key={d} value={d} className="text-xs">{DEPARTMENT_LABELS[d]?.en || d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select value={subjectYearFilter} onValueChange={setSubjectYearFilter}>
                          <SelectTrigger className="w-24 h-7 text-[11px] rounded-md">
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all" className="text-xs">All Years</SelectItem>
                            {[1, 2, 3, 4].map(y => (
                              <SelectItem key={y} value={y.toString()} className="text-xs">Year {y}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <span className="text-[10px] text-muted-foreground ml-auto font-medium">
                          {filteredSubjectsForPicker.length} of {subjects.length} subjects
                        </span>
                      </div>

                      <div className="max-h-56 overflow-y-auto space-y-1 pr-1 divide-y divide-border/40">
                        <button
                          type="button"
                          onClick={() => handleSubjectSelect('none')}
                          className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors hover:bg-muted/60 ${
                            !formData.subject_id ? 'bg-purple-500/10 font-semibold text-purple-700 dark:text-purple-300' : 'text-muted-foreground'
                          }`}
                        >
                          <span>Standalone Suggestion (No direct course link)</span>
                          {!formData.subject_id && <Check className="h-3.5 w-3.5 text-purple-600" />}
                        </button>

                        {filteredSubjectsForPicker.length === 0 ? (
                          <div className="py-6 text-center text-xs text-muted-foreground">
                            No subjects found matching your search.
                          </div>
                        ) : (
                          filteredSubjectsForPicker.map(s => {
                            const isSelected = formData.subject_id === s.id;
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => handleSubjectSelect(s.id)}
                                className={`w-full text-left p-2 rounded-lg text-xs transition-all flex items-center justify-between gap-2 hover:bg-purple-500/10 ${
                                  isSelected ? 'bg-purple-500/15 font-semibold text-purple-900 dark:text-purple-100 border border-purple-400/40' : 'text-foreground'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold truncate">{s.name}</span>
                                    {s.name_bn && (
                                      <span className="text-[10px] text-muted-foreground truncate">({s.name_bn})</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    {s.department && (
                                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                                        {s.department}
                                      </span>
                                    )}
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                                      {s.course_type || 'BBA'}
                                    </span>
                                    {s.compatible_years && s.compatible_years.length > 0 && (
                                      <span className="text-[9px] text-muted-foreground">
                                        Y{s.compatible_years.join(', Y')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {isSelected ? (
                                  <CheckCircle2 className="h-4 w-4 text-purple-600 shrink-0" />
                                ) : (
                                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold shrink-0">
                                    Select
                                  </span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Title & Slug Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Title (English) *</Label>
                    <Input
                      value={formData.title || ''}
                      onChange={e => handleTitleChange(e.target.value)}
                      placeholder="e.g. Business Mathematics Suggestion"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Title (বাংলা) *</Label>
                    <Input
                      value={formData.title_bn || ''}
                      onChange={e => setFormData(p => ({ ...p, title_bn: e.target.value }))}
                      placeholder="e.g. ব্যবসায় গণিত সাজেশন"
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">URL Slug *</Label>
                  <Input
                    value={formData.slug || ''}
                    onChange={e => setFormData(p => ({ ...p, slug: generateSlug(e.target.value) }))}
                    placeholder="e.g. business-mathematics-pdf-suggestion"
                    className="rounded-xl font-mono text-xs"
                  />
                </div>

                {/* 4. Target Program, Dept, Years */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Program / Course Type *</Label>
                    <Select
                      value={formData.course_type || 'BBA'}
                      onValueChange={v => setFormData(p => ({ ...p, course_type: v }))}
                    >
                      <SelectTrigger className="rounded-xl text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COURSE_TYPES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Department *</Label>
                    <Select
                      value={formData.department || 'accounting'}
                      onValueChange={v => setFormData(p => ({ ...p, department: v }))}
                    >
                      <SelectTrigger className="rounded-xl text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map(d => (
                          <SelectItem key={d} value={d} className="text-xs">{DEPARTMENT_LABELS[d]?.en || d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Target Academic Years */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Applicable Academic Year(s)</Label>
                  <div className="flex items-center gap-4 flex-wrap p-3 rounded-xl bg-muted/40 border">
                    {[1, 2, 3, 4].map(year => {
                      const checked = (formData.compatible_years || []).includes(year);
                      return (
                        <label key={year} className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                          <Checkbox checked={checked} onCheckedChange={() => toggleYear(year)} />
                          <span>Year {year}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Pricing (Only shown for Paid Suggestions) */}
                {!formData.is_free && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-purple-700 dark:text-purple-300">
                        Offer Price (৳) *
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.price ?? 20}
                        onChange={e => setFormData(p => ({ ...p, price: Number(e.target.value) }))}
                        className="rounded-xl font-bold text-purple-700 dark:text-purple-300"
                      />
                      <p className="text-[10px] text-muted-foreground">Standard ৳20 charged via bKash.</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Original Price (৳)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.original_price ?? 100}
                        onChange={e => setFormData(p => ({ ...p, original_price: Number(e.target.value) }))}
                        className="rounded-xl text-muted-foreground"
                      />
                      <p className="text-[10px] text-muted-foreground">Original crossed-out price (e.g. ৳100).</p>
                    </div>
                  </div>
                )}

                {/* 6. PDF Source Selector (Direct Upload or Google Drive Link) */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <Upload className="h-4 w-4 text-purple-600" />
                      {formData.is_free ? 'Free PDF Source *' : 'Paid PDF Source *'}
                    </Label>
                    {(selectedFile || googleDriveLink || formData.file_url || formData.free_pdf_url || formData.paid_pdf_url) && (
                      <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {pdfSourceMode === 'google_drive' ? 'Google Drive Link Set' : 'PDF Attached'}
                      </Badge>
                    )}
                  </div>

                  {/* Mode Selector Tabs */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-muted/60 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPdfSourceMode('upload')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        pdfSourceMode === 'upload'
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Direct File Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setPdfSourceMode('google_drive')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        pdfSourceMode === 'google_drive'
                          ? 'bg-card text-purple-700 dark:text-purple-300 shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Google Drive Link
                    </button>
                  </div>

                  {pdfSourceMode === 'google_drive' ? (
                    <div className="space-y-2 p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20">
                      <Label className="text-xs font-bold text-foreground">
                        Google Drive Shareable Link (Anyone with link can view)
                      </Label>
                      <Input
                        type="url"
                        placeholder="https://drive.google.com/file/d/1A2B3C.../view?usp=sharing"
                        value={googleDriveLink}
                        onChange={e => setGoogleDriveLink(e.target.value)}
                        className="rounded-xl h-10 text-xs font-mono"
                      />
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Paste your Google Drive PDF link. In the student reader, it will be securely displayed without download or print buttons.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        accept=".pdf"
                        id="suggestion-pdf-file-input"
                        className="hidden"
                        onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                      />
                      <label
                        htmlFor="suggestion-pdf-file-input"
                        className="flex flex-col items-center justify-center p-5 rounded-xl border-2 border-dashed border-border/80 bg-muted/20 hover:border-purple-500 hover:bg-muted/40 cursor-pointer transition-all text-center gap-2"
                      >
                        <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">
                            {selectedFile ? selectedFile.name : formData.file_name || formData.free_pdf_name || formData.paid_pdf_name || 'Click to select PDF Document'}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {selectedFile
                              ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready to upload`
                              : 'Supports PDF files up to 50MB. Uploaded securely to Supabase Storage.'}
                          </p>
                        </div>
                      </label>
                    </div>
                  )}
                </div>

                {/* 7. What's Included Editor (Only shown for Paid Suggestions) */}
                {!formData.is_free && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-bold">What's Included in this Package</Label>
                        <p className="text-[11px] text-muted-foreground">Bullet points displayed on the details page</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={addIncludedItem}
                        className="h-8 text-xs rounded-lg"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
                      </Button>
                    </div>

                    <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                      {formData.whats_included?.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2.5 rounded-xl border bg-muted/30">
                          <div className="flex-1 space-y-1.5">
                            <Input
                              value={item.text}
                              onChange={e => updateIncludedItem(idx, 'text', e.target.value)}
                              placeholder="English description"
                              className="h-8 text-xs bg-card"
                            />
                            <Input
                              value={item.textBn}
                              onChange={e => updateIncludedItem(idx, 'textBn', e.target.value)}
                              placeholder="বাংলা বর্ণনা"
                              className="h-8 text-xs bg-card"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive shrink-0"
                            onClick={() => removeIncludedItem(idx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 8. PDF Reading Terms & Conditions (📚 PDF বই পড়ার শর্তাবলি) */}
                <div className="space-y-3 p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                        <BookOpen className="h-4 w-4" />
                        PDF বই পড়ার শর্তাবলি (Reading Terms & Rules)
                      </Label>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        এই শর্তাবলি প্রতিটি সাজেশন বিস্তারিত পেজে প্রদর্শিত হবে (স্বয়ংক্রিয়ভাবে পূরণ করা থাকে)
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[10px] text-purple-600 hover:text-purple-700 font-semibold"
                      onClick={() => setFormData(p => ({
                        ...p,
                        reading_terms_title: DEFAULT_PDF_READING_TERMS_TITLE,
                        reading_terms: DEFAULT_PDF_READING_TERMS_CONTENT,
                      }))}
                    >
                      Default Terms
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold">Terms Title</Label>
                    <Input
                      value={formData.reading_terms_title || ''}
                      onChange={e => setFormData(p => ({ ...p, reading_terms_title: e.target.value }))}
                      placeholder="📚 PDF বই পড়ার শর্তাবলি"
                      className="rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold">Terms Content (বাংলা)</Label>
                    <Textarea
                      rows={8}
                      value={formData.reading_terms || ''}
                      onChange={e => setFormData(p => ({ ...p, reading_terms: e.target.value }))}
                      placeholder="PDF বই পড়ার শর্তাবলি লিখুন..."
                      className="rounded-xl text-xs leading-relaxed font-sans"
                    />
                  </div>
                </div>

                {/* 9. Visibility Switch */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border">
                  <div>
                    <Label className="text-sm font-semibold">Publish on Website</Label>
                    <p className="text-[11px] text-muted-foreground">Make this PDF suggestion visible to students</p>
                  </div>
                  <Switch
                    checked={formData.is_visible ?? true}
                    onCheckedChange={v => setFormData(p => ({ ...p, is_visible: v }))}
                  />
                </div>

                <Button
                  onClick={handleSave}
                  disabled={uploading}
                  className="w-full h-12 btn-brand rounded-xl font-bold text-base"
                >
                  {uploading ? 'Uploading & Saving to Supabase...' : isEditing ? 'Update PDF Suggestion' : 'Create & Publish PDF Suggestion'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <Card className="rounded-2xl border-border/80">
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search PDF suggestions by title, slug, or keywords..."
              className="pl-9 h-10 rounded-xl"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            {/* Type Filter */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-32 h-10 rounded-xl text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="free">Free Only</SelectItem>
                <SelectItem value="paid">Paid Only</SelectItem>
              </SelectContent>
            </Select>

            {/* Program Filter */}
            <Select value={filterCourse} onValueChange={setFilterCourse}>
              <SelectTrigger className="w-32 h-10 rounded-xl text-xs"><SelectValue placeholder="Program" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {COURSE_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Department Filter */}
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-36 h-10 rounded-xl text-xs"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Depts</SelectItem>
                {DEPARTMENTS.map(d => (
                  <SelectItem key={d} value={d}>{DEPARTMENT_LABELS[d]?.en || d}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Year Filter */}
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-28 h-10 rounded-xl text-xs"><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {[1, 2, 3, 4].map(y => <SelectItem key={y} value={y.toString()}>Year {y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="rounded-2xl border-border/80 overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[750px]">
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-bold">Suggestion Title</TableHead>
                <TableHead className="font-bold">Type</TableHead>
                <TableHead className="font-bold">Dept & Program</TableHead>
                <TableHead className="font-bold">Years</TableHead>
                <TableHead className="font-bold">Price</TableHead>
                <TableHead className="font-bold">PDF File</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="text-right font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    Loading suggestions...
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No PDF suggestions found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map(item => (
                  <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div>
                        <p className="font-bold text-sm text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.title_bn}</p>
                        <span className="text-[10px] text-muted-foreground font-mono">/{item.slug}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.is_free ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-[10px]">
                          Free PDF
                        </Badge>
                      ) : (
                        <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-400 border-0 text-[10px]">
                          Paid Package
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold capitalize">{item.department}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 w-fit">{item.course_type}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {item.compatible_years?.map(y => (
                          <Badge key={y} variant="secondary" className="text-[10px] px-1 py-0">Y{y}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.is_free ? (
                        <span className="font-bold text-sm text-emerald-600">Free</span>
                      ) : (
                        <div>
                          <span className="font-bold text-sm">৳{item.price}</span>
                          {item.original_price && item.original_price > item.price && (
                            <span className="text-[11px] line-through text-muted-foreground block">৳{item.original_price}</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.file_url || item.free_pdf_url || item.paid_pdf_url ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-[10px]">
                          Uploaded
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">No file</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.is_visible ? "default" : "outline"} className="text-xs">
                        {item.is_visible ? "Live" : "Hidden"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Preview Public Page"
                          onClick={() => window.open(`/pdf-suggestions/${item.slug}`, '_blank')}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title={item.is_visible ? "Hide" : "Show"}
                          onClick={() => toggleVisibility(item)}
                        >
                          {item.is_visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary"
                          title="Edit"
                          onClick={() => editItem(item)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          title="Delete"
                          onClick={() => deleteItem(item)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
  );
}

export default function PDFSuggestionsManagementPage() {
  return (
    <AdminLayout>
      <PDFSuggestionsManagementPageContent />
    </AdminLayout>
  );
}
