import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Link to="/" className="mb-10 flex items-center gap-2.5">
        <img src="/logo.png" alt="Shaharia Math" className="w-10 h-10 rounded-xl object-contain shadow-sm" width={40} height={40} />
        <span className="font-bold text-xl text-foreground tracking-tight">Shaharia Math</span>
      </Link>
      <div className="text-center max-w-sm">
        <div className="text-7xl font-extrabold text-primary/20 mb-4 tracking-tighter">404</div>
        <h1 className="text-xl font-bold text-foreground mb-2 tracking-tight">Page not found</h1>
        <p className="text-sm text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => window.history.back()} className="gap-2 rounded-xl h-11">
            <ArrowLeft className="h-4 w-4" /> Go Back
          </Button>
          <Link to="/">
            <Button className="gap-2 rounded-xl h-11 w-full bg-gradient-brand hover:opacity-90">
              <Home className="h-4 w-4" /> Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
