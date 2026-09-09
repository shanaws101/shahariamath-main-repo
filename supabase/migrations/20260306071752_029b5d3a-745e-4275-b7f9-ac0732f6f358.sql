
ALTER TABLE public.blog_posts ADD COLUMN view_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_blog_view(post_slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE blog_posts SET view_count = view_count + 1 WHERE slug = post_slug AND is_published = true;
$$;
