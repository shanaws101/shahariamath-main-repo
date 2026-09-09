import { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

interface Banner {
  id: string;
  image_url: string;
  link_url: string | null;
  title: string | null;
  title_bn: string | null;
  display_order: number;
}

export function HeroCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { isEnglish } = useLanguage();
  const navigate = useNavigate();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  useEffect(() => {
    const fetchBanners = async () => {
      const { data } = await supabase
        .from('carousel_banners')
        .select('*')
        .eq('is_visible', true)
        .order('display_order', { ascending: true });
      if (data) {
        setBanners(data);
        // Preload the first banner image for LCP optimization
        if (data.length > 0) {
          const existingPreload = document.querySelector('link[data-lcp-preload]');
          if (!existingPreload) {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = data[0].image_url;
            link.setAttribute('data-lcp-preload', 'true');
            document.head.appendChild(link);
          }
        }
      }
    };
    fetchBanners();
  }, []);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  // Auto-play
  useEffect(() => {
    if (!emblaApi || banners.length <= 1) return;
    const interval = setInterval(() => emblaApi.scrollNext(), 5000);
    return () => clearInterval(interval);
  }, [emblaApi, banners.length]);

  const handleBannerClick = (linkUrl: string | null) => {
    if (!linkUrl) return;
    if (linkUrl.startsWith('http')) {
      window.open(linkUrl, '_blank');
    } else {
      navigate(linkUrl);
    }
  };

  if (banners.length === 0) {
    // Fallback hero when no banners
    return (
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-20 md:py-32">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-white mb-6">
            {isEnglish ? (
              <>Master Your Subjects with <span className="text-gradient">OliSahar Academy</span></>
            ) : (
              <><span className="text-gradient">অলি সাহার একাডেমি</span> দিয়ে আপনার বিষয়গুলো আয়ত্ত করুন</>
            )}
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-8">
            {isEnglish
              ? 'Live private tutoring for Honours students in Bangladesh. Join free classes, enroll in paid batches.'
              : 'বাংলাদেশের অনার্স শিক্ষার্থীদের জন্য লাইভ প্রাইভেট টিউটরিং।'}
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" className="bg-gradient-primary hover:opacity-90 h-12 px-8" onClick={() => navigate('/join')}>
              {isEnglish ? 'Join Course' : 'কোর্সে যোগ দিন'}
            </Button>
            <Button size="lg" className="h-12 px-8 border border-white/30 bg-white/10 hover:bg-white/20 text-white" onClick={() => navigate('/free-classes')}>
              {isEnglish ? 'Free Classes' : 'ফ্রি ক্লাস'}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className="relative flex-[0_0_100%] min-w-0 cursor-pointer"
              onClick={() => handleBannerClick(banner.link_url)}
            >
              <div className="relative aspect-[16/9] sm:aspect-[21/9] md:aspect-[3/1] w-full">
                <img
                  src={banner.image_url}
                  alt={isEnglish ? (banner.title || 'Banner') : (banner.title_bn || banner.title || 'Banner')}
                  className="w-full h-full object-cover"
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  decoding={index === 0 ? "sync" : "async"}
                />
                {(banner.title || banner.title_bn) && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end">
                    <div className="container mx-auto px-4 pb-8 md:pb-12">
                      <h2 className="text-white text-xl md:text-3xl font-bold drop-shadow-lg">
                        {isEnglish ? banner.title : (banner.title_bn || banner.title)}
                      </h2>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={() => emblaApi?.scrollPrev()}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => emblaApi?.scrollNext()}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => emblaApi?.scrollTo(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                index === selectedIndex ? 'bg-white w-6' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
