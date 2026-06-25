import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Layers, Image as ImageIcon, FileText, ArrowRightLeft, Info, Calculator, AlignLeft, Menu, X, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

const allNavItems = [
  { href: "/pdf",        label: "PDF Tools",   icon: FileText,        key: "pdf" },
  { href: "/image",      label: "Image Tools",  icon: ImageIcon,       key: "image" },
  { href: "/convert",    label: "Convert",      icon: ArrowRightLeft,  key: "convert" },
  { href: "/calculator", label: "Calculators",  icon: Calculator,      key: "calculator" },
  { href: "/text",       label: "Text Tools",   icon: AlignLeft,       key: "text" },
  { href: "/about",      label: "About",        icon: Info,            key: "about" },
  { href: "/faq",        label: "FAQ",          icon: Info,            key: "faq" },
];

export function Navbar({ hiddenPages = [] }: { hiddenPages?: string[] }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setOpen(false); }, [location]);
  useEffect(() => { setMounted(true); }, []);

  const navItems = allNavItems.filter(item => !hiddenPages.includes(item.key));

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="bg-primary p-1.5 rounded-lg">
            <Layers className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl tracking-tight">FileZone</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors",
                location === href || location.startsWith(href + "/")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </Link>
          ))}
        </nav>

        {/* Right action container */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Toggle Theme"
          >
            {mounted && theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={() => setOpen(o => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t bg-background/98 backdrop-blur px-4 py-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                location === href || location.startsWith(href + "/")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
