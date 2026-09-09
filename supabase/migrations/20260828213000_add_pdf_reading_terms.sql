-- Migration: Add reading_terms_title and reading_terms to pdf_suggestions
ALTER TABLE public.pdf_suggestions
ADD COLUMN IF NOT EXISTS reading_terms_title TEXT DEFAULT '📚 PDF বই পড়ার শর্তাবলি',
ADD COLUMN IF NOT EXISTS reading_terms TEXT;
