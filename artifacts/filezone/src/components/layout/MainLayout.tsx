import { ReactNode, useEffect, useState } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

interface PublicSettings {
  maintenance_mode?: string;
  maintenance_message?: string;
  maintenance_paths?: string;
  hidden_pages?: string;
  site_title?: string;
  title_animation?: string;
  website_animations?: string;
  footer_copyright?: string;
  analytics_code?: string;
}

function injectHeaderCode(htmlCode: string) {
  if (!htmlCode) return;

  // Remove previously injected analytics scripts to avoid duplicates
  const existingScripts = document.querySelectorAll("[data-analytics-script]");
  existingScripts.forEach(el => el.remove());

  // Use DOMParser to parse the HTML string
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${htmlCode}</div>`, "text/html");
  const children = doc.body.firstChild?.childNodes;

  if (!children) return;

  children.forEach(node => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.tagName.toLowerCase() === "script") {
        const script = document.createElement("script");
        script.setAttribute("data-analytics-script", "true");
        
        // Copy all attributes
        Array.from(el.attributes).forEach(attr => {
          script.setAttribute(attr.name, attr.value);
        });
        
        // Copy inner content
        script.textContent = el.textContent;
        document.head.appendChild(script);
      } else {
        // For other header tags (like <link>, <meta>), clone and append
        const clone = el.cloneNode(true) as HTMLElement;
        clone.setAttribute("data-analytics-script", "true");
        document.head.appendChild(clone);
      }
    }
  });
}

export function MainLayout({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PublicSettings>({});
  const [location] = useLocation();

  useEffect(() => {
    if (!sessionStorage.getItem("visit_tracked")) {
      fetch("/api/visit", { method: "POST" }).catch(() => {});
      sessionStorage.setItem("visit_tracked", "1");
    }
    fetch("/api/public-settings", { cache: "no-store" })
      .then(r => r.json())
      .then((d: PublicSettings) => setSettings(d))
      .catch(() => {});
  }, []);

  // Inject Google Analytics / Header Code
  useEffect(() => {
    if (settings.analytics_code) {
      injectHeaderCode(settings.analytics_code);
    }
  }, [settings.analytics_code]);

  // Scroll to top on page navigation
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location]);

  // Dynamic Animated Tab Title
  useEffect(() => {
    const animation = settings.title_animation ?? "none";
    if (animation === "none") return;

    let intervalId: any;
    // Wait a brief moment for the page-specific SEO component to write the title
    const timerId = setTimeout(() => {
      const baseTitle = document.title || settings.site_title || "5toolbox";
      
      if (animation === "scrolling") {
        let txt = baseTitle + " · 100% Free & Local · ";
        intervalId = setInterval(() => {
          txt = txt.substring(1) + txt.substring(0, 1);
          document.title = txt;
        }, 300);
      } else if (animation === "typing") {
        let i = 0;
        let direction = 1;
        intervalId = setInterval(() => {
          if (direction === 1) {
            document.title = baseTitle.substring(0, i + 1) + "_";
            i++;
            if (i >= baseTitle.length) {
              direction = -1;
            }
          } else {
            document.title = baseTitle.substring(0, i) + "_";
            i--;
            if (i <= 0) {
              direction = 1;
            }
          }
        }, 300);
      } else if (animation === "bounce") {
        const messages = [baseTitle, "🚀 100% Free Tools", "🔒 Secure & Local", "✨ Free Web Utilities"];
        let idx = 0;
        intervalId = setInterval(() => {
          document.title = messages[idx];
          idx = (idx + 1) % messages.length;
        }, 3000);
      }
    }, 1000);

    return () => {
      clearTimeout(timerId);
      clearInterval(intervalId);
    };
  }, [settings.title_animation, settings.site_title, children]);

  const hiddenPages = (settings.hidden_pages ?? "").split(",").map(s => s.trim()).filter(Boolean);
  const animationsEnabled = settings.website_animations !== "false";

  const isMaintEnabled = settings.maintenance_mode === "true";
  const maintPaths = (settings.maintenance_paths ?? "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

  let isMaintActive = false;
  if (isMaintEnabled) {
    if (maintPaths.length === 0) {
      isMaintActive = true;
    } else {
      isMaintActive = maintPaths.some(p => location.toLowerCase().includes(p) || p === location.toLowerCase());
    }
  }

  if (isMaintActive) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center px-4">
        <div className="max-w-md text-center space-y-6">
          <div className="inline-flex p-5 rounded-2xl bg-amber-100 mb-2">
            <Wrench className="h-10 w-10 text-amber-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Under Maintenance</h1>
          <p className="text-muted-foreground text-lg">
            {settings.maintenance_message || "We're performing scheduled maintenance. We'll be back soon!"}
          </p>
          <p className="text-sm text-muted-foreground">— The 5toolbox Team</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar hiddenPages={hiddenPages} />
      <main className="flex-1">
        <div key={location} className={cn(animationsEnabled && "animate-fade-in-up")}>
          {children}
        </div>
      </main>
      <Footer hiddenPages={hiddenPages} copyright={settings.footer_copyright} />
    </div>
  );
}
