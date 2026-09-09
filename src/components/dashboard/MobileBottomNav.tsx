import { BookOpen, Video, Radio, Bell, Settings } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const navItems = [
  { titleKey: 'dashboard.mySubjects', url: '/dashboard', icon: BookOpen, end: true },
  { titleKey: 'dashboard.freeClasses', url: '/dashboard/free-classes', icon: Video },
  { titleKey: 'dashboard.liveClasses', url: '/live-sessions', icon: Radio },
  { titleKey: 'dashboard.notifications', url: '/dashboard/notifications', icon: Bell },
  { titleKey: 'dashboard.settings', url: '/dashboard/settings', icon: Settings },
];

export function MobileBottomNav() {
  const { t } = useLanguage();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = item.end
            ? location.pathname === item.url
            : location.pathname.startsWith(item.url);

          return (
            <NavLink
              key={item.url}
              to={item.url}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full px-1 transition-all relative",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
              )}
              <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              <span className="text-[10px] font-medium leading-tight truncate max-w-[60px] text-center">
                {t(item.titleKey)}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
