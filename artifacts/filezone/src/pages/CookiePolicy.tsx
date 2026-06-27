import { useState, useEffect } from "react";
import { Cookie } from "lucide-react";
import { SEO } from "@/components/SEO";

export function CookiePolicy() {
  const [emailPrivacy, setEmailPrivacy] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/public-settings")
      .then(res => res.json())
      .then(data => {
        setEmailPrivacy(data.email_privacy !== undefined ? data.email_privacy : "");
      })
      .catch(() => {
        setEmailPrivacy("");
      });
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <SEO
        title="Cookie Policy"
        description="5toolbox's cookie policy. Learn about what cookies we use, why we use them, and how you can control them."
        keywords="cookie policy, 5toolbox cookies, privacy"
      />
      <div className="text-center mb-12">
        <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-4">
          <Cookie className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-3">Cookie Policy</h1>
        <p className="text-muted-foreground text-sm">Last updated: June 2026 · 5toolbox</p>
      </div>

      <div className="prose prose-sm max-w-none space-y-8">
        <section className="p-6 rounded-2xl border bg-card">
          <h2 className="text-xl font-semibold mb-3">1. What Are Cookies?</h2>
          <p className="text-muted-foreground leading-relaxed">
            Cookies are small text files that are placed on your device (computer, smartphone, or tablet) when you visit a website. They are widely used to make websites work efficiently, provide a better user experience, and give website owners information about how their site is being used.
          </p>
        </section>

        <section className="p-6 rounded-2xl border bg-card">
          <h2 className="text-xl font-semibold mb-3">2. How We Use Cookies</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            5toolbox uses a minimal set of cookies to operate the Service. We respect your privacy and do not use cookies to track you across other websites or build advertising profiles.
          </p>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-muted/40 border">
              <h3 className="font-semibold text-sm mb-1">Essential Cookies</h3>
              <p className="text-sm text-muted-foreground">Required for the website to function. These include session cookies for the admin interface. You cannot opt out of these cookies as they are necessary for the Service to operate.</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/40 border">
              <h3 className="font-semibold text-sm mb-1">Preference Cookies</h3>
              <p className="text-sm text-muted-foreground">We store your cookie consent preference locally in your browser so you are not asked repeatedly. This is stored in <code className="text-xs bg-muted px-1 rounded">localStorage</code> and does not leave your device.</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/40 border">
              <h3 className="font-semibold text-sm mb-1">Advertising Cookies (Google AdSense)</h3>
              <p className="text-sm text-muted-foreground">5toolbox uses Google AdSense to display advertisements. Google may use cookies to serve ads based on your prior visits to our website or other websites. Google's use of advertising cookies enables it and its partners to serve ads based on your visit to our site and/or other sites on the Internet. You may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>.</p>
            </div>
          </div>
        </section>

        <section className="p-6 rounded-2xl border bg-card">
          <h2 className="text-xl font-semibold mb-3">3. Third-Party Cookies</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Some cookies on our site are set by third parties. We do not control these cookies. The main third-party cookie provider we use is:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><strong>Google AdSense / DoubleClick</strong> — for advertising. <a href="https://policies.google.com/technologies/cookies" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">View Google's cookie policy</a>.</li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl border bg-card">
          <h2 className="text-xl font-semibold mb-3">4. Your Cookie Choices</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">You have the following options to control cookies:</p>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="text-primary shrink-0">•</span><span><strong>Browser Settings:</strong> Most browsers allow you to refuse or delete cookies through their settings. See your browser's help documentation for instructions.</span></li>
            <li className="flex gap-2"><span className="text-primary shrink-0">•</span><span><strong>Google Opt-Out:</strong> Visit <a href="https://www.google.com/settings/ads" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Google Ad Settings</a> or install the <a href="https://tools.google.com/dlpage/gaoptout" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Google Analytics Opt-Out Browser Add-on</a>.</span></li>
            <li className="flex gap-2"><span className="text-primary shrink-0">•</span><span><strong>Network Advertising Initiative:</strong> Visit the <a href="https://optout.networkadvertising.org/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">NAI opt-out page</a> to opt out of interest-based advertising.</span></li>
          </ul>
          <p className="text-sm text-muted-foreground mt-3">Note: Disabling cookies may affect some functionality of the Service (such as the admin interface), but will not affect the file processing tools.</p>
        </section>

        <section className="p-6 rounded-2xl border bg-card">
          <h2 className="text-xl font-semibold mb-3">5. Changes to This Policy</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update this Cookie Policy from time to time to reflect changes in the cookies we use or for other operational, legal, or regulatory reasons. Please revisit this page regularly to stay informed about our use of cookies.
          </p>
        </section>

        <section className="p-6 rounded-2xl border bg-card">
          <h2 className="text-xl font-semibold mb-3">6. Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you have any questions about our use of cookies, please contact us
            {emailPrivacy ? (
              <>
                {" "}at{" "}
                <a href={`mailto:${emailPrivacy}`} className="text-primary hover:underline">{emailPrivacy}</a>{" "}
                or use our
              </>
            ) : (
              <>
                {" "}via our
              </>
            )}{" "}
            <a href="/contact" className="text-primary hover:underline">Contact Us</a> page.
          </p>
        </section>
      </div>
    </div>
  );
}
