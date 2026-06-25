import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "fz_cookie_consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(STORAGE_KEY);
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(STORAGE_KEY, "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 animate-in slide-in-from-bottom-4 duration-300">
      <div className="max-w-4xl mx-auto bg-card border rounded-2xl shadow-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Cookie className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm mb-1">We use cookies</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We use cookies to display ads and improve your experience. By clicking "Accept", you consent to our use of cookies.{" "}
              <Link href="/cookie-policy" className="text-primary hover:underline">Learn more</Link>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={decline} className="flex-1 sm:flex-none">
            Decline
          </Button>
          <Button size="sm" onClick={accept} className="flex-1 sm:flex-none">
            Accept All
          </Button>
          <button onClick={decline} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
