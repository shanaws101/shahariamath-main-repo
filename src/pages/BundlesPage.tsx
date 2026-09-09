import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package, BookOpen, ShoppingCart, Check, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart, CartBundle } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';

interface SubjectInfo {
  id: string; name: string; name_bn: string; price: number;
}

interface BundleData {
  id: string; title: string; title_bn: string | null;
  department: string | null; year: number | null;
  price: number; original_price: number | null;
  cover_image_url: string | null;
  description: string | null; description_bn: string | null;
  subject_count: number; subject_ids: string[];
  subjects?: SubjectInfo[];
}

const departmentLabels: Record<string, { en: string; bn: string }> = {
  accounting: { en: 'Accounting', bn: 'একাউন্টিং' },
  management: { en: 'Management', bn: 'ম্যানেজমেন্ট' },
  finance: { en: 'Finance', bn: 'ফাইন্যান্স' },
  marketing: { en: 'Marketing', bn: 'মার্কেটিং' },
  economics: { en: 'Economics', bn: 'ইকোনমিক্স' },
};

const yearLabels: Record<number, { en: string; bn: string }> = {
  1: { en: '1st Year', bn: '১ম বর্ষ' },
  2: { en: '2nd Year', bn: '২য় বর্ষ' },
  3: { en: '3rd Year', bn: '৩য় বর্ষ' },
  4: { en: '4th Year', bn: '৪র্থ বর্ষ' },
};

const cardAccents = [
  { gradient: 'from-emerald-500 to-teal-600', light: 'bg-emerald-500/10', text: 'text-emerald-600' },
  { gradient: 'from-blue-500 to-indigo-600', light: 'bg-blue-500/10', text: 'text-blue-600' },
  { gradient: 'from-violet-500 to-purple-600', light: 'bg-violet-500/10', text: 'text-violet-600' },
  { gradient: 'from-amber-500 to-orange-600', light: 'bg-amber-500/10', text: 'text-amber-600' },
  { gradient: 'from-rose-500 to-pink-600', light: 'bg-rose-500/10', text: 'text-rose-600' },
  { gradient: 'from-cyan-500 to-blue-600', light: 'bg-cyan-500/10', text: 'text-cyan-600' },
];

export default function BundlesPage() {
  const { isEnglish } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addBundleToCart, isBundleInCart } = useCart();
  const [bundles, setBundles] = useState<BundleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBundles = async () => {
      const { data: bundlesData } = await supabase
        .from('bundles').select('*').eq('is_visible', true).order('display_order');
      if (!bundlesData) { setIsLoading(false); return; }
      const bundlesWithSubjects: BundleData[] = await Promise.all(
        bundlesData.map(async (b: any) => {
          const { data: bs } = await supabase.from('bundle_subjects').select('subject_id').eq('bundle_id', b.id);
          const subjectIds = bs?.map(x => x.subject_id) || [];
          let subjects: SubjectInfo[] = [];
          if (subjectIds.length > 0) {
            const { data: subjectsData } = await supabase.from('subjects').select('id, name, name_bn, price').in('id', subjectIds);
            if (subjectsData) subjects = subjectsData;
          }
          return { ...b, subject_count: subjectIds.length, subject_ids: subjectIds, subjects };
        })
      );
      setBundles(bundlesWithSubjects);
      setIsLoading(false);
    };
    fetchBundles();
  }, [user]);

  const handleEnroll = async (bundle: BundleData) => {
    if (!user) { navigate('/login'); return; }
    if (isBundleInCart(bundle.id)) {
      toast({ title: isEnglish ? 'Bundle already in cart' : 'বান্ডেল ইতিমধ্যে কার্টে আছে' });
      return;
    }
    const cartBundle: CartBundle = {
      id: '', bundle_id: bundle.id, title: bundle.title, title_bn: bundle.title_bn,
      price: Number(bundle.price), original_price: bundle.original_price ? Number(bundle.original_price) : null,
      department: bundle.department, year: bundle.year, subject_ids: bundle.subject_ids,
      cover_image_url: bundle.cover_image_url,
    };
    await addBundleToCart(cartBundle);
  };

  const totalIndividualPrice = (bundle: BundleData) => bundle.subjects?.reduce((sum, s) => sum + Number(s.price), 0) || 0;
  const savingsPercent = (bundle: BundleData) => {
    const total = totalIndividualPrice(bundle);
    if (total <= 0) return 0;
    return Math.round(((total - Number(bundle.price)) / total) * 100);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-orange-950 via-primary to-orange-700 py-16 md:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(255,255,255,0.12),transparent_60%)]" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="container mx-auto px-4 relative z-10">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-primary-foreground/50 hover:text-primary-foreground/80 mb-8 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              {isEnglish ? 'Home' : 'হোম'}
            </Link>
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-5">
                <Badge className="bg-white/10 text-white border-0 rounded-full px-4 py-1.5 text-xs font-medium gap-1.5 backdrop-blur-sm">
                  <Zap className="h-3 w-3" />
                  {isEnglish ? 'Save More Together' : 'একসাথে বেশি সাশ্রয়'}
                </Badge>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4 leading-[1.1]">
                {isEnglish ? 'Course' : 'কোর্স'}{' '}
                <span className="bg-gradient-to-r from-orange-200 to-white bg-clip-text text-transparent">
                  {isEnglish ? 'Bundles' : 'বান্ডেল'}
                </span>
              </h1>
              <p className="text-white/60 text-lg md:text-xl max-w-lg leading-relaxed">
                {isEnglish ? 'Get multiple courses at a discounted price and supercharge your preparation' : 'ডিসকাউন্টে একসাথে একাধিক সাবজেক্ট নিন'}
              </p>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-10 md:py-14">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-96 rounded-3xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : bundles.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mx-auto mb-6">
                <Package className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-xl font-bold mb-2">{isEnglish ? 'No bundles available' : 'কোনো বান্ডেল পাওয়া যাচ্ছে না'}</h3>
              <p className="text-muted-foreground text-sm">{isEnglish ? 'Check back soon for new offers!' : 'নতুন অফারের জন্য শীঘ্রই আবার দেখুন!'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bundles.map((bundle, idx) => {
                const inCart = isBundleInCart(bundle.id);
                const savings = savingsPercent(bundle);
                const accent = cardAccents[idx % cardAccents.length];
                const individualTotal = totalIndividualPrice(bundle);

                return (
                  <div
                    key={bundle.id}
                    className="group relative rounded-3xl border border-border/60 bg-card overflow-hidden hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-400 cursor-pointer flex flex-col"
                    onClick={() => navigate(`/bundles/${bundle.id}`)}
                  >
                    {/* Visual header */}
                    <div className={`relative h-44 bg-gradient-to-br ${accent.gradient} overflow-hidden`}>
                      {bundle.cover_image_url ? (
                        <>
                          <img
                            src={bundle.cover_image_url}
                            alt={isEnglish ? bundle.title : bundle.title_bn || bundle.title}
                            className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60 group-hover:scale-110 transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        </>
                      ) : (
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.2),transparent_60%)]" />
                      )}
                      
                      {/* Floating badges */}
                      <div className="absolute top-4 left-4 flex gap-2">
                        {bundle.department && (
                          <Badge className="bg-white/20 text-white border-0 text-[10px] rounded-full backdrop-blur-md capitalize">
                            {isEnglish ? departmentLabels[bundle.department]?.en || bundle.department : departmentLabels[bundle.department]?.bn || bundle.department}
                          </Badge>
                        )}
                        {bundle.year && (
                          <Badge className="bg-white/20 text-white border-0 text-[10px] rounded-full backdrop-blur-md">
                            {isEnglish ? yearLabels[bundle.year]?.en : yearLabels[bundle.year]?.bn}
                          </Badge>
                        )}
                      </div>

                      {savings > 0 && (
                        <div className="absolute top-4 right-4">
                          <Badge className="bg-red-500 text-white border-0 text-xs font-bold shadow-xl rounded-full px-3 py-1 animate-pulse">
                            {savings}% OFF
                          </Badge>
                        </div>
                      )}

                      {/* Subject count pill */}
                      <div className="absolute bottom-4 left-4">
                        <Badge className="bg-white/90 dark:bg-black/60 text-foreground border-0 text-xs gap-1.5 rounded-full px-3 py-1 backdrop-blur-md font-semibold">
                          <BookOpen className="h-3 w-3" />
                          {bundle.subject_count} {isEnglish ? 'Subjects' : 'বিষয়'}
                        </Badge>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-5 flex flex-col">
                      <h3 className="font-extrabold text-lg leading-tight text-foreground mb-2 group-hover:text-primary transition-colors tracking-tight">
                        {isEnglish ? bundle.title : bundle.title_bn || bundle.title}
                      </h3>

                      {(bundle.description || bundle.description_bn) && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                          {isEnglish ? bundle.description : bundle.description_bn || bundle.description}
                        </p>
                      )}

                      {/* Subject list preview */}
                      {bundle.subjects && bundle.subjects.length > 0 && (
                        <div className="mb-4 space-y-1.5">
                          {bundle.subjects.slice(0, 3).map(s => (
                            <div key={s.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                              <span className="truncate">{isEnglish ? s.name : s.name_bn}</span>
                            </div>
                          ))}
                          {bundle.subjects.length > 3 && (
                            <p className="text-[10px] text-muted-foreground pl-3.5">
                              +{bundle.subjects.length - 3} {isEnglish ? 'more' : 'আরও'}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Pricing */}
                      <div className="mt-auto pt-4 border-t border-border/50">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-extrabold text-foreground">৳{bundle.price}</span>
                              {individualTotal > 0 && individualTotal > Number(bundle.price) && (
                                <span className="text-sm line-through text-muted-foreground">৳{individualTotal}</span>
                              )}
                            </div>
                            {savings > 0 && (
                              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                                {isEnglish ? `You save ৳${individualTotal - Number(bundle.price)}` : `আপনি বাঁচাচ্ছেন ৳${individualTotal - Number(bundle.price)}`}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button 
                          className="w-full h-12 rounded-2xl font-bold text-sm gap-2"
                          onClick={(e) => { e.stopPropagation(); handleEnroll(bundle); }}
                          disabled={inCart}
                        >
                          {inCart ? (
                            <><Check className="h-4 w-4" />{isEnglish ? 'Added to Cart' : 'কার্টে যোগ হয়েছে'}</>
                          ) : (
                            <><ShoppingCart className="h-4 w-4" />{isEnglish ? 'Add Bundle to Cart' : 'কার্টে যোগ করুন'}</>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Hover ring */}
                    <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/5 group-hover:ring-primary/20 transition-all pointer-events-none" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
