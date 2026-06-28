import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Search, ArrowRight, FileText, Image, RefreshCw, AlignLeft, Zap, Shield, Globe, Clock } from "lucide-react";
import { useListTools, useGetToolStats, useListToolCategories } from "@workspace/api-client-react";
import { ToolCard } from "@/components/ToolCard";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AdBanner } from "@/components/AdBanner";
import { SEO } from "@/components/SEO";

const categoryIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText, Image, RefreshCw, AlignLeft,
};
const categoryColorMap: Record<string, string> = {
  pdf: "from-red-500 to-rose-600",
  image: "from-blue-500 to-indigo-600",
  convert: "from-violet-500 to-purple-600",
  text: "from-emerald-500 to-teal-600",
};

export function Home() {
  const [search, setSearch] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const { data: tools, isLoading: toolsLoading } = useListTools();
  const { data: stats } = useGetToolStats();
  const { data: categories } = useListToolCategories();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("search_history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const addToHistory = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const nextHistory = [trimmed, ...history.filter(h => h !== trimmed)].slice(0, 5);
    setHistory(nextHistory);
    try {
      localStorage.setItem("search_history", JSON.stringify(nextHistory));
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = tools?.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const featured = tools?.filter(t => t.isFeatured).slice(0, 6) ?? [];

  const suggestions = tools?.filter(t =>
    search.length >= 2 &&
    (t.name.toLowerCase().includes(search.toLowerCase()) ||
     t.description.toLowerCase().includes(search.toLowerCase()))
  ).slice(0, 5) ?? [];

  const trendingTerms = ["Compress PDF", "Resize Image", "JPG to PNG", "Base64", "QR Generator"];

  return (
    <div>
      <SEO
        title="Free Online File Tools"
        description="Merge PDFs, compress images, convert files, generate QR codes and more — all free, all in your browser. No uploads, no sign-up, no limits."
        keywords="pdf merge, compress image, file converter, qr generator, online tools, free tools"
      />
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-violet-50/50 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-4 bg-primary/10 text-primary border-0 hover:bg-primary/10">
            100% Free — No sign-up required
          </Badge>
          <h1 className="text-5xl font-bold tracking-tight text-foreground mb-5 leading-tight">
            The Complete Online<br className="hidden sm:block" />
            <span className="text-primary"> File Toolkit</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Merge PDFs, compress images, convert files, and more — all in your browser. No uploads, no limits, no watermarks.
          </p>
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  addToHistory(search);
                }
              }}
              placeholder="Search tools — try 'compress PDF' or 'resize image'…"
              className="pl-10 h-13 rounded-2xl text-base shadow-sm border-border/60"
              data-testid="input-search"
            />
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-card border rounded-2xl shadow-xl overflow-hidden text-left p-3 space-y-3">
                {search.length >= 2 && suggestions.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-0.5 tracking-wider">Suggestions</p>
                    <div className="mt-1 space-y-0.5">
                      {suggestions.map(t => (
                        <Link key={t.slug} href={`/tools/${t.slug}`}>
                          <div
                            onClick={() => addToHistory(t.name)}
                            className="px-2 py-1.5 hover:bg-muted rounded-xl cursor-pointer text-sm font-medium flex justify-between items-center"
                          >
                            <span>{t.name}</span>
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] uppercase font-bold">{t.category}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                
                {history.length > 0 && (
                  <div>
                    <div className="flex justify-between items-center px-2 py-0.5">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Recent Searches</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); setHistory([]); localStorage.removeItem("search_history"); }}
                        className="text-[10px] text-destructive hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {history.map(h => (
                        <div
                          key={h}
                          onClick={() => { setSearch(h); addToHistory(h); }}
                          className="px-2 py-1.5 hover:bg-muted rounded-xl cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
                        >
                          <Clock className="h-3.5 w-3.5 opacity-60" />
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-0.5 tracking-wider">Trending</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {trendingTerms.map(term => (
                      <button
                        key={term}
                        onClick={() => { setSearch(term); addToHistory(term); }}
                        className="text-xs px-2.5 py-1 bg-muted hover:bg-primary/10 hover:text-primary rounded-lg font-medium cursor-pointer transition-colors text-muted-foreground"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>


      {/* Search Results */}
      {search && (
        <section className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-sm text-muted-foreground mb-4">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{search}"
          </p>
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No tools found matching your search.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filtered.map(t => (
                <ToolCard key={t.slug} {...t} usageCount={t.usageCount ?? 0} isFeatured={t.isFeatured ?? false} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Stats Bar */}
      {!search && (
        <section className="border-y bg-muted/30">
          <div className="max-w-5xl mx-auto px-4 py-5 flex flex-wrap justify-center gap-8 text-center">
            <div>
              <p className="text-2xl font-bold text-foreground">{stats ? stats.totalTools : "50"}+</p>
              <p className="text-xs text-muted-foreground">Online Tools</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">100%</p>
              <p className="text-xs text-muted-foreground">Browser-Based</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats ? stats.totalConversions.toLocaleString() : "0"}</p>
              <p className="text-xs text-muted-foreground">Files Processed (100% Local)</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">Free</p>
              <p className="text-xs text-muted-foreground">Always & Forever</p>
            </div>
          </div>
        </section>
      )}

      {!search && (
        <>
          {/* Categories */}
          <section className="max-w-7xl mx-auto px-4 py-14">
            <h2 className="text-2xl font-bold mb-2 text-center">Browse by Category</h2>
            <p className="text-muted-foreground text-center mb-8 text-sm">Pick a category to explore all available tools</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {!categories ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-[218px] rounded-2xl" />
                ))
              ) : (
                categories.map(cat => {
                  const Icon = categoryIconMap[cat.icon] ?? FileText;
                  const gradient = categoryColorMap[cat.slug] ?? "from-gray-500 to-gray-600";
                  const href = `/${cat.slug}`;
                  return (
                    <Link key={cat.slug} href={href} data-testid={`category-card-${cat.slug}`}>
                      <div className="group rounded-2xl p-6 border bg-card hover:shadow-lg transition-all duration-200 cursor-pointer hover:-translate-y-0.5 h-[218px] flex flex-col justify-between">
                        <div>
                          <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${gradient} mb-4`}>
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">{cat.name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{cat.description}</p>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/20">
                          <span className="text-xs text-muted-foreground">{cat.toolCount} tools</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </section>

          {/* Popular Tools */}
          <section className="max-w-7xl mx-auto px-4 pb-8">
            <h2 className="text-2xl font-bold mb-2">Popular Tools</h2>
            <p className="text-muted-foreground mb-6 text-sm">The most-used tools by our community</p>
            {toolsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {featured.map(t => (
                  <ToolCard key={t.slug} {...t} usageCount={t.usageCount ?? 0} isFeatured={t.isFeatured ?? false} />
                ))}
              </div>
            )}
          </section>

          {/* AdSense — responsive banner between popular tools and how-it-works */}
          <section className="max-w-7xl mx-auto px-4 pb-8">
            <AdBanner slot="responsive" />
          </section>

          {/* How it works */}
          <section className="bg-muted/30 border-t py-14">
            <div className="max-w-5xl mx-auto px-4 text-center">
              <h2 className="text-2xl font-bold mb-2">How It Works</h2>
              <p className="text-muted-foreground mb-10 text-sm">Three simple steps, completely in your browser</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { icon: "1", title: "Upload Your File", desc: "Drop your file onto the tool page or click to browse. No size limits, no account needed." },
                  { icon: "2", title: "Choose Options", desc: "Adjust settings specific to each tool — quality, dimensions, password, and more." },
                  { icon: "3", title: "Download Result", desc: "Click the process button and download your result instantly. Your file stays on your device." },
                ].map(step => (
                  <div key={step.icon} className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground text-xl font-bold flex items-center justify-center mb-4 shadow-md">
                      {step.icon}
                    </div>
                    <h3 className="font-semibold mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="max-w-5xl mx-auto px-4 py-14">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: Shield, title: "Private & Secure", desc: "Files are processed locally in your browser. Nothing is ever uploaded to a server." },
                { icon: Zap, title: "Fast Processing", desc: "Powered by WebAssembly — results in seconds, even for large files." },
                { icon: Globe, title: "Works Everywhere", desc: "No installation needed. Works on any device with a modern browser." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-4 p-5 rounded-xl border bg-card">
                  <div className="p-2.5 rounded-lg bg-primary/10 h-fit">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{title}</h3>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
