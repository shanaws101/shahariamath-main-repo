import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText, ArrowLeft, CheckCircle2, ShieldCheck,
  ShoppingCart, Lock, BookOpen, Sparkles, AlertCircle, Check, Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useToast } from "@/hooks/use-toast";
import { DEPARTMENT_LABELS, DEFAULT_PDF_READING_TERMS_TITLE, DEFAULT_PDF_READING_TERMS_CONTENT } from "@/lib/constants";
import { PdfSuggestion } from "./PdfSuggestionsPage";

const defaultIncluded = [
  { text: 'Chapter-wise 99% common questions with high exam probability', textBn: 'অধ্যায়ভিত্তিক ৯৯% কমন আসার মতো অতি গুরুত্বপূর্ণ প্রশ্নাবলি' },
  { text: 'Complete short & broad question solutions with accurate explanations', textBn: 'সংক্ষিপ্ত ও রচনামূলক সকল প্রশ্নের নির্ভুল ও সহজবোধ্য উত্তরমালা' },
  { text: 'Previous years university question analysis and pattern breakdown', textBn: 'বিগত ৫ বছরের বোর্ড ও বিশ্ববিদ্যালয় পরীক্ষার প্রশ্ন বিশ্লেষণ' },
  { text: 'Special formula sheet & quick exam revision memory hacks', textBn: 'সকল গাণিতিক সূত্র তালিকা এবং দ্রুত রিভিশনের এক্সক্লুসিভ টেকনিক' },
  { text: 'Exam writing format guidelines by Shaharia Sir', textBn: 'পরীক্ষায় সর্বোচ্চ নম্বর পাওয়ার স্ট্র্যাটেজি ও খাতা উপস্থাপনের নিয়ম' },
];

export default function PdfSuggestionDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { isEnglish } = useLanguage();
  const { user, profile, isAdmin, isEmployee } = useAuth();
  const { addPdfToCart, isPdfInCart, removePdfFromCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [suggestion, setSuggestion] = useState<PdfSuggestion | null>(null);
  const [relatedSuggestions, setRelatedSuggestions] = useState<PdfSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaimingFree, setIsClaimingFree] = useState(false);
  const [hasPaidAccess, setHasPaidAccess] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        let foundPdf: any = null;

        // 1. Try Supabase pdf_suggestions first
        const { data: pdfData, error } = await (supabase as any)
          .from('pdf_suggestions')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (pdfData && !error) {
          foundPdf = {
            ...pdfData,
            is_free: pdfData.is_free ?? (pdfData.price === 0),
            price: Number(pdfData.price) || 0,
            original_price: Number(pdfData.original_price) || 0,
          };
        } else {
          // 2. Try Supabase course_pdfs table
          try {
            const { data: cpData } = await supabase
              .from('course_pdfs')
              .select('*')
              .order('created_at', { ascending: false });

            if (cpData && cpData.length > 0) {
              const matched = cpData.find((cp: any) => {
                const s = cp.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                return s === slug || `${s}-pdf-suggestion` === slug || cp.id === slug;
              });

              if (matched) {
                foundPdf = {
                  id: matched.id,
                  subject_id: matched.subject_id,
                  title: matched.title,
                  title_bn: matched.title_bn || matched.title,
                  slug: slug,
                  department: matched.department || 'accounting',
                  course_type: 'BBA',
                  compatible_years: matched.target_years || [1, 2, 3, 4],
                  subject_type: 'Theory',
                  is_free: Boolean(matched.is_free),
                  price: matched.is_free ? 0 : 20,
                  original_price: matched.is_free ? 0 : 100,
                  description: null,
                  description_bn: null,
                  whats_included: null,
                  file_url: matched.file_url,
                  free_pdf_url: matched.is_free ? matched.file_url : null,
                  paid_pdf_url: !matched.is_free ? matched.file_url : null,
                  is_visible: matched.is_visible ?? true,
                };
              }
            }
          } catch {}

          // 3. Check local storage fallback
          if (!foundPdf) {
            try {
              const raw = localStorage.getItem('oli_pdf_suggestions_local');
              if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                  const localFound = parsed.find((p: any) => p.slug === slug || p.id === slug);
                  if (localFound) {
                    foundPdf = {
                      ...localFound,
                      is_free: localFound.is_free ?? (localFound.price === 0),
                      price: Number(localFound.price) || 0,
                      original_price: Number(localFound.original_price) || 0,
                    };
                  }
                }
              }
            } catch {}
          }
        }

        if (foundPdf) {
          setSuggestion(foundPdf);

          // Check if user already owns / purchased this
          if (user) {
            try {
              let hasAccess = false;

              // 1. Check pdf_suggestion_enrollments in DB (STRICTLY COMPLETED ONLY)
              if (!foundPdf.is_free) {
                const { data: enrollments } = await (supabase as any)
                  .from('pdf_suggestion_enrollments')
                  .select('id, access_type, payment_status')
                  .eq('user_id', user.id)
                  .eq('pdf_suggestion_id', foundPdf.id)
                  .eq('access_type', 'paid')
                  .eq('payment_status', 'completed');

                if (enrollments && enrollments.length > 0) {
                  hasAccess = true;
                }
              }

              // 2. Check completed payments gateway_response (STRICTLY COMPLETED ONLY)
              if (!hasAccess && !foundPdf.is_free) {
                const { data: userPayments } = await supabase
                  .from('payments')
                  .select('gateway_response, status')
                  .eq('user_id', user.id)
                  .eq('status', 'completed');

                (userPayments || []).forEach((p: any) => {
                  const ids = p.gateway_response?.pdf_suggestion_ids;
                  if (Array.isArray(ids) && ids.includes(foundPdf.id)) {
                    hasAccess = true;
                  }
                });
              }

              if (hasAccess && !foundPdf.is_free) {
                setHasPaidAccess(true);
              }
            } catch (e) {
              console.warn('Access check notice:', e);
            }
          }

          // Fetch related
          try {
            const { data: related } = await (supabase as any)
              .from('pdf_suggestions')
              .select('*')
              .eq('department', foundPdf.department)
              .neq('slug', foundPdf.slug)
              .eq('is_visible', true)
              .limit(3);

            if (related && related.length > 0) {
              setRelatedSuggestions(related);
            }
          } catch {}
        } else {
          setSuggestion(null);
        }
      } catch (err) {
        console.error('Error fetching pdf detail:', err);
        setSuggestion(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [slug, user]);

  const inCart = suggestion ? isPdfInCart(suggestion.id) : false;
  const isFreePackage = Boolean(suggestion?.is_free || suggestion?.price === 0);
  const sellingPrice = suggestion?.price != null ? Number(suggestion.price) : 0;
  const oldPrice = suggestion?.original_price != null && Number(suggestion.original_price) > 0 ? Number(suggestion.original_price) : null;
  const hasDiscount = !isFreePackage && Boolean(oldPrice && oldPrice > sellingPrice);
  const discountPercent = hasDiscount && oldPrice
    ? Math.round(((oldPrice - sellingPrice) / oldPrice) * 100) 
    : 0;

  const handleReadFree = async () => {
    if (!user) {
      toast({
        title: isEnglish ? 'Login Required' : 'লগইন প্রয়োজন',
        description: isEnglish ? 'Please login or create an account to read the free PDF suggestion.' : 'ফ্রি পিডিএফ পড়তে দয়া করে একটি অ্যাকাউন্ট তৈরি বা লগইন করুন।',
      });
      navigate(`/login?redirect=${encodeURIComponent(`/dashboard/pdf-reader?id=${suggestion?.id || slug}`)}`);
      return;
    }

    setIsClaimingFree(true);
    try {
      if (suggestion) {
        // Record free access enrollment
        await (supabase as any)
          .from('pdf_suggestion_enrollments')
          .upsert({
            user_id: user.id,
            pdf_suggestion_id: suggestion.id,
            access_type: 'free',
            payment_status: 'completed',
          }, { onConflict: 'user_id,pdf_suggestion_id,access_type' });
      }

      toast({
        title: isEnglish ? 'Free PDF Unlocked!' : 'ফ্রি পিডিএফ খোলা হয়েছে!',
        description: isEnglish ? 'Opening in your secure dashboard reader.' : 'ড্যাশবোর্ডের সুরক্ষিত রিডারে খোলা হচ্ছে।',
      });
      navigate(`/dashboard/pdf-reader?id=${suggestion?.id}`);
    } catch (e) {
      navigate(`/dashboard/pdf-reader`);
    } finally {
      setIsClaimingFree(false);
    }
  };

  const handleAddToCart = () => {
    if (!suggestion) return;
    if (inCart) {
      removePdfFromCart(suggestion.id);
    } else {
      addPdfToCart({
        id: suggestion.id,
        pdf_suggestion_id: suggestion.id,
        title: suggestion.title,
        title_bn: suggestion.title_bn,
        price: sellingPrice,
        original_price: oldPrice,
        department: suggestion.department,
        course_type: suggestion.course_type,
        compatible_years: suggestion.compatible_years,
        slug: suggestion.slug,
      });
    }
  };

  const handleBuyNow = () => {
    if (!suggestion) return;
    if (hasPaidAccess) {
      navigate(`/dashboard/pdf-reader?id=${suggestion.id}`);
      return;
    }
    if (!inCart) {
      addPdfToCart({
        id: suggestion.id,
        pdf_suggestion_id: suggestion.id,
        title: suggestion.title,
        title_bn: suggestion.title_bn,
        price: sellingPrice,
        original_price: oldPrice,
        department: suggestion.department,
        course_type: suggestion.course_type,
        compatible_years: suggestion.compatible_years,
        slug: suggestion.slug,
      });
    }
    navigate('/checkout');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!suggestion) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">{isEnglish ? 'PDF Suggestion Not Found' : 'পিডিএফ সাজেশন পাওয়া যায়নি'}</h2>
            <Button onClick={() => navigate('/pdf-suggestions')} className="btn-brand mt-2">
              {isEnglish ? 'Back to Suggestions' : 'সকল সাজেশনে ফিরে যান'}
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const includedItems = suggestion.whats_included && suggestion.whats_included.length > 0
    ? suggestion.whats_included
    : defaultIncluded;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Header */}
        <section className="relative overflow-hidden py-10 md:py-14 border-b border-border/50 bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent">
          <div className="container mx-auto px-4 max-w-5xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
              <Link to="/" className="hover:text-foreground">{isEnglish ? 'Home' : 'হোম'}</Link>
              <span>/</span>
              <Link to="/pdf-suggestions" className="hover:text-foreground">{isEnglish ? 'PDF Suggestions' : 'পিডিএফ সাজেশন'}</Link>
              <span>/</span>
              <span className="text-foreground truncate max-w-[200px] sm:max-w-none">
                {isEnglish ? suggestion.title : suggestion.title_bn || suggestion.title}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Left Details */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {isFreePackage ? (
                    <Badge className="bg-emerald-600 text-white border-0 font-bold px-3 py-1 rounded-full text-xs flex items-center gap-1.5 shadow-sm">
                      <FileText className="h-3.5 w-3.5" />
                      {isEnglish ? 'Free PDF Suggestion' : 'ফ্রি পিডিএফ সাজেশন'}
                    </Badge>
                  ) : (
                    <Badge className="bg-purple-600 text-white border-0 font-bold px-3 py-1 rounded-full text-xs flex items-center gap-1.5 shadow-sm">
                      <FileText className="h-3.5 w-3.5" />
                      {isEnglish ? '99% Common Paid Package' : '৯৯% কমন পেইড প্যাকেজ'}
                    </Badge>
                  )}
                  {suggestion.course_type && (
                    <Badge variant="outline" className="bg-background/80 text-xs font-semibold px-2.5 py-0.5">
                      {suggestion.course_type}
                    </Badge>
                  )}
                  {suggestion.department && (
                    <Badge variant="secondary" className="capitalize text-xs px-2.5 py-0.5">
                      {DEPARTMENT_LABELS[suggestion.department]?.en || suggestion.department}
                    </Badge>
                  )}
                  {suggestion.compatible_years?.map(y => (
                    <Badge key={y} variant="outline" className="text-xs px-2 py-0.5">
                      {isEnglish ? `Year ${y}` : `${y}ম বর্ষ`}
                    </Badge>
                  ))}
                </div>

                <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
                  {isEnglish ? suggestion.title : suggestion.title_bn || suggestion.title}
                </h1>

                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {isEnglish ? suggestion.description : suggestion.description_bn || suggestion.description}
                </p>

                {/* Secure viewing badge */}
                <div className="flex items-center gap-2 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-800 dark:text-purple-300 text-xs font-semibold">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-purple-600" />
                  <span>
                    {isEnglish 
                      ? 'Protected In-App Reading: Access your suggestions anytime from your Student Dashboard.'
                      : 'সুরক্ষিত অনলাইন রিডার: আপনার স্টুডেন্ট ড্যাশবোর্ড থেকে যেকোনো সময় অনলাইনে সহজেই পড়ুন।'}
                  </span>
                </div>
              </div>

              {/* Right Action Box */}
              <div className="space-y-4">
                {isFreePackage ? (
                  /* Free Suggestion Card */
                  <Card className="rounded-3xl border-2 border-emerald-300 dark:border-emerald-800/60 shadow-xl overflow-hidden bg-card">
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            {isEnglish ? 'Free Student Access' : 'শিক্ষার্থীদের জন্য বিনামূল্যে'}
                          </span>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl font-extrabold text-emerald-600 tracking-tight">
                              {isEnglish ? 'Free' : 'বিনামূল্যে'}
                            </span>
                          </div>
                        </div>
                        <Badge className="bg-emerald-500 text-white font-extrabold text-xs px-2.5 py-1 rounded-full">
                          ৳0
                        </Badge>
                      </div>

                      <Button
                        onClick={handleReadFree}
                        disabled={isClaimingFree}
                        className="w-full h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-base shadow-md shadow-emerald-600/20 gap-2"
                      >
                        <BookOpen className="h-4 w-4" />
                        {isClaimingFree
                          ? (isEnglish ? 'Opening Reader...' : 'রিডার খোলা হচ্ছে...')
                          : (isEnglish ? 'Read Free Online' : 'অনলাইনে ফ্রি পড়ুন')}
                      </Button>
                    </div>
                  </Card>
                ) : (
                  /* Paid Package Card */
                  <Card className="rounded-3xl border-2 border-purple-300 dark:border-purple-800/60 shadow-xl overflow-hidden bg-card">
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                            {isEnglish ? 'Full Suggestion Package' : 'সম্পূর্ণ সাজেশন প্যাকেজ'}
                          </span>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl font-extrabold text-foreground tracking-tight">৳{sellingPrice}</span>
                            {hasDiscount && (
                              <span className="text-sm font-medium line-through text-muted-foreground">
                                ৳{oldPrice}
                              </span>
                            )}
                          </div>
                        </div>
                        {hasDiscount && discountPercent > 0 && (
                          <Badge className="bg-red-500 text-white font-extrabold text-xs px-2.5 py-1 rounded-full">
                            {discountPercent}% OFF
                          </Badge>
                        )}
                      </div>

                      {hasPaidAccess ? (
                        <div className="space-y-3">
                          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>{isEnglish ? 'You already own this full suggestion package' : 'আপনি ইতিমধ্যে এই সম্পূর্ণ সাজেশন প্যাকেজটি কিনেছেন'}</span>
                          </div>
                          <Button
                            onClick={() => navigate(`/dashboard/pdf-reader?id=${suggestion.id}`)}
                            className="w-full h-12 rounded-xl font-extrabold bg-purple-600 hover:bg-purple-700 text-white text-base gap-2 shadow-lg shadow-purple-600/20"
                          >
                            <BookOpen className="h-4 w-4" />
                            {isEnglish ? 'Read Online in Dashboard' : 'অনলাইনে পড়ুন (ড্যাশবোর্ড)'}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          <Button
                            onClick={handleBuyNow}
                            disabled={isAdmin || isEmployee}
                            className="w-full h-12 rounded-xl font-bold btn-brand text-base shadow-md shadow-primary/20"
                          >
                            {isEnglish ? 'Buy Now via bKash' : 'বিকাশে এখনই কিনুন'}
                          </Button>
                          <Button
                            onClick={handleAddToCart}
                            disabled={isAdmin || isEmployee}
                            variant="outline"
                            className="w-full h-11 rounded-xl font-semibold gap-2 border-2"
                          >
                            {inCart ? (
                              <>
                                <Check className="h-4 w-4 text-emerald-600" />
                                {isEnglish ? 'Added in Cart' : 'কার্টে যুক্ত আছে'}
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="h-4 w-4" />
                                {isEnglish ? 'Add to Cart' : 'কার্টে যোগ করুন'}
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Content Breakdown: What's Included */}
        <section className="py-12 container mx-auto px-4 max-w-5xl">
          <div className="mb-8">
            <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              {isEnglish ? "What's Included in this PDF Suggestion?" : "এই পিডিএফ সাজেশনে যা যা থাকছে"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isEnglish 
                ? 'Everything designed for 100% exam readiness and guaranteed performance in university examinations.'
                : 'বিশ্ববিদ্যালয় ও জাতীয় বিশ্ববিদ্যালয়ের পরীক্ষায় শতভাগ নিশ্চিত প্রস্তুতির জন্য সবকিছু এক ফাইলে।'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            {includedItems.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-3.5 p-4 rounded-2xl border border-border/70 bg-card hover:border-purple-400/40 hover:shadow-md transition-all"
              >
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground leading-relaxed">
                    {isEnglish ? item.text : item.textBn || item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* 📚 PDF বই পড়ার শর্তাবলি (Always in Bengali, customizable from Super Admin) */}
          <Card className="rounded-3xl border border-purple-500/30 bg-card p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/60">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">
                  {suggestion.reading_terms_title || DEFAULT_PDF_READING_TERMS_TITLE}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  পিডিএফ সাজেশন ব্যবহারের নিয়ম ও নির্দেশনাবলী
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-foreground/90 leading-relaxed font-sans whitespace-pre-line">
              {suggestion.reading_terms || DEFAULT_PDF_READING_TERMS_CONTENT}
            </div>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
}
