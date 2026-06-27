import { useState, useEffect } from "react";
import { Link, useRoute } from "wouter";
import { SEO } from "@/components/SEO";
import { StructuredData } from "@/components/StructuredData";
import {
  Calendar,
  Clock,
  Eye,
  User,
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

interface Article {
  id: number;
  slug: string;
  title: string;
  content: string;
  summary: string;
  authorName: string;
  readTime: number;
  views: number;
  publishedAt: string;
  socialLinks?: { platform: string; url: string }[];
}

interface Comment {
  id: number;
  userName: string;
  content: string;
  createdAt: string;
}

export function ArticleDetail() {
  const [, params] = useRoute("/articles/:slug");
  const slug = params?.slug ?? "";

  const [article, setArticle] = useState<Article | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Comment Form State
  const [userName, setUserName] = useState("");
  const [content, setContent] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState("");

  useEffect(() => {
    if (!slug) return;
    async function fetchArticleAndComments() {
      try {
        setLoading(true);
        const [articleRes, commentsRes] = await Promise.all([
          fetch(`/api/articles/${slug}`).then(res => {
            if (!res.ok) throw new Error("Article not found");
            return res.json();
          }),
          fetch(`/api/comments/article/${slug}`).then(res => res.json())
        ]);
        setArticle(articleRes);
        setComments(Array.isArray(commentsRes) ? commentsRes : []);
      } catch (err) {
        console.error("Error fetching article details:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchArticleAndComments();
  }, [slug]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !content.trim() || !article) return;
    setSubmittingComment(true);
    setCommentError("");
    try {
      const res = await fetch(`/api/comments/article/${slug}`, {
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

  if (!article) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 px-4">
        <h2 className="text-2xl font-bold mb-4">Article Not Found</h2>
        <p className="text-muted-foreground mb-6">The technical guide you are looking for does not exist or has been moved.</p>
        <Link href="/blog" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium">
          <ChevronLeft className="h-4 w-4" /> Back to Blog
        </Link>
      </div>
    );
  }

  // Schema for Article
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "description": article.summary,
    "author": {
      "@type": "Organization",
      "name": "5toolbox Team",
      "url": "https://5toolbox.app/about"
    },
    "publisher": {
      "@type": "Organization",
      "name": "5toolbox",
      "logo": {
        "@type": "ImageObject",
        "url": "https://5toolbox.app/favicon.svg"
      }
    },
    "datePublished": article.publishedAt,
    "dateModified": article.publishedAt,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://5toolbox.app/articles/${article.slug}`
    }
  };

  const encodedUrl = encodeURIComponent(window.location.href);
  const encodedTitle = encodeURIComponent(article.title);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <SEO
        title={article.title}
        description={article.summary}
        keywords="technical guide, file tutorials, 5toolbox articles"
        ogType="article"
      />
      <StructuredData data={articleSchema} />

      <div className="mb-6">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back to knowledge base
        </Link>
      </div>

      <article className="bg-card border rounded-3xl overflow-hidden shadow-sm p-6 sm:p-10 mb-10">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-3 text-xs text-primary mb-4 font-bold uppercase tracking-wider">
            <span className="bg-primary/10 px-3 py-1 rounded-full">Technical Guide</span>
            <span className="text-muted-foreground">•</span>
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(article.publishedAt).toLocaleDateString()}</span>
            <span className="text-muted-foreground">•</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {article.readTime} min read</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 text-foreground leading-tight">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-b py-4 mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{article.authorName}</p>
                  <p className="text-xs text-muted-foreground">Expert Technical Author</p>
                </div>
              </div>
              {article.socialLinks && article.socialLinks.length > 0 && (
                <div className="flex items-center gap-3 border-t pt-3 mt-1 sm:border-t-0 sm:pt-0 sm:mt-0 sm:border-l sm:pl-4 sm:ml-2">
                  {article.socialLinks.map((link, idx) => {
                    const iconClass = "h-4.5 w-4.5 text-muted-foreground hover:text-primary transition-colors";
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
                        title={`${link.platform}: ${link.url}`}
                      >
                        {icon}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Metrics */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Eye className="h-4 w-4" /> {article.views} views</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="prose dark:prose-invert max-w-none text-base sm:text-lg border-b pb-8 mb-8">
          {parseMarkdown(article.content)}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t">
          <div></div> {/* spacer */}
          {/* Social Shares */}
          <div className="flex items-center gap-2">
            <a
              href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 border rounded-xl hover:bg-muted hover:text-foreground text-muted-foreground bg-background transition-colors cursor-pointer"
              title="Share on X (Twitter)"
            >
              <Twitter className="h-4 w-4" />
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 border rounded-xl hover:bg-muted hover:text-foreground text-muted-foreground bg-background transition-colors cursor-pointer"
              title="Share on Facebook"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <a
              href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 border rounded-xl hover:bg-muted hover:text-foreground text-muted-foreground bg-background transition-colors cursor-pointer"
              title="Share on LinkedIn"
            >
              <Linkedin className="h-4 w-4" />
            </a>
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
              placeholder="What do you think about this guide? Your feedback helps us improve."
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
