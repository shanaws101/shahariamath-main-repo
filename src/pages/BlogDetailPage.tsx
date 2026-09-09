import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Calendar, User, ArrowLeft, Tag, Share2, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface BlogPost {
  id: string;
  title: string;
  title_bn: string | null;
  slug: string;
  content: string;
  content_bn: string | null;
  excerpt: string | null;
  excerpt_bn: string | null;
  cover_image_url: string | null;
  images: string[];
  author_name: string;
  author_name_bn: string | null;
  author_avatar_url: string | null;
  meta_description: string | null;
  meta_description_bn: string | null;
  keywords: string[];
  is_featured: boolean;
  published_at: string | null;
  view_count: number;
}

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { isEnglish } = useLanguage();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) return;
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();
      if (data) {
        setPost(data as unknown as BlogPost);
        supabase.rpc('increment_blog_view', { post_slug: slug });
      }
      setLoading(false);
    };
    fetchPost();
  }, [slug]);

  useEffect(() => {
    if (post) {
      const title = isEnglish ? post.title : post.title_bn || post.title;
      document.title = `${title} | Shaharia Math Blog`;
      const metaDesc = isEnglish ? post.meta_description : post.meta_description_bn || post.meta_description;
      if (metaDesc) {
        let meta = document.querySelector('meta[name="description"]');
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('name', 'description');
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', metaDesc);
      }
    }
  }, [post, isEnglish]);

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: isEnglish ? post?.title : post?.title_bn || post?.title,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-extrabold mb-4 tracking-tight">{isEnglish ? 'Post not found' : 'পোস্ট পাওয়া যায়নি'}</h1>
            <Link to="/blog">
              <Button variant="outline" className="gap-2 rounded-xl">
                <ArrowLeft className="h-4 w-4" /> {isEnglish ? 'Back to Blog' : 'ব্লগে ফিরুন'}
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const title = isEnglish ? post.title : post.title_bn || post.title;
  const content = isEnglish ? post.content : post.content_bn || post.content;
  const authorName = isEnglish ? post.author_name : post.author_name_bn || post.author_name;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Cover Image */}
        {post.cover_image_url && (
          <div className="w-full h-64 md:h-[400px] overflow-hidden relative">
            <img src={post.cover_image_url} alt={title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
          </div>
        )}

        <article className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
          {/* Back Link */}
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> {isEnglish ? 'Back to Blog' : 'ব্লগে ফিরুন'}
          </Link>

          {/* Post Header */}
          <header className="mb-8">
            {post.is_featured && (
              <Badge className="mb-3 bg-primary/10 text-primary border-primary/20 text-xs">Featured</Badge>
            )}
            <h1 className="text-2xl md:text-4xl font-extrabold text-foreground mb-5 tracking-tight leading-tight">{title}</h1>

            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-3">
                {post.author_avatar_url ? (
                  <img src={post.author_avatar_url} alt={authorName} className="w-10 h-10 rounded-full object-cover ring-2 ring-border" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-foreground text-sm">{authorName}</p>
                  {post.published_at && (
                    <p className="text-xs flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(post.published_at), 'MMMM d, yyyy')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 ml-auto">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Eye className="h-3 w-3" /> {post.view_count} {isEnglish ? 'views' : 'বার পড়া হয়েছে'}
                </span>
                <Button variant="outline" size="sm" onClick={handleShare} className="gap-2 rounded-xl h-8">
                  <Share2 className="h-3.5 w-3.5" /> {isEnglish ? 'Share' : 'শেয়ার'}
                </Button>
              </div>
            </div>
            {post.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {post.keywords.map(kw => (
                  <Badge key={kw} variant="outline" className="text-xs gap-1 rounded-lg">
                    <Tag className="h-3 w-3" /> {kw}
                  </Badge>
                ))}
              </div>
            )}
          </header>

          {/* Content */}
          <div
            className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight prose-p:text-muted-foreground prose-a:text-primary prose-img:rounded-2xl"
            dangerouslySetInnerHTML={{ __html: content }}
          />

          {/* Additional Images Gallery */}
          {post.images && post.images.length > 0 && (
            <div className="mt-12">
              <h3 className="text-lg font-bold mb-4 tracking-tight">{isEnglish ? 'Gallery' : 'গ্যালারি'}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {post.images.map((url, i) => (
                  <img key={i} src={url} alt={`${title} - ${i + 1}`} className="rounded-2xl w-full h-48 object-cover" />
                ))}
              </div>
            </div>
          )}
        </article>
      </main>
      <Footer />
    </div>
  );
}
