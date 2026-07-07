import { useState, useEffect, lazy, Suspense } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useGetTool, getGetToolQueryKey, useTrackToolUsage, useListTools } from "@workspace/api-client-react";
import { ToolCard } from "@/components/ToolCard";
import { AdBanner } from "@/components/AdBanner";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Loader2, Star, StarHalf, MessageSquare, Send, Award, HelpCircle, ShieldAlert, CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---- LAZY LOADED TOOLS ----

// PDF Tools
const MergePdf = lazy(() => import("./tools/PdfTools").then(m => ({ default: m.MergePdf })));
const SplitPdf = lazy(() => import("./tools/PdfTools").then(m => ({ default: m.SplitPdf })));
const CompressPdf = lazy(() => import("./tools/PdfTools").then(m => ({ default: m.CompressPdf })));
const PdfToJpg = lazy(() => import("./tools/PdfTools").then(m => ({ default: m.PdfToJpg })));
const JpgToPdf = lazy(() => import("./tools/PdfTools").then(m => ({ default: m.JpgToPdf })));
const RotatePdf = lazy(() => import("./tools/PdfTools").then(m => ({ default: m.RotatePdf })));
const WatermarkPdf = lazy(() => import("./tools/PdfTools").then(m => ({ default: m.WatermarkPdf })));
const PdfToText = lazy(() => import("./tools/PdfTools").then(m => ({ default: m.PdfToText })));
const ProtectPdf = lazy(() => import("./tools/PdfTools").then(m => ({ default: m.ProtectPdf })));
const RemovePdfPages = lazy(() => import("./tools/PdfTools").then(m => ({ default: m.RemovePdfPages })));
const AddPageNumbers = lazy(() => import("./tools/PdfTools").then(m => ({ default: m.AddPageNumbers })));

// Image Tools
const CompressImage = lazy(() => import("./tools/ImageTools").then(m => ({ default: m.CompressImage })));
const ResizeImage = lazy(() => import("./tools/ImageTools").then(m => ({ default: m.ResizeImage })));
const ConvertImage = lazy(() => import("./tools/ImageTools").then(m => ({ default: m.ConvertImage })));
const CropImage = lazy(() => import("./tools/ImageTools").then(m => ({ default: m.CropImage })));
const ImageToPdf = lazy(() => import("./tools/ImageTools").then(m => ({ default: m.ImageToPdf })));
const FlipImage = lazy(() => import("./tools/ImageTools").then(m => ({ default: m.FlipImage })));
const RotateImage = lazy(() => import("./tools/ImageTools").then(m => ({ default: m.RotateImage })));
const WatermarkImage = lazy(() => import("./tools/ImageTools").then(m => ({ default: m.WatermarkImage })));
const ImageToBase64 = lazy(() => import("./tools/ImageTools").then(m => ({ default: m.ImageToBase64 })));
const SvgToPng = lazy(() => import("./tools/ImageTools").then(m => ({ default: m.SvgToPng })));

// Text Tools
const WordCounter = lazy(() => import("./tools/TextTools").then(m => ({ default: m.WordCounter })));
const QrGenerator = lazy(() => import("./tools/TextTools").then(m => ({ default: m.QrGenerator })));
const Base64Tool = lazy(() => import("./tools/TextTools").then(m => ({ default: m.Base64Tool })));
const JsonFormatter = lazy(() => import("./tools/TextTools").then(m => ({ default: m.JsonFormatter })));
const OnlineClipboard = lazy(() => import("./tools/TextTools").then(m => ({ default: m.OnlineClipboard })));
const FileSharing = lazy(() => import("./tools/FileSharing").then(m => ({ default: m.FileSharing })));

// Calculators
const AgeCalculator = lazy(() => import("./CalculatorTools").then(m => ({ default: m.AgeCalculator })));
const BmiCalculator = lazy(() => import("./CalculatorTools").then(m => ({ default: m.BmiCalculator })));
const PercentageCalculator = lazy(() => import("./CalculatorTools").then(m => ({ default: m.PercentageCalculator })));
const CgpaCalculator = lazy(() => import("./CalculatorTools").then(m => ({ default: m.CgpaCalculator })));
const GpaCalculator = lazy(() => import("./CalculatorTools").then(m => ({ default: m.GpaCalculator })));
const EmiCalculator = lazy(() => import("./CalculatorTools").then(m => ({ default: m.EmiCalculator })));
const SipCalculator = lazy(() => import("./CalculatorTools").then(m => ({ default: m.SipCalculator })));
const GstCalculator = lazy(() => import("./CalculatorTools").then(m => ({ default: m.GstCalculator })));
const IncomeTaxCalculator = lazy(() => import("./CalculatorTools").then(m => ({ default: m.IncomeTaxCalculator })));
const CurrencyConverter = lazy(() => import("./CalculatorTools").then(m => ({ default: m.CurrencyConverter })));
const ScientificCalculator = lazy(() => import("./CalculatorTools").then(m => ({ default: m.ScientificCalculator })));
const LoanCalculator = lazy(() => import("./CalculatorTools").then(m => ({ default: m.LoanCalculator })));
const DiscountCalculator = lazy(() => import("./CalculatorTools").then(m => ({ default: m.DiscountCalculator })));
const AttendanceCalculator = lazy(() => import("./CalculatorTools").then(m => ({ default: m.AttendanceCalculator })));
const DateDifference = lazy(() => import("./CalculatorTools").then(m => ({ default: m.DateDifference })));

// Convert Tools
const CsvToJson = lazy(() => import("./tools/ConvertTools").then(m => ({ default: m.CsvToJson })));
const JsonToCsv = lazy(() => import("./tools/ConvertTools").then(m => ({ default: m.JsonToCsv })));
const MarkdownToHtml = lazy(() => import("./tools/ConvertTools").then(m => ({ default: m.MarkdownToHtml })));
const HtmlToText = lazy(() => import("./tools/ConvertTools").then(m => ({ default: m.HtmlToText })));
const UrlEncoderTool = lazy(() => import("./tools/ConvertTools").then(m => ({ default: m.UrlEncoderTool })));
const ColorConverter = lazy(() => import("./tools/ConvertTools").then(m => ({ default: m.ColorConverter })));
const NumberBase = lazy(() => import("./tools/ConvertTools").then(m => ({ default: m.NumberBase })));

const TOOL_COMPONENTS: Record<string, React.ComponentType<{ onDone: () => void }>> = {
  "merge-pdf": MergePdf,
  "split-pdf": SplitPdf,
  "compress-pdf": CompressPdf,
  "pdf-to-jpg": PdfToJpg,
  "jpg-to-pdf": JpgToPdf,
  "rotate-pdf": RotatePdf,
  "watermark-pdf": WatermarkPdf,
  "pdf-to-text": PdfToText,
  "protect-pdf": ProtectPdf,
  "remove-pdf-pages": RemovePdfPages,
  "add-page-numbers": AddPageNumbers,
  "compress-image": CompressImage,
  "resize-image": ResizeImage,
  "convert-image": ConvertImage,
  "crop-image": CropImage,
  "image-to-pdf": ImageToPdf,
  "flip-image": FlipImage,
  "rotate-image": RotateImage,
  "watermark-image": WatermarkImage,
  "image-to-base64": ImageToBase64,
  "svg-to-png": SvgToPng,
  "word-counter": WordCounter,
  "qr-generator": QrGenerator,
  "base64": Base64Tool,
  "json-formatter": JsonFormatter,
  "online-clipboard": OnlineClipboard,
  "file-sharing": FileSharing,
  // Calculators
  "age-calculator": AgeCalculator,
  "bmi-calculator": BmiCalculator,
  "percentage-calculator": PercentageCalculator,
  "cgpa-calculator": CgpaCalculator,
  "gpa-calculator": GpaCalculator,
  "emi-calculator": EmiCalculator,
  "sip-calculator": SipCalculator,
  "gst-calculator": GstCalculator,
  "income-tax-calculator": IncomeTaxCalculator,
  "currency-converter": CurrencyConverter,
  "scientific-calculator": ScientificCalculator,
  "loan-calculator": LoanCalculator,
  "discount-calculator": DiscountCalculator,
  "attendance-calculator": AttendanceCalculator,
  "date-difference": DateDifference,
  // Convert tools
  "csv-to-json": CsvToJson,
  "json-to-csv": JsonToCsv,
  "markdown-to-html": MarkdownToHtml,
  "html-to-text": HtmlToText,
  "url-encoder": UrlEncoderTool,
  "color-converter": ColorConverter,
  "number-base": NumberBase,
};

const NO_DONE_TOOLS = new Set([
  "word-counter", "base64", "json-formatter",
  "age-calculator", "bmi-calculator", "percentage-calculator", "cgpa-calculator",
  "gpa-calculator", "emi-calculator", "sip-calculator", "gst-calculator",
  "income-tax-calculator", "currency-converter", "scientific-calculator",
  "loan-calculator", "discount-calculator", "attendance-calculator", "date-difference",
  "csv-to-json", "json-to-csv", "markdown-to-html", "html-to-text",
  "url-encoder", "color-converter", "number-base",
  "online-clipboard",
  "file-sharing",
]);

const categoryBadgeColors: Record<string, string> = {
  pdf:        "bg-red-100 text-red-700",
  image:      "bg-blue-100 text-blue-700",
  convert:    "bg-violet-100 text-violet-700",
  text:       "bg-emerald-100 text-emerald-700",
  calculator: "bg-amber-100 text-amber-700",
};

function getFallbackSteps(category: string, toolName: string): string[] {
  const cat = (category || "").toLowerCase();
  if (cat === "pdf") {
    return [
      `Click the file selection area to upload your PDF files, or drag and drop them directly into the zone.`,
      `Adjust any settings if needed (such as page order, password, or compression level).`,
      `Click the processing button to run the tool. All processing happens 100% locally in your browser.`,
      `Once completed, click the download button to save your processed PDF file to your device.`
    ];
  } else if (cat === "image") {
    return [
      `Choose your image file (JPEG, PNG, WebP, etc.) from your device or drag it into the dropzone.`,
      `Specify your target dimensions, quality, or output format settings in the options panel.`,
      `Click the conversion or optimization button to process the image in real-time.`,
      `Preview the output size savings and click download to save the new image.`
    ];
  } else if (cat === "convert" || cat === "text" || cat === "calculator") {
    return [
      `Input your raw data, text, or file into the input area.`,
      `Configure the tool parameters (such as formatting settings, conversions, or calculations).`,
      `The results will be generated automatically or after clicking the action button.`,
      `Click the "Copy to Clipboard" button or "Download" to save your result.`
    ];
  }
  return [
    `Upload or enter your input data into the tool.`,
    `Adjust the options and settings to your preference.`,
    `Run the tool to process your data locally and securely.`,
    `Copy or download your finalized output.`
  ];
}

export function ToolPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: rawTool, isLoading } = useGetTool(slug, {
    query: { enabled: !!slug, queryKey: getGetToolQueryKey(slug) },
  });
  const tool = rawTool as any;
  const trackMutation = useTrackToolUsage();
  const { data: allTools } = useListTools();

  const [comments, setComments] = useState<any[]>([]);
  const [ratings, setRatings] = useState<{ average: number; count: number }>({ average: 0, count: 0 });
  const [userRating, setUserRating] = useState<number | null>(null);
  const [ratingError, setRatingError] = useState("");
  const [ratingSuccess, setRatingSuccess] = useState("");

  const [commentName, setCommentName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState("");

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/comments/tool/${slug}`)
      .then(res => res.json())
      .then(data => setComments(Array.isArray(data) ? data : []))
      .catch(console.error);

    fetch(`/api/ratings/${slug}`)
      .then(res => res.json())
      .then(data => setRatings(data))
      .catch(console.error);
      
    setUserRating(null);
    setRatingError("");
    setRatingSuccess("");
    setCommentName("");
    setCommentText("");
    setCommentError("");
  }, [slug]);

  const handleRate = async (ratingVal: number) => {
    try {
      setRatingError("");
      setRatingSuccess("");
      const res = await fetch(`/api/ratings/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: ratingVal })
      });
      if (res.ok) {
        setUserRating(ratingVal);
        setRatingSuccess("Thank you for your rating!");
        const data = await fetch(`/api/ratings/${slug}`).then(r => r.json());
        setRatings(data);
      } else {
        const data = await res.json();
        setRatingError(data.error || "Failed to submit rating");
      }
    } catch (err) {
      setRatingError("Error connecting to server");
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentName.trim() || !commentText.trim()) return;
    setCommentSubmitting(true);
    setCommentError("");
    try {
      const res = await fetch(`/api/comments/tool/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: commentName, content: commentText })
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments(prev => [newComment, ...prev]);
        setCommentText("");
      } else {
        const data = await res.json();
        setCommentError(data.error || "Failed to submit comment");
      }
    } catch (err) {
      setCommentError("Error connecting to server");
    } finally {
      setCommentSubmitting(false);
    }
  };

  function safeJsonParse<T>(val: string | null | undefined, fallback: T): T {
    if (!val) return fallback;
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  }

  const ToolComponent = TOOL_COMPONENTS[slug];

  function onDone() {
    if (!NO_DONE_TOOLS.has(slug)) {
      trackMutation.mutate({ toolSlug: slug, data: { filesProcessed: 1 } });
    }
  }

  const related = allTools
    ?.filter(t => t.slug !== slug && t.category === tool?.category)
    .slice(0, 4) ?? [];

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!ToolComponent) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-2">Tool Not Found</h1>
        <p className="text-muted-foreground mb-6">The tool "{slug}" doesn't exist yet.</p>
        <Link href="/"><Button><ArrowLeft className="h-4 w-4 mr-2" /> Back to Home</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <SEO
        title={tool?.name ?? slug}
        description={tool?.description
          ? `${tool.description} — Free online tool, no sign-up required. Works entirely in your browser.`
          : undefined}
        keywords={tool ? `${tool.name.toLowerCase()}, ${tool.category} tools, free online ${tool.name.toLowerCase()}` : undefined}
      />
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> All Tools
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          {tool?.category && (
            <Badge className={cn("text-xs font-medium border-0", categoryBadgeColors[tool.category] ?? "bg-muted text-muted-foreground")}>
              {tool.category.toUpperCase()}
            </Badge>
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">{tool?.name ?? slug}</h1>
        {tool?.description && <p className="text-muted-foreground">{tool.description}</p>}
        {!!(tool?.inputFormats?.length || tool?.outputFormats?.length) && (
          <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
            {!!tool?.inputFormats?.length && <span>Input: {tool.inputFormats.join(", ").toUpperCase()}</span>}
            {!!tool?.outputFormats?.length && <span>Output: {tool.outputFormats.join(", ").toUpperCase()}</span>}
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <Suspense fallback={
          <div className="flex flex-col justify-center items-center py-16 bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground mt-4 animate-pulse">Loading secure workspace...</p>
          </div>
        }>
          <ToolComponent onDone={onDone} />
        </Suspense>
      </div>

      {/* AdSense — rectangle between tool and related tools */}
      <div className="mt-10 flex justify-center">
        <AdBanner slot="rectangle" />
      </div>

      {/* Interactive Rating Component */}
      <div className="mt-10 p-6 border rounded-2xl bg-card shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-semibold text-lg mb-1">User Ratings</h3>
            <div className="flex items-center gap-2">
              <div className="flex text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => {
                  const starVal = i + 1;
                  const isFull = ratings.average >= starVal;
                  const isHalf = !isFull && ratings.average >= starVal - 0.5;
                  if (isFull) return <Star key={i} className="h-5 w-5 fill-amber-500" />;
                  if (isHalf) return <StarHalf key={i} className="h-5 w-5 fill-amber-500" />;
                  return <Star key={i} className="h-5 w-5" />;
                })}
              </div>
              <span className="text-sm font-medium text-foreground">
                {ratings.average > 0 ? `${ratings.average} / 5` : "No ratings yet"}
              </span>
              {ratings.count > 0 && (
                <span className="text-xs text-muted-foreground">({ratings.count} reviews)</span>
              )}
            </div>
          </div>

          <div className="border-t sm:border-t-0 sm:border-l pt-4 sm:pt-0 sm:pl-6 flex flex-col items-start sm:items-end">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Rate this tool:</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRate(star)}
                  disabled={userRating !== null}
                  className="text-muted hover:text-amber-500 cursor-pointer disabled:cursor-default transition-colors p-0.5 group"
                  title={`Rate ${star} star${star > 1 ? "s" : ""}`}
                >
                  <Star className={cn("h-6 w-6 transition-transform group-hover:scale-110",
                    (userRating !== null && userRating >= star) ? "fill-amber-500 text-amber-500" : ""
                  )} />
                </button>
              ))}
            </div>
            {ratingError && <p className="text-xs text-destructive mt-1.5">{ratingError}</p>}
            {ratingSuccess && <p className="text-xs text-emerald-600 mt-1.5">{ratingSuccess}</p>}
          </div>
        </div>
      </div>

      {/* Dynamic SEO Sections */}
      {tool && (
        <div className="mt-12 space-y-10 border-t pt-10">
          {/* Introduction */}
          {tool.introduction && (
            <section className="prose dark:prose-invert max-w-none">
              <h2 className="text-2xl font-bold text-foreground">About {tool.name}</h2>
              <p className="text-muted-foreground leading-relaxed mt-2 text-base">{tool.introduction}</p>
            </section>
          )}

          {/* Steps / How To */}
          {(() => {
            const steps = tool.steps && safeJsonParse<string[]>(tool.steps, []).length > 0
              ? safeJsonParse<string[]>(tool.steps, [])
              : getFallbackSteps(tool.category, tool.name);
            return (
              <section className="bg-muted/30 p-6 rounded-2xl border">
                <h2 className="text-xl font-bold text-foreground mb-4">How to Use {tool.name}</h2>
                <ol className="space-y-3 list-decimal pl-5">
                  {steps.map((stepText, i) => (
                    <li key={i} className="text-muted-foreground text-sm leading-relaxed pl-1">
                      {stepText}
                    </li>
                  ))}
                </ol>
              </section>
            );
          })()}

          {/* Features, Benefits & Advantages Grid */}
          {(tool.features || tool.benefits || tool.advantages) && (
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tool.features && safeJsonParse<string[]>(tool.features, []).length > 0 && (
                <div className="p-5 border rounded-2xl bg-card">
                  <h3 className="font-semibold text-md mb-3 text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" /> Key Features
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {safeJsonParse<string[]>(tool.features, []).map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-600 mt-0.5">•</span> <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {tool.advantages && safeJsonParse<string[]>(tool.advantages, []).length > 0 && (
                <div className="p-5 border rounded-2xl bg-card">
                  <h3 className="font-semibold text-md mb-3 text-foreground flex items-center gap-1.5">
                    <Award className="h-4.5 w-4.5 text-primary" /> Advantages
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {safeJsonParse<string[]>(tool.advantages, []).map((adv, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-primary mt-0.5">•</span> <span>{adv}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* Use cases & Tips */}
          {(tool.useCases || tool.tips || tool.commonErrors) && (
            <section className="space-y-6">
              {tool.tips && safeJsonParse<string[]>(tool.tips, []).length > 0 && (
                <div className="p-5 border rounded-2xl bg-amber-50/10 border-amber-500/20">
                  <h3 className="font-semibold text-md mb-3 text-amber-600 dark:text-amber-500 flex items-center gap-1.5">
                    <HelpCircle className="h-4.5 w-4.5" /> Professional Tips
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {safeJsonParse<string[]>(tool.tips, []).map((tip, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-amber-500 mt-0.5">•</span> <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {tool.commonErrors && safeJsonParse<string[]>(tool.commonErrors, []).length > 0 && (
                <div className="p-5 border rounded-2xl bg-rose-50/10 border-rose-500/20">
                  <h3 className="font-semibold text-md mb-3 text-rose-600 dark:text-rose-500 flex items-center gap-1.5">
                    <ShieldAlert className="h-4.5 w-4.5" /> Common Errors &amp; Troubleshooting
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {safeJsonParse<string[]>(tool.commonErrors, []).map((errText, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-rose-500 mt-0.5">•</span> <span>{errText}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* FAQ Accordion */}
          {tool.faqs && safeJsonParse<{ q: string; a: string }[]>(tool.faqs, []).length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">Frequently Asked Questions</h2>
              <div className="space-y-3">
                {safeJsonParse<{ q: string; a: string }[]>(tool.faqs, []).map((faq, i) => (
                  <div key={i} className="p-4 border rounded-xl bg-card">
                    <h4 className="font-semibold text-sm text-foreground mb-1.5 flex items-start gap-1.5">
                      <HelpCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" /> <span>{faq.q}</span>
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pl-5">{faq.a}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Technical Info Metadata */}
          <section className="p-4 bg-muted/20 border rounded-xl text-xs text-muted-foreground grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="font-semibold text-foreground uppercase tracking-wider text-[9px] mb-0.5">Developer</p>
              <p>{tool.developer || "5toolbox"}</p>
            </div>
            <div>
              <p className="font-semibold text-foreground uppercase tracking-wider text-[9px] mb-0.5">Version</p>
              <p>{tool.version || "1.0.0"}</p>
            </div>
            <div>
              <p className="font-semibold text-foreground uppercase tracking-wider text-[9px] mb-0.5">License</p>
              <p>{tool.license || "MIT"}</p>
            </div>
            <div>
              <p className="font-semibold text-foreground uppercase tracking-wider text-[9px] mb-0.5">Last Updated</p>
              <p>{tool.lastUpdated ? new Date(tool.lastUpdated).toLocaleDateString() : "Recently"}</p>
            </div>
          </section>
        </div>
      )}

      {/* Review Comments Section */}
      <section className="mt-12 border-t pt-10">
        <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <MessageSquare className="h-5.5 w-5.5 text-primary" /> User Reviews &amp; Feedback ({comments.length})
        </h2>

        {/* Comment Form */}
        <form onSubmit={handleCommentSubmit} className="space-y-4 mb-8 bg-card border p-5 rounded-2xl shadow-sm">
          {commentError && (
            <div className="p-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
              {commentError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="comment-username" className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Name
              </label>
              <input
                id="comment-username"
                type="text"
                placeholder="Your name"
                className="w-full px-3 py-1.5 border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                value={commentName}
                onChange={(e) => setCommentName(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="comment-text" className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Review or Question
            </label>
            <textarea
              id="comment-text"
              placeholder="Post a review, suggest a feature, or report a bug. We read every comment."
              rows={3}
              className="w-full px-3 py-2 border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={commentSubmitting}
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-xl font-medium text-xs hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            {commentSubmitting ? "Submitting..." : "Submit Review"}
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>

        {/* Reviews List */}
        {comments.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-2xl bg-muted/10">
            <p className="text-muted-foreground text-xs">No reviews yet. Share your experience with this tool!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((c) => (
              <div key={c.id} className="p-4 border rounded-2xl bg-muted/10">
                <div className="flex items-center justify-between gap-4 mb-1">
                  <span className="font-semibold text-xs text-foreground">{c.userName}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed whitespace-pre-wrap">{c.content}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {related.length > 0 && (
        <div className="mt-12 border-t pt-10">
          <h2 className="font-semibold text-lg mb-4">Related Tools</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {related.map(t => (
              <ToolCard key={t.slug} {...t} usageCount={t.usageCount ?? 0} isFeatured={t.isFeatured ?? false} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
