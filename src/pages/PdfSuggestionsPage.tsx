import { useEffect, useState, useMemo } from "react";
import { useCart } from "@/contexts/CartContext";
import { Link, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  FileText, ArrowLeft, Search, 
  BookOpen, GraduationCap, X, ShoppingCart, Check, Sparkles, CheckCircle2, Eye, Crown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { resolveEffectiveFilters } from "@/lib/subjects-filter";
import { COURSE_TYPES, COURSE_TYPE_LABELS, DEPARTMENT_LABELS } from "@/lib/constants";

export interface PdfSuggestion {
  id: string;
  subject_id?: string | null;
  title: string;
  title_bn: string;
  description: string | null;
  description_bn: string | null;
  is_free: boolean;
  price: number;
  original_price: number | null;
  slug: string;
  compatible_years: number[] | null;
  department: string | null;
  course_type: string | null;
  subject_type: string | null;
  whats_included: { text: string; textBn: string }[] | null;
  file_url?: string | null;
  free_pdf_url: string | null;
  paid_pdf_url: string | null;
  is_free_available?: boolean | null;
  is_paid_available?: boolean | null;
  is_visible?: boolean | null;
  reading_terms_title?: string | null;
  reading_terms?: string | null;
}

const courseTypes = [
  { value: 'all', label: 'All Programs', label_bn: 'সব প্রোগ্রাম' },
  ...COURSE_TYPES.map(ct => ({
    value: ct,
    label: COURSE_TYPE_LABELS[ct]?.en ?? ct,
    label_bn: COURSE_TYPE_LABELS[ct]?.bn ?? ct,
  })),
];

const departmentLabels = DEPARTMENT_LABELS;

const yearLabels: Record<number, { en: string; bn: string }> = {
  1: { en: '1st Year', bn: '১ম বর্ষ' },
  2: { en: '2nd Year', bn: '২য় বর্ষ' },
  3: { en: '3rd Year', bn: '৩য় বর্ষ' },
  4: { en: '4th Year', bn: '৪র্থ বর্ষ' },
};

const normalizeFilterValue = (value: string | null | undefined) =>
  (value ?? '').trim().toLowerCase();

export default function PdfSuggestionsPage() {
  const { isEnglish } = useLanguage();
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [suggestions, setSuggestions] = useState<PdfSuggestion[]>([]);
  const [purchasedPdfIds, setPurchasedPdfIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const filterParam = searchParams.get('filter') || searchParams.get('dept') || 'all';
  const typeParam = searchParams.get('type') || searchParams.get('price');

  const [priceTypeFilter, setPriceTypeFilter] = useState<'all' | 'free' | 'paid'>(() => {
    if (typeParam === 'paid') return 'paid';
    if (typeParam === 'free') return 'free';
    return 'all';
  });

  const [activeCourse, setActiveCourse] = useState(() => {
    const ct = courseTypes.find(c => c.value === filterParam);
    if (ct) return filterParam;
    return 'all';
  });
  const [activeDept, setActiveDept] = useState<string>(() => {
    if (departmentLabels[filterParam]) return filterParam;
    return 'all';
  });
  const [activeYear, setActiveYear] = useState<number | null>(null);

  useEffect(() => {
    const tp = searchParams.get('type') || searchParams.get('price');
    if (tp === 'paid' || tp === 'free' || tp === 'all') {
      setPriceTypeFilter(tp);
    }
    const fp = searchParams.get('filter') || searchParams.get('dept');
    if (fp && departmentLabels[fp]) {
      setActiveDept(fp);
    }
  }, [searchParams]);

  const { isStudentLocked, effectiveCourse, effectiveDept } = resolveEffectiveFilters({
    profile,
    isLoggedIn: !!user,
    course: activeCourse,
    dept: activeDept,
  });

  useEffect(() => {
    if (!user) {
      setPurchasedPdfIds(new Set());
      return;
    }

    const checkPurchases = async () => {
      const owned = new Set<string>();

      // 1. Database enrollments (STRICTLY COMPLETED PAID ONLY)
      try {
        const { data: enr } = await (supabase as any)
          .from('pdf_suggestion_enrollments')
          .select('pdf_suggestion_id, access_type, payment_status')
          .eq('user_id', user.id)
          .eq('access_type', 'paid')
          .eq('payment_status', 'completed');

        (enr || []).forEach((e: any) => {
          if (e.pdf_suggestion_id) {
            owned.add(e.pdf_suggestion_id);
          }
        });
      } catch {}

      // 2. Payments table (STRICTLY COMPLETED ONLY)
      try {
        const { data: userPmts } = await supabase
          .from('payments')
          .select('gateway_response')
          .eq('user_id', user.id)
          .eq('status', 'completed');

        (userPmts || []).forEach((p: any) => {
          const ids = p.gateway_response?.pdf_suggestion_ids;
          if (Array.isArray(ids)) {
            ids.forEach((id: string) => owned.add(id));
          }
        });
      } catch {}

      setPurchasedPdfIds(owned);
    };

    checkPurchases();
  }, [user]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      setIsLoading(true);
      const combined: PdfSuggestion[] = [];

      try {
        // 1. Fetch from pdf_suggestions in Supabase
        const { data, error } = await (supabase as any)
          .from('pdf_suggestions')
          .select('*')
          .eq('is_visible', true)
          .order('display_order', { ascending: true })
          .order('title', { ascending: true });

        if (!error && data && data.length > 0) {
          data.forEach((d: any) => {
            combined.push({
              ...d,
              is_free: d.is_free ?? (d.price === 0),
              price: Number(d.price) || 0,
              original_price: Number(d.original_price) || 0,
            });
          });
        }
      } catch (err) {
        console.warn('pdf_suggestions query notice:', err);
      }

      // 2. Also check course_pdfs for any newly uploaded PDFs and merge seamlessly
      try {
        const { data: cpData, error: cpErr } = await supabase
          .from('course_pdfs')
          .select('*')
          .eq('is_visible', true)
          .order('created_at', { ascending: false });

        if (!cpErr && cpData && cpData.length > 0) {
          cpData.forEach((cp: any) => {
            const alreadyExists = combined.some(c => 
              c.id === cp.id || 
              (c.file_url && cp.file_url && c.file_url === cp.file_url) ||
              (c.title.toLowerCase().trim() === cp.title.toLowerCase().trim() && c.department?.toLowerCase() === (cp.department || 'accounting').toLowerCase())
            );
            if (!alreadyExists) {
              const baseSlug = cp.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
              combined.push({
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
                whats_included: null,
                file_url: cp.file_url,
                free_pdf_url: cp.is_free ? cp.file_url : null,
                paid_pdf_url: !cp.is_free ? cp.file_url : null,
                is_visible: cp.is_visible ?? true,
                is_free_available: Boolean(cp.is_free),
                is_paid_available: !cp.is_free,
              });
            }
          });
        }
      } catch (e) {
        console.warn('course_pdfs query notice:', e);
      }

      // Check local storage backup if completely empty
      if (combined.length === 0) {
        try {
          const raw = localStorage.getItem('oli_pdf_suggestions_local');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              parsed.filter((p: any) => p.is_visible !== false).forEach((p: any) => {
                combined.push({
                  ...p,
                  is_free: p.is_free ?? (p.price === 0),
                  price: Number(p.price) || 0,
                  original_price: Number(p.original_price) || 0,
                });
              });
            }
          }
        } catch {}
      }

      setSuggestions(combined);
      setIsLoading(false);
    };

    fetchSuggestions();
  }, []);

  useEffect(() => {
    if (departmentLabels[filterParam] && activeCourse === 'all') {
      setActiveCourse('BBA');
    }
  }, [filterParam]);

  const handleCourseChange = (value: string) => {
    setActiveCourse(value);
    setActiveDept('all');
    setActiveYear(null);
    setSearchParams(value === 'all' ? {} : { filter: value });
  };

  const handleDeptChange = (value: string) => {
    setActiveDept(value);
    setActiveYear(null);
    if (value === 'all') {
      setSearchParams(activeCourse === 'all' ? {} : { filter: activeCourse });
    } else {
      setSearchParams({ filter: value });
    }
  };

  const availableDepts = useMemo(() => {
    if (effectiveCourse === 'all') {
      return Object.keys(departmentLabels);
    }
    const deptsInCourse = new Set<string>();
    suggestions.forEach(s => {
      if (normalizeFilterValue(s.course_type) === normalizeFilterValue(effectiveCourse) && s.department) {
        deptsInCourse.add(s.department.toLowerCase());
      }
    });
    return Object.keys(departmentLabels).filter(d => deptsInCourse.has(d.toLowerCase()));
  }, [effectiveCourse, suggestions]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    suggestions.forEach(s => {
      const matchCourse = effectiveCourse === 'all' || normalizeFilterValue(s.course_type) === normalizeFilterValue(effectiveCourse);
      const matchDept = effectiveDept === 'all' || normalizeFilterValue(s.department) === normalizeFilterValue(effectiveDept);
      if (matchCourse && matchDept && s.compatible_years) {
        s.compatible_years.forEach(y => years.add(y));
      }
    });
    return Array.from(years).sort();
  }, [effectiveCourse, effectiveDept, suggestions]);

  const filtered = useMemo(() => {
    return suggestions.filter(s => {
      const matchCourse = effectiveCourse === 'all' || normalizeFilterValue(s.course_type) === normalizeFilterValue(effectiveCourse);
      const matchDept = effectiveDept === 'all' || normalizeFilterValue(s.department) === normalizeFilterValue(effectiveDept);
      const matchYear = !activeYear || (s.compatible_years && s.compatible_years.includes(activeYear));
      const matchSearch = !searchQuery || 
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.title_bn.includes(searchQuery) ||
        (s.department && s.department.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchPriceType = priceTypeFilter === 'all' ||
        (priceTypeFilter === 'free' && (s.is_free || s.price === 0)) ||
        (priceTypeFilter === 'paid' && (!s.is_free && s.price > 0));
      return matchCourse && matchDept && matchYear && matchSearch && matchPriceType;
    });
  }, [suggestions, effectiveCourse, effectiveDept, activeYear, searchQuery, priceTypeFilter]);

  const groupedByYear = useMemo(() => {
    if (activeYear || searchQuery) return null;
    const groups: Record<number, PdfSuggestion[]> = {};
    filtered.forEach(s => {
      const years = s.compatible_years && s.compatible_years.length > 0 ? s.compatible_years : [1];
      years.forEach(y => {
        if (!groups[y]) groups[y] = [];
        if (!groups[y].some(item => item.id === s.id)) {
          groups[y].push(s);
        }
      });
    });
    return Object.keys(groups).length > 0 ? groups : null;
  }, [filtered, activeYear, searchQuery]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-10 md:py-16 border-b border-border/50 bg-gradient-to-b from-purple-500/5 via-primary/5 to-transparent">
          <div className="container mx-auto px-4 max-w-6xl">
            <Link 
              to="/" 
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-4 transition-colors group"
            >
              <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
              {isEnglish ? 'Back to Home' : 'হোমে ফিরে যান'}
            </Link>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-bold mb-3">
                  <Sparkles className="h-3.5 w-3.5" />
                  {isEnglish ? 'Exam Special 99% Common' : 'পরীক্ষা স্পেশাল ৯৯% কমন'}
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                  {isEnglish ? 'Exam PDF Suggestions' : 'পরীক্ষার পিডিএফ সাজেশন'}
                </h1>
                <p className="text-sm md:text-base text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">
                  {isEnglish 
                    ? 'Get curated exam-oriented chapter questions, formula sheets, and solved papers prepared by Shaharia Sir.'
                    : 'শাহরিয়া স্যার ও বিশেষজ্ঞ শিক্ষকদের তৈরি অধ্যায়ভিত্তিক স্পেশাল সাজেশন, কমন প্রশ্ন ও নির্ভুল সমাধান।'}
                </p>
              </div>

              {/* Search input */}
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={isEnglish ? 'Search suggestions...' : 'সাজেশন খুঁজুন...'}
                  className="pl-9 pr-8 h-11 rounded-xl bg-card border-border/80 text-sm focus-visible:ring-primary"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Course type filter chips */}
            {!isStudentLocked && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {courseTypes.map(c => (
                  <button
                    key={c.value}
                    onClick={() => handleCourseChange(c.value)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                      activeCourse === c.value
                        ? 'bg-primary text-primary-foreground shadow-sm scale-105'
                        : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {isEnglish ? c.label : c.label_bn}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Filters & Content Area */}
        <div className="container mx-auto px-4 max-w-6xl py-8">
          {/* Prominent Free / Paid Highlighted Toggle */}
          <div className="flex items-center justify-center mb-8">
            <div className="inline-flex p-1 sm:p-1.5 rounded-2xl bg-card border-2 border-purple-500/30 shadow-lg shadow-purple-500/5 gap-1 sm:gap-1.5 max-w-lg w-full">
              <button
                onClick={() => setPriceTypeFilter('all')}
                className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl text-[11px] sm:text-sm font-extrabold transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                  priceTypeFilter === 'all'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 scale-[1.02]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="truncate">{isEnglish ? 'All' : 'সব'}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/20 ml-0.5">
                  {suggestions.length}
                </span>
              </button>

              <button
                onClick={() => setPriceTypeFilter('free')}
                className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl text-[11px] sm:text-sm font-extrabold transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                  priceTypeFilter === 'free'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-[1.02]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="truncate">{isEnglish ? 'Free' : 'ফ্রি স্যাম্পল'}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/20 ml-0.5">
                  {suggestions.filter(s => s.is_free || s.price === 0).length}
                </span>
              </button>

              <button
                onClick={() => setPriceTypeFilter('paid')}
                className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl text-[11px] sm:text-sm font-extrabold transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                  priceTypeFilter === 'paid'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30 scale-[1.02]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Crown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-300 shrink-0" />
                <span className="truncate">{isEnglish ? 'Paid ৳20' : 'লিখিত ৳২০'}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/20 ml-0.5">
                  {suggestions.filter(s => !s.is_free && s.price > 0).length}
                </span>
              </button>
            </div>
          </div>

          {/* Department Chips */}
          {!isStudentLocked && availableDepts.length > 0 && (
            <div className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-2">
                {isEnglish ? 'Departments' : 'বিভাগসমূহ'}
              </p>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button
                  onClick={() => handleDeptChange('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    activeDept === 'all'
                      ? 'bg-foreground text-background shadow-sm'
                      : 'bg-card border border-border/70 text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                  }`}
                >
                  {isEnglish ? 'All Departments' : 'সকল বিভাগ'}
                </button>
                {availableDepts.map(d => (
                  <button
                    key={d}
                    onClick={() => handleDeptChange(d)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      activeDept === d
                        ? 'bg-foreground text-background shadow-sm'
                        : 'bg-card border border-border/70 text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                    }`}
                  >
                    {isEnglish ? departmentLabels[d]?.en || d : departmentLabels[d]?.bn || d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Academic Year Pills */}
          {availableYears.length > 0 && (
            <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-xs text-muted-foreground font-semibold mr-1">
                {isEnglish ? 'Year:' : 'বর্ষ:'}
              </span>
              <button
                onClick={() => setActiveYear(null)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  activeYear === null
                    ? 'bg-primary/10 text-primary font-bold border border-primary/30'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {isEnglish ? 'All Years' : 'সব বর্ষ'}
              </button>
              {availableYears.map(y => (
                <button
                  key={y}
                  onClick={() => setActiveYear(activeYear === y ? null : y)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    activeYear === y
                      ? 'bg-primary/10 text-primary font-bold border border-primary/30'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {isEnglish ? yearLabels[y]?.en || `Year ${y}` : yearLabels[y]?.bn || `${y}ম বর্ষ`}
                </button>
              ))}
            </div>
          )}

          {/* Listing */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 py-8">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="h-80 rounded-2xl bg-muted/40 animate-pulse border border-border/50" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border p-8">
              <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-foreground mb-1">
                {isEnglish ? 'No PDF suggestions found' : 'কোনো পিডিএফ সাজেশন পাওয়া যায়নি'}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {isEnglish ? 'Try adjusting your filters or search keywords.' : 'ফিল্টার বা সার্চ কি-ওয়ার্ড পরিবর্তন করে পুনরায় চেষ্টা করুন।'}
              </p>
            </div>
          ) : groupedByYear ? (
            <div className="space-y-12">
              {Object.keys(groupedByYear).sort().map(yearKey => {
                const yearNum = parseInt(yearKey);
                const label = yearLabels[yearNum] 
                  ? (isEnglish ? yearLabels[yearNum].en : yearLabels[yearNum].bn)
                  : (isEnglish ? 'Other' : 'অন্যান্য');
                const items = groupedByYear[yearKey];
                return (
                  <div key={yearKey}>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                        <GraduationCap className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-foreground tracking-tight">{label}</h3>
                        <p className="text-xs text-muted-foreground">{items.length} {isEnglish ? 'PDF suggestions' : 'টি সাজেশন'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {items.map(pdf => (
                        <PdfSuggestionCard
                          key={`${yearKey}-${pdf.id}`}
                          pdf={pdf}
                          isEnglish={isEnglish}
                          isPurchased={purchasedPdfIds.has(pdf.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(pdf => (
                <PdfSuggestionCard
                  key={pdf.id}
                  pdf={pdf}
                  isEnglish={isEnglish}
                  isPurchased={purchasedPdfIds.has(pdf.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function PdfSuggestionCard({
  pdf,
  isEnglish,
  isPurchased = false,
}: {
  pdf: PdfSuggestion;
  isEnglish: boolean;
  isPurchased?: boolean;
}) {
  const { user, isAdmin, isEmployee } = useAuth();
  const { addPdfToCart, isPdfInCart, removePdfFromCart } = useCart();
  const inCart = isPdfInCart(pdf.id);
  const sellingPrice = Number(pdf.price) || 0;
  const oldPrice = pdf.original_price != null && Number(pdf.original_price) > 0 ? Number(pdf.original_price) : null;
  const isPaidAndPurchased = !pdf.is_free && Boolean(isPurchased);
  
  const hasDiscount = Boolean(oldPrice && oldPrice > sellingPrice);
  const discountPercent = hasDiscount && oldPrice
    ? Math.round(((oldPrice - sellingPrice) / oldPrice) * 100) 
    : 0;

  const handleCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPaidAndPurchased) return;
    if (inCart) {
      removePdfFromCart(pdf.id);
    } else {
      addPdfToCart({
        id: pdf.id,
        pdf_suggestion_id: pdf.id,
        title: pdf.title,
        title_bn: pdf.title_bn,
        price: sellingPrice,
        original_price: oldPrice,
        department: pdf.department,
        course_type: pdf.course_type,
        compatible_years: pdf.compatible_years,
        slug: pdf.slug,
      });
    }
  };

  return (
    <Link
      to={`/pdf-suggestions/${pdf.slug}`}
      className="group relative flex flex-col rounded-2xl border border-border/60 bg-card overflow-hidden hover:shadow-xl hover:border-purple-400/40 hover:-translate-y-1 transition-all duration-300"
    >
      {/* Top Banner Gradient */}
      <div className="h-28 bg-gradient-to-br from-purple-500/15 via-indigo-500/10 to-primary/5 relative overflow-hidden p-4 flex flex-col justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.15),transparent_60%)]" />
        
        <div className="flex items-center justify-between relative z-10">
          {isPaidAndPurchased ? (
            <Badge className="bg-emerald-600 text-white border-0 text-[10px] font-bold rounded-full px-2.5 py-0.5 flex items-center gap-1 shadow-sm">
              <CheckCircle2 className="h-3 w-3" />
              {isEnglish ? 'Enrolled' : 'কেনা হয়েছে'}
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-white/80 dark:bg-black/50 text-purple-700 dark:text-purple-300 border-purple-200/50 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {pdf.is_free ? (isEnglish ? 'Free Sample' : 'ফ্রি স্যাম্পল') : (isEnglish ? 'PDF Suggestion' : 'পিডিএফ সাজেশন')}
            </Badge>
          )}
          {hasDiscount && !isPaidAndPurchased && discountPercent > 0 && (
            <Badge className="bg-red-500 text-white border-0 text-[10px] font-bold rounded-full px-2">
              {discountPercent}% OFF
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 relative z-10">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 backdrop-blur-sm flex items-center justify-center text-purple-700 dark:text-purple-300">
            <BookOpen className="h-4 w-4" />
          </div>
          {pdf.department && (
            <span className="text-xs font-semibold text-purple-800 dark:text-purple-200 bg-white/70 dark:bg-black/40 px-2.5 py-0.5 rounded-full capitalize">
              {isEnglish ? departmentLabels[pdf.department]?.en || pdf.department : departmentLabels[pdf.department]?.bn || pdf.department}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 pb-3 flex flex-col">
        <h3 className="font-bold text-base text-foreground leading-snug line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors mb-2">
          {isEnglish ? pdf.title : pdf.title_bn || pdf.title}
        </h3>
        
        {/* Features / What's Included Preview */}
        {pdf.whats_included && pdf.whats_included.length > 0 ? (
          <div className="space-y-1.5 mb-3 bg-muted/40 rounded-xl p-2.5 text-xs text-muted-foreground">
            {pdf.whats_included.slice(0, 2).map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 truncate">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{isEnglish ? item.text : item.textBn || item.text}</span>
              </div>
            ))}
          </div>
        ) : (
          (pdf.description || pdf.description_bn) && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
              {isEnglish ? pdf.description : pdf.description_bn || pdf.description}
            </p>
          )
        )}

        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {isPaidAndPurchased ? (
            <Badge variant="secondary" className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border-0 px-2 py-0.5 rounded-md">
              {isEnglish ? '✓ Access Unlocked' : '✓ অ্যাক্সেস আনলকড'}
            </Badge>
          ) : pdf.is_free ? (
            <Badge variant="secondary" className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border-0 px-2 py-0.5 rounded-md">
              {isEnglish ? 'Free for Students' : 'শিক্ষার্থীদের জন্য সম্পূর্ণ ফ্রি'}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold border-0 px-2 py-0.5 rounded-md">
              {isEnglish ? 'Paid Package' : '৯৯% কমন পেইড প্যাকেজ'}
            </Badge>
          )}
          {pdf.compatible_years && pdf.compatible_years.length > 0 && (
            pdf.compatible_years.map(y => (
              <span key={y} className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {isEnglish ? yearLabels[y]?.en : yearLabels[y]?.bn}
              </span>
            ))
          )}
        </div>

        {/* Price & Action */}
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/50">
          {isPaidAndPurchased ? (
            <>
              <div>
                <span className="text-xs text-muted-foreground block font-medium">
                  {isEnglish ? 'Status' : 'স্ট্যাটাস'}
                </span>
                <span className="text-[14px] font-extrabold text-emerald-600 tracking-tight flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {isEnglish ? 'Purchased' : 'কেনা হয়েছে'}
                </span>
              </div>
              <Button
                asChild
                size="sm"
                className="h-9 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <Link to={`/dashboard/pdf-reader?id=${pdf.id}`}>
                  <BookOpen className="h-3.5 w-3.5" />
                  {isEnglish ? 'Read Online' : 'অনলাইনে পড়ুন'}
                </Link>
              </Button>
            </>
          ) : pdf.is_free ? (
            <>
              <div>
                <span className="text-xs text-muted-foreground block font-medium">
                  {isEnglish ? 'Access' : 'অ্যাক্সেস'}
                </span>
                <span className="text-[18px] font-extrabold text-emerald-600 tracking-tight">
                  {isEnglish ? 'Free' : 'বিনামূল্যে'}
                </span>
              </div>
              <Button
                asChild
                size="sm"
                className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
              >
                <Link to={user ? `/dashboard/pdf-reader?id=${pdf.id}` : `/login?redirect=${encodeURIComponent(`/dashboard/pdf-reader?id=${pdf.id}`)}`}>
                  <BookOpen className="h-3.5 w-3.5" />
                  {isEnglish ? 'Read Free' : 'ফ্রি পড়ুন'}
                </Link>
              </Button>
            </>
          ) : (
            <>
              <div>
                <span className="text-xs text-muted-foreground block font-medium">
                  {isEnglish ? 'Price' : 'মূল্য'}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[18px] font-extrabold text-foreground tracking-tight">৳{sellingPrice}</span>
                  {hasDiscount && (
                    <span className="text-xs font-medium line-through text-muted-foreground/60">
                      ৳{oldPrice}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCartClick}
                  disabled={isAdmin || isEmployee}
                  aria-label={inCart ? 'Remove from cart' : 'Add to cart'}
                  className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                    inCart 
                      ? 'bg-purple-600 text-white shadow-md scale-105' 
                      : 'bg-muted/80 text-muted-foreground hover:bg-purple-600 hover:text-white hover:shadow-md hover:scale-105'
                  }`}
                >
                  {inCart ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Hover border glow */}
      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5 group-hover:ring-purple-500/30 transition-all pointer-events-none" />
    </Link>
  );
}
