import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight, Star, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useCmsContent } from '@/hooks/useCmsContent';

interface BlogPost {
  id: string;
  title: string;
  title_bn: string | null;
  slug: string;
  excerpt: string | null;
  excerpt_bn: string | null;
  cover_image_url: string | null;
  author_name: string;
  author_name_bn: string | null;
  author_avatar_url: string | null;
  is_featured: boolean;
  published_at: string | null;
  keywords: string[];
}

export function BlogSection() {
  const { isEnglish } = useLanguage();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const cms = useCmsContent('blog_section', {
    heading: 'Our Learning Blog',
    heading_bn: 'আমাদের ব্লগ',
    subheading: 'Tips, insights, and study guides to accelerate your learning journey',
    subheading_bn: 'আপনার শেখার যাত্রাকে ত্বরান্বিত করতে টিপস, অন্তর্দৃষ্টি এবং স্টাডি গাইড',
  });

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('id, title, title_bn, slug, excerpt, excerpt_bn, cover_image_url, author_name, author_name_bn, author_avatar_url, is_featured, published_at, keywords')
        .eq('is_published', true)
        .order('is_featured', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(6);
      if (data) setPosts(data as unknown as BlogPost[]);
      setLoading(false);
    };
    fetchPosts();
  }, []);

  if (loading || posts.length === 0) return null;

  const featured = posts.find(p => p.is_featured);
  const regularPosts = posts.filter(p => p !== featured).slice(0, 3);

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {isEnglish ? cms.heading : cms.heading_bn}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {isEnglish ? cms.subheading : cms.subheading_bn}
          </p>
        </div>

        <div className="grid gap-8">
          {/* Featured Post */}
          {featured && (
            <Link to={`/blog/${featured.slug}`} className="group block">
              <div className="relative overflow-hidden rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl">
                <div className="grid md:grid-cols-2 gap-0">
                  {featured.cover_image_url ? (
                    <div className="h-64 md:h-80 overflow-hidden">
                      <img
                        src={featured.cover_image_url}
                        alt={isEnglish ? featured.title : featured.title_bn || featured.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="h-64 md:h-80 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <Star className="h-16 w-16 text-primary/40" />
                    </div>
                  )}
                  <div className="p-6 md:p-8 flex flex-col justify-center">
                    <Badge className="w-fit mb-3 gap-1"><Star className="h-3 w-3" /> {isEnglish ? 'Featured' : 'বৈশিষ্ট্যযুক্ত'}</Badge>
                    <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                      {isEnglish ? featured.title : featured.title_bn || featured.title}
                    </h3>
                    {(isEnglish ? featured.excerpt : featured.excerpt_bn || featured.excerpt) && (
                      <p className="text-muted-foreground mb-4 line-clamp-3">
                        {isEnglish ? featured.excerpt : featured.excerpt_bn || featured.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {featured.author_avatar_url ? (
                        <img src={featured.author_avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <span>{isEnglish ? featured.author_name : featured.author_name_bn || featured.author_name}</span>
                      {featured.published_at && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(featured.published_at), 'MMM d, yyyy')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Regular Posts Grid */}
          {regularPosts.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularPosts.map(post => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="group block">
                  <div className="rounded-xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg h-full flex flex-col">
                    {post.cover_image_url ? (
                      <div className="h-48 overflow-hidden">
                        <img
                          src={post.cover_image_url}
                          alt={isEnglish ? post.title : post.title_bn || post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="h-48 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                        <Star className="h-10 w-10 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {isEnglish ? post.title : post.title_bn || post.title}
                      </h3>
                      {(isEnglish ? post.excerpt : post.excerpt_bn || post.excerpt) && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2 flex-1">
                          {isEnglish ? post.excerpt : post.excerpt_bn || post.excerpt}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-3 border-t border-border">
                        <span>{isEnglish ? post.author_name : post.author_name_bn || post.author_name}</span>
                        {post.published_at && (
                          <span>{format(new Date(post.published_at), 'MMM d, yyyy')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* View All Link */}
          <div className="text-center mt-4">
            <Link to="/blog" className="inline-flex items-center gap-2 text-primary font-medium hover:underline">
              {isEnglish ? 'View All Posts' : 'সব পোস্ট দেখুন'} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
