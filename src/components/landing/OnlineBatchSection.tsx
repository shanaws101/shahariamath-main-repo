import { useNavigate } from 'react-router-dom';
import { ArrowRight, GraduationCap, BookOpen, Calculator, FileText } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Subject {
  id: string;
  name: string;
  name_bn: string;
  slug: string;
  compatible_years: number[] | null;
  department: string | null;
  course_type: string | null;
  subject_type: string | null;
}

const courseTypes = [
  { value: 'BBA', label: 'BBA', label_bn: 'বিবিএ' },
  { value: 'MBA', label: 'MBA', label_bn: 'এমবিএ' },
  { value: 'BBS', label: 'BBS', label_bn: 'বিবিএস' },
  { value: 'Job Preparation', label: 'Job Prep', label_bn: 'চাকরি প্রস্তুতি' },
  { value: 'Statistics Courses', label: 'Statistics', label_bn: 'পরিসংখ্যান' },
  { value: 'BSS (Honours)', label: 'BSS Honours', label_bn: 'বিএসএস অনার্স' },
  { value: 'Honours', label: 'Honours', label_bn: 'অনার্স' },
];

const departments = [
  { value: 'accounting', label: 'Accounting', label_bn: 'একাউন্টিং' },
  { value: 'management', label: 'Management', label_bn: 'ম্যানেজমেন্ট' },
  { value: 'finance', label: 'Finance', label_bn: 'ফাইন্যান্স' },
  { value: 'marketing', label: 'Marketing', label_bn: 'মার্কেটিং' },
  { value: 'economics', label: 'Economics', label_bn: 'ইকোনমিক্স' },
  { value: 'general', label: 'General', label_bn: 'সাধারণ' },
  { value: 'statistics', label: 'Statistics', label_bn: 'পরিসংখ্যান' },
];

const years = [
  { year: 1, label: '1st Year', label_bn: '১ম বর্ষ' },
  { year: 2, label: '2nd Year', label_bn: '২য় বর্ষ' },
  { year: 3, label: '3rd Year', label_bn: '৩য় বর্ষ' },
  { year: 4, label: '4th Year', label_bn: '৪র্থ বর্ষ' },
];

const typeIcon = (type: string | null) => {
  if (type === 'Math') return <Calculator className="h-3 w-3" />;
  if (type === 'Theory+Graph') return <FileText className="h-3 w-3" />;
  return <BookOpen className="h-3 w-3" />;
};

export function OnlineBatchSection() {
  const { isEnglish } = useLanguage();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeCourse, setActiveCourse] = useState('BBA');
  const [activeDept, setActiveDept] = useState('accounting');

  useEffect(() => {
    const fetchSubjects = async () => {
      const { data } = await supabase
        .from('subjects')
        .select('id, name, name_bn, slug, compatible_years, department, course_type, subject_type')
        .eq('is_visible', true)
        .order('name');
      if (data) setSubjects(data);
    };
    fetchSubjects();
  }, []);

  const availableDepts = departments.filter(d =>
    subjects.some(s => s.course_type === activeCourse && s.department === d.value)
  );

  useEffect(() => {
    if (availableDepts.length > 0 && !availableDepts.find(d => d.value === activeDept)) {
      setActiveDept(availableDepts[0].value);
    }
  }, [activeCourse, availableDepts]);

  const filteredSubjects = subjects.filter(
    s => s.course_type === activeCourse && s.department === activeDept
  );

  const getSubjectsForYear = (year: number) =>
    filteredSubjects.filter(s => s.compatible_years?.includes(year));

  const noYearSubjects = filteredSubjects.filter(
    s => !s.compatible_years || s.compatible_years.length === 0
  );

  const hasYearGrouping = filteredSubjects.some(s => s.compatible_years && s.compatible_years.length > 0);

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-8 bg-secondary rounded-full" />
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            {isEnglish ? 'Honours Online Batch' : 'অনার্স অনলাইন ব্যাচ'}
          </h2>
        </div>

        {/* Course Type Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {courseTypes.map(ct => (
            <button
              key={ct.value}
              onClick={() => setActiveCourse(ct.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                activeCourse === ct.value
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'bg-muted text-muted-foreground hover:bg-accent border border-border'
              }`}
            >
              {isEnglish ? ct.label : ct.label_bn}
            </button>
          ))}
        </div>

        {/* Department Pills */}
        {availableDepts.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {availableDepts.map(dept => (
              <button
                key={dept.value}
                onClick={() => setActiveDept(dept.value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  activeDept === dept.value
                    ? 'bg-foreground text-background shadow-md'
                    : 'bg-muted text-muted-foreground hover:bg-accent border border-border'
                }`}
              >
                {isEnglish ? dept.label : dept.label_bn}
              </button>
            ))}
          </div>
        )}

        {/* Subjects Grid */}
        {hasYearGrouping ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {years.map(yearItem => {
              const yearSubjects = getSubjectsForYear(yearItem.year);
              if (yearSubjects.length === 0) return null;

              return (
                <div key={yearItem.year}>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-widest">
                    {isEnglish ? yearItem.label : yearItem.label_bn}
                    <span className="ml-2 opacity-50">({yearSubjects.length})</span>
                  </h3>
                  <div className="space-y-1.5">
                    {yearSubjects.map(subject => (
                      <button
                        key={subject.id}
                        onClick={() => navigate(`/subjects/${subject.slug}`)}
                        className="group w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-muted hover:bg-accent border border-border hover:border-primary/20 transition-all duration-200 text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                            {typeIcon(subject.subject_type)}
                          </span>
                          <span className="text-sm text-foreground/80 group-hover:text-foreground truncate transition-colors">
                            {isEnglish ? subject.name : subject.name_bn}
                          </span>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="max-w-xl">
            <div className="space-y-1.5">
              {noYearSubjects.map(subject => (
                <button
                  key={subject.id}
                  onClick={() => navigate(`/subjects/${subject.slug}`)}
                  className="group w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-muted hover:bg-accent border border-border hover:border-primary/20 transition-all duration-200 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                      {typeIcon(subject.subject_type)}
                    </span>
                    <span className="text-sm text-foreground/80 group-hover:text-foreground truncate transition-colors">
                      {isEnglish ? subject.name : subject.name_bn}
                    </span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* View all button */}
        <div className="mt-10">
          <button
            onClick={() => navigate('/subjects')}
            className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            {isEnglish ? 'View All Subjects' : 'সব বিষয় দেখুন'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
