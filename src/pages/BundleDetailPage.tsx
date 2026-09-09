import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCart, CartBundle } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Package, BookOpen, ShoppingCart, Check, Share2, ArrowRight } from 'lucide-react';

interface SubjectInfo {
  id: string;
  name: string;
  name_bn: string;
  price: number;
  slug: string;
  description: string | null;
  description_bn: string | null;
}

interface BundleDetail {
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
  subject_ids: string[];
  subjects: SubjectInfo[];
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

export default function BundleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isEnglish } = useLanguage();
  const { user, isAdmin, isEmployee } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addBundleToCart, isBundleInCart } = useCart();
  const [bundle, setBundle] = useState<BundleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchBundle = async () => {
      const { data: b } = await supabase
        .from('bundles')
        .select('*')
        .eq('id', id)
        .eq('is_visible', true)
        .single();

      if (!b) { setIsLoading(false); return; }

      const { data: bs } = await supabase
        .from('bundle_subjects')
        .select('subject_id')
        .eq('bundle_id', b.id);
      const subjectIds = bs?.map(x => x.subject_id) || [];

      let subjects: SubjectInfo[] = [];
      if (subjectIds.length > 0) {
        const { data: subjectsData } = await supabase
          .from('subjects')
          .select('id, name, name_bn, price, slug, description, description_bn')
          .in('id', subjectIds);
        if (subjectsData) subjects = subjectsData;
      }

      setBundle({ ...b, subject_ids: subjectIds, subjects });
      setIsLoading(false);
    };
    fetchBundle();
  }, [id]);

  const handleEnroll = async () => {
    if (!bundle) return;
    if (!user) { navigate('/login'); return; }
    if (isBundleInCart(bundle.id)) {
      toast({ title: isEnglish ? 'Bundle already in cart' : 'বান্ডেল ইতিমধ্যে কার্টে আছে' });
      return;
    }
    const cartBundle: CartBundle = {
      id: '',
      bundle_id: bundle.id,
      title: bundle.title,
      title_bn: bundle.title_bn,
      price: Number(bundle.price),
      original_price: bundle.original_price ? Number(bundle.original_price) : null,
      department: bundle.department,
      year: bundle.year,
      subject_ids: bundle.subject_ids,
      cover_image_url: bundle.cover_image_url,
    };
    await addBundleToCart(cartBundle);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: bundle?.title || 'Bundle', url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: isEnglish ? 'Link copied!' : 'লিংক কপি হয়েছে!' });
    }
  };

  const individualTotal = bundle?.subjects.reduce((sum, s) => sum + Number(s.price), 0) || 0;
  const savings = individualTotal > 0 && bundle ? Math.round(((individualTotal - Number(bundle.price)) / individualTotal) * 100) : 0;
  const inCart = bundle ? isBundleInCart(bundle.id) : false;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        {isLoading ? (
          <div className="container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="h-8 w-48 bg-muted animate-pulse rounded-xl" />
              <div className="aspect-video bg-muted animate-pulse rounded-2xl" />
              <div className="h-6 w-3/4 bg-muted animate-pulse rounded-xl" />
            </div>
          </div>
        ) : !bundle ? (
          <div className="container mx-auto px-4 py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h1 className="text-2xl font-bold mb-2">
              {isEnglish ? 'Bundle Not Found' : 'বান্ডেল পাওয়া যায়নি'}
            </h1>
            <p className="text-muted-foreground mb-6">
              {isEnglish ? 'This bundle may no longer be available.' : 'এই বান্ডেলটি আর পাওয়া যাচ্ছে না।'}
            </p>
            <Button asChild className="rounded-2xl">
              <Link to="/bundles">{isEnglish ? 'View All Bundles' : 'সব বান্ডেল দেখুন'}</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Hero */}
            <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-orange-800 py-14 md:py-20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.08),transparent_70%)]" />
              <div className="container mx-auto px-4 max-w-4xl relative z-10">
                <Link to="/bundles" className="inline-flex items-center gap-2 text-sm text-primary-foreground/60 hover:text-primary-foreground/80 mb-6 transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                  {isEnglish ? 'All Bundles' : 'সব বান্ডেল'}
                </Link>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-primary-foreground mb-4">
                  {isEnglish ? bundle.title : bundle.title_bn || bundle.title}
                </h1>
                <div className="flex flex-wrap gap-2">
                  {bundle.department && (
                    <Badge className="bg-primary-foreground/15 text-primary-foreground border-0 text-xs capitalize rounded-full">
                      {isEnglish ? departmentLabels[bundle.department]?.en || bundle.department : departmentLabels[bundle.department]?.bn || bundle.department}
                    </Badge>
                  )}
                  {bundle.year && (
                    <Badge className="bg-primary-foreground/15 text-primary-foreground border-0 text-xs rounded-full">
                      {isEnglish ? yearLabels[bundle.year]?.en : yearLabels[bundle.year]?.bn}
                    </Badge>
                  )}
                  <Badge className="bg-primary-foreground/15 text-primary-foreground border-0 text-xs gap-1 rounded-full">
                    <BookOpen className="h-3 w-3" />
                    {bundle.subjects.length} {isEnglish ? 'subjects' : 'বিষয়'}
                  </Badge>
                  {savings > 0 && (
                    <Badge className="bg-green-500/90 text-white border-0 text-xs font-bold rounded-full">
                      {savings}% OFF
                    </Badge>
                  )}
                </div>
              </div>
            </section>

            <div className="container mx-auto px-4 py-8 md:py-10 max-w-4xl">
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  {bundle.cover_image_url && (
                    <div className="aspect-video rounded-2xl overflow-hidden bg-muted">
                      <img src={bundle.cover_image_url} alt={bundle.title} className="w-full h-full object-cover" />
                    </div>
                  )}

                  {(bundle.description || bundle.description_bn) && (
                    <div className="space-y-2">
                      <h2 className="text-xl font-bold tracking-tight">{isEnglish ? 'About This Bundle' : 'এই বান্ডেল সম্পর্কে'}</h2>
                      <p className="text-muted-foreground leading-relaxed">
                        {isEnglish ? bundle.description : bundle.description_bn || bundle.description}
                      </p>
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-4">
                    <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      {isEnglish ? 'Included Subjects' : 'অন্তর্ভুক্ত বিষয়সমূহ'}
                    </h2>
                    <div className="space-y-3">
                      {bundle.subjects.map((subject) => (
                        <Link
                          key={subject.id}
                          to={`/subjects/${subject.slug}`}
                          className="group block p-4 rounded-2xl border border-border bg-card hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                        >
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                {isEnglish ? subject.name : subject.name_bn || subject.name}
                              </h3>
                              {(subject.description || subject.description_bn) && (
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {isEnglish ? subject.description : subject.description_bn || subject.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-4">
                              <span className="text-sm font-bold text-muted-foreground">৳{subject.price}</span>
                              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sidebar - Pricing Card */}
                <div className="lg:col-span-1">
                  <div className="sticky top-24 space-y-4">
                    <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
                      <div className="text-center space-y-1">
                        <div className="text-3xl font-extrabold text-primary">৳{bundle.price}</div>
                        {bundle.original_price && Number(bundle.original_price) > Number(bundle.price) && (
                          <div className="text-sm line-through text-muted-foreground">৳{bundle.original_price}</div>
                        )}
                      </div>

                      {savings > 0 && (
                        <Badge className="w-full justify-center bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10 py-2 rounded-xl text-sm">
                          {isEnglish ? `Save ${savings}% — ৳${individualTotal - Number(bundle.price)} off` : `${savings}% ছাড় — ৳${individualTotal - Number(bundle.price)} কম`}
                        </Badge>
                      )}

                      <Separator />

                      <div className="space-y-2 text-sm">
                        {individualTotal > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{isEnglish ? 'If bought separately' : 'আলাদাভাবে কিনলে'}</span>
                            <span className="line-through text-muted-foreground">৳{individualTotal}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold">
                          <span>{isEnglish ? 'Bundle Price' : 'বান্ডেল মূল্য'}</span>
                          <span className="text-primary">৳{bundle.price}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Button
                          className={`w-full gap-2 h-14 rounded-2xl text-base font-bold ${
                            isAdmin || isEmployee ? 'bg-muted text-muted-foreground opacity-100 hover:bg-muted' : 'btn-brand'
                          }`}
                          onClick={handleEnroll}
                          disabled={inCart || isAdmin || isEmployee}
                        >
                          {inCart ? (
                            <>
                              <Check className="h-4 w-4" />
                              {isEnglish ? 'Already in Cart' : 'ইতিমধ্যে কার্টে আছে'}
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="h-4 w-4" />
                              {isEnglish ? 'Add to Cart' : 'কার্টে যোগ করুন'}
                            </>
                          )}
                        </Button>
                        {(isAdmin || isEmployee) && (
                          <p className="text-xs text-center text-red-500 font-medium leading-tight px-1 mt-1">
                            {isEnglish ? 'You are an admin, so you cannot purchase bundles.' : 'আপনি অ্যাডমিন, তাই বান্ডেল কিনতে পারবেন না।'}
                          </p>
                        )}
                      </div>

                      <Button variant="outline" className="w-full gap-2 rounded-2xl" onClick={handleShare}>
                        <Share2 className="h-4 w-4" />
                        {isEnglish ? 'Share Bundle' : 'বান্ডেল শেয়ার করুন'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
