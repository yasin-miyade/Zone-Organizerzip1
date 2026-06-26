import { useState, useEffect } from "react";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import { BookOpen, Calendar, Clock, Eye, FileText, Search, User } from "lucide-react";

interface Blog {
  id: number;
  slug: string;
  title: string;
  summary: string;
  coverImage: string | null;
  authorName: string;
  readTime: number;
  tags: string[];
  category: string;
  views: number;
  publishedAt: string;
}

interface Article {
  id: number;
  slug: string;
  title: string;
  summary: string;
  authorName: string;
  readTime: number;
  views: number;
  publishedAt: string;
}

export function BlogIndex() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [blogsRes, articlesRes] = await Promise.all([
          fetch("/api/blogs").then(res => res.json()),
          fetch("/api/articles").then(res => res.json())
        ]);
        setBlogs(Array.isArray(blogsRes) ? blogsRes : []);
        setArticles(Array.isArray(articlesRes) ? articlesRes : []);
      } catch (err) {
        console.error("Error fetching blogs/articles:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const categories = ["All", ...Array.from(new Set(blogs.map(b => b.category)))];

  const filteredBlogs = blogs.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.summary.toLowerCase().includes(search.toLowerCase()) ||
      b.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategory === "All" || b.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredArticles = articles.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.summary.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <SEO
        title="Official Blog — 5toolbox"
        description="Learn tips, guides, and updates about PDF processing, image optimization, developer tools, and local web utility processing on the 5toolbox blog."
        keywords="5toolbox blog, file tools blog, pdf compression guides, image editing tips, local conversion, developer utilities"
      />

      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
          <BookOpen className="h-4 w-4" /> 5toolbox Knowledge Hub
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-4 sm:text-5xl">Blog &amp; Knowledge Base</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Deep guides, useful workflows, and technical details to get the most out of our 100% client-side file tools.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-10">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search blogs or guides..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors ${
                selectedCategory === c
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Blogs Section */}
          <div className="lg:col-span-2 space-y-8">
            <h2 className="text-2xl font-bold border-b pb-2 mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Blog Posts
            </h2>

            {filteredBlogs.length === 0 ? (
              <div className="text-center py-12 border rounded-xl bg-card">
                <p className="text-muted-foreground">No blog posts found matching your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredBlogs.map(post => (
                  <article key={post.id} className="flex flex-col bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                    <Link href={`/blog/${post.slug}`} className="block overflow-hidden relative aspect-video bg-muted">
                      {post.coverImage ? (
                        <img
                          src={post.coverImage}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary">
                          <BookOpen className="h-10 w-10 opacity-40" />
                        </div>
                      )}
                      <span className="absolute top-3 left-3 bg-background/90 backdrop-blur text-primary text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border">
                        {post.category}
                      </span>
                    </Link>

                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {new Date(post.publishedAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {post.readTime} min read
                        </span>
                      </div>

                      <h3 className="font-bold text-lg leading-tight mb-2 group-hover:text-primary transition-colors">
                        <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                      </h3>

                      <p className="text-muted-foreground text-sm line-clamp-3 mb-4 flex-1">
                        {post.summary}
                      </p>

                      <div className="border-t pt-4 mt-auto flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" /> {post.authorName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" /> {post.views} views
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar / In-depth Guides Section */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold border-b pb-2 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Technical Guides
            </h2>

            {filteredArticles.length === 0 ? (
              <div className="text-center py-8 border rounded-xl bg-card">
                <p className="text-muted-foreground">No technical articles found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredArticles.map(article => (
                  <div key={article.id} className="p-4 border rounded-xl bg-card hover:bg-muted/40 transition-colors group">
                    <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Technical Article
                    </span>
                    <h3 className="font-bold text-md mt-2 group-hover:text-primary transition-colors">
                      <Link href={`/articles/${article.slug}`}>{article.title}</Link>
                    </h3>
                    <p className="text-muted-foreground text-xs line-clamp-2 mt-1 mb-3">
                      {article.summary}
                    </p>
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {article.readTime} min read
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
