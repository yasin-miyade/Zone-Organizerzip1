import { useState } from "react";
import { Link } from "wouter";
import { Layers, Calculator, X } from "lucide-react";

function FooterCalculator() {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [reset, setReset] = useState(false);
  const [open, setOpen] = useState(false);

  function pressNum(n: string) {
    if (reset || display === "0") {
      setDisplay(n);
      setReset(false);
    } else setDisplay(display.length < 12 ? display + n : display);
  }
  function pressDot() {
    if (reset) {
      setDisplay("0.");
      setReset(false);
      return;
    }
    if (!display.includes(".")) setDisplay(display + ".");
  }
  function pressOp(o: string) {
    setPrev(parseFloat(display));
    setOp(o);
    setReset(true);
  }
  function calc() {
    if (prev === null || op === null) return;
    const cur = parseFloat(display);
    let r = 0;
    if (op === "+") r = prev + cur;
    else if (op === "-") r = prev - cur;
    else if (op === "×") r = prev * cur;
    else if (op === "÷") r = cur !== 0 ? prev / cur : 0;
    setDisplay(parseFloat(r.toFixed(8)).toString());
    setPrev(null);
    setOp(null);
    setReset(true);
  }
  function clear() {
    setDisplay("0");
    setPrev(null);
    setOp(null);
    setReset(false);
  }

  const btn = (label: string, action: () => void, cls = "") => (
    <button
      key={label}
      onClick={action}
      className={`rounded-lg py-2 text-sm font-medium transition-colors hover:opacity-80 active:scale-95 ${cls}`}
    >
      {label}
    </button>
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        <Calculator className="h-3.5 w-3.5" /> Quick Calculator
      </button>
      {open && (
        <div className="absolute bottom-8 left-0 z-50 w-64 bg-card border rounded-2xl shadow-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground">
              Calculator
            </span>
            <button onClick={() => setOpen(false)}>
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
          <div className="bg-muted rounded-xl px-3 py-2 text-right text-xl font-mono font-bold mb-3 overflow-hidden">
            {display}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {btn("C", clear, "col-span-2 bg-destructive/10 text-destructive")}
            {btn("÷", () => pressOp("÷"), "bg-primary/10 text-primary")}
            {btn("×", () => pressOp("×"), "bg-primary/10 text-primary")}
            {["7", "8", "9"].map((n) =>
              btn(
                n,
                () => pressNum(n),
                "bg-muted hover:bg-muted/80 text-foreground",
              ),
            )}
            {btn("-", () => pressOp("-"), "bg-primary/10 text-primary")}
            {["4", "5", "6"].map((n) =>
              btn(
                n,
                () => pressNum(n),
                "bg-muted hover:bg-muted/80 text-foreground",
              ),
            )}
            {btn("+", () => pressOp("+"), "bg-primary/10 text-primary")}
            {["1", "2", "3"].map((n) =>
              btn(
                n,
                () => pressNum(n),
                "bg-muted hover:bg-muted/80 text-foreground",
              ),
            )}
            {btn("=", calc, "row-span-1 bg-primary text-primary-foreground")}
            {btn(
              "0",
              () => pressNum("0"),
              "col-span-2 bg-muted hover:bg-muted/80 text-foreground",
            )}
            {btn(".", pressDot, "bg-muted hover:bg-muted/80 text-foreground")}
          </div>
        </div>
      )}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t bg-white py-12 mt-16">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-primary p-1.5 rounded-lg">
              <Layers className="h-4 w-4 text-primary-foreground" />
            </div>
            <h3 className="font-bold text-lg">FileZone</h3>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed mb-4">
            The go-to toolkit for everyday file work. Fast, clean, and capable.
            All processing happens securely in your browser.
          </p>
          <FooterCalculator />
        </div>

        <div>
          <h4 className="font-medium mb-4">Tools</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link
                href="/pdf"
                className="hover:text-primary transition-colors"
              >
                PDF Tools
              </Link>
            </li>
            <li>
              <Link
                href="/image"
                className="hover:text-primary transition-colors"
              >
                Image Tools
              </Link>
            </li>
            <li>
              <Link
                href="/convert"
                className="hover:text-primary transition-colors"
              >
                Converters
              </Link>
            </li>
            <li>
              <Link
                href="/calculator"
                className="hover:text-primary transition-colors"
              >
                Calculators
              </Link>
            </li>
            <li>
              <Link
                href="/text"
                className="hover:text-primary transition-colors"
              >
                Text Tools
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium mb-4">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link
                href="/about"
                className="hover:text-primary transition-colors"
              >
                About Us
              </Link>
            </li>
            <li>
              <Link
                href="/contact"
                className="hover:text-primary transition-colors"
              >
                Contact Us
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium mb-4">Legal</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link
                href="/privacy"
                className="hover:text-primary transition-colors"
              >
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link
                href="/terms"
                className="hover:text-primary transition-colors"
              >
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-12 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          &copy; {new Date().getFullYear()} FileZone. All rights reserved.
        </span>
        <div className="flex gap-4">
          <Link
            href="/privacy"
            className="hover:text-primary transition-colors"
          >
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-primary transition-colors">
            Terms
          </Link>
          <Link
            href="/contact"
            className="hover:text-primary transition-colors"
          >
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}
