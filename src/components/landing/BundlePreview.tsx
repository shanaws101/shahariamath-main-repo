import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Package, BookOpen, ShoppingCart, Check, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCart, CartBundle } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCmsContent } from '@/hooks/useCmsContent';

interface SubjectInfo {
  id: string;
  name: string;
  name_bn: string;
  price: number;
}

interface BundleData {
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
  subject_count: number;
  subject_ids: string[];
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

export function BundlePreview() {
  const { isEnglish } = useLanguage();
  const { user, isAdmin, isEmployee } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addBundleToCart, isBundleInCart } = useCart();
  const [bundles, setBundles] = useState<BundleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBundle, setSelectedBundle] = useState<BundleData | null>(null);
  const cms = useCmsContent('bundle_preview', {
    heading: 'Bundle Offers',
    heading_bn: 'বান্ডেল অফার',
    subheading: 'Save more with our curated course bundles',
    subheading_bn: 'আমাদের কোর্স বান্ডেলে আরো সাশ্রয় করুন',
  });

  useEffect(() => {
    const fetchBundles = async () => {
      const { data: bundlesData } = await supabase
        .from('bundles')
        .select('*')
        .eq('is_visible', true)
        .order('display_order')
        .limit(3);

      if (!bundlesData) { setIsLoading(false); return; }

      const bundlesWithSubjects: BundleData[] = await Promise.all(
        bundlesData.map(async (b: any) => {
          const { data: bs } = await supabase
            .from('bundle_subjects')
            .select('subject_id')
            .eq('bundle_id', b.id);
          const subjectIds = bs?.map(x => x.subject_id) || [];

          let subjects: SubjectInfo[] = [];
          if (subjectIds.length > 0) {
            const { data: subjectsData } = await supabase
              .from('subjects')
              .select('id, name, name_bn, price')
              .in('id', subjectIds);
            if (subjectsData) subjects = subjectsData;
          }

          return { ...b, subject_count: subjectIds.length, subject_ids: subjectIds, subjects };
        })
      );

      setBundles(bundlesWithSubjects);
      setIsLoading(false);
    };
    fetchBundles();
  }, []);

  const handleEnroll = async (bundle: BundleData) => {
    if (!user) {
      navigate('/login');
      return;
    }
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

  const totalIndividualPrice = (bundle: BundleData) => {
    return bundle.subjects?.reduce((sum, s) => sum + Number(s.price), 0) || 0;
  };

  const savingsPercent = (bundle: BundleData) => {
    const total = totalIndividualPrice(bundle);
    if (total <= 0) return 0;
    return Math.round(((total - Number(bundle.price)) / total) * 100);
  };

  if (!isLoading && bundles.length === 0) return null;

  return (
    <>
      <section className="py-12 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4">
              {isEnglish ? cms.heading : cms.heading_bn}
            </h2>
            <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto">
              {isEnglish ? cms.subheading : cms.subheading_bn}
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[1, 2].map(i => (
                <div key={i} className="h-80 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className={`grid grid-cols-1 ${bundles.length >= 3 ? 'md:grid-cols-2 lg:grid-cols-3' : bundles.length === 2 ? 'md:grid-cols-2' : ''} gap-6 max-w-5xl mx-auto`}>
              {bundles.map(bundle => {
                const inCart = isBundleInCart(bundle.id);
                return (
                  <Card key={bundle.id} className="overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer" onClick={() => navigate(`/bundles/${bundle.id}`)}>
                    {bundle.cover_image_url ? (
                      <div className="aspect-video overflow-hidden bg-muted relative">
                        <img
                          src={bundle.cover_image_url}
                          alt={isEnglish ? bundle.title : bundle.title_bn || bundle.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="bg-background/90 rounded-full p-2.5">
                            <Eye className="h-5 w-5 text-foreground" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center relative">
                        <Package className="h-12 w-12 text-primary/30" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="bg-background/90 rounded-full p-2.5">
                            <Eye className="h-5 w-5 text-foreground" />
                          </div>
                        </div>
                      </div>
                    )}
                    <CardContent className="p-4 md:p-5 space-y-2.5 md:space-y-3">
                      <h3 className="font-semibold text-base md:text-lg leading-tight">
                        {isEnglish ? bundle.title : bundle.title_bn || bundle.title}
                      </h3>

                      <div className="flex flex-wrap gap-1.5 md:gap-2">
                        {bundle.department && (
                          <Badge variant="secondary" className="text-[10px] md:text-xs capitalize">
                            {isEnglish ? departmentLabels[bundle.department]?.en || bundle.department : departmentLabels[bundle.department]?.bn || bundle.department}
                          </Badge>
                        )}
                        {bundle.year && (
                          <Badge variant="outline" className="text-xs">
                            {isEnglish ? yearLabels[bundle.year]?.en || `Year ${bundle.year}` : yearLabels[bundle.year]?.bn || `${bundle.year} বর্ষ`}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs gap-1">
                          <BookOpen className="h-3 w-3" />
                          {bundle.subject_count} {isEnglish ? 'subjects' : 'বিষয়'}
                        </Badge>
                      </div>

                      {(bundle.description || bundle.description_bn) && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {isEnglish ? bundle.description : bundle.description_bn || bundle.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[17px] font-extrabold text-foreground tracking-tight">
                            ৳{bundle.original_price != null ? Math.min(bundle.price, bundle.original_price) : bundle.price}
                          </span>
                          {bundle.original_price != null && Math.max(bundle.price, bundle.original_price) > Math.min(bundle.price, bundle.original_price) && (
                            <span className="text-xs font-medium line-through text-muted-foreground/60">
                              ৳{Math.max(bundle.price, bundle.original_price)}
                            </span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className={`gap-1.5 ${isAdmin || isEmployee ? 'bg-muted text-muted-foreground opacity-100 hover:bg-muted' : 'btn-brand'}`}
                          onClick={(e) => { e.stopPropagation(); handleEnroll(bundle); }}
                          disabled={inCart || isAdmin || isEmployee}
                        >
                          {inCart ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              {isEnglish ? 'In Cart' : 'কার্টে আছে'}
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="h-3.5 w-3.5" />
                              {isEnglish ? 'Add to Cart' : 'কার্টে যোগ করুন'}
                            </>
                          )}
                        </Button>
                      </div>
                      {(isAdmin || isEmployee) && (
                        <p className="text-[10px] text-red-500 font-medium leading-tight mt-1.5 text-right">
                          {isEnglish ? 'Admins cannot enroll' : 'অ্যাডমিনরা এনরোল করতে পারবেন না'}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="text-center mt-10">
            <Button variant="outline" size="lg" className="gap-2" onClick={() => navigate('/bundles')}>
              {isEnglish ? 'See All Bundles' : 'সব বান্ডেল দেখুন'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Quick View Dialog */}
      <Dialog open={!!selectedBundle} onOpenChange={(open) => !open && setSelectedBundle(null)}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
          {selectedBundle && (() => {
            const bundle = selectedBundle;
            const inCart = isBundleInCart(bundle.id);
            const individualTotal = totalIndividualPrice(bundle);
            const savings = savingsPercent(bundle);

            return (
              <>
                {bundle.cover_image_url ? (
                  <div className="aspect-video w-full overflow-hidden bg-muted shrink-0">
                    <img src={bundle.cover_image_url} alt={isEnglish ? bundle.title : bundle.title_bn || bundle.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-video w-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shrink-0">
                    <Package className="h-16 w-16 text-primary/20" />
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-foreground leading-tight">
                      {isEnglish ? bundle.title : bundle.title_bn || bundle.title}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {bundle.department && (
                        <Badge variant="secondary" className="text-xs capitalize">
                          {isEnglish ? departmentLabels[bundle.department]?.en || bundle.department : departmentLabels[bundle.department]?.bn || bundle.department}
                        </Badge>
                      )}
                      {bundle.year && (
                        <Badge variant="outline" className="text-xs">
                          {isEnglish ? yearLabels[bundle.year]?.en : yearLabels[bundle.year]?.bn}
                        </Badge>
                      )}
                      {savings > 0 && (
                        <Badge className="text-xs bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10">
                          {isEnglish ? `Save ${savings}%` : `${savings}% ছাড়`}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {(bundle.description || bundle.description_bn) && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {isEnglish ? bundle.description : bundle.description_bn || bundle.description}
                    </p>
                  )}

                  <Separator />

                  <div className="space-y-2.5">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      {isEnglish ? `Included Subjects (${bundle.subject_count})` : `অন্তর্ভুক্ত বিষয়সমূহ (${bundle.subject_count})`}
                    </h3>
                    <div className="space-y-1.5">
                      {bundle.subjects && bundle.subjects.length > 0 ? (
                        bundle.subjects.map((subject) => (
                          <div key={subject.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2.5">
                              <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                              <span className="text-sm font-medium text-foreground">
                                {isEnglish ? subject.name : subject.name_bn || subject.name}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">৳{subject.price}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {isEnglish ? 'Subject details not available.' : 'বিষয়ের বিবরণ পাওয়া যায়নি।'}
                        </p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2 bg-muted/30 rounded-lg p-4">
                    {individualTotal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{isEnglish ? 'If bought separately' : 'আলাদাভাবে কিনলে'}</span>
                        <span className="line-through text-muted-foreground">৳{individualTotal}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-foreground">{isEnglish ? 'Bundle Price' : 'বান্ডেল মূল্য'}</span>
                      <span className="text-2xl font-bold text-primary">৳{bundle.price}</span>
                    </div>
                    {savings > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600 font-medium">{isEnglish ? 'You save' : 'আপনি বাঁচাচ্ছেন'}</span>
                        <span className="text-green-600 font-semibold">৳{individualTotal - Number(bundle.price)}</span>
                      </div>
                    )}
                  </div>

                  {/* View Details Link */}
                  <div className="text-center">
                    <Button
                      variant="link"
                      className="text-primary gap-1"
                      onClick={() => { setSelectedBundle(null); navigate(`/bundles/${bundle.id}`); }}
                    >
                      {isEnglish ? 'View Full Details' : 'সম্পূর্ণ বিবরণ দেখুন'}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="shrink-0 border-t border-border p-4 bg-background">
                  <div className="space-y-1.5">
                    <Button
                      className={`w-full gap-2 h-11 ${isAdmin || isEmployee ? 'bg-muted text-muted-foreground opacity-100 hover:bg-muted' : 'btn-brand'}`}
                      onClick={() => { handleEnroll(bundle); setSelectedBundle(null); }}
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
                          {isEnglish ? 'Add to Cart — ৳' + bundle.price : 'কার্টে যোগ করুন — ৳' + bundle.price}
                        </>
                      )}
                    </Button>
                    {(isAdmin || isEmployee) && (
                      <p className="text-xs text-center text-red-500 font-medium leading-tight px-1">
                        {isEnglish ? 'You are an admin, so you cannot purchase bundles.' : 'আপনি অ্যাডমিন, তাই বান্ডেল কিনতে পারবেন না।'}
                      </p>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
