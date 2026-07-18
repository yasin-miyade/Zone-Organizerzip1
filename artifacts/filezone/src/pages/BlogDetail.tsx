import { useState, useEffect } from "react";
import { Link, useRoute } from "wouter";
import { SEO } from "@/components/SEO";
import { StructuredData } from "@/components/StructuredData";
import {
  Calendar,
  Clock,
  Eye,
  User,
  Heart,
  Bookmark,
  Share2,
  ChevronLeft,
  Send,
  MessageSquare,
  Facebook,
  Twitter,
  Linkedin,
  Link as LinkIcon,
  Check,
  Github,
  Youtube,
  Instagram
} from "lucide-react";

interface Blog {
  id: number;
  slug: string;
  title: string;
  content: string;
  summary: string;
  coverImage: string | null;
  authorName: string;
  readTime: number;
  tags: string[];
  category: string;
  views: number;
  likes: number;
  publishedAt: string;
  socialLinks?: { platform: string; url: string }[];
}

interface Comment {
  id: number;
  userName: string;
  content: string;
  createdAt: string;
}

export function BlogDetail() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug ?? "";

  const [blog, setBlog] = useState<Blog | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);

  // Comment Form State
  const [userName, setUserName] = useState("");
  const [content, setContent] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState("");

  useEffect(() => {
    if (!slug) return;
    async function fetchBlogAndComments() {
      try {
        setLoading(true);
        const [blogRes, commentsRes] = await Promise.all([
          fetch(`/api/blogs/${slug}`).then(res => {
            if (!res.ok) throw new Error("Blog not found");
            return res.json();
          }),
          fetch(`/api/comments/blog/${slug}`).then(res => res.json())
        ]);
        setBlog(blogRes);
        setComments(Array.isArray(commentsRes) ? commentsRes : []);

        // Load like/bookmark state from localStorage
        const likedBlogs = JSON.parse(localStorage.getItem("liked_blogs") ?? "[]");
        setLiked(likedBlogs.includes(slug));

        const bookmarkedBlogs = JSON.parse(localStorage.getItem("bookmarked_blogs") ?? "[]");
        setBookmarked(bookmarkedBlogs.includes(slug));
      } catch (err) {
        console.error("Error fetching blog details:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBlogAndComments();
  }, [slug]);

  const handleLike = async () => {
    if (liked || !blog) return;
    try {
      const res = await fetch(`/api/blogs/${slug}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setBlog({ ...blog, likes: data.likes });
        setLiked(true);
        const likedBlogs = JSON.parse(localStorage.getItem("liked_blogs") ?? "[]");
        likedBlogs.push(slug);
        localStorage.setItem("liked_blogs", JSON.stringify(likedBlogs));
      }
    } catch (err) {
      console.error("Failed to like blog:", err);
    }
  };

  const handleBookmark = () => {
    if (!blog) return;
    const bookmarkedBlogs = JSON.parse(localStorage.getItem("bookmarked_blogs") ?? "[]");
    if (bookmarked) {
      const filtered = bookmarkedBlogs.filter((s: string) => s !== slug);
      localStorage.setItem("bookmarked_blogs", JSON.stringify(filtered));
      setBookmarked(false);
    } else {
      bookmarkedBlogs.push(slug);
      localStorage.setItem("bookmarked_blogs", JSON.stringify(bookmarkedBlogs));
      setBookmarked(true);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !content.trim() || !blog) return;
    setSubmittingComment(true);
    setCommentError("");
    try {
      const res = await fetch(`/api/comments/blog/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName, content })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to post comment");
      }
      const newComment = await res.json();
      setComments([newComment, ...comments]);
      setContent("");
    } catch (err: any) {
      setCommentError(err.message || "Failed to submit comment. Please try again.");
    } finally {
      setSubmittingComment(false);
    }
  };

  function parseInlineMarkdown(text: string) {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, idx) =>
      idx % 2 === 1 ? <strong key={idx} className="font-semibold text-foreground">{part}</strong> : part
    );
  }

  function parseMarkdown(text: string) {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("### ")) {
        return <h4 key={idx} className="text-lg font-bold mt-4 mb-2 text-foreground">{trimmed.slice(4)}</h4>;
      }
      if (trimmed.startsWith("## ")) {
        return <h3 key={idx} className="text-xl font-bold mt-6 mb-3 text-foreground border-b pb-1">{trimmed.slice(3)}</h3>;
      }
      if (trimmed.startsWith("# ")) {
        return <h2 key={idx} className="text-2xl font-bold mt-8 mb-4 text-foreground">{trimmed.slice(2)}</h2>;
      }
      if (trimmed.startsWith("- ")) {
        return <li key={idx} className="ml-6 list-disc mb-1.5 text-muted-foreground">{parseInlineMarkdown(trimmed.slice(2))}</li>;
      }
      if (trimmed.startsWith("* ")) {
        return <li key={idx} className="ml-6 list-disc mb-1.5 text-muted-foreground">{parseInlineMarkdown(trimmed.slice(2))}</li>;
      }
      if (trimmed === "") {
        return <div key={idx} className="h-2" />;
      }
      return <p key={idx} className="mb-4 leading-relaxed text-muted-foreground">{parseInlineMarkdown(trimmed)}</p>;
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 px-4">
        <h2 className="text-2xl font-bold mb-4">Blog Post Not Found</h2>
        <p className="text-muted-foreground mb-6">The article you are looking for does not exist or has been moved.</p>
        <Link href="/blog" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium">
          <ChevronLeft className="h-4 w-4" /> Back to Blog
        </Link>
      </div>
    );
  }

  // Schema for Article
  const origin = typeof window !== "undefined" ? window.location.origin : "https://tools.itsyasin.me";
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": blog.title,
    "description": blog.summary,
    "image": blog.coverImage || `${origin}/favicon.svg`,
    "author": {
      "@type": "Organization",
      "name": "5toolbox Team",
      "url": `${origin}/about`
    },
    "publisher": {
      "@type": "Organization",
      "name": "5toolbox",
      "logo": {
        "@type": "ImageObject",
        "url": `${origin}/favicon.svg`
      }
    },
    "datePublished": blog.publishedAt,
    "dateModified": blog.publishedAt,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${origin}/blog/${blog.slug}`
    }
  };

  const encodedUrl = encodeURIComponent(window.location.href);
  const encodedTitle = encodeURIComponent(blog.title);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <SEO
        title={blog.title}
        description={blog.summary}
        keywords={blog.tags.join(", ")}
        ogType="blog"
        ogImage={blog.coverImage || undefined}
      />
      <StructuredData data={articleSchema} />

      <div className="mb-6">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back to blog list
        </Link>
      </div>

      <article className="bg-card border rounded-3xl overflow-hidden shadow-sm p-6 sm:p-10 mb-10">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-3 text-xs text-primary mb-4 font-bold uppercase tracking-wider">
            <span className="bg-primary/10 px-3 py-1 rounded-full">{blog.category}</span>
            <span className="text-muted-foreground">•</span>
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(blog.publishedAt).toLocaleDateString()}</span>
            <span className="text-muted-foreground">•</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {blog.readTime} min read</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 text-foreground leading-tight">
            {blog.title}
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-b py-4 mt-6">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{blog.authorName}</p>
                <p className="text-xs text-muted-foreground">Expert Technical Author</p>
              </div>
            </div>

            {/* Metrics */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Eye className="h-4 w-4" /> {blog.views} views</span>
            </div>
          </div>
        </header>

        {/* Cover Image */}
        {blog.coverImage && (
          <div className="aspect-video w-full rounded-2xl overflow-hidden mb-8 bg-muted border">
            <img src={blog.coverImage} alt={blog.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Main Content */}
        <div className="prose dark:prose-invert max-w-none text-base sm:text-lg border-b pb-8 mb-8">
          {parseMarkdown(blog.content)}
        </div>

        {/* Tags */}
        {blog.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {blog.tags.map(tag => (
              <span key={tag} className="text-xs bg-muted text-muted-foreground border px-2.5 py-1 rounded-lg">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions (Like, Bookmark, Share) */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                liked
                  ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900"
                  : "hover:bg-muted hover:text-foreground text-muted-foreground bg-background"
              }`}
            >
              <Heart className={`h-4.5 w-4.5 ${liked ? "fill-rose-600 text-rose-600" : ""}`} />
              <span>{blog.likes} Likes</span>
            </button>

            <button
              onClick={handleBookmark}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                bookmarked
                  ? "bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900"
                  : "hover:bg-muted hover:text-foreground text-muted-foreground bg-background"
              }`}
            >
              <Bookmark className={`h-4.5 w-4.5 ${bookmarked ? "fill-amber-600 text-amber-600" : ""}`} />
              <span>{bookmarked ? "Bookmarked" : "Bookmark"}</span>
            </button>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-2">
            {blog.socialLinks && blog.socialLinks.map((link, idx) => {
              const iconClass = "h-4 w-4";
              let icon = <LinkIcon className={iconClass} />;
              if (link.platform === "facebook") icon = <Facebook className={iconClass} />;
              if (link.platform === "linkedin") icon = <Linkedin className={iconClass} />;
              if (link.platform === "twitter") icon = <Twitter className={iconClass} />;
              if (link.platform === "github") icon = <Github className={iconClass} />;
              if (link.platform === "youtube") icon = <Youtube className={iconClass} />;
              if (link.platform === "instagram") icon = <Instagram className={iconClass} />;
              return (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 border rounded-xl hover:bg-muted hover:text-foreground text-muted-foreground bg-background transition-colors cursor-pointer animate-in fade-in zoom-in duration-200"
                  title={`${link.platform}: ${link.url}`}
                >
                  {icon}
                </a>
              );
            })}
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1 px-3 py-2 border rounded-xl hover:bg-muted hover:text-foreground text-muted-foreground bg-background transition-colors cursor-pointer text-xs font-medium"
              title="Copy link to clipboard"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <LinkIcon className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied" : "Copy Link"}</span>
            </button>
          </div>
        </div>
      </article>

      {/* Comments Section */}
      <section className="bg-card border rounded-3xl p-6 sm:p-10">
        <h2 className="text-xl sm:text-2xl font-bold mb-6 flex items-center gap-2 text-foreground">
          <MessageSquare className="h-5.5 w-5.5 text-primary" /> Comments ({comments.length})
        </h2>

        {/* Comment Form */}
        <form onSubmit={handleCommentSubmit} className="space-y-4 mb-8">
          {commentError && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
              {commentError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="comment-username" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Your Name
              </label>
              <input
                id="comment-username"
                type="text"
                placeholder="Enter your name"
                className="w-full px-4 py-2 border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="comment-content" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Comment
            </label>
            <textarea
              id="comment-content"
              placeholder="What do you think about this post? All feedback is welcome."
              rows={4}
              className="w-full px-4 py-3 border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={submittingComment}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            {submittingComment ? "Posting..." : "Post Comment"}
            <Send className="h-4 w-4" />
          </button>
        </form>

        {/* Comments List */}
        {comments.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-2xl bg-muted/20">
            <p className="text-muted-foreground text-sm">No comments yet. Be the first to start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map(c => (
              <div key={c.id} className="p-4 border rounded-2xl bg-muted/20 hover:bg-muted/40 transition-colors">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <span className="font-semibold text-sm text-foreground">{c.userName}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                  {c.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
