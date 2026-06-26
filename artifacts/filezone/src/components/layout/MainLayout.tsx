import { ReactNode, useEffect, useState } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

interface PublicSettings {
  maintenance_mode?: string;
  maintenance_message?: string;
  hidden_pages?: string;
  site_title?: string;
  title_animation?: string;
  website_animations?: string;
  footer_copyright?: string;
}

export function MainLayout({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PublicSettings>({});

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
        const messages = [baseTitle, "🚀 100% Free Tools", "🔒 Secure & Local", "✨ 50+ Web Utilities"];
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

  if (settings.maintenance_mode === "true") {
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
      <main className={cn("flex-1", animationsEnabled && "animate-fade-in-up")}>
        {children}
      </main>
      <Footer hiddenPages={hiddenPages} copyright={settings.footer_copyright} />
    </div>
  );
}
