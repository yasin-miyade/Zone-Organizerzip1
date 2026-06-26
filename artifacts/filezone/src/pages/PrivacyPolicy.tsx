import { Shield } from "lucide-react";
import { SEO } from "@/components/SEO";

export function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <SEO
        title="Privacy Policy"
        description="5toolbox's privacy policy. We never upload your files. All processing is local. We collect only anonymous usage statistics."
      />
      <div className="text-center mb-12">
        <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-4">
          <Shield className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-3">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm">Last updated: June 2026 · 5toolbox</p>
      </div>

      <div className="prose prose-sm max-w-none space-y-8">
        <section className="p-6 rounded-2xl border bg-card">
          <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
          <p className="text-muted-foreground leading-relaxed">
            Welcome to 5toolbox ("we", "our", or "us"). We are committed to protecting your privacy. This Privacy Policy explains how 5toolbox handles information when you use our website and tools at 5toolbox.app (the "Service").
          </p>
        </section>

        <section className="p-6 rounded-2xl border bg-card">
          <h2 className="text-xl font-semibold mb-3">2. Information We Do Not Collect</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            5toolbox processes all files <strong>locally in your browser</strong>. This means:
          </p>
          <ul className="space-y-2 text-muted-foreground text-sm list-none">
            {[
              "Your files are never uploaded to our servers",
              "We never see the contents of any file you process",
              "No file metadata (name, size, type) is stored or transmitted",
              "We do not collect your name, email address, or any personal identifiers",
              "We do not create user accounts or profiles",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="p-6 rounded-2xl border bg-card">
          <h2 className="text-xl font-semibold mb-3">3. Anonymous Usage Statistics</h2>
          <p className="text-muted-foreground leading-relaxed">
            We collect minimal, anonymous statistics solely to improve our Service. This includes aggregate counts of which tools are used (e.g., "PDF Merge was used 500 times today"). This data contains no personal information and cannot be linked to any individual user. We may also collect general analytics such as page visit counts and geographic region (country level only) via privacy-respecting analytics tools.
          </p>
        </section>

        <section className="p-6 rounded-2xl border bg-card">
          <h2 className="text-xl font-semibold mb-3">4. Cookies</h2>
          <p className="text-muted-foreground leading-relaxed">
            5toolbox uses only essential, functional cookies (such as session tokens for our admin interface). We do not use tracking cookies, advertising cookies, or third-party analytics cookies. You can disable cookies in your browser settings without affecting the functionality of 5toolbox's file processing tools.
          </p>
        </section>

        <section className="p-6 rounded-2xl border bg-card">
          <h2 className="text-xl font-semibold mb-3">5. Third-Party Services</h2>
          <p className="text-muted-foreground leading-relaxed">
            5toolbox may use the following third-party services:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><strong>Google Fonts</strong> – for typography (subject to Google's privacy policy)</li>
            <li><strong>Google AdSense</strong> – for displaying relevant advertisements (subject to Google's privacy policy). AdSense may use cookies to serve ads based on your prior visits.</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-3">
            You can opt out of Google's use of cookies by visiting Google's Ads Settings or the Network Advertising Initiative opt-out page.
          </p>
        </section>

        <section className="p-6 rounded-2xl border bg-card">
          <h2 className="text-xl font-semibold mb-3">6. Data Security</h2>
          <p className="text-muted-foreground leading-relaxed">
            Because we do not collect or store your files or personal data, there is no risk of your files being exposed through a data breach. All HTTPS connections are encrypted in transit. Our backend stores only anonymous tool usage counts.
          </p>
        </section>

        <section className="p-6 rounded-2xl border bg-card">
          <h2 className="text-xl font-semibold mb-3">7. Children's Privacy</h2>
          <p className="text-muted-foreground leading-relaxed">
            5toolbox does not knowingly collect any information from children under the age of 13. Our Service is intended for general audiences. If you believe we have inadvertently collected information from a child, please contact us immediately.
          </p>
        </section>

        <section className="p-6 rounded-2xl border bg-card">
          <h2 className="text-xl font-semibold mb-3">8. Changes to This Policy</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date. Continued use of the Service after changes constitutes your acceptance of the updated policy.
          </p>
        </section>

        <section className="p-6 rounded-2xl border bg-card">
          <h2 className="text-xl font-semibold mb-3">9. Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you have any questions about this Privacy Policy, please contact us at{" "}
            <a href="mailto:privacy@5toolbox.app" className="text-primary hover:underline">privacy@5toolbox.app</a>{" "}
            or use our <a href="/contact" className="text-primary hover:underline">Contact Us</a> page.
          </p>
        </section>
      </div>
    </div>
  );
}
