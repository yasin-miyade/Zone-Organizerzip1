import { useState } from "react";
import { SEO } from "@/components/SEO";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    category: "General",
    items: [
      {
        q: "Is 5toolbox completely free?",
        a: "Yes — 5toolbox is 100% free to use with no sign-up, no subscription, and no hidden fees. Every tool on this site works at no cost.",
      },
      {
        q: "Do I need to create an account?",
        a: "No account is required. Just visit the tool you need and start using it immediately. We don't ask for your email, name, or any personal information.",
      },
      {
        q: "How many files can I process at once?",
        a: "Most tools support processing multiple files in a single session. PDF merge, for example, lets you add as many PDFs as you need. Image tools generally process one file at a time to maintain quality control.",
      },
    ],
  },
  {
    category: "Privacy & Security",
    items: [
      {
        q: "Are my files uploaded to your servers?",
        a: "No. 5toolbox processes all files directly in your browser using WebAssembly and browser APIs. Your files never leave your device — they are not uploaded, stored, or transmitted to any server. This is a core architectural decision we made to protect your privacy.",
      },
      {
        q: "Is my data safe?",
        a: "Because all processing happens locally in your browser, there is nothing stored on our end. We only record anonymous usage counts (how many times a tool was used — no file content). We do not track what files you process.",
      },
      {
        q: "Do you share my data with third parties?",
        a: "We do not sell or share any personal data. The only third-party service integrated is Google AdSense for advertising. Please read our Privacy Policy for full details.",
      },
      {
        q: "Is it safe to process sensitive documents?",
        a: "Yes. Since all processing is done in your browser, sensitive documents (financial records, legal documents, medical files) never leave your device. This makes 5toolbox a safer choice compared to tools that require file uploads.",
      },
    ],
  },
  {
    category: "PDF Tools",
    items: [
      {
        q: "How do I merge multiple PDFs into one?",
        a: "Go to the Merge PDF tool, click 'Add Files' or drag and drop your PDFs into the upload area, arrange them in the desired order, then click 'Merge PDFs'. The combined PDF will download automatically.",
      },
      {
        q: "Can I split a single PDF into multiple files?",
        a: "Yes. Use the Split PDF tool. Upload your PDF and choose to split by every page or specify a page range. Each split section downloads as a separate PDF file.",
      },
      {
        q: "How much does PDF compression reduce file size?",
        a: "Compression results depend on the original file content. PDFs with large images typically see 40–70% reduction. Text-heavy PDFs may see 10–30% reduction. You can preview the compressed size before downloading.",
      },
      {
        q: "Can I protect a PDF with a password?",
        a: "Yes. The Protect PDF tool lets you set an owner password that prevents unauthorized editing, printing, or copying of the PDF. This uses standard PDF encryption.",
      },
    ],
  },
  {
    category: "Image Tools",
    items: [
      {
        q: "What image formats are supported for conversion?",
        a: "5toolbox supports converting between JPG, PNG, WebP, GIF, BMP, ICO, TIFF, and SVG formats. SVG export embeds the raster image as base64 data inside the SVG container.",
      },
      {
        q: "Will compressing an image reduce its quality?",
        a: "The image compressor uses a quality slider (1–100). Lower values reduce file size at the cost of some visual quality. A quality setting of 75–85 typically gives a good balance between size and clarity for photos.",
      },
      {
        q: "Can I add a watermark to an image?",
        a: "Yes. The Watermark Image tool lets you type any text watermark, choose its size, color, opacity, and position (center, corner, etc.), then apply it to your image.",
      },
    ],
  },
  {
    category: "Online Clipboard",
    items: [
      {
        q: "What is the Online Clipboard tool?",
        a: "The Online Clipboard lets you paste any text (code, notes, URLs, passwords) and instantly generate a shareable link and QR code. Open the link on another device to retrieve the text — no app install required.",
      },
      {
        q: "How long does the clipboard link stay active?",
        a: "All clipboard links expire automatically after 24 hours. After expiry, the content is deleted from our servers and the link returns a 'not found' response.",
      },
      {
        q: "Is clipboard content encrypted?",
        a: "Clipboard content is stored as plain text in our database and deleted after 24 hours. Do not store highly sensitive information like banking credentials or private keys in the clipboard.",
      },
    ],
  },
  {
    category: "Calculators & Converters",
    items: [
      {
        q: "Are the calculator results accurate?",
        a: "All calculators use standard financial and mathematical formulas. Results are for informational purposes only. For critical decisions (loans, taxes, investment planning), please consult a qualified professional.",
      },
      {
        q: "Does the currency converter use live exchange rates?",
        a: "The currency converter uses approximate rates for common currencies. For live trading rates, always use your bank or a dedicated financial service.",
      },
    ],
  },
  {
    category: "Technical",
    items: [
      {
        q: "Which browsers does 5toolbox support?",
        a: "5toolbox works best in modern browsers: Chrome 90+, Firefox 88+, Edge 90+, and Safari 14+. Some WebAssembly-powered features (like PDF processing) may not work in very old browsers.",
      },
      {
        q: "Why does PDF processing sometimes take a while?",
        a: "PDF processing runs entirely in your browser using WebAssembly (a compiled binary format). The first time a PDF tool loads, it downloads and compiles the WASM module (~2–5 MB), which can take a few seconds on slower connections. Subsequent uses within the same session are instant.",
      },
      {
        q: "Can I use 5toolbox on my phone?",
        a: "Yes — 5toolbox is fully responsive and works on mobile browsers. However, some tools (like PDF merge with many files) work better on a desktop due to the larger screen and more available memory.",
      },
    ],
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start justify-between gap-4 p-5 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="font-medium text-sm leading-relaxed">{q}</span>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t bg-muted/20 pt-4">
          {a}
        </div>
      )}
    </div>
  );
}

export function FAQ() {
  const [active, setActive] = useState("All");
  const categories = ["All", ...faqs.map(f => f.category)];

  const filtered = active === "All" ? faqs : faqs.filter(f => f.category === active);

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <SEO
        title="FAQ — Frequently Asked Questions"
        description="Find answers to common questions about 5toolbox — how it works, privacy, file security, supported formats, and more."
        keywords="5toolbox faq, frequently asked questions, file tools help, pdf tools faq"
      />

      <div className="text-center mb-12">
        <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-4">
          <HelpCircle className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-3">Frequently Asked Questions</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Everything you need to know about 5toolbox — how it works, privacy, supported formats, and more.
        </p>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-8 justify-center">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors",
              active === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {filtered.map(section => (
          <div key={section.category}>
            <h2 className="text-lg font-semibold mb-4 text-primary">{section.category}</h2>
            <div className="space-y-3">
              {section.items.map(item => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 text-center rounded-2xl border bg-muted/30 p-8">
        <h3 className="font-semibold text-lg mb-2">Still have questions?</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Can't find what you're looking for? Drop us a message and we'll get back to you.
        </p>
        <a
          href="/contact"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Contact Us
        </a>
      </div>
    </div>
  );
}
