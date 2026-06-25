import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

// ----- Helpers -----
function ResultBox({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border bg-muted/40 p-4 text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold text-primary">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function CalcCard({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

// ==================== AGE CALCULATOR ====================
export function AgeCalculator() {
  const [dob, setDob] = useState("");
  const [asOf, setAsOf] = useState(new Date().toISOString().split("T")[0]);
  const [result, setResult] = useState<null | { years: number; months: number; days: number; totalDays: number; nextBirthday: number }>(null);

  function calculate() {
    const birth = new Date(dob);
    const ref = new Date(asOf);
    if (isNaN(birth.getTime()) || isNaN(ref.getTime())) return;

    let years = ref.getFullYear() - birth.getFullYear();
    let months = ref.getMonth() - birth.getMonth();
    let days = ref.getDate() - birth.getDate();

    if (days < 0) { months--; const prevMonth = new Date(ref.getFullYear(), ref.getMonth(), 0); days += prevMonth.getDate(); }
    if (months < 0) { years--; months += 12; }

    const totalDays = Math.floor((ref.getTime() - birth.getTime()) / 86400000);

    const nextBd = new Date(ref.getFullYear(), birth.getMonth(), birth.getDate());
    if (nextBd <= ref) nextBd.setFullYear(ref.getFullYear() + 1);
    const nextBirthday = Math.ceil((nextBd.getTime() - ref.getTime()) / 86400000);

    setResult({ years, months, days, totalDays, nextBirthday });
  }

  return (
    <CalcCard>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Date of Birth</Label><Input type="date" value={dob} onChange={e => setDob(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>As of Date</Label><Input type="date" value={asOf} onChange={e => setAsOf(e.target.value)} /></div>
      </div>
      <Button className="w-full" onClick={calculate} data-testid="button-process">Calculate Age</Button>
      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <ResultBox label="Years" value={result.years} />
            <ResultBox label="Months" value={result.months} />
            <ResultBox label="Days" value={result.days} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ResultBox label="Total Days Lived" value={result.totalDays.toLocaleString()} />
            <ResultBox label="Days to Next Birthday" value={result.nextBirthday} />
          </div>
        </div>
      )}
    </CalcCard>
  );
}

// ==================== BMI CALCULATOR ====================
export function BmiCalculator() {
  const [unit, setUnit] = useState<"metric" | "imperial">("metric");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [feet, setFeet] = useState("");
  const [inches, setInches] = useState("");
  const [result, setResult] = useState<{ bmi: number; category: string; color: string } | null>(null);

  function calculate() {
    let h = parseFloat(height) / 100;
    let w = parseFloat(weight);
    if (unit === "imperial") {
      h = (parseFloat(feet) * 12 + parseFloat(inches || "0")) * 0.0254;
      w = w * 0.453592;
    }
    if (!h || !w) return;
    const bmi = w / (h * h);
    let category = ""; let color = "";
    if (bmi < 18.5) { category = "Underweight"; color = "text-blue-600"; }
    else if (bmi < 25) { category = "Normal weight"; color = "text-green-600"; }
    else if (bmi < 30) { category = "Overweight"; color = "text-yellow-600"; }
    else { category = "Obese"; color = "text-red-600"; }
    setResult({ bmi: Math.round(bmi * 10) / 10, category, color });
  }

  return (
    <CalcCard>
      <div className="flex gap-2">
        {(["metric", "imperial"] as const).map(u => (
          <Button key={u} variant={unit === u ? "default" : "outline"} onClick={() => setUnit(u)} className="capitalize">{u}</Button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Weight {unit === "metric" ? "(kg)" : "(lbs)"}</Label>
          <Input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="70" />
        </div>
        {unit === "metric" ? (
          <div className="space-y-1.5"><Label>Height (cm)</Label><Input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="175" /></div>
        ) : (
          <div className="space-y-1.5">
            <Label>Height</Label>
            <div className="flex gap-2">
              <Input type="number" value={feet} onChange={e => setFeet(e.target.value)} placeholder="5 ft" />
              <Input type="number" value={inches} onChange={e => setInches(e.target.value)} placeholder="9 in" />
            </div>
          </div>
        )}
      </div>
      <Button className="w-full" onClick={calculate} data-testid="button-process">Calculate BMI</Button>
      {result && (
        <div className="grid grid-cols-2 gap-3">
          <ResultBox label="BMI" value={result.bmi} />
          <div className="rounded-xl border bg-muted/40 p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Category</p>
            <p className={`text-xl font-bold ${result.color}`}>{result.category}</p>
          </div>
        </div>
      )}
      <div className="rounded-xl border p-4 text-xs space-y-1">
        <p className="font-medium mb-2">BMI Scale</p>
        {[["< 18.5", "Underweight", "text-blue-600"], ["18.5 – 24.9", "Normal", "text-green-600"], ["25 – 29.9", "Overweight", "text-yellow-600"], ["≥ 30", "Obese", "text-red-600"]].map(([r, l, c]) => (
          <div key={r} className="flex justify-between"><span className={c}>{l}</span><span className="text-muted-foreground">{r}</span></div>
        ))}
      </div>
    </CalcCard>
  );
}

// ==================== PERCENTAGE CALCULATOR ====================
export function PercentageCalculator() {
  const [mode, setMode] = useState<"of" | "change" | "is">("of");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [result, setResult] = useState<string | null>(null);

  function calculate() {
    const na = parseFloat(a), nb = parseFloat(b);
    if (isNaN(na) || isNaN(nb)) return;
    if (mode === "of") setResult(`${((na / 100) * nb).toFixed(4).replace(/\.?0+$/, "")}`);
    else if (mode === "change") setResult(`${(((nb - na) / na) * 100).toFixed(2)}%`);
    else setResult(`${((na / nb) * 100).toFixed(4).replace(/\.?0+$/, "")}%`);
  }

  const labels: Record<string, [string, string, string]> = {
    of: ["Percentage", "of number", "Result"],
    change: ["From value", "To value", "% Change"],
    is: ["Value", "is what % of", "Result"],
  };

  return (
    <CalcCard>
      <div className="flex gap-2 flex-wrap">
        {([["of", "% of Number"], ["change", "% Change"], ["is", "What % is"]] as [string, string][]).map(([m, l]) => (
          <Button key={m} variant={mode === m ? "default" : "outline"} size="sm" onClick={() => { setMode(m as "of" | "change" | "is"); setResult(null); }}>{l}</Button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>{labels[mode][0]}</Label><Input type="number" value={a} onChange={e => setA(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>{labels[mode][1]}</Label><Input type="number" value={b} onChange={e => setB(e.target.value)} /></div>
      </div>
      <Button className="w-full" onClick={calculate} data-testid="button-process">Calculate</Button>
      {result && <ResultBox label={labels[mode][2]} value={result} />}
    </CalcCard>
  );
}

// ==================== CGPA CALCULATOR ====================
export function CgpaCalculator() {
  const [cgpa, setCgpa] = useState("");
  const [scale, setScale] = useState("10");
  const [result, setResult] = useState<{ percentage: number; grade: string } | null>(null);

  function calculate() {
    const c = parseFloat(cgpa), s = parseFloat(scale);
    if (!c || !s) return;
    const percentage = (c / s) * 100;
    let grade = percentage >= 90 ? "A+" : percentage >= 80 ? "A" : percentage >= 70 ? "B" : percentage >= 60 ? "C" : percentage >= 50 ? "D" : "F";
    setResult({ percentage: Math.round(percentage * 100) / 100, grade });
  }

  return (
    <CalcCard>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>CGPA</Label><Input type="number" value={cgpa} onChange={e => setCgpa(e.target.value)} placeholder="8.5" /></div>
        <div className="space-y-1.5"><Label>Scale</Label>
          <Select value={scale} onValueChange={setScale}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10-point scale</SelectItem>
              <SelectItem value="4">4-point scale</SelectItem>
              <SelectItem value="5">5-point scale</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button className="w-full" onClick={calculate} data-testid="button-process">Calculate</Button>
      {result && (
        <div className="grid grid-cols-2 gap-3">
          <ResultBox label="Percentage" value={`${result.percentage}%`} />
          <ResultBox label="Grade" value={result.grade} />
        </div>
      )}
    </CalcCard>
  );
}

// ==================== GPA CALCULATOR ====================
const gradePoints: Record<string, number> = { "A+": 4.0, "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7, "C+": 2.3, "C": 2.0, "C-": 1.7, "D+": 1.3, "D": 1.0, "F": 0.0 };

export function GpaCalculator() {
  const [courses, setCourses] = useState([{ credits: "3", grade: "A" }]);
  const [result, setResult] = useState<number | null>(null);

  function addCourse() { setCourses(c => [...c, { credits: "3", grade: "A" }]); }
  function removeCourse(i: number) { setCourses(c => c.filter((_, j) => j !== i)); }
  function update(i: number, k: "credits" | "grade", v: string) {
    setCourses(c => c.map((row, j) => j === i ? { ...row, [k]: v } : row));
  }

  function calculate() {
    let totalPoints = 0, totalCredits = 0;
    for (const c of courses) {
      const credits = parseFloat(c.credits) || 0;
      const points = gradePoints[c.grade] ?? 0;
      totalPoints += credits * points;
      totalCredits += credits;
    }
    setResult(totalCredits ? Math.round((totalPoints / totalCredits) * 100) / 100 : 0);
  }

  return (
    <CalcCard>
      <div className="space-y-2">
        {courses.map((c, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input type="number" value={c.credits} onChange={e => update(i, "credits", e.target.value)} className="w-24" placeholder="Credits" />
            <Select value={c.grade} onValueChange={v => update(i, "grade", v)}>
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.keys(gradePoints).map(g => <SelectItem key={g} value={g}>{g} ({gradePoints[g].toFixed(1)})</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => removeCourse(i)} className="shrink-0 h-9 w-9">×</Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addCourse}>+ Add Course</Button>
      </div>
      <Button className="w-full" onClick={calculate} data-testid="button-process">Calculate GPA</Button>
      {result !== null && <ResultBox label="GPA" value={result.toFixed(2)} sub="out of 4.0" />}
    </CalcCard>
  );
}

// ==================== EMI CALCULATOR ====================
export function EmiCalculator() {
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("");
  const [tenure, setTenure] = useState("");
  const [tenureType, setTenureType] = useState<"months" | "years">("years");
  const [result, setResult] = useState<{ emi: number; totalAmount: number; totalInterest: number } | null>(null);

  function calculate() {
    const P = parseFloat(principal);
    const r = parseFloat(rate) / (100 * 12);
    const n = tenureType === "years" ? parseFloat(tenure) * 12 : parseFloat(tenure);
    if (!P || !r || !n) return;
    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalAmount = emi * n;
    setResult({ emi: Math.round(emi), totalAmount: Math.round(totalAmount), totalInterest: Math.round(totalAmount - P) });
  }

  return (
    <CalcCard>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Loan Amount (₹)</Label><Input type="number" value={principal} onChange={e => setPrincipal(e.target.value)} placeholder="500000" /></div>
        <div className="space-y-1.5"><Label>Annual Interest Rate (%)</Label><Input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="8.5" /></div>
        <div className="space-y-1.5">
          <Label>Loan Tenure</Label>
          <div className="flex gap-2">
            <Input type="number" value={tenure} onChange={e => setTenure(e.target.value)} placeholder="5" />
            <Select value={tenureType} onValueChange={v => setTenureType(v as "months" | "years")}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="years">Years</SelectItem><SelectItem value="months">Months</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <Button className="w-full" onClick={calculate} data-testid="button-process">Calculate EMI</Button>
      {result && (
        <div className="grid grid-cols-3 gap-3">
          <ResultBox label="Monthly EMI" value={`₹${result.emi.toLocaleString()}`} />
          <ResultBox label="Total Interest" value={`₹${result.totalInterest.toLocaleString()}`} />
          <ResultBox label="Total Payment" value={`₹${result.totalAmount.toLocaleString()}`} />
        </div>
      )}
    </CalcCard>
  );
}

// ==================== SIP CALCULATOR ====================
export function SipCalculator() {
  const [monthly, setMonthly] = useState("");
  const [rate, setRate] = useState("");
  const [years, setYears] = useState("");
  const [result, setResult] = useState<{ maturity: number; invested: number; returns: number } | null>(null);

  function calculate() {
    const P = parseFloat(monthly);
    const r = parseFloat(rate) / (100 * 12);
    const n = parseFloat(years) * 12;
    if (!P || !r || !n) return;
    const maturity = P * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
    const invested = P * n;
    setResult({ maturity: Math.round(maturity), invested: Math.round(invested), returns: Math.round(maturity - invested) });
  }

  return (
    <CalcCard>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5"><Label>Monthly Investment (₹)</Label><Input type="number" value={monthly} onChange={e => setMonthly(e.target.value)} placeholder="5000" /></div>
        <div className="space-y-1.5"><Label>Expected Return Rate (%/yr)</Label><Input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="12" /></div>
        <div className="space-y-1.5"><Label>Investment Period (years)</Label><Input type="number" value={years} onChange={e => setYears(e.target.value)} placeholder="10" /></div>
      </div>
      <Button className="w-full" onClick={calculate} data-testid="button-process">Calculate SIP Returns</Button>
      {result && (
        <div className="grid grid-cols-3 gap-3">
          <ResultBox label="Amount Invested" value={`₹${result.invested.toLocaleString()}`} />
          <ResultBox label="Estimated Returns" value={`₹${result.returns.toLocaleString()}`} />
          <ResultBox label="Maturity Value" value={`₹${result.maturity.toLocaleString()}`} />
        </div>
      )}
    </CalcCard>
  );
}

// ==================== GST CALCULATOR ====================
export function GstCalculator() {
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("18");
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [result, setResult] = useState<{ gst: number; total: number; cgst: number; sgst: number } | null>(null);

  function calculate() {
    const a = parseFloat(amount), r = parseFloat(rate);
    if (!a || isNaN(r)) return;
    let gst: number, total: number;
    if (mode === "add") { gst = (a * r) / 100; total = a + gst; }
    else { total = a; gst = a - a / (1 + r / 100); }
    setResult({ gst: Math.round(gst * 100) / 100, total: Math.round(total * 100) / 100, cgst: Math.round(gst * 50) / 100, sgst: Math.round(gst * 50) / 100 });
  }

  return (
    <CalcCard>
      <div className="flex gap-2">
        <Button variant={mode === "add" ? "default" : "outline"} onClick={() => setMode("add")}>Add GST</Button>
        <Button variant={mode === "remove" ? "default" : "outline"} onClick={() => setMode("remove")}>Remove GST</Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>{mode === "add" ? "Original Amount (₹)" : "Amount with GST (₹)"}</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>GST Rate</Label>
          <Select value={rate} onValueChange={setRate}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["3","5","12","18","28"].map(r => <SelectItem key={r} value={r}>{r}%</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <Button className="w-full" onClick={calculate} data-testid="button-process">Calculate GST</Button>
      {result && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ResultBox label="GST Amount" value={`₹${result.gst}`} />
          <ResultBox label="CGST (50%)" value={`₹${result.cgst}`} />
          <ResultBox label="SGST (50%)" value={`₹${result.sgst}`} />
          <ResultBox label={mode === "add" ? "Total with GST" : "Original Amount"} value={`₹${result.total}`} />
        </div>
      )}
    </CalcCard>
  );
}

// ==================== INCOME TAX CALCULATOR ====================
export function IncomeTaxCalculator() {
  const [income, setIncome] = useState("");
  const [regime, setRegime] = useState<"new" | "old">("new");
  const [result, setResult] = useState<{ tax: number; cess: number; totalTax: number; effectiveRate: number } | null>(null);

  function calculate() {
    const inc = parseFloat(income.replace(/,/g, ""));
    if (!inc) return;

    let tax = 0;
    if (regime === "new") {
      const slabs = [[300000, 0], [300000, 0.05], [300000, 0.1], [300000, 0.15], [300000, 0.2], [Infinity, 0.3]] as [number, number][];
      let remaining = Math.max(0, inc - 300000);
      for (const [slab, r] of slabs) {
        if (remaining <= 0) break;
        const taxable = Math.min(remaining, slab);
        tax += taxable * r;
        remaining -= taxable;
      }
    } else {
      const slabs = [[250000, 0], [250000, 0.05], [500000, 0.2], [Infinity, 0.3]] as [number, number][];
      let remaining = inc;
      for (const [slab, r] of slabs) {
        if (remaining <= 0) break;
        const taxable = Math.min(remaining, slab);
        tax += taxable * r;
        remaining -= taxable;
      }
    }
    const cess = tax * 0.04;
    const total = tax + cess;
    setResult({ tax: Math.round(tax), cess: Math.round(cess), totalTax: Math.round(total), effectiveRate: Math.round((total / inc) * 1000) / 10 });
  }

  return (
    <CalcCard>
      <div className="flex gap-2">
        <Button variant={regime === "new" ? "default" : "outline"} onClick={() => setRegime("new")}>New Regime</Button>
        <Button variant={regime === "old" ? "default" : "outline"} onClick={() => setRegime("old")}>Old Regime</Button>
      </div>
      <div className="space-y-1.5"><Label>Annual Income (₹)</Label><Input type="number" value={income} onChange={e => setIncome(e.target.value)} placeholder="1000000" /></div>
      <Button className="w-full" onClick={calculate} data-testid="button-process">Calculate Tax</Button>
      {result && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ResultBox label="Income Tax" value={`₹${result.tax.toLocaleString()}`} />
          <ResultBox label="Health & Education Cess (4%)" value={`₹${result.cess.toLocaleString()}`} />
          <ResultBox label="Total Tax" value={`₹${result.totalTax.toLocaleString()}`} />
          <ResultBox label="Effective Tax Rate" value={`${result.effectiveRate}%`} />
        </div>
      )}
      <p className="text-xs text-muted-foreground">*This is an estimate for FY 2024-25 India. Consult a tax advisor for accurate computation.</p>
    </CalcCard>
  );
}

// ==================== CURRENCY CONVERTER ====================
const FALLBACK_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.5, JPY: 150.2, CAD: 1.36, AUD: 1.53,
  CHF: 0.90, CNY: 7.24, SGD: 1.34, HKD: 7.82, NOK: 10.55, SEK: 10.42, NZD: 1.63, AED: 3.67,
  MXN: 17.15, BRL: 4.97, ZAR: 18.63, KRW: 1325, THB: 35.2, MYR: 4.72,
};

const CURRENCY_NAMES: Record<string, string> = {
  USD: "US Dollar", EUR: "Euro", GBP: "British Pound", INR: "Indian Rupee",
  JPY: "Japanese Yen", CAD: "Canadian Dollar", AUD: "Australian Dollar",
  CHF: "Swiss Franc", CNY: "Chinese Yuan", SGD: "Singapore Dollar",
  HKD: "Hong Kong Dollar", NOK: "Norwegian Krone", SEK: "Swedish Krona",
  NZD: "New Zealand Dollar", AED: "UAE Dirham", MXN: "Mexican Peso",
  BRL: "Brazilian Real", ZAR: "South African Rand", KRW: "South Korean Won",
  THB: "Thai Baht", MYR: "Malaysian Ringgit",
};

export function CurrencyConverter() {
  const [amount, setAmount] = useState("1");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("INR");
  const [result, setResult] = useState<number | null>(null);
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [ratesDate, setRatesDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingLive, setUsingLive] = useState(false);

  useEffect(() => {
    fetch("https://open.er-api.com/v6/latest/USD")
      .then(r => r.json())
      .then(data => {
        if (data.rates && typeof data.rates === "object") {
          const supported: Record<string, number> = {};
          for (const key of Object.keys(FALLBACK_RATES)) {
            if (data.rates[key]) supported[key] = data.rates[key];
          }
          setRates(supported);
          setRatesDate(data.time_last_update_utc?.split(" ").slice(0, 4).join(" ") ?? null);
          setUsingLive(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function convert() {
    const a = parseFloat(amount);
    if (!a || isNaN(a)) return;
    const converted = (a / rates[from]) * rates[to];
    setResult(Math.round(converted * 100000) / 100000);
  }

  const currencies = Object.keys(rates).sort();

  return (
    <CalcCard>
      {loading && <p className="text-xs text-muted-foreground text-center">Fetching live exchange rates…</p>}
      <div className="space-y-1.5"><Label>Amount</Label>
        <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="0" step="any" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>From</Label>
          <Select value={from} onValueChange={setFrom}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {currencies.map(c => <SelectItem key={c} value={c}>{c} — {CURRENCY_NAMES[c] ?? c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>To</Label>
          <Select value={to} onValueChange={setTo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {currencies.map(c => <SelectItem key={c} value={c}>{c} — {CURRENCY_NAMES[c] ?? c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button className="w-full" onClick={convert} data-testid="button-process">Convert</Button>
      {result !== null && (
        <div className="rounded-xl border bg-muted/40 p-5 text-center space-y-2">
          <p className="text-sm text-muted-foreground">{amount} {from} =</p>
          <p className="text-3xl font-bold text-primary">{result.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })} {to}</p>
          <p className="text-xs text-muted-foreground">1 {from} = {(rates[to] / rates[from]).toFixed(5)} {to}</p>
          <p className="text-xs text-muted-foreground">
            {usingLive
              ? <span className="text-emerald-600 font-medium">✓ Live rates{ratesDate ? ` · Updated ${ratesDate}` : ""}</span>
              : "Using cached rates"}
          </p>
        </div>
      )}
    </CalcCard>
  );
}

// ==================== SCIENTIFIC CALCULATOR ====================
export function ScientificCalculator() {
  const [display, setDisplay] = useState("0");
  const [expression, setExpression] = useState("");
  const [error, setError] = useState(false);
  const [shift, setShift] = useState(false);

  function press(val: string) {
    setError(false);
    if (display === "0" || error) setDisplay(val.replace(/[^0-9.]/g, "") || val);
    else setDisplay(d => d + val);
    setExpression(e => e + val);
  }

  function clear() { setDisplay("0"); setExpression(""); setError(false); }
  function del() {
    setDisplay(d => d.length > 1 ? d.slice(0, -1) : "0");
    setExpression(e => e.slice(0, -1));
  }

  function calc() {
    try {
      // Replace math functions
      let expr = expression
        .replace(/sin\(/g, "Math.sin(")
        .replace(/cos\(/g, "Math.cos(")
        .replace(/tan\(/g, "Math.tan(")
        .replace(/asin\(/g, "Math.asin(")
        .replace(/acos\(/g, "Math.acos(")
        .replace(/atan\(/g, "Math.atan(")
        .replace(/log\(/g, "Math.log10(")
        .replace(/ln\(/g, "Math.log(")
        .replace(/√\(/g, "Math.sqrt(")
        .replace(/π/g, String(Math.PI))
        .replace(/e/g, String(Math.E))
        .replace(/\^/g, "**");
      // eslint-disable-next-line no-new-func
      const res = Function(`"use strict"; return (${expr})`)();
      const num = parseFloat(res.toFixed(10));
      setDisplay(String(num));
      setExpression(String(num));
    } catch {
      setDisplay("Error");
      setError(true);
    }
  }

  function applyFn(fn: string) {
    try {
      const val = parseFloat(display);
      let res: number;
      switch (fn) {
        case "sin": res = Math.sin(val * Math.PI / 180); break;
        case "cos": res = Math.cos(val * Math.PI / 180); break;
        case "tan": res = Math.tan(val * Math.PI / 180); break;
        case "asin": res = Math.asin(val) * 180 / Math.PI; break;
        case "acos": res = Math.acos(val) * 180 / Math.PI; break;
        case "atan": res = Math.atan(val) * 180 / Math.PI; break;
        case "log": res = Math.log10(val); break;
        case "ln": res = Math.log(val); break;
        case "sqrt": res = Math.sqrt(val); break;
        case "sq": res = val * val; break;
        case "inv": res = 1 / val; break;
        case "abs": res = Math.abs(val); break;
        case "neg": res = -val; break;
        case "fact": {
          let f = 1; for (let i = 2; i <= val; i++) f *= i; res = f; break;
        }
        default: res = val;
      }
      setDisplay(String(parseFloat(res.toFixed(10))));
      setExpression(String(parseFloat(res.toFixed(10))));
    } catch { setDisplay("Error"); setError(true); }
  }

  const row = (btns: [string, string, (() => void)?][]) => (
    <div className="flex gap-1.5">
      {btns.map(([label, cls, fn]) => (
        <button key={label} onClick={fn ?? (() => press(label))}
          className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${cls}`}>
          {label}
        </button>
      ))}
    </div>
  );

  const num = "bg-card border hover:bg-muted";
  const op = "bg-primary/10 text-primary hover:bg-primary/20";
  const fn2 = "bg-muted hover:bg-muted/70 text-xs";
  const eq = "bg-primary text-primary-foreground hover:bg-primary/90";
  const red = "bg-red-100 text-red-700 hover:bg-red-200";

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-muted/30 p-4 text-right">
        <p className="text-xs text-muted-foreground h-4 truncate">{expression || ""}</p>
        <p className={`text-3xl font-mono font-bold mt-1 ${error ? "text-destructive" : ""}`}>{display}</p>
      </div>
      <div className="space-y-1.5">
        {row([["sin", fn2, () => applyFn("sin")], ["cos", fn2, () => applyFn("cos")], ["tan", fn2, () => applyFn("tan")], ["log", fn2, () => applyFn("log")], ["ln", fn2, () => applyFn("ln")]])}
        {row([["x²", fn2, () => applyFn("sq")], ["√", fn2, () => applyFn("sqrt")], ["1/x", fn2, () => applyFn("inv")], ["n!", fn2, () => applyFn("fact")], ["±", fn2, () => applyFn("neg")]])}
        {row([["C", red, clear], ["DEL", red, del], ["(", op, () => press("(")], [")", op, () => press(")")], ["%", op, () => press("%")]])}
        {row([["7", num], ["8", num], ["9", num], ["÷", op, () => press("/")], ["^", op, () => press("^")]])}
        {row([["4", num], ["5", num], ["6", num], ["×", op, () => press("*")], ["π", op, () => press("π")]])}
        {row([["1", num], ["2", num], ["3", num], ["-", op, () => press("-")], ["e", op, () => press("e")]])}
        {row([["0", num], [".", num], ["00", num], ["+", op, () => press("+")], ["=", eq, calc]])}
      </div>
    </div>
  );
}

// ==================== LOAN CALCULATOR ====================
export function LoanCalculator() {
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("");
  const [years, setYears] = useState("");
  const [result, setResult] = useState<{ emi: number; total: number; interest: number; schedule: { month: number; emi: number; principal: number; interest: number; balance: number }[] } | null>(null);

  function calculate() {
    const P = parseFloat(principal);
    const r = parseFloat(rate) / (100 * 12);
    const n = parseFloat(years) * 12;
    if (!P || !r || !n) return;
    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    let balance = P;
    const schedule = [];
    for (let i = 1; i <= Math.min(n, 360); i++) {
      const interestPart = balance * r;
      const principalPart = emi - interestPart;
      balance -= principalPart;
      schedule.push({ month: i, emi: Math.round(emi), principal: Math.round(principalPart), interest: Math.round(interestPart), balance: Math.max(0, Math.round(balance)) });
    }
    setResult({ emi: Math.round(emi), total: Math.round(emi * n), interest: Math.round(emi * n - P), schedule });
  }

  return (
    <CalcCard>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5"><Label>Loan Amount (₹)</Label><Input type="number" value={principal} onChange={e => setPrincipal(e.target.value)} placeholder="1000000" /></div>
        <div className="space-y-1.5"><Label>Annual Rate (%)</Label><Input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="8.5" /></div>
        <div className="space-y-1.5"><Label>Term (years)</Label><Input type="number" value={years} onChange={e => setYears(e.target.value)} placeholder="20" /></div>
      </div>
      <Button className="w-full" onClick={calculate} data-testid="button-process">Calculate</Button>
      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <ResultBox label="Monthly EMI" value={`₹${result.emi.toLocaleString()}`} />
            <ResultBox label="Total Interest" value={`₹${result.interest.toLocaleString()}`} />
            <ResultBox label="Total Payment" value={`₹${result.total.toLocaleString()}`} />
          </div>
          <div className="rounded-xl border overflow-auto max-h-64">
            <table className="w-full text-xs">
              <thead className="bg-muted sticky top-0"><tr>
                {["Month", "EMI", "Principal", "Interest", "Balance"].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}
              </tr></thead>
              <tbody>
                {result.schedule.slice(0, 12).map(row => (
                  <tr key={row.month} className="border-t">
                    <td className="px-3 py-1.5">{row.month}</td>
                    <td className="px-3 py-1.5">₹{row.emi.toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-green-700">₹{row.principal.toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-red-600">₹{row.interest.toLocaleString()}</td>
                    <td className="px-3 py-1.5">₹{row.balance.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.schedule.length > 12 && <p className="text-xs text-center text-muted-foreground py-2">Showing first 12 months of {result.schedule.length}</p>}
          </div>
        </div>
      )}
    </CalcCard>
  );
}

// ==================== DISCOUNT CALCULATOR ====================
export function DiscountCalculator() {
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [mode, setMode] = useState<"pct" | "amt">("pct");
  const [result, setResult] = useState<{ saved: number; finalPrice: number; discountPct: number } | null>(null);

  function calculate() {
    const p = parseFloat(price), d = parseFloat(discount);
    if (!p || isNaN(d)) return;
    let saved: number;
    if (mode === "pct") saved = (p * d) / 100;
    else saved = d;
    const finalPrice = p - saved;
    setResult({ saved: Math.round(saved * 100) / 100, finalPrice: Math.round(finalPrice * 100) / 100, discountPct: Math.round((saved / p) * 10000) / 100 });
  }

  return (
    <CalcCard>
      <div className="flex gap-2">
        <Button variant={mode === "pct" ? "default" : "outline"} onClick={() => setMode("pct")}>% Discount</Button>
        <Button variant={mode === "amt" ? "default" : "outline"} onClick={() => setMode("amt")}>Fixed Amount</Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Original Price</Label><Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="1000" /></div>
        <div className="space-y-1.5"><Label>{mode === "pct" ? "Discount (%)" : "Discount Amount"}</Label><Input type="number" value={discount} onChange={e => setDiscount(e.target.value)} placeholder={mode === "pct" ? "20" : "200"} /></div>
      </div>
      <Button className="w-full" onClick={calculate} data-testid="button-process">Calculate Discount</Button>
      {result && (
        <div className="grid grid-cols-3 gap-3">
          <ResultBox label="You Save" value={`₹${result.saved}`} />
          <ResultBox label="Discount" value={`${result.discountPct}%`} />
          <ResultBox label="Final Price" value={`₹${result.finalPrice}`} />
        </div>
      )}
    </CalcCard>
  );
}

// ==================== ATTENDANCE CALCULATOR ====================
export function AttendanceCalculator() {
  const [attended, setAttended] = useState("");
  const [total, setTotal] = useState("");
  const [required, setRequired] = useState("75");
  const [result, setResult] = useState<{ pct: number; needed: number; canSkip: number; status: string } | null>(null);

  function calculate() {
    const a = parseFloat(attended), t = parseFloat(total), r = parseFloat(required) / 100;
    if (isNaN(a) || isNaN(t) || !t) return;
    const pct = (a / t) * 100;
    const needed = Math.ceil((r * t - a) / (1 - r));
    const canSkip = Math.floor((a - r * t) / r);
    const status = pct >= parseFloat(required) ? "✅ Eligible" : "❌ Short";
    setResult({ pct: Math.round(pct * 100) / 100, needed: Math.max(0, needed), canSkip: Math.max(0, canSkip), status });
  }

  return (
    <CalcCard>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Classes Attended</Label><Input type="number" value={attended} onChange={e => setAttended(e.target.value)} placeholder="60" /></div>
        <div className="space-y-1.5"><Label>Total Classes</Label><Input type="number" value={total} onChange={e => setTotal(e.target.value)} placeholder="80" /></div>
      </div>
      <div className="space-y-1.5"><Label>Required Attendance (%)</Label>
        <Select value={required} onValueChange={setRequired}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{["60","65","70","75","80","85"].map(r => <SelectItem key={r} value={r}>{r}%</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Button className="w-full" onClick={calculate} data-testid="button-process">Calculate Attendance</Button>
      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <ResultBox label="Current Attendance" value={`${result.pct}%`} />
            <div className="rounded-xl border bg-muted/40 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <p className="text-xl font-bold">{result.status}</p>
            </div>
          </div>
          {result.needed > 0 && <div className="rounded-xl border bg-red-50 p-4 text-center"><p className="text-sm text-red-700">You need to attend <strong>{result.needed}</strong> more consecutive classes to reach {required}%</p></div>}
          {result.canSkip > 0 && <div className="rounded-xl border bg-green-50 p-4 text-center"><p className="text-sm text-green-700">You can skip up to <strong>{result.canSkip}</strong> more classes and still maintain {required}%</p></div>}
        </div>
      )}
    </CalcCard>
  );
}

// ==================== DATE DIFFERENCE ====================
export function DateDifference() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState(new Date().toISOString().split("T")[0]);
  const [result, setResult] = useState<{ days: number; weeks: number; months: number; years: number; weekdays: number; weekends: number } | null>(null);

  function calculate() {
    const s = new Date(start), e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return;
    const diff = Math.abs(e.getTime() - s.getTime());
    const days = Math.floor(diff / 86400000);
    const weeks = Math.floor(days / 7);
    const months = Math.abs(e.getMonth() - s.getMonth() + (e.getFullYear() - s.getFullYear()) * 12);
    const years = Math.abs(e.getFullYear() - s.getFullYear());
    let weekdays = 0, weekends = 0;
    const cur = new Date(Math.min(s.getTime(), e.getTime()));
    for (let i = 0; i < days; i++) {
      const day = cur.getDay();
      if (day === 0 || day === 6) weekends++; else weekdays++;
      cur.setDate(cur.getDate() + 1);
    }
    setResult({ days, weeks, months, years, weekdays, weekends });
  }

  return (
    <CalcCard>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={start} onChange={e => setStart(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>End Date</Label><Input type="date" value={end} onChange={e => setEnd(e.target.value)} /></div>
      </div>
      <Button className="w-full" onClick={calculate} data-testid="button-process">Calculate Difference</Button>
      {result && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <ResultBox label="Days" value={result.days.toLocaleString()} />
          <ResultBox label="Weeks" value={result.weeks.toLocaleString()} />
          <ResultBox label="Months" value={result.months} />
          <ResultBox label="Years" value={result.years} />
          <ResultBox label="Weekdays" value={result.weekdays.toLocaleString()} />
          <ResultBox label="Weekends" value={result.weekends.toLocaleString()} />
        </div>
      )}
    </CalcCard>
  );
}
