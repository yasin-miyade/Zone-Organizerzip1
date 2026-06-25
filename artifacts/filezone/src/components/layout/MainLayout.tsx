import { ReactNode, useEffect, useState } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { Wrench } from "lucide-react";

export function MainLayout({ children }: { children: ReactNode }) {
  const [maintenance, setMaintenance] = useState<{ on: boolean; msg: string }>({ on: false, msg: "" });

  useEffect(() => {
    if (!sessionStorage.getItem("visit_tracked")) {
      fetch("/api/visit", { method: "POST" }).catch(() => {});
      sessionStorage.setItem("visit_tracked", "1");
    }
    fetch("/api/public-settings")
      .then(r => r.json())
      .then((d: Record<string, string>) => {
        if (d.maintenance_mode === "true") {
          setMaintenance({
            on: true,
            msg: d.maintenance_message || "We're performing scheduled maintenance. We'll be back soon!",
          });
        }
      })
      .catch(() => {});
  }, []);

  if (maintenance.on) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center px-4">
        <div className="max-w-md text-center space-y-6">
          <div className="inline-flex p-5 rounded-2xl bg-amber-100 mb-2">
            <Wrench className="h-10 w-10 text-amber-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Under Maintenance</h1>
          <p className="text-muted-foreground text-lg">{maintenance.msg}</p>
          <p className="text-sm text-muted-foreground">— The FileZone Team</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
