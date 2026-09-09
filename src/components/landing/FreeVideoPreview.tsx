import { useNavigate } from 'react-router-dom';
import { Play, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCmsContent } from '@/hooks/useCmsContent';

const freeVideos = [
  {
    id: '1',
    title: 'Introduction to Business Management',
    title_bn: 'ব্যবসায় ব্যবস্থাপনার ভূমিকা',
    thumbnail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=225&fit=crop',
  },
  {
    id: '2',
    title: 'Marketing Basics for Beginners',
    title_bn: 'শিক্ষানবিসদের জন্য মার্কেটিং বেসিক',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=225&fit=crop',
  },
  {
    id: '3',
    title: 'Understanding Financial Statements',
    title_bn: 'আর্থিক বিবৃতি বোঝা',
    thumbnail: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=225&fit=crop',
  },
];

export function FreeVideoPreview() {
  const { isEnglish } = useLanguage();
  const navigate = useNavigate();
  const cms = useCmsContent('free_classes', {
    heading: 'Free Recorded Videos',
    heading_bn: 'ফ্রি রেকর্ডেড ভিডিও',
    subheading: 'Watch our free educational content anytime, anywhere',
    subheading_bn: 'যেকোনো সময়, যেকোনো জায়গায় আমাদের ফ্রি শিক্ষামূলক কন্টেন্ট দেখুন',
  });

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {isEnglish ? cms.heading : cms.heading_bn}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {isEnglish ? cms.subheading : cms.subheading_bn}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {freeVideos.map((video) => (
            <div
              key={video.id}
              className="group cursor-pointer overflow-hidden rounded-2xl border bg-card hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={video.thumbnail}
                  alt={isEnglish ? video.title : video.title_bn}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                    <Play className="h-6 w-6 text-primary ml-0.5" />
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                  {isEnglish ? video.title : video.title_bn}
                </h3>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Button variant="outline" size="lg" className="gap-2" onClick={() => navigate('/free-classes')}>
            {isEnglish ? 'Explore Free Videos' : 'ফ্রি ভিডিও দেখুন'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
