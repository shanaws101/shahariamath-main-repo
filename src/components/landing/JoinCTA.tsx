import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useCmsContent } from '@/hooks/useCmsContent';

interface Bundle {
  id: string;
  title: string;
  title_bn: string | null;
  price: number;
  original_price: number | null;
}

export function JoinCTA() {
  const { isEnglish } = useLanguage();
  const navigate = useNavigate();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const cms = useCmsContent('join_cta', {
    heading: 'Save More with Bundles',
    heading_bn: 'বান্ডেলে বেশি সেভ করুন',
    subheading: 'Get multiple subjects at a discounted price and supercharge your preparation',
    subheading_bn: 'ডিসকাউন্টে একসাথে একাধিক সাবজেক্ট নিন এবং প্রস্তুতি সুপারচার্জ করুন',
  });

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('bundles')
        .select('id, title, title_bn, price, original_price')
        .eq('is_visible', true)
        .order('display_order', { ascending: true })
        .limit(3);
      if (data) setBundles(data);
    };
    fetch();
  }, []);

  return (
    <section className="py-12 md:py-24 bg-background relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] md:w-[600px] h-[400px] md:h-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-border/50 bg-card p-5 md:p-14">
          {/* Gradient mesh background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
          <div className="absolute top-0 right-0 w-48 md:w-80 h-48 md:h-80 rounded-full bg-primary/8 blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-36 md:w-60 h-36 md:h-60 rounded-full bg-primary/6 blur-[80px]" />
          
          {/* Decorative grid */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)',
            backgroundSize: '24px 24px'
          }} />

          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-6 md:mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium mb-3 md:mb-4">
                <Sparkles className="h-3 w-3 md:h-3.5 md:w-3.5" />
                {isEnglish ? 'Best Value Bundles' : 'সেরা ভ্যালু বান্ডেল'}
              </div>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-2 md:mb-3">
                {isEnglish ? cms.heading : cms.heading_bn}
              </h2>
              <p className="text-muted-foreground text-sm md:text-lg max-w-xl mx-auto">
                {isEnglish ? cms.subheading : cms.subheading_bn}
              </p>
            </div>

            {/* Bundle Pills */}
            {bundles.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:flex-wrap justify-center gap-2.5 md:gap-3 mb-6 md:mb-10">
                {bundles.map((bundle) => {
                  const sellingPrice = bundle.original_price != null ? Math.min(bundle.price, bundle.original_price) : bundle.price;
                  const oldPrice = bundle.original_price != null ? Math.max(bundle.price, bundle.original_price) : null;
                  const hasDiscount = oldPrice != null && oldPrice > sellingPrice;
                  const discount = hasDiscount
                    ? Math.round(((oldPrice - sellingPrice) / oldPrice) * 100)
                    : 0;

                  return (
                    <button
                      key={bundle.id}
                      onClick={() => navigate(`/bundles/${bundle.id}`)}
                      className="group flex items-center gap-3 px-4 py-3 md:px-5 rounded-xl md:rounded-2xl border border-border bg-background hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 w-full sm:w-auto active:scale-[0.98]"
                    >
                      <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                        <Package className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">
                          {isEnglish ? bundle.title : (bundle.title_bn || bundle.title)}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-foreground font-extrabold text-sm tracking-tight">৳{sellingPrice}</span>
                          {hasDiscount && (
                            <>
                              <span className="text-muted-foreground/60 text-xs font-medium line-through">৳{oldPrice}</span>
                              <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                -{discount}%
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* CTA Button */}
            <div className="text-center">
              <Button
                size="lg"
                className="btn-brand text-sm md:text-base h-11 md:h-12 px-6 md:px-8 gap-2 font-semibold shadow-xl w-full sm:w-auto"
                onClick={() => navigate('/bundles')}
              >
                {isEnglish ? 'View All Bundles' : 'সব বান্ডেল দেখুন'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
