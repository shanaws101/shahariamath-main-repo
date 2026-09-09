import { Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";

interface AuthMobileHeroProps {
  title: string;
  subtitle: string;
  features?: { icon: LucideIcon; label: string }[];
}

/**
 * Mobile-first branded hero for auth pages.
 * Renders ONLY on mobile (<lg). Desktop uses the side panel instead.
 * Emerald gradient with brand logo, big tagline, and feature chips.
 */
export function AuthMobileHero({ title, subtitle, features = [] }: AuthMobileHeroProps) {
  return (
    <div className="lg:hidden relative overflow-hidden bg-gradient-brand text-white px-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-10 rounded-b-[2rem] shadow-lg">
      {/* decorative blobs */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-16 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />

      <Link to="/" className="relative z-10 inline-flex items-center gap-2.5 mb-6">
        <img
          src="/logo.png"
          alt="Shaharia Math"
          className="w-11 h-11 rounded-xl object-contain bg-white/20 backdrop-blur p-1"
          width={44}
          height={44}
        />
        <span className="font-bold text-lg tracking-tight">Shaharia Math</span>
      </Link>

      <h1 className="relative z-10 text-2xl font-extrabold leading-tight tracking-tight mb-2">
        {title}
      </h1>
      <p className="relative z-10 text-white/80 text-sm leading-relaxed">{subtitle}</p>

      {features.length > 0 && (
        <div className="relative z-10 mt-5 flex flex-wrap gap-2">
          {features.map((f) => (
            <div
              key={f.label}
              className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-xs font-medium"
            >
              <f.icon className="h-3.5 w-3.5" />
              {f.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
