import { useNavigate } from 'react-router-dom';
import {
  Briefcase, 
  TrendingUp, 
  Calculator, 
  DollarSign, 
  BarChart3,
  GraduationCap,
  BookOpen,
} from 'lucide-react';

const courseData = [
  { slug: 'BBA', icon: GraduationCap, label: 'BBA', color: 'bg-blue-500' },
  { slug: 'MBA', icon: BookOpen, label: 'MBA', color: 'bg-purple-500' },
  { slug: 'BBS', icon: BookOpen, label: 'BBS', color: 'bg-indigo-500' },
  { slug: 'accounting', icon: Calculator, label: 'Accounting', color: 'bg-emerald-500' },
  { slug: 'management', icon: Briefcase, label: 'Management', color: 'bg-amber-500' },
  { slug: 'finance', icon: DollarSign, label: 'Finance', color: 'bg-pink-500' },
  { slug: 'marketing', icon: TrendingUp, label: 'Marketing', color: 'bg-orange-500' },
  { slug: 'Job Preparation', icon: BarChart3, label: 'Job Preparation', color: 'bg-red-500' },
  { slug: 'SSC', icon: BookOpen, label: 'SSC', color: 'bg-cyan-500' },
  { slug: 'HSC', icon: BookOpen, label: 'HSC', color: 'bg-lime-500' },
];

export function SubjectCategories() {
  const navigate = useNavigate();

  return (
    <section className="py-6 md:py-8 bg-muted border-y border-border">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-center gap-3 md:gap-5">
          {courseData.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.slug}
                className="group flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-border bg-card hover:bg-accent hover:border-primary/30 transition-all duration-200"
                onClick={() => navigate(`/subjects?filter=${encodeURIComponent(item.slug)}`)}
              >
                <div className={`w-7 h-7 rounded-full ${item.color} flex items-center justify-center`}>
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm text-muted-foreground group-hover:text-foreground font-medium transition-colors">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
