import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Menu, X, Globe, Shield } from 'lucide-react';
import { useCmsContent } from '@/hooks/useCmsContent';
import { CartDrawer } from '@/components/cart/CartDrawer';

export function Header() {
  const { isEnglish, setLanguage } = useLanguage();
  const { user, isAdmin } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navCms = useCmsContent('navbar', {
    home: 'Home', home_bn: 'হোম',
    subjects: 'Courses', subjects_bn: 'কোর্সসমূহ',
    bundles: 'Bundles', bundles_bn: 'বান্ডেল',
    pdf_suggestions: 'PDF Suggestion', pdf_suggestions_bn: 'পিডিএফ সাজেশন',
    free_classes: 'Free Classes', free_classes_bn: 'ফ্রি ক্লাস',
    about: 'About', about_bn: 'আমাদের সম্পর্কে',
  });

  const btnCms = useCmsContent('navbar_buttons', {
    login: 'Login', login_bn: 'লগইন',
    join: 'Enroll Now', join_bn: 'ভর্তি হন',
    dashboard: 'Dashboard', dashboard_bn: 'ড্যাশবোর্ড',
    brand_name: 'Shaharia Math', brand_name_bn: 'শাহরিয়া ম্যাথ',
  });

  const loginMethod = typeof window !== 'undefined' ? sessionStorage.getItem('login_method') : null;
  const showAdminUI = isAdmin && loginMethod === 'email';

  const navLinks = [
    { href: '/', label: isEnglish ? navCms.home : navCms.home_bn },
    { href: '/subjects', label: isEnglish ? navCms.subjects : navCms.subjects_bn },
    { href: '/bundles', label: isEnglish ? navCms.bundles : navCms.bundles_bn },
    { href: '/pdf-suggestions', label: isEnglish ? (navCms.pdf_suggestions || 'PDF Suggestion') : (navCms.pdf_suggestions_bn || 'পিডিএফ সাজেশন') },
    { href: '/free-classes', label: isEnglish ? navCms.free_classes : navCms.free_classes_bn },
  ];

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  const toggleLanguage = () => {
    setLanguage(isEnglish ? 'bn' : 'en');
  };

  const loginLabel = isEnglish ? btnCms.login : btnCms.login_bn;
  const joinLabel = isEnglish ? btnCms.join : btnCms.join_bn;
  const dashLabel = isEnglish ? btnCms.dashboard : btnCms.dashboard_bn;
  const brandName = isEnglish ? btnCms.brand_name : btnCms.brand_name_bn;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5">
              <img src="/logo.png" alt="Shaharia Math" className="w-9 h-9 rounded-xl object-contain" width={36} height={36} />
              <span className="font-extrabold text-lg hidden sm:inline-block tracking-tight font-display">
                {brandName}
              </span>
            </Link>
            {showAdminUI && (
              <Link to="/admin" className="flex items-center gap-1.5">
                <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1 text-xs font-semibold">
                  <Shield className="h-3 w-3" />
                  Admin
                </Badge>
              </Link>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-sm font-semibold tracking-tight transition-colors relative pb-1 ${
                  isActive(link.href)
                    ? 'text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="gap-2 text-muted-foreground"
            >
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">{isEnglish ? 'বাংলা' : 'English'}</span>
            </Button>

            <CartDrawer />

            {user ? (
              showAdminUI ? (
                <Button
                  size="sm"
                  className="hidden md:inline-flex btn-brand gap-1.5"
                  onClick={() => navigate('/admin')}
                >
                  <Shield className="h-3.5 w-3.5" />
                  {isEnglish ? 'Admin Panel' : 'অ্যাডমিন প্যানেল'}
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="hidden md:inline-flex"
                  onClick={() => navigate('/dashboard')}
                >
                  {dashLabel}
                </Button>
              )
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden md:inline-flex"
                  onClick={() => navigate('/login')}
                >
                  {loginLabel}
                </Button>
                <Button
                  size="sm"
                  className="hidden md:inline-flex btn-brand"
                  onClick={() => navigate('/join')}
                >
                  {joinLabel}
                </Button>
              </>
            )}

            {!user && (
              <Button
                size="sm"
                className="md:hidden btn-brand text-xs px-3"
                onClick={() => navigate('/login')}
              >
                {loginLabel}
              </Button>
            )}
            {user && !showAdminUI && (
              <Button
                size="sm"
                className="md:hidden text-xs px-3"
                onClick={() => navigate('/dashboard')}
              >
                {dashLabel}
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t py-4">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive(link.href)
                      ? 'text-primary bg-primary/10 font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="border-t my-2" />
              {user ? (
                showAdminUI ? (
                  <Button
                    className="btn-brand gap-1.5"
                    onClick={() => { navigate('/admin'); setIsMenuOpen(false); }}
                  >
                    <Shield className="h-3.5 w-3.5" />
                    {isEnglish ? 'Admin Panel' : 'অ্যাডমিন প্যানেল'}
                  </Button>
                ) : (
                  <Button onClick={() => { navigate('/dashboard'); setIsMenuOpen(false); }}>
                    {dashLabel}
                  </Button>
                )
              ) : (
                <>
                  <Button variant="ghost" className="justify-start" onClick={() => { navigate('/login'); setIsMenuOpen(false); }}>
                    {loginLabel}
                  </Button>
                  <Button className="btn-brand" onClick={() => { navigate('/join'); setIsMenuOpen(false); }}>
                    {joinLabel}
                  </Button>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
