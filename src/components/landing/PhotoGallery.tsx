import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useCmsContent } from '@/hooks/useCmsContent';

const fallbackImages = [
  { image_url: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=600&h=400&fit=crop', alt_text: 'Students in classroom', alt_text_bn: 'ক্লাসরুমে শিক্ষার্থীরা' },
  { image_url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&h=400&fit=crop', alt_text: 'Live teaching session', alt_text_bn: 'লাইভ টিচিং সেশন' },
  { image_url: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=600&h=400&fit=crop', alt_text: 'Group study session', alt_text_bn: 'গ্রুপ স্টাডি সেশন' },
  { image_url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&h=400&fit=crop', alt_text: 'Education event', alt_text_bn: 'শিক্ষা ইভেন্ট' },
  { image_url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=600&h=400&fit=crop', alt_text: 'Student success', alt_text_bn: 'শিক্ষার্থীর সাফল্য' },
  { image_url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=400&fit=crop', alt_text: 'Collaborative learning', alt_text_bn: 'সহযোগী শেখা' },
];

const defaultCms = {
  heading: 'Our Learning Community',
  heading_bn: 'আমাদের শিক্ষা সম্প্রদায়',
  subheading: 'See our vibrant learning community in action',
  subheading_bn: 'আমাদের প্রাণবন্ত শিক্ষা সম্প্রদায়কে কাজে দেখুন',
  scroll_speed: '30',
};

interface GalleryImage {
  image_url: string;
  alt_text: string;
  alt_text_bn: string | null;
}

function MarqueeRow({ images, direction, speed, isEnglish }: { images: GalleryImage[]; direction: 'left' | 'right'; speed: number; isEnglish: boolean }) {
  // Quadruple images to ensure no gaps ever appear
  const repeated = [...images, ...images, ...images, ...images];

  const animationClass = direction === 'left' ? 'animate-marquee-left' : 'animate-marquee-right';

  return (
    <div className="overflow-hidden">
      <div
        className={`flex gap-3 md:gap-4 w-max ${animationClass}`}
        style={{ '--marquee-speed': `${speed}s` } as React.CSSProperties}
      >
        {repeated.map((image, index) => (
          <div key={index} className="shrink-0 w-[200px] md:w-[340px] group relative overflow-hidden rounded-xl md:rounded-2xl">
            <div className="aspect-[4/3] overflow-hidden">
              <img
                src={image.image_url}
                alt={isEnglish ? image.alt_text : (image.alt_text_bn || image.alt_text)}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                loading="lazy"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-white text-sm font-medium">
                  {isEnglish ? image.alt_text : (image.alt_text_bn || image.alt_text)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PhotoGallery() {
  const { isEnglish } = useLanguage();
  const [images, setImages] = useState<GalleryImage[]>(fallbackImages);
  const cms = useCmsContent('photo_gallery', defaultCms);

  const speed = parseInt(cms.scroll_speed || '30', 10) || 30;

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from('gallery_images')
        .select('image_url, alt_text, alt_text_bn')
        .eq('is_visible', true)
        .order('display_order', { ascending: true });
      if (data && data.length > 0) setImages(data);
    };
    fetchData();
  }, []);

  const mid = Math.ceil(images.length / 2);
  const topRow = images.slice(0, mid);
  const bottomRow = images.slice(mid);

  return (
    <section className="py-16 md:py-24 bg-muted overflow-hidden">
      <div className="container mx-auto px-4 mb-10">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            {isEnglish ? cms.heading : cms.heading_bn}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {isEnglish ? cms.subheading : cms.subheading_bn}
          </p>
        </div>
      </div>

      <div className="space-y-3 md:space-y-4">
        <MarqueeRow images={topRow} direction="left" speed={speed} isEnglish={isEnglish} />
        {bottomRow.length > 0 && (
          <MarqueeRow images={bottomRow} direction="right" speed={speed} isEnglish={isEnglish} />
        )}
      </div>
    </section>
  );
}
