import { useState } from "react";
import { SEO } from "@/components/SEO";
import { Mail, MessageSquare, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContactUs() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      setSent(true);
    } catch {
      alert("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <SEO
        title="Contact Us"
        description="Get in touch with the 5toolbox team. Have a question, found a bug, or want to suggest a feature? We'd love to hear from you."
        keywords="contact 5toolbox, support, feedback"
      />
      <div className="text-center mb-12">
        <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-4">
          <Mail className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-3">Contact Us</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Have a question, suggestion, or found a bug? We'd love to hear from you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Info cards */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl border bg-card">
            <div className="p-2.5 rounded-lg bg-primary/10 w-fit mb-3">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Email Us</h3>
            <p className="text-sm text-muted-foreground">{" "}
              <a href="mailto:hello@5toolbox.app" className="text-primary hover:underline">Contact Us</a>
            </p>
          </div>

          <div className="p-5 rounded-2xl border bg-card">
            <div className="p-2.5 rounded-lg bg-primary/10 w-fit mb-3">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Support</h3>
            <p className="text-sm text-muted-foreground">
              For tool issues or feature requests, use the form below. We read every message.
            </p>
          </div>

          <div className="p-5 rounded-2xl border bg-card">
            <div className="p-2.5 rounded-lg bg-primary/10 w-fit mb-3">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Response Time</h3>
            <p className="text-sm text-muted-foreground">
              We typically respond within 1–2 business days.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-2">
          {sent ? (
            <div className="h-full flex flex-col items-center justify-center p-10 rounded-2xl border bg-card text-center">
              <div className="p-4 rounded-full bg-green-100 mb-4">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Message Sent!</h2>
              <p className="text-muted-foreground mb-6">
                Thanks for reaching out, {form.name}. We'll get back to you at <strong>{form.email}</strong> within 1–2 business days.
              </p>
              <Button variant="outline" onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }); }}>
                Send another message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 rounded-2xl border bg-card space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Your Name <span className="text-destructive">*</span></Label>
                  <Input id="name" name="name" value={form.name} onChange={handleChange} placeholder="Jane Smith" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address <span className="text-destructive">*</span></Label>
                  <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="jane@example.com" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject <span className="text-destructive">*</span></Label>
                <Input id="subject" name="subject" value={form.subject} onChange={handleChange} placeholder="e.g. Bug report, Feature request, General question" required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message">Message <span className="text-destructive">*</span></Label>
                <Textarea
                  id="message"
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Describe your question or issue in detail..."
                  rows={6}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending…" : "Send Message"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                By submitting this form, you agree to our{" "}
                <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
