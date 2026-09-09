import { useEffect, useState, useMemo } from "react";
import { useCart } from "@/contexts/CartContext";
import { Link, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  BookOpen, ArrowLeft, Search, 
  Calculator, FileText, GraduationCap, X, ShoppingCart, Check, Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { resolveEffectiveFilters } from "@/lib/subjects-filter";
import { COURSE_TYPES, COURSE_TYPE_LABELS, DEPARTMENT_LABELS } from "@/lib/constants";

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
  department: string | null;
  course_type: string | null;
  subject_type: string | null;
}

const courseTypes = [
  { value: 'all', label: 'All Courses', label_bn: 'সব কোর্স' },
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

const typeGradients: Record<string, string> = {
  'Math': 'from-blue-500/10 to-indigo-500/5',
  'Theory': 'from-emerald-500/10 to-teal-500/5',
  'Theory+Graph': 'from-violet-500/10 to-purple-500/5',
};

const typeAccents: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  'Math': { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-200', icon: 'text-blue-500' },
  'Theory': { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-200', icon: 'text-emerald-500' },
  'Theory+Graph': { bg: 'bg-violet-500/10', text: 'text-violet-600', border: 'border-violet-200', icon: 'text-violet-500' },
};

const typeIcon = (type: string | null) => {
  if (type === 'Math') return <Calculator className="h-3.5 w-3.5" />;
  if (type === 'Theory+Graph') return <FileText className="h-3.5 w-3.5" />;
  return <BookOpen className="h-3.5 w-3.5" />;
};

const normalizeFilterValue = (value: string | null | undefined) =>
  (value ?? '').trim().toLowerCase();

export default function SubjectsPage() {
  const { t, isEnglish } = useLanguage();
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const filterParam = searchParams.get('filter') || 'all';
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

  const { isStudentLocked, effectiveCourse, effectiveDept } = resolveEffectiveFilters({
    profile,
    isLoggedIn: !!user,
    course: activeCourse,
    dept: activeDept,
  });

  useEffect(() => {
    const fetchSubjects = async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('is_visible', true)
        .order('name');
      if (!error && data) setSubjects(data);
      setIsLoading(false);
    };
    fetchSubjects();
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
    if (value !== 'all') setSearchParams({ filter: value });
    else setSearchParams({});
  };

  const availableDepts = useMemo(() => {
    const depts = new Set<string>();
    const courseLc = normalizeFilterValue(effectiveCourse);
    subjects.forEach(s => {
      if ((courseLc === 'all' || normalizeFilterValue(s.course_type) === courseLc) && s.department) depts.add(s.department.toLowerCase());
    });
    return Array.from(depts).sort();
  }, [subjects, effectiveCourse]);

  const availableYears = useMemo(() => {
    const yrs = new Set<number>();
    const courseLc = normalizeFilterValue(effectiveCourse);
    const deptLc = normalizeFilterValue(effectiveDept);
    subjects.forEach(s => {
      if ((courseLc === 'all' || normalizeFilterValue(s.course_type) === courseLc) &&
          (deptLc === 'all' || normalizeFilterValue(s.department) === deptLc)) {
        s.compatible_years?.forEach(y => yrs.add(y));
      }
    });
    return Array.from(yrs).sort();
  }, [subjects, effectiveCourse, effectiveDept]);

  const filtered = useMemo(() => {
    const courseLc = normalizeFilterValue(effectiveCourse);
    const deptLc = normalizeFilterValue(effectiveDept);
    return subjects.filter(s => {
      if (courseLc !== 'all' && normalizeFilterValue(s.course_type) !== courseLc) return false;
      if (deptLc !== 'all' && normalizeFilterValue(s.department) !== deptLc) return false;
      if (activeYear && !s.compatible_years?.includes(activeYear)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.name_bn.includes(searchQuery);
      }
      return true;
    });
  }, [subjects, effectiveCourse, effectiveDept, activeYear, searchQuery]);

  const groupedByYear = useMemo(() => {
    if (activeYear) return null;
    const groups: Record<string, Subject[]> = {};
    filtered.forEach(s => {
      if (s.compatible_years && s.compatible_years.length > 0) {
        s.compatible_years.forEach(y => {
          const key = String(y);
          if (!groups[key]) groups[key] = [];
          groups[key].push(s);
        });
      } else {
        if (!groups['other']) groups['other'] = [];
        groups['other'].push(s);
      }
    });
    return groups;
  }, [filtered, activeYear]);

  const activeFiltersCount = [
    !isStudentLocked && effectiveCourse !== 'all',
    !isStudentLocked && effectiveDept !== 'all',
    activeYear !== null,
    searchQuery !== '',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setActiveCourse('all');
    setActiveDept('all');
    setActiveYear(null);
    setSearchQuery('');
    setSearchParams({});
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero — immersive gradient */}
        <section className="relative overflow-hidden bg-gradient-to-br from-orange-950 via-primary to-orange-700 py-10 md:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(255,255,255,0.12),transparent_60%)]" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="container mx-auto px-4 relative z-10">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-primary-foreground/60 hover:text-primary-foreground/90 mb-5 md:mb-8 transition-colors min-h-[44px]">
              <ArrowLeft className="h-4 w-4" />
              {isEnglish ? 'Home' : 'হোম'}
            </Link>
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-3 md:mb-5">
                <Badge className="bg-white/15 text-white border-0 rounded-full px-3 py-1 text-[11px] md:text-xs font-medium gap-1.5 backdrop-blur-sm">
                  <Sparkles className="h-3 w-3" />
                  {isEnglish ? `${subjects.length} Courses Available` : `${subjects.length}টি কোর্স উপলব্ধ`}
                </Badge>
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-2 md:mb-4 leading-[1.1]">
                {isEnglish ? 'Explore Our' : 'আমাদের'}{' '}
                <span className="bg-gradient-to-r from-orange-200 to-white bg-clip-text text-transparent">
                  {isEnglish ? 'Courses' : 'কোর্সসমূহ'}
                </span>
              </h1>
              <p className="text-white/70 text-sm md:text-xl max-w-lg leading-relaxed">
                {isEnglish 
                  ? 'Find the right course to accelerate your success' 
                  : 'আপনার সাফল্য ত্বরান্বিত করতে সঠিক কোর্স বেছে নিন'}
              </p>
            </div>
          </div>
        </section>

        {/* Sticky filter bar */}
        <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/50">
          <div className="container mx-auto px-4 py-3 md:py-4">
            <div className="flex flex-col gap-2.5 md:gap-3">
              {/* Search + count */}
              <div className="flex items-center gap-2 md:gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={isEnglish ? 'Search courses...' : 'কোর্স খুঁজুন...'}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-11 h-12 md:h-11 rounded-xl border-border/60 bg-card text-base md:text-sm"
                  />
                </div>
                <span className="text-xs md:text-sm font-semibold text-muted-foreground bg-muted px-3 h-12 md:h-11 rounded-xl flex items-center md:bg-transparent md:px-0 md:h-auto md:font-normal">
                  {filtered.length}
                  <span className="hidden md:inline ml-1">
                    {isEnglish ? `result${filtered.length !== 1 ? 's' : ''}` : 'টি ফলাফল'}
                  </span>
                </span>
                {activeFiltersCount > 0 && (
                  <button onClick={clearFilters} className="text-xs text-destructive hover:underline flex items-center gap-1 shrink-0 min-h-[44px] px-1">
                    <X className="h-3 w-3" /> {isEnglish ? 'Clear' : 'মুছুন'}
                  </button>
                )}
              </div>

              {/* Student locked indicator */}
              {isStudentLocked && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10 rounded-full px-3 py-1">
                    <GraduationCap className="h-3 w-3 mr-1" />
                    {isEnglish 
                      ? `${departmentLabels[profile.department!]?.en || profile.department} Dept` 
                      : `${departmentLabels[profile.department!]?.bn || profile.department} বিভাগ`}
                  </Badge>
                  <Link to="/dashboard/settings" className="text-xs text-primary hover:underline">
                    {isEnglish ? 'Change' : 'পরিবর্তন'}
                  </Link>
                </div>
              )}

              {user && !profile?.department && (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5">
                  <GraduationCap className="h-5 w-5 text-primary flex-shrink-0" />
                  <p className="text-xs md:text-sm text-foreground flex-1">
                    {isEnglish
                      ? 'Set your department in Settings for personalized courses.'
                      : 'ব্যক্তিগতকৃত কোর্সের জন্য সেটিংসে বিভাগ নির্ধারণ করুন।'}
                  </p>
                  <Link to="/dashboard/settings">
                    <Button size="sm" variant="outline" className="flex-shrink-0 rounded-xl text-xs">
                      {isEnglish ? 'Settings' : 'সেটিংস'}
                    </Button>
                  </Link>
                </div>
              )}

              {/* Course type pills */}
              {!isStudentLocked && (
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none snap-x">
                  {courseTypes.map(ct => (
                    <button
                      key={ct.value}
                      onClick={() => handleCourseChange(ct.value)}
                      className={`px-4 h-10 rounded-full text-sm font-semibold transition-all whitespace-nowrap snap-start shrink-0 ${
                        activeCourse === ct.value
                          ? 'bg-foreground text-background shadow-lg scale-[1.02]'
                          : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      {isEnglish ? ct.label : ct.label_bn}
                    </button>
                  ))}
                </div>
              )}

              {/* Dept + Year pills (horizontal scroll on mobile) */}
              <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap scrollbar-none">
                {!isStudentLocked && availableDepts.length > 1 && (
                  <>
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest shrink-0">
                      {isEnglish ? 'Dept' : 'বিভাগ'}
                    </span>
                    {['all', ...availableDepts].map(dept => (
                      <button
                        key={dept}
                        onClick={() => setActiveDept(dept)}
                        className={`px-3 h-9 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                          activeDept === dept
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {dept === 'all' 
                          ? (isEnglish ? 'All' : 'সব')
                          : (isEnglish ? departmentLabels[dept]?.en || dept : departmentLabels[dept]?.bn || dept)}
                      </button>
                    ))}
                    <span className="w-px h-4 bg-border mx-1 shrink-0" />
                  </>
                )}
                {availableYears.length > 1 && (
                  <>
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest shrink-0">
                      {isEnglish ? 'Year' : 'বর্ষ'}
                    </span>
                    <button
                      onClick={() => setActiveYear(null)}
                      className={`px-3 h-9 rounded-full text-xs font-medium transition-all shrink-0 ${
                        activeYear === null ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {isEnglish ? 'All' : 'সব'}
                    </button>
                    {availableYears.map(y => (
                      <button
                        key={y}
                        onClick={() => setActiveYear(y)}
                        className={`px-3 h-9 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                          activeYear === y ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {isEnglish ? yearLabels[y]?.en || `Year ${y}` : yearLabels[y]?.bn || `${y} বর্ষ`}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="container mx-auto px-4 py-8 md:py-12">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-52 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mx-auto mb-6">
                <GraduationCap className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-xl font-bold mb-2">{isEnglish ? 'No courses found' : 'কোনো কোর্স পাওয়া যায়নি'}</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                {isEnglish ? 'Try adjusting your filters or search to find what you\'re looking for.' : 'আপনি যা খুঁজছেন তা খুঁজে পেতে ফিল্টার বা সার্চ পরিবর্তন করুন।'}
              </p>
            </div>
          ) : activeYear || searchQuery ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(subject => (
                <SubjectCard key={subject.id} subject={subject} isEnglish={isEnglish} />
              ))}
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
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <GraduationCap className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-foreground tracking-tight">{label}</h3>
                        <p className="text-xs text-muted-foreground">{items.length} {isEnglish ? 'courses' : 'কোর্স'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {items.map(subject => (
                        <SubjectCard key={`${yearKey}-${subject.id}`} subject={subject} isEnglish={isEnglish} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function SubjectCard({ subject, isEnglish }: { subject: Subject; isEnglish: boolean }) {
  const { addToCart, isInCart, removeFromCart } = useCart();
  const { isAdmin, isEmployee } = useAuth();
  const inCart = isInCart(subject.id);
  const accent = typeAccents[subject.subject_type || ''] || typeAccents['Theory'];
  const gradient = typeGradients[subject.subject_type || ''] || typeGradients['Theory'];
  const sellingPrice = subject.original_price != null ? Math.min(subject.price, subject.original_price) : subject.price;
  const oldPrice = subject.original_price != null ? Math.max(subject.price, subject.original_price) : null;
  
  const hasDiscount = Boolean(oldPrice && oldPrice > sellingPrice);
  const discountPercent = hasDiscount 
    ? Math.round(((Number(oldPrice) - sellingPrice) / Number(oldPrice)) * 100) 
    : 0;

  const handleCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inCart) removeFromCart(subject.id);
    else addToCart({
      id: subject.id, name: subject.name, name_bn: subject.name_bn,
      price: sellingPrice, original_price: oldPrice, subject_type: subject.subject_type,
      department: subject.department, course_type: subject.course_type,
      compatible_years: subject.compatible_years,
    });
  };

  return (
    <Link
      to={`/subjects/${subject.slug}`}
      className="group relative flex flex-col rounded-2xl border border-border/60 bg-card overflow-hidden hover:shadow-xl hover:border-primary/30 hover:-translate-y-1 transition-all duration-300"
    >
      {/* Top gradient strip */}
      <div className={`h-28 bg-gradient-to-br ${gradient} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="absolute bottom-3 left-4 flex items-center gap-2">
          <div className={`w-10 h-10 rounded-xl ${accent.bg} backdrop-blur-sm flex items-center justify-center border border-white/10`}>
            <span className={accent.icon}>{typeIcon(subject.subject_type)}</span>
          </div>
          {subject.subject_type && (
            <span className={`text-xs font-semibold ${accent.text} bg-white/80 dark:bg-black/40 px-2.5 py-1 rounded-full`}>
              {subject.subject_type}
            </span>
          )}
        </div>
        {hasDiscount && discountPercent > 0 && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-red-500 text-white border-0 text-[10px] font-bold shadow-lg rounded-full px-2.5">
              {discountPercent}% OFF
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 pb-3 flex flex-col">
        <h3 className="font-bold text-base text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors mb-2">
          {isEnglish ? subject.name : subject.name_bn}
        </h3>
        
        {(subject.description || subject.description_bn) && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
            {isEnglish ? subject.description : subject.description_bn || subject.description}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5 mb-3">
          {subject.department && (
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full capitalize">
              {isEnglish ? departmentLabels[subject.department]?.en || subject.department : departmentLabels[subject.department]?.bn || subject.department}
            </span>
          )}
          {subject.compatible_years && subject.compatible_years.length > 0 && subject.compatible_years.length <= 2 && (
            subject.compatible_years.map(y => (
              <span key={y} className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {isEnglish ? yearLabels[y]?.en : yearLabels[y]?.bn}
              </span>
            ))
          )}
        </div>

        {/* Price + Cart */}
        <div className="mt-auto flex flex-col pt-3 border-t border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[17px] font-extrabold text-foreground tracking-tight">৳{sellingPrice}</span>
              {hasDiscount && (
                <span className="text-xs font-medium line-through text-muted-foreground/60">
                  ৳{oldPrice}
                </span>
              )}
            </div>
            <button
              onClick={handleCartClick}
              disabled={isAdmin || isEmployee}
              aria-label={inCart ? 'Remove from cart' : 'Add to cart'}
              className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-200 ${
                inCart 
                  ? 'bg-primary text-primary-foreground shadow-md scale-105' 
                  : isAdmin || isEmployee
                  ? 'bg-muted text-muted-foreground opacity-100 hover:bg-muted'
                  : 'bg-muted/80 text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:scale-105'
              }`}
            >
              {inCart ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
            </button>
          </div>
          {(isAdmin || isEmployee) && (
            <p className="text-[10px] text-red-500 font-medium leading-tight mt-1.5 text-right">
              {isEnglish ? 'Admins cannot enroll' : 'অ্যাডমিনরা এনরোল করতে পারবেন না'}
            </p>
          )}
        </div>
      </div>

      {/* Hover glow */}
      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5 group-hover:ring-primary/20 transition-all pointer-events-none" />
    </Link>
  );
}
