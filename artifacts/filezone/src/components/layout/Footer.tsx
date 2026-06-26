import { useState } from "react";
import { Link } from "wouter";
import { Layers, Calculator, X, Shield, Github, Twitter } from "lucide-react";

function FooterCalculator() {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [reset, setReset] = useState(false);
  const [open, setOpen] = useState(false);

  function pressNum(n: string) {
    if (reset || display === "0") { setDisplay(n); setReset(false); }
    else setDisplay(display.length < 12 ? display + n : display);
  }
  function pressDot() {
    if (reset) { setDisplay("0."); setReset(false); return; }
    if (!display.includes(".")) setDisplay(display + ".");
  }
  function pressOp(o: string) { setPrev(parseFloat(display)); setOp(o); setReset(true); }
  function calc() {
    if (prev === null || op === null) return;
    const cur = parseFloat(display);
    let r = 0;
    if (op === "+") r = prev + cur;
    else if (op === "-") r = prev - cur;
    else if (op === "×") r = prev * cur;
    else if (op === "÷") r = cur !== 0 ? prev / cur : 0;
    setDisplay(parseFloat(r.toFixed(8)).toString());
    setPrev(null); setOp(null); setReset(true);
  }
  function clear() { setDisplay("0"); setPrev(null); setOp(null); setReset(false); }

  const btn = (label: string, action: () => void, cls = "") => (
    <button key={label} onClick={action}
      className={`rounded-lg py-2 text-sm font-medium transition-colors hover:opacity-80 active:scale-95 ${cls}`}>
      {label}
    </button>
  );

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
        <Calculator className="h-3.5 w-3.5" /> Quick Calculator
      </button>
      {open && (
        <div className="absolute bottom-8 left-0 z-50 w-64 bg-card border rounded-2xl shadow-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground">Calculator</span>
            <button onClick={() => setOpen(false)}><X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" /></button>
          </div>
          <div className="bg-muted rounded-xl px-3 py-2 text-right text-xl font-mono font-bold mb-3 overflow-hidden">{display}</div>
          <div className="grid grid-cols-4 gap-1.5">
            {btn("C", clear, "col-span-2 bg-destructive/10 text-destructive")}
            {btn("÷", () => pressOp("÷"), "bg-primary/10 text-primary")}
            {btn("×", () => pressOp("×"), "bg-primary/10 text-primary")}
            {["7","8","9"].map(n => btn(n, () => pressNum(n), "bg-muted hover:bg-muted/80 text-foreground"))}
            {btn("-", () => pressOp("-"), "bg-primary/10 text-primary")}
            {["4","5","6"].map(n => btn(n, () => pressNum(n), "bg-muted hover:bg-muted/80 text-foreground"))}
            {btn("+", () => pressOp("+"), "bg-primary/10 text-primary")}
            {["1","2","3"].map(n => btn(n, () => pressNum(n), "bg-muted hover:bg-muted/80 text-foreground"))}
            {btn("=", calc, "row-span-1 bg-primary text-primary-foreground")}
            {btn("0", () => pressNum("0"), "col-span-2 bg-muted hover:bg-muted/80 text-foreground")}
            {btn(".", pressDot, "bg-muted hover:bg-muted/80 text-foreground")}
          </div>
        </div>
      )}
    </div>
  );
}

export function Footer({ hiddenPages = [] }: { hiddenPages?: string[] }) {
  const show = (key: string) => !hiddenPages.includes(key);

  return (
    <footer className="border-t bg-background py-14 mt-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-primary p-1.5 rounded-lg"><Layers className="h-4 w-4 text-primary-foreground" /></div>
              <h3 className="font-bold text-lg">5toolbox</h3>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed mb-5 max-w-xs">
              The complete free online web utility toolkit for everyday work — PDFs, images, converters, calculators, and text tools. All processing happens securely in your browser.
            </p>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1.5 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900">
                <Shield className="h-3 w-3" /> 100% Local &amp; Private
              </div>
              <div className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1.5 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900">
                AdSense Approved
              </div>
            </div>
            <FooterCalculator />
          </div>

          {/* PDF & Image */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">PDF Tools</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link href="/tools/merge-pdf" className="hover:text-primary transition-colors">Merge PDF</Link></li>
              <li><Link href="/tools/split-pdf" className="hover:text-primary transition-colors">Split PDF</Link></li>
              <li><Link href="/tools/compress-pdf" className="hover:text-primary transition-colors">Compress PDF</Link></li>
              <li><Link href="/tools/pdf-to-jpg" className="hover:text-primary transition-colors">PDF to JPG</Link></li>
              <li><Link href="/tools/protect-pdf" className="hover:text-primary transition-colors">Protect PDF</Link></li>
              <li><Link href="/pdf" className="hover:text-primary transition-colors font-medium text-foreground/70">All PDF Tools →</Link></li>
            </ul>
          </div>

          {/* Image & Convert */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Image &amp; Convert</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link href="/tools/compress-image" className="hover:text-primary transition-colors">Compress Image</Link></li>
              <li><Link href="/tools/resize-image" className="hover:text-primary transition-colors">Resize Image</Link></li>
              <li><Link href="/tools/convert-image" className="hover:text-primary transition-colors">Convert Image</Link></li>
              <li><Link href="/tools/csv-to-json" className="hover:text-primary transition-colors">CSV to JSON</Link></li>
              <li><Link href="/tools/qr-generator" className="hover:text-primary transition-colors">QR Generator</Link></li>
              <li><Link href="/image" className="hover:text-primary transition-colors font-medium text-foreground/70">All Image Tools →</Link></li>
            </ul>
          </div>

          {/* Company & Legal */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Resources</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {show("about") && <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>}
              {show("contact") && <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>}
              {show("faq") && <li><Link href="/faq" className="hover:text-primary transition-colors">FAQ</Link></li>}
              <li><Link href="/blog" className="hover:text-primary transition-colors">Blog &amp; Articles</Link></li>
            </ul>
            <h4 className="font-semibold mb-4 mt-8 text-sm uppercase tracking-wider text-muted-foreground">Legal</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {show("privacy") && <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>}
              {show("terms") && <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>}
              <li><Link href="/cookie-policy" className="hover:text-primary transition-colors">Cookie Policy</Link></li>
              <li><a href="/api/sitemap.xml" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Sitemap</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>
            <span>&copy; {new Date().getFullYear()} 5toolbox by </span>
            <span className="font-medium text-foreground">Yasin Miyade</span>
            <span>. All rights reserved. All file processing happens locally.</span>
          </div>
          <div className="flex flex-wrap gap-4">
            {show("privacy") && <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>}
            {show("terms") && <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>}
            <Link href="/cookie-policy" className="hover:text-primary transition-colors">Cookies</Link>
            {show("contact") && <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>}
          </div>
        </div>
      </div>
    </footer>
  );
}
