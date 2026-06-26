import { ReactNode, useEffect, useState } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { Wrench } from "lucide-react";

interface PublicSettings {
  maintenance_mode?: string;
  maintenance_message?: string;
  hidden_pages?: string;
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

  const hiddenPages = (settings.hidden_pages ?? "").split(",").map(s => s.trim()).filter(Boolean);

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
      <main className="flex-1">
        {children}
      </main>
      <Footer hiddenPages={hiddenPages} />
    </div>
  );
}
