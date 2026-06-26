import { FileText } from "lucide-react";
import { SEO } from "@/components/SEO";

export function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <SEO
        title="Terms of Service"
        description="5toolbox terms of service. Free to use, no account required. All file processing happens locally in your browser."
      />
      <div className="text-center mb-12">
        <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-4">
          <FileText className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-3">Terms of Service</h1>
        <p className="text-muted-foreground text-sm">Last updated: June 2026 · 5toolbox</p>
      </div>

      <div className="space-y-6">
        <section className="p-6 rounded-2xl border bg-card">
          <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            By accessing and using 5toolbox ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service. These terms apply to all visitors and users of 5toolbox.
          </p>
        </section>

        <section className="p-6 rounded-2xl border bg-card">
          <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
          <p className="text-muted-foreground leading-relaxed">
            5toolbox provides free, browser-based file processing tools including PDF management, image compression and conversion, file format conversion, text analysis tools, and calculators. All file processing occurs locally in your browser. We do not store or transmit your files.
          </p>
        </section>

        <section className="p-6 rounded-2xl border bg-card">
          <h2 className="text-xl font-semibold mb-3">3. Acceptable Use</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">You agree to use 5toolbox only for lawful purposes. You may not use the Service to:</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {[
              "Process files containing illegal, harmful, or infringing content",
              "Attempt to reverse-engineer, disassemble, or hack any part of the Service",
              "Engage in any automated scraping or bulk usage that degrades Service performance for others",
              "Use the Service to violate any applicable laws or regulations",
              "Infringe upon the intellectual property rights of others",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-destructive mt-0.5">✗</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="p-6 rounded-2xl border bg-card">
          <h2 className="text-xl font-semibold mb-3">4. Intellectual Property</h2>
          <p className="text-muted-foreground leading-relaxed">
            The 5toolbox name, logo, website design, and all underlying software are the intellectual property of 5toolbox and its licensors. You are granted a limited, non-exclusive, non-transferable license to access and use the Service for personal, non-commercial purposes. You retain full ownership of any files you process through our tools.
          </p>
        </section>

        <section className="p-6 rounded-2xl border bg-card">
          <h2 className="text-xl font-semibold mb-3">5. Disclaimer of Warranties</h2>
          <p className="text-muted-foreground leading-relaxed">
            5toolbox is provided "as is" and "as available" without warranties of any kind, express or implied. We do not warrant that the Service will be uninterrupted, error-free, or completely secure. We do not guarantee the accuracy of tool outputs. Use the Service at your own risk and always keep backups of important files before processing.
          </p>
        </section>

        <section className="p-6 rounded-2xl border bg-card">
          <h2 className="text-xl font-semibold mb-3">6. Limitation of Liability</h2>
          <p className="text-muted-foreground leading-relaxed">
            To the maximum extent permitted by law, 5toolbox shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of data, loss of profits, or business interruption, arising from your use or inability to use the Service, even if we have been advised of the possibility of such damages.
          </p>
        </section>

        <section className="p-6 rounded-2xl border bg-card">
          <h2 className="text-xl font-semibold mb-3">7. Advertising</h2>
          <p className="text-muted-foreground leading-relaxed">
            5toolbox may display advertisements through Google AdSense to support the free operation of the Service. By using 5toolbox, you acknowledge that advertisements may be displayed. We are not responsible for the content of third-party advertisements. You can review Google's advertising policies at google.com/policies/technologies/ads.
          </p>
        </section>

        <section className="p-6 rounded-2xl border bg-card">
          <h2 className="text-xl font-semibold mb-3">8. Modifications to Service</h2>
          <p className="text-muted-foreground leading-relaxed">
            We reserve the right to modify, suspend, or discontinue any part of the Service at any time without notice. We may also update these Terms of Service from time to time. Continued use of the Service after any modifications constitutes your acceptance of the updated terms.
          </p>
        </section>

        <section className="p-6 rounded-2xl border bg-card">
          <h2 className="text-xl font-semibold mb-3">9. Governing Law</h2>
          <p className="text-muted-foreground leading-relaxed">
            These Terms of Service shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles. Any disputes arising from use of the Service shall be resolved through good-faith negotiation or, if necessary, binding arbitration.
          </p>
        </section>

        <section className="p-6 rounded-2xl border bg-card">
          <h2 className="text-xl font-semibold mb-3">10. Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            For questions about these Terms, contact us at{" "}
            <a href="mailto:legal@5toolbox.app" className="text-primary hover:underline">legal@5toolbox.app</a>{" "}
            or visit our <a href="/contact" className="text-primary hover:underline">Contact Us</a> page.
          </p>
        </section>
      </div>
    </div>
  );
}
