import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, ChevronRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

interface Bundle {
  id: string;
  title: string;
  title_bn: string | null;
  price: number;
  original_price: number | null;
  cover_image_url: string | null;
  department: string | null;
  year: number | null;
}

export function PaidBatchesRow() {
  const { isEnglish } = useLanguage();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("bundles")
        .select("id, title, title_bn, price, original_price, cover_image_url, department, year")
        .eq("is_visible", true)
        .order("display_order", { ascending: true })
        .limit(6);
      if (data) setBundles(data as Bundle[]);
      setLoading(false);
    })();
  }, []);

  if (!loading && bundles.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-extrabold flex items-center gap-2 tracking-tight">
          <Package className="h-4 w-4 text-primary" />
          {isEnglish ? "Paid Batches" : "পেইড ব্যাচ"}
        </h2>
        <Button variant="ghost" size="sm" asChild className="text-xs gap-1 h-7 rounded-lg">
          <Link to="/bundles">
            {isEnglish ? "All" : "সব"}
            <ChevronRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {[1, 2].map((i) => (
            <div key={i} className="min-w-[260px] h-36 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="-mx-4 px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1">
          {bundles.map((b) => {
            const title = isEnglish ? b.title : b.title_bn || b.title;
            const sellingPrice = b.original_price != null ? Math.min(b.price, b.original_price) : b.price;
            const oldPrice = b.original_price != null ? Math.max(b.price, b.original_price) : null;
            const hasDiscount = oldPrice != null && oldPrice > sellingPrice;
            const discount = hasDiscount
                ? Math.round(((oldPrice - sellingPrice) / oldPrice) * 100)
                : 0;
            return (
              <Link
                key={b.id}
                to={`/bundles/${b.id}`}
                className="min-w-[260px] max-w-[260px] snap-start rounded-2xl border border-border bg-card overflow-hidden active:scale-[0.98] transition-transform"
              >
                <div className="relative h-28 bg-gradient-brand overflow-hidden">
                  {b.cover_image_url ? (
                    <img
                      src={b.cover_image_url}
                      alt={title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      <Package className="h-10 w-10 opacity-80" />
                    </div>
                  )}
                  {discount > 0 && (
                    <Badge className="absolute top-2 right-2 bg-rose-500 text-white border-0 rounded-full text-[10px] font-bold gap-1">
                      <Sparkles className="h-2.5 w-2.5" />
                      {discount}% OFF
                    </Badge>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-sm leading-tight line-clamp-2 mb-1.5">{title}</h3>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-extrabold text-primary">৳{sellingPrice}</span>
                    {hasDiscount && (
                      <span className="text-xs text-muted-foreground line-through">
                        ৳{oldPrice}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
