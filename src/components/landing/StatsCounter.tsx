import { Users, BookOpen, Video, Headphones } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const stats = [
  { icon: Users, value: '500+', label: 'Students', label_bn: 'শিক্ষার্থী' },
  { icon: BookOpen, value: '5', label: 'Subjects', label_bn: 'বিষয়' },
  { icon: Video, value: '100+', label: 'Free Videos', label_bn: 'ফ্রি ভিডিও' },
  { icon: Headphones, value: '24/7', label: 'Support', label_bn: 'সাপোর্ট' },
];

export function StatsCounter() {
  const { isEnglish } = useLanguage();

  return (
    <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 py-10 md:py-14">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-3">
                  <Icon className="h-6 w-6 text-primary" style={{ color: 'hsl(222 84% 60%)' }} />
                </div>
                <div className="text-2xl md:text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-slate-400">
                  {isEnglish ? stat.label : stat.label_bn}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
