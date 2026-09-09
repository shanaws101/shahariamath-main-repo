import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FileText, ArrowLeft, BookOpen, Search, Shield, Sparkles, ExternalLink, Crown, AlertCircle
} from "lucide-react";
import { NativePdfCanvasReader } from "@/components/pdf/NativePdfCanvasReader";
import { getGoogleDriveEmbedUrl } from "@/lib/pdfUtils";

interface ReaderPdfItem {
  id: string;
  title: string;
  title_bn: string | null;
  subject_id: string | null;
  is_free: boolean;
  file_url: string;
  item_type?: 'suggestion' | 'course_pdf';
  access_type?: 'free' | 'paid';
  department?: string | null;
}

export default function PDFReaderPage() {
  const { user, profile } = useAuth();
  const { isEnglish } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetId = searchParams.get('id');

  const [pdfs, setPdfs] = useState<ReaderPdfItem[]>([]);
  const [allSuggestions, setAllSuggestions] = useState<any[]>([]);
  const [selectedPdf, setSelectedPdf] = useState<ReaderPdfItem | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPdfOpening, setIsPdfOpening] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'suggestions' | 'free' | 'paid'>('all');

  const studentDept = (profile?.department || '').trim().toLowerCase();

  useEffect(() => {
    if (user) {
      fetchAllPdfs();
    }
  }, [user, profile?.department]);

  const fetchAllPdfs = async () => {
    setIsLoading(true);
    const combined: ReaderPdfItem[] = [];

    try {
      // 1. Fetch all visible suggestions from pdf_suggestions
      let rawSuggestions: any[] = [];
      try {
        const { data: suggestionsData } = await (supabase as any)
          .from('pdf_suggestions')
          .select('*')
          .eq('is_visible', true);

        if (suggestionsData) {
          rawSuggestions = suggestionsData;
          setAllSuggestions(suggestionsData);

          suggestionsData.forEach((s: any) => {
            const isFree = Boolean(s.is_free || s.price === 0);
            const url = s.free_pdf_url || s.file_url;
            const deptMatches = !studentDept || !s.department || s.department.toLowerCase() === studentDept;
            if (isFree && url && deptMatches) {
              combined.push({
                id: s.id,
                title: s.title,
                title_bn: s.title_bn,
                subject_id: s.subject_id,
                is_free: true,
                file_url: url,
                item_type: 'suggestion',
                access_type: 'free',
                department: s.department,
              });
            }
          });
        }
      } catch (err) {
        console.warn('Suggestions query notice:', err);
      }

      // 2. Fetch user paid enrollments & purchases for PDF suggestions
      if (user) {
        try {
          const paidPdfIds = new Set<string>();

          // A. From pdf_suggestion_enrollments (STRICTLY COMPLETED ONLY)
          const { data: enrollments } = await (supabase as any)
            .from('pdf_suggestion_enrollments')
            .select('id, access_type, pdf_suggestion_id, payment_status')
            .eq('user_id', user.id)
            .eq('access_type', 'paid')
            .eq('payment_status', 'completed');

          (enrollments || []).forEach((e: any) => {
            if (e.pdf_suggestion_id) {
              paidPdfIds.add(e.pdf_suggestion_id);
            }
          });

          // B. From payments table (STRICTLY COMPLETED ONLY)
          const { data: userPayments } = await supabase
            .from('payments')
            .select('id, status, gateway_response')
            .eq('user_id', user.id)
            .eq('status', 'completed');

          (userPayments || []).forEach((p: any) => {
            const ids = p.gateway_response?.pdf_suggestion_ids;
            if (Array.isArray(ids)) {
              ids.forEach((id: string) => paidPdfIds.add(id));
            }
          });

          if (paidPdfIds.size > 0) {
            const { data: paidSuggestions } = await (supabase as any)
              .from('pdf_suggestions')
              .select('*')
              .in('id', Array.from(paidPdfIds));

            if (paidSuggestions) {
              paidSuggestions.forEach((s: any) => {
                const url = s.paid_pdf_url || s.file_url;
                const deptMatches = !studentDept || !s.department || s.department.toLowerCase() === studentDept;
                if (url && deptMatches && !combined.some(c => c.id === s.id && c.access_type === 'paid')) {
                  combined.push({
                    id: s.id,
                    title: s.title,
                    title_bn: s.title_bn,
                    subject_id: s.subject_id,
                    is_free: false,
                    file_url: url,
                    item_type: 'suggestion',
                    access_type: 'paid',
                    department: s.department,
                  });
                }
              });
            }
          }
        } catch (enrErr) {
          console.warn('Enrollment query notice:', enrErr);
        }
      }

      // 3. Fetch general / course PDFs matching department
      try {
        const { data: coursePdfs } = await supabase
          .from('course_pdfs')
          .select('id, title, title_bn, subject_id, is_free, file_url, department')
          .eq('is_visible', true)
          .order('display_order');

        if (coursePdfs) {
          coursePdfs.forEach(p => {
            const deptMatches = !studentDept || !p.department || p.department.toLowerCase() === studentDept || p.department.toLowerCase() === 'general';
            if (deptMatches && !combined.some(c => c.id === p.id || (c.file_url && c.file_url === p.file_url))) {
              combined.push({
                id: p.id,
                title: p.title,
                title_bn: p.title_bn,
                subject_id: p.subject_id,
                is_free: Boolean(p.is_free),
                file_url: p.file_url,
                item_type: 'course_pdf',
                access_type: p.is_free ? 'free' : 'paid',
                department: p.department,
              });
            }
          });
        }
      } catch (cpErr) {
        console.warn('course_pdfs query notice:', cpErr);
      }

      // Fallback to local storage if combined is empty
      if (combined.length === 0) {
        try {
          const raw = localStorage.getItem('oli_pdf_suggestions_local');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              parsed.forEach((p: any) => {
                const url = p.file_url || p.free_pdf_url || p.paid_pdf_url;
                if (url) {
                  combined.push({
                    id: p.id,
                    title: p.title,
                    title_bn: p.title_bn,
                    subject_id: p.subject_id,
                    is_free: Boolean(p.is_free || p.price === 0),
                    file_url: url,
                    item_type: 'suggestion',
                    access_type: (p.is_free || p.price === 0) ? 'free' : 'paid',
                    department: p.department,
                  });
                }
              });
            }
          }
        } catch {}
      }

      setPdfs(combined);

      // Only auto-open if a specific ?id= was explicitly clicked from outside
      if (targetId) {
        const found = combined.find(p => p.id === targetId || p.file_url === targetId);
        if (found) {
          openPdf(found);
        }
      }
    } catch (e) {
      console.error('Error fetching student PDFs:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const openPdf = async (pdf: ReaderPdfItem) => {
    setSelectedPdf(pdf);
    setPdfBytes(null);
    setPdfUrl(null);
    setPdfError(null);
    setIsPdfOpening(true);

    try {
      const driveUrl = getGoogleDriveEmbedUrl(pdf.file_url);
      if (driveUrl) {
        setPdfUrl(driveUrl);
        setIsPdfOpening(false);
        return;
      }

      if (pdf.file_url.startsWith('http://') || pdf.file_url.startsWith('https://')) {
        const res = await fetch(pdf.file_url);
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to download PDF`);
        const buf = await res.arrayBuffer();
        setPdfBytes(new Uint8Array(buf));
      } else {
        const cleanPath = pdf.file_url.replace(/^\/+/, '');

        // 1. Try public storage URL
        try {
          const { data: pubData } = supabase.storage
            .from('course-pdfs')
            .getPublicUrl(cleanPath);

          if (pubData?.publicUrl) {
            const res = await fetch(pubData.publicUrl);
            if (res.ok) {
              const buf = await res.arrayBuffer();
              setPdfBytes(new Uint8Array(buf));
              return;
            }
          }
        } catch {}

        // 2. Try direct download method
        const { data: blobData, error: dlErr } = await supabase.storage
          .from("course-pdfs")
          .download(cleanPath);

        if (!dlErr && blobData) {
          const buffer = await blobData.arrayBuffer();
          setPdfBytes(new Uint8Array(buffer));
        } else {
          // 3. Try signed URL method
          const { data: signed, error: signErr } = await supabase.storage
            .from("course-pdfs")
            .createSignedUrl(cleanPath, 7200);

          if (signed?.signedUrl) {
            const res = await fetch(signed.signedUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to download signed PDF`);
            const buf = await res.arrayBuffer();
            setPdfBytes(new Uint8Array(buf));
          } else {
            throw new Error(dlErr?.message || signErr?.message || 'Could not load PDF document.');
          }
        }
      }
    } catch (err: any) {
      console.error('Error opening PDF document:', err);
      setPdfError(err?.message || 'Failed to load PDF file. Please try again.');
    } finally {
      setIsPdfOpening(false);
    }
  };

  const getPaidSuggestionLink = (pdf: ReaderPdfItem) => {
    const dept = (pdf.department || profile?.department || '').trim().toLowerCase();
    if (dept && dept !== 'all') {
      return `/pdf-suggestions?dept=${encodeURIComponent(dept)}&type=paid`;
    }
    return `/pdf-suggestions?type=paid`;
  };

  const filteredPdfs = pdfs.filter(pdf => {
    const matchSearch = !searchQuery ||
      pdf.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pdf.title_bn && pdf.title_bn.includes(searchQuery));
    if (filterTab === 'suggestions') return matchSearch && pdf.item_type === 'suggestion';
    if (filterTab === 'free') return matchSearch && pdf.access_type === 'free';
    if (filterTab === 'paid') return matchSearch && pdf.access_type === 'paid';
    return matchSearch;
  });

  // Render Open PDF View (Full Screen Experience)
  if (selectedPdf && (pdfBytes || pdfUrl || isPdfOpening)) {
    const driveUrl = getGoogleDriveEmbedUrl(selectedPdf.file_url) || (pdfUrl && getGoogleDriveEmbedUrl(pdfUrl));

    if (isPdfOpening) {
      return (
        <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-6">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-foreground">Opening Secured PDF...</p>
            <p className="text-xs text-muted-foreground">{selectedPdf.title}</p>
          </div>
        </div>
      );
    }

    if (pdfBytes) {
      return (
        <NativePdfCanvasReader
          data={pdfBytes}
          title={isEnglish ? selectedPdf.title : selectedPdf.title_bn || selectedPdf.title}
          isFree={selectedPdf.is_free}
          onBack={() => {
            setSelectedPdf(null);
            setPdfBytes(null);
            setPdfUrl(null);
          }}
        />
      );
    }

    if (driveUrl) {
      return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-2.5 bg-card border-b border-border">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-xl shrink-0"
                onClick={() => {
                  setSelectedPdf(null);
                  setPdfUrl(null);
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-extrabold truncate text-foreground">
                  {isEnglish ? selectedPdf.title : selectedPdf.title_bn || selectedPdf.title}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  Google Drive Cloud PDF • Shaharia Math
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant="outline"
                className="text-[10px] font-bold text-emerald-700 bg-emerald-500/10 border-emerald-500/30 px-2 py-0.5 rounded-full items-center gap-1"
              >
                <Shield className="h-3 w-3" />
                Protected Reader
              </Badge>
            </div>
          </div>

          <div className="flex-1 bg-muted/20 relative">
            <iframe
              src={driveUrl}
              title={selectedPdf.title}
              className="w-full h-full border-0"
              allow="autoplay; encrypted-media; fullscreen"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md bg-card p-8 rounded-3xl border border-destructive/30 shadow-2xl">
          <div className="h-12 w-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-base font-extrabold text-foreground">{isEnglish ? 'Could not load PDF' : 'পিডিএফ লোড করা যায়নি'}</p>
            <p className="text-xs text-muted-foreground mt-1">{pdfError || (isEnglish ? 'Please check your connection and try again.' : 'দয়া করে ইন্টারনেট সংযোগ চেক করে আবার চেষ্টা করুন।')}</p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => {
                setSelectedPdf(null);
                setPdfBytes(null);
                setPdfUrl(null);
                setPdfError(null);
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {isEnglish ? 'Back to Library' : 'লাইব্রেরিতে ফিরে যান'}
            </Button>
            <Button
              size="sm"
              className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => {
                if (selectedPdf) openPdf(selectedPdf);
              }}
            >
              {isEnglish ? 'Retry' : 'পুনরায় চেষ্টা'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-purple-600" />
              {isEnglish ? 'PDF Library & Reader' : 'পিডিএফ লাইব্রেরি ও রিডার'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {isEnglish
                ? 'High-speed secured canvas reader for all your course suggestions & notes'
                : 'আপনার সকল সাজেশন ও কোর্সের সুরক্ষিত হাই-স্পিড ক্যানভাস রিডার'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 px-3 py-1">
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              {pdfs.length} {isEnglish ? 'Documents Ready' : 'টি ডকুমেন্ট উপলব্ধ'}
            </Badge>
          </div>
        </div>

        {/* Search & Tabs */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isEnglish ? "Search PDF documents..." : "পিডিএফ অনুসন্ধান করুন..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11 rounded-xl bg-card border-border"
            />
          </div>

          <div className="flex items-center bg-muted/60 p-1 rounded-xl gap-1 w-full sm:w-auto overflow-x-auto">
            {(['all', 'suggestions', 'free', 'paid'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
                  filterTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'all' && (isEnglish ? 'All PDFs' : 'সব পিডিএফ')}
                {tab === 'suggestions' && (isEnglish ? 'Suggestions' : 'সাজেশন')}
                {tab === 'free' && (isEnglish ? 'Free' : 'ফ্রি')}
                {tab === 'paid' && (isEnglish ? 'Paid' : 'পেইড')}
              </button>
            ))}
          </div>
        </div>

        {/* Documents Grid */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3 bg-card rounded-2xl border border-border">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-muted-foreground">{isEnglish ? 'Loading your library...' : 'লাইব্রেরি লোড হচ্ছে...'}</p>
          </div>
        ) : filteredPdfs.length === 0 ? (
          <div className="py-20 text-center space-y-3 bg-card rounded-2xl border border-border p-6">
            <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <FileText className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-foreground">
              {isEnglish ? 'No PDF Documents Found' : 'কোন পিডিএফ ডকুমেন্ট পাওয়া যায়নি'}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {isEnglish
                ? 'Check out our Exam PDF Suggestions or enroll in subjects to get instant access.'
                : 'তাৎক্ষণিক অ্যাক্সেস পেতে আমাদের পরীক্ষার পিডিএফ সাজেশন দেখুন বা বিষয়ে ভর্তি হন।'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPdfs.map((pdf) => (
              <div
                key={`${pdf.id}-${pdf.access_type}`}
                onClick={() => openPdf(pdf)}
                className="group relative bg-card rounded-2xl border border-border/80 p-5 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <FileText className="h-5 w-5" />
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] font-bold ${
                        pdf.is_free
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                      }`}
                    >
                      {pdf.is_free ? (isEnglish ? 'FREE' : 'ফ্রি') : (isEnglish ? 'PREMIUM' : 'পেইড')}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-foreground line-clamp-2 group-hover:text-purple-600 transition-colors">
                      {isEnglish ? pdf.title : pdf.title_bn || pdf.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-1 capitalize">
                      {pdf.department || 'Business'} • {pdf.item_type === 'suggestion' ? 'Exam Suggestion' : 'Course PDF'}
                    </p>
                  </div>
                </div>

                <div className="pt-3.5 mt-3.5 border-t border-border/80 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
                  {pdf.is_free ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 border-purple-500/30 hover:bg-purple-600 hover:text-white transition-all shadow-sm flex items-center gap-1 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(getPaidSuggestionLink(pdf));
                      }}
                    >
                      <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      {isEnglish ? 'Paid Solution ৳20' : 'লিখিত সমাধান ৳২০'}
                    </Button>
                  ) : (
                    <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-1 rounded-lg flex items-center gap-1">
                      <Crown className="h-3 w-3 text-amber-500" />
                      {isEnglish ? 'Paid Solution' : 'পূর্ণাঙ্গ সমাধান'}
                    </span>
                  )}

                  <Button
                    size="sm"
                    className="h-8 px-3 rounded-xl text-xs font-bold gap-1 bg-purple-600 hover:bg-purple-700 text-white shrink-0 ml-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      openPdf(pdf);
                    }}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    {isEnglish ? 'Read Online' : 'অনলাইনে পড়ুন'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
