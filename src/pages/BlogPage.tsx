import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'react-router-dom';
import { Calendar, User, Star, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

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

export default function BlogPage() {
  const { isEnglish } = useLanguage();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('id, title, title_bn, slug, excerpt, excerpt_bn, cover_image_url, author_name, author_name_bn, author_avatar_url, is_featured, published_at, keywords')
        .eq('is_published', true)
        .order('is_featured', { ascending: false })
        .order('published_at', { ascending: false });
      if (data) setPosts(data as unknown as BlogPost[]);
      setLoading(false);
    };
    fetchPosts();
  }, []);

  const filtered = posts.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.title.toLowerCase().includes(q) || (p.title_bn && p.title_bn.includes(q)) ||
      p.keywords.some(k => k.toLowerCase().includes(q));
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative py-16 md:py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
          <div className="container mx-auto px-4 relative">
            <div className="text-center max-w-2xl mx-auto">
              <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight mb-3">
                {isEnglish ? 'Blog' : 'ব্লগ'}
              </h1>
              <p className="text-muted-foreground mb-8">
                {isEnglish ? 'Educational insights, study tips, and updates' : 'শিক্ষামূলক অন্তর্দৃষ্টি, স্টাডি টিপস এবং আপডেট'}
              </p>
              <div className="max-w-md mx-auto relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder={isEnglish ? 'Search posts...' : 'পোস্ট খুঁজুন...'} 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  className="pl-11 h-12 rounded-2xl border-border/60 bg-card shadow-sm"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Posts Grid */}
        <section className="pb-16 md:pb-20">
          <div className="container mx-auto px-4">
            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-2xl bg-muted animate-pulse h-80" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                {isEnglish ? 'No blog posts found.' : 'কোনো ব্লগ পোস্ট পাওয়া যায়নি।'}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map(post => (
                  <Link key={post.id} to={`/blog/${post.slug}`} className="group block">
                    <div className="rounded-2xl overflow-hidden bg-card border border-border/60 hover:border-primary/40 transition-all duration-300 hover:shadow-lg h-full flex flex-col">
                      {post.cover_image_url ? (
                        <div className="h-48 overflow-hidden">
                          <img src={post.cover_image_url} alt={isEnglish ? post.title : post.title_bn || post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                      ) : (
                        <div className="h-48 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                          <Star className="h-10 w-10 text-primary/20" />
                        </div>
                      )}
                      <div className="p-5 flex-1 flex flex-col">
                        {post.is_featured && (
                          <Badge className="w-fit mb-2 gap-1 bg-primary/10 text-primary border-primary/20 text-[10px]">
                            <Star className="h-3 w-3" /> Featured
                          </Badge>
                        )}
                        <h2 className="font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2 tracking-tight">
                          {isEnglish ? post.title : post.title_bn || post.title}
                        </h2>
                        {(isEnglish ? post.excerpt : post.excerpt_bn || post.excerpt) && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-3 flex-1">
                            {isEnglish ? post.excerpt : post.excerpt_bn || post.excerpt}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto pt-3 border-t border-border/60">
                          {post.author_avatar_url ? (
                            <img src={post.author_avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-3 w-3 text-primary" />
                            </div>
                          )}
                          <span>{isEnglish ? post.author_name : post.author_name_bn || post.author_name}</span>
                          {post.published_at && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(post.published_at), 'MMM d, yyyy')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
