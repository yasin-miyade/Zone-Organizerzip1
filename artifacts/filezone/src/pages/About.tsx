import { Shield, Zap, Globe, Lock, FileText, Image, RefreshCw, Calculator, AlignLeft, Users, Award, Heart } from "lucide-react";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Shield, title: "Privacy First", desc: "Your files never leave your browser. All processing happens locally on your device — nothing is ever uploaded to our servers. We have no access to your files." },
  { icon: Zap, title: "Lightning Fast", desc: "Powered by WebAssembly and modern browser APIs, 5toolbox processes files in seconds without any waiting, queues, or server round-trips." },
  { icon: Globe, title: "Works Everywhere", desc: "No installation, no account, no app required. 5toolbox runs in any modern browser on any device — desktop, tablet, or mobile — for free." },
  { icon: Lock, title: "Always Free", desc: "All 50+ tools are completely free to use with no sign-up, no limits, no watermarks, and no hidden paywalls. Our tools are supported by non-intrusive ads." },
];

const toolCategories = [
  { icon: FileText, label: "PDF Tools", count: 11, href: "/pdf", color: "bg-red-50 text-red-600" },
  { icon: Image, label: "Image Tools", count: 10, href: "/image", color: "bg-blue-50 text-blue-600" },
  { icon: RefreshCw, label: "Converters", count: 7, href: "/convert", color: "bg-violet-50 text-violet-600" },
  { icon: Calculator, label: "Calculators", count: 15, href: "/calculator", color: "bg-amber-50 text-amber-600" },
  { icon: AlignLeft, label: "Text Tools", count: 5, href: "/text", color: "bg-emerald-50 text-emerald-600" },
];

const stats = [
  { value: "50+", label: "Free Tools" },
  { value: "100%", label: "Browser-Based" },
  { value: "0", label: "Uploads Required" },
  { value: "Free", label: "Always" },
];

export function About() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <SEO
        title="About 5toolbox — Free Browser-Based File Tools"
        description="5toolbox is a free, privacy-first browser-based file toolkit by Yasin Miyade. 50+ tools including PDF merge, image compress, converters, calculators — no uploads, no sign-up, all processing in your browser."
        keywords="about 5toolbox, yasin miyade, file tools, privacy first, pdf tools, image tools, free online tools"
      />

      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-5">
          <Heart className="h-4 w-4" /> Made with care for everyone
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">About 5toolbox</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          5toolbox is a completely free, privacy-first online toolkit for everyday file tasks. Merge PDFs, compress images, convert files, generate QR codes — all without installing anything or uploading files to a server.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16">
        {stats.map(s => (
          <div key={s.label} className="text-center p-5 rounded-2xl border bg-card">
            <p className="text-3xl font-bold text-primary mb-1">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Mission */}
      <div className="p-8 rounded-2xl border bg-card mb-12">
        <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          5toolbox was created with one simple goal: give everyone access to powerful file processing tools without the frustration of sign-ups, subscriptions, file uploads, or watermarks. We believe privacy and convenience should not be in conflict.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Every tool on 5toolbox runs entirely in your browser using modern web technologies like WebAssembly. This means your files <strong>never leave your device</strong>, processing is <strong>instant</strong>, and the tools work even <strong>offline</strong> once loaded. We store only anonymous, aggregate usage counts — never your files or personal data.
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
        {features.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="p-6 rounded-2xl border bg-card flex gap-4">
            <div className="p-3 rounded-xl bg-primary/10 h-fit shrink-0">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tool categories */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-2 text-center">50+ Free Tools Across 5 Categories</h2>
        <p className="text-muted-foreground text-center mb-8">Every tool is free, no sign-up required</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {toolCategories.map(({ icon: Icon, label, count, href, color }) => (
            <Link key={href} href={href}>
              <div className="group p-5 rounded-2xl border bg-card hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer text-center">
                <div className={`inline-flex p-3 rounded-xl ${color} bg-opacity-60 mb-3`}>
                  <Icon className="h-6 w-6" />
                </div>
                <p className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">{label}</p>
                <p className="text-xs text-muted-foreground">{count} tools</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Creator */}
      <div className="p-8 rounded-2xl border bg-card mb-12">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-primary/10 shrink-0">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Built by Yasin Miyade</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              5toolbox is an independent project built and maintained by <strong>Yasin Miyade</strong>. The goal was to create a truly free, no-nonsense file toolkit that respects user privacy and works for everyone regardless of their technical skill level.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              If you find 5toolbox useful, the best way to support it is to share it with others and allow ads to run — that's how we keep the lights on and everything free.
            </p>
          </div>
        </div>
      </div>

      {/* AdSense compliance section */}
      <div className="p-8 rounded-2xl border bg-muted/30 mb-12">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 shrink-0">
            <Award className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-2">Content Policy</h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              5toolbox processes all files on the user's device. We do not have access to, store, or transmit any user files. Our tools are designed for legitimate, lawful file management tasks. We do not facilitate illegal content, copyright infringement, or harmful activities. All content on 5toolbox is original and created to genuinely help users with their file management needs.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-3">Ready to get started?</h2>
        <p className="text-muted-foreground mb-6">Try any of our 50+ free tools — no sign-up, no limits.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button size="lg" className="px-8">Explore All Tools</Button>
          </Link>
          <Link href="/contact">
            <Button size="lg" variant="outline" className="px-8">Contact Us</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
