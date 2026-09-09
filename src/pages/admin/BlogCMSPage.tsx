import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { AiWriterButton } from '@/components/admin/AiWriterButton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Edit, Trash2, Eye, EyeOff, Star, Search, Calendar,
  Globe, Wand2, CheckCircle, Tag, FileText, Image as ImageIcon, Clock
} from 'lucide-react';
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
  is_published: boolean;
  published_at: string | null;
  scheduled_for: string | null;
  created_at: string;
  updated_at: string;
}

const emptyPost: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'> = {
  title: '', title_bn: null, slug: '', content: '', content_bn: null,
  excerpt: null, excerpt_bn: null, cover_image_url: null, images: [],
  author_name: 'Admin', author_name_bn: null, author_avatar_url: null,
  meta_description: null, meta_description_bn: null, keywords: [],
  is_featured: false, is_published: false, published_at: null, scheduled_for: null,
};

export function BlogCMSPageContent() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [form, setForm] = useState(emptyPost);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [keywordInput, setKeywordInput] = useState('');
  const [activeTab, setActiveTab] = useState('content');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const { toast } = useToast();

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setPosts(data as unknown as BlogPost[]);
    setLoading(false);
  };

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
  };

  const openCreate = () => {
    setEditingPost(null);
    setForm(emptyPost);
    setScheduledDate('');
    setScheduledTime('');
    setDialogOpen(true);
    setActiveTab('content');
  };

  const openEdit = (post: BlogPost) => {
    setEditingPost(post);
    setForm({
      title: post.title, title_bn: post.title_bn, slug: post.slug,
      content: post.content, content_bn: post.content_bn,
      excerpt: post.excerpt, excerpt_bn: post.excerpt_bn,
      cover_image_url: post.cover_image_url, images: post.images || [],
      author_name: post.author_name, author_name_bn: post.author_name_bn,
      author_avatar_url: post.author_avatar_url,
      meta_description: post.meta_description, meta_description_bn: post.meta_description_bn,
      keywords: post.keywords || [], is_featured: post.is_featured,
      is_published: post.is_published, published_at: post.published_at,
      scheduled_for: post.scheduled_for,
    });
    if (post.scheduled_for) {
      const d = new Date(post.scheduled_for);
      setScheduledDate(format(d, 'yyyy-MM-dd'));
      setScheduledTime(format(d, 'HH:mm'));
    } else {
      setScheduledDate('');
      setScheduledTime('');
    }
    setDialogOpen(true);
    setActiveTab('content');
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop();
    const path = `covers/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('blog-images').upload(path, file);
    if (error) { toast({ title: 'Upload failed', variant: 'destructive' }); return; }
    const { data: { publicUrl } } = supabase.storage.from('blog-images').getPublicUrl(path);
    setForm(f => ({ ...f, cover_image_url: publicUrl }));
  };

  const handleAuthorAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop();
    const path = `authors/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('blog-images').upload(path, file);
    if (error) { toast({ title: 'Upload failed', variant: 'destructive' }); return; }
    const { data: { publicUrl } } = supabase.storage.from('blog-images').getPublicUrl(path);
    setForm(f => ({ ...f, author_avatar_url: publicUrl }));
  };

  const handleAdditionalImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop();
      const path = `gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('blog-images').upload(path, file);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('blog-images').getPublicUrl(path);
        urls.push(publicUrl);
      }
    }
    setForm(f => ({ ...f, images: [...f.images, ...urls] }));
  };

  const removeImage = (index: number) => {
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !form.keywords.includes(keywordInput.trim())) {
      setForm(f => ({ ...f, keywords: [...f.keywords, keywordInput.trim()] }));
      setKeywordInput('');
    }
  };

  const removeKeyword = (kw: string) => {
    setForm(f => ({ ...f, keywords: f.keywords.filter(k => k !== kw) }));
  };

  const handleSave = async (publishNow?: boolean) => {
    if (!form.title || !form.slug) {
      toast({ title: 'Title and slug are required', variant: 'destructive' });
      return;
    }
    setSaving(true);

    let scheduled_for = null;
    if (scheduledDate && scheduledTime) {
      scheduled_for = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
    }

    const payload: any = {
      title: form.title, title_bn: form.title_bn, slug: form.slug,
      content: form.content, content_bn: form.content_bn,
      excerpt: form.excerpt, excerpt_bn: form.excerpt_bn,
      cover_image_url: form.cover_image_url, images: form.images,
      author_name: form.author_name, author_name_bn: form.author_name_bn,
      author_avatar_url: form.author_avatar_url,
      meta_description: form.meta_description, meta_description_bn: form.meta_description_bn,
      keywords: form.keywords, is_featured: form.is_featured,
      scheduled_for,
    };

    if (publishNow) {
      payload.is_published = true;
      payload.published_at = new Date().toISOString();
    } else {
      payload.is_published = form.is_published;
      if (form.is_published && !form.published_at) {
        payload.published_at = new Date().toISOString();
      }
    }

    let error;
    if (editingPost) {
      ({ error } = await supabase.from('blog_posts').update(payload).eq('id', editingPost.id));
    } else {
      ({ error } = await supabase.from('blog_posts').insert(payload));
    }

    if (error) {
      toast({ title: 'Error saving post', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editingPost ? 'Post updated' : 'Post created' });
      setDialogOpen(false);
      fetchPosts();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this blog post?')) return;
    await supabase.from('blog_posts').delete().eq('id', id);
    toast({ title: 'Post deleted' });
    fetchPosts();
  };

  const togglePublish = async (post: BlogPost) => {
    const newStatus = !post.is_published;
    await supabase.from('blog_posts').update({
      is_published: newStatus,
      published_at: newStatus ? new Date().toISOString() : null,
    }).eq('id', post.id);
    fetchPosts();
  };

  const filteredPosts = posts.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.title_bn && p.title_bn.includes(searchQuery));
    if (filterStatus === 'published') return matchesSearch && p.is_published;
    if (filterStatus === 'draft') return matchesSearch && !p.is_published;
    if (filterStatus === 'featured') return matchesSearch && p.is_featured;
    if (filterStatus === 'scheduled') return matchesSearch && p.scheduled_for && !p.is_published;
    return matchesSearch;
  });

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Blog CMS</h1>
            <p className="text-muted-foreground">Manage blog posts with AI-powered writing tools</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> New Post
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search posts..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Posts</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Drafts</SelectItem>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Posts List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filteredPosts.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No blog posts found. Create your first post!</p>
          </CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {filteredPosts.map(post => (
              <Card key={post.id} className="overflow-hidden">
                <div className="flex flex-col sm:flex-row">
                  {post.cover_image_url && (
                    <div className="w-full sm:w-48 h-32 sm:h-auto shrink-0">
                      <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-foreground truncate">{post.title}</h3>
                          {post.is_featured && <Badge variant="default" className="gap-1"><Star className="h-3 w-3" /> Featured</Badge>}
                          {post.is_published ? (
                            <Badge variant="secondary" className="gap-1"><Eye className="h-3 w-3" /> Published</Badge>
                          ) : post.scheduled_for ? (
                            <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Scheduled</Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1"><EyeOff className="h-3 w-3" /> Draft</Badge>
                          )}
                        </div>
                        {post.title_bn && <p className="text-sm text-muted-foreground">{post.title_bn}</p>}
                        <p className="text-sm text-muted-foreground mt-1">
                          By {post.author_name} · {format(new Date(post.created_at), 'MMM d, yyyy')}
                          {post.scheduled_for && !post.is_published && ` · Scheduled: ${format(new Date(post.scheduled_for), 'MMM d, yyyy HH:mm')}`}
                        </p>
                        {post.excerpt && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{post.excerpt}</p>}
                        {post.keywords.length > 0 && (
                          <div className="flex gap-1 flex-wrap mt-2">
                            {post.keywords.map(kw => <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>)}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => togglePublish(post)} title={post.is_published ? 'Unpublish' : 'Publish'}>
                          {post.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(post)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(post.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPost ? 'Edit Blog Post' : 'Create Blog Post'}</DialogTitle>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
                <TabsTrigger value="seo">SEO</TabsTrigger>
                <TabsTrigger value="author">Author</TabsTrigger>
                <TabsTrigger value="publish">Publish</TabsTrigger>
              </TabsList>

              {/* Content Tab */}
              <TabsContent value="content" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Title (English)</Label>
                      <AiWriterButton defaultPrompt="Write a blog title" context="educational blog" onApply={(v) => {
                        setForm(f => ({ ...f, title: v, slug: f.slug || generateSlug(v) }));
                      }} />
                    </div>
                    <Input value={form.title} onChange={e => {
                      const title = e.target.value;
                      setForm(f => ({ ...f, title, slug: !editingPost ? generateSlug(title) : f.slug }));
                    }} placeholder="Blog post title" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Title (বাংলা)</Label>
                      <AiWriterButton defaultPrompt={`Translate to Bengali: ${form.title}`} context="translation" onApply={(v) => setForm(f => ({ ...f, title_bn: v }))} />
                    </div>
                    <Input value={form.title_bn || ''} onChange={e => setForm(f => ({ ...f, title_bn: e.target.value }))} placeholder="ব্লগ পোস্টের শিরোনাম" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="blog-post-slug" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Excerpt (English)</Label>
                      <AiWriterButton defaultPrompt={`Write a short excerpt for: ${form.title}`} context="blog excerpt" onApply={(v) => setForm(f => ({ ...f, excerpt: v }))} />
                    </div>
                    <Textarea value={form.excerpt || ''} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} placeholder="Short summary..." rows={3} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Excerpt (বাংলা)</Label>
                      <AiWriterButton defaultPrompt={`Translate to Bengali: ${form.excerpt || form.title}`} context="translation" onApply={(v) => setForm(f => ({ ...f, excerpt_bn: v }))} />
                    </div>
                    <Textarea value={form.excerpt_bn || ''} onChange={e => setForm(f => ({ ...f, excerpt_bn: e.target.value }))} placeholder="সংক্ষিপ্ত সারাংশ..." rows={3} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Content (English)</Label>
                    <AiWriterButton defaultPrompt={`Write a detailed educational blog post about: ${form.title}`} context="blog content" onApply={(v) => setForm(f => ({ ...f, content: v }))} />
                  </div>
                  <RichTextEditor content={form.content} onChange={(v) => setForm(f => ({ ...f, content: v }))} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Content (বাংলা)</Label>
                    <AiWriterButton defaultPrompt={`Translate this blog content to Bengali: ${form.content?.slice(0, 500)}`} context="translation" onApply={(v) => setForm(f => ({ ...f, content_bn: v }))} />
                  </div>
                  <RichTextEditor content={form.content_bn || ''} onChange={(v) => setForm(f => ({ ...f, content_bn: v }))} />
                </div>
              </TabsContent>

              {/* Media Tab */}
              <TabsContent value="media" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Cover Image</Label>
                  <Input type="file" accept="image/*" onChange={handleCoverUpload} />
                  {form.cover_image_url && (
                    <div className="relative w-full max-w-md">
                      <img src={form.cover_image_url} alt="Cover" className="rounded-lg w-full h-48 object-cover" />
                      <Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => setForm(f => ({ ...f, cover_image_url: null }))}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Additional Images</Label>
                  <Input type="file" accept="image/*" multiple onChange={handleAdditionalImages} />
                  {form.images.length > 0 && (
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                      {form.images.map((url, i) => (
                        <div key={i} className="relative group">
                          <img src={url} alt={`Image ${i + 1}`} className="rounded-lg w-full h-24 object-cover" />
                          <Button variant="destructive" size="sm" className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeImage(i)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <p className="text-xs text-muted-foreground mt-1 truncate">{url.split('/').pop()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Uploaded images can be inserted into content using the editor's image button.</p>
                </div>
              </TabsContent>

              {/* SEO Tab */}
              <TabsContent value="seo" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Meta Description (English)</Label>
                      <AiWriterButton defaultPrompt={`Write SEO meta description for: ${form.title}`} context="seo" onApply={(v) => setForm(f => ({ ...f, meta_description: v }))} />
                    </div>
                    <Textarea value={form.meta_description || ''} onChange={e => setForm(f => ({ ...f, meta_description: e.target.value }))} placeholder="SEO meta description (max 160 chars)" rows={3} maxLength={160} />
                    <p className="text-xs text-muted-foreground">{(form.meta_description || '').length}/160</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Meta Description (বাংলা)</Label>
                      <AiWriterButton defaultPrompt={`Translate to Bengali: ${form.meta_description || form.title}`} context="translation" onApply={(v) => setForm(f => ({ ...f, meta_description_bn: v }))} />
                    </div>
                    <Textarea value={form.meta_description_bn || ''} onChange={e => setForm(f => ({ ...f, meta_description_bn: e.target.value }))} placeholder="SEO মেটা বিবরণ" rows={3} maxLength={160} />
                    <p className="text-xs text-muted-foreground">{(form.meta_description_bn || '').length}/160</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Keywords</Label>
                    <AiWriterButton defaultPrompt={`Suggest 5-8 SEO keywords for: ${form.title}. Return comma-separated.`} context="seo keywords" onApply={(v) => {
                      const kws = v.split(',').map(k => k.trim()).filter(Boolean);
                      setForm(f => ({ ...f, keywords: [...new Set([...f.keywords, ...kws])] }));
                    }} />
                  </div>
                  <div className="flex gap-2">
                    <Input value={keywordInput} onChange={e => setKeywordInput(e.target.value)} placeholder="Add keyword..." onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }} />
                    <Button type="button" variant="outline" onClick={addKeyword}>Add</Button>
                  </div>
                  {form.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {form.keywords.map(kw => (
                        <Badge key={kw} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeKeyword(kw)}>
                          <Tag className="h-3 w-3" />{kw} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Card>
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CheckCircle className="h-4 w-4" /> SEO Checklist</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className={`flex items-center gap-2 ${form.title ? 'text-green-600' : 'text-muted-foreground'}`}>
                      <CheckCircle className="h-3 w-3" /> Title present {form.title && form.title.length <= 60 ? '(✓ good length)' : form.title ? '(⚠ too long)' : ''}
                    </div>
                    <div className={`flex items-center gap-2 ${form.slug ? 'text-green-600' : 'text-muted-foreground'}`}>
                      <CheckCircle className="h-3 w-3" /> Slug defined
                    </div>
                    <div className={`flex items-center gap-2 ${form.meta_description ? 'text-green-600' : 'text-muted-foreground'}`}>
                      <CheckCircle className="h-3 w-3" /> Meta description {form.meta_description && form.meta_description.length <= 160 ? '(✓ good length)' : ''}
                    </div>
                    <div className={`flex items-center gap-2 ${form.keywords.length > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                      <CheckCircle className="h-3 w-3" /> Keywords ({form.keywords.length})
                    </div>
                    <div className={`flex items-center gap-2 ${form.cover_image_url ? 'text-green-600' : 'text-muted-foreground'}`}>
                      <CheckCircle className="h-3 w-3" /> Cover image
                    </div>
                    <div className={`flex items-center gap-2 ${form.excerpt ? 'text-green-600' : 'text-muted-foreground'}`}>
                      <CheckCircle className="h-3 w-3" /> Excerpt
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Author Tab */}
              <TabsContent value="author" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Author Name (English)</Label>
                    <Input value={form.author_name} onChange={e => setForm(f => ({ ...f, author_name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Author Name (বাংলা)</Label>
                    <Input value={form.author_name_bn || ''} onChange={e => setForm(f => ({ ...f, author_name_bn: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Author Avatar</Label>
                  <Input type="file" accept="image/*" onChange={handleAuthorAvatarUpload} />
                  {form.author_avatar_url && (
                    <div className="flex items-center gap-3">
                      <img src={form.author_avatar_url} alt="Author" className="w-16 h-16 rounded-full object-cover" />
                      <Button variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, author_avatar_url: null }))}>Remove</Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Publish Tab */}
              <TabsContent value="publish" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Featured Post</Label>
                    <p className="text-xs text-muted-foreground">Featured posts appear prominently on the blog section</p>
                  </div>
                  <Switch checked={form.is_featured} onCheckedChange={(v) => setForm(f => ({ ...f, is_featured: v }))} />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Schedule Publication</Label>
                  <p className="text-xs text-muted-foreground">Leave empty to publish immediately when clicking "Publish Now"</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
                    <Input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => handleSave(false)} disabled={saving} className="flex-1">
                    {saving ? 'Saving...' : 'Save as Draft'}
                  </Button>
                  <Button onClick={() => handleSave(true)} disabled={saving} className="flex-1">
                    {saving ? 'Publishing...' : scheduledDate ? 'Schedule Post' : 'Publish Now'}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {activeTab !== 'publish' && (
              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => handleSave(false)} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Draft'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

export default function BlogCMSPage() {
  return <AdminLayout requiredPermission="can_manage_cms"><BlogCMSPageContent /></AdminLayout>;
}
