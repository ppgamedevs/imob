import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ImobIntelBot - Crawler Information",
  description: "Information about the ImobIntel web crawler",
};

export default function BotPage() {
  return (
    <div className="container max-w-3xl py-12">
      <h1 className="text-3xl font-bold mb-6">ImobIntelBot</h1>

      <div className="prose dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-3">About Our Crawler</h2>
          <p>
            ImobIntelBot is the web crawler for ImobIntel.ro, a platform that
            helps users analyze real estate listings in București, Romania.
          </p>
          <p>
            <strong>User-Agent:</strong> ImobIntelBot/1.0 (+https://imob.ro/bot)
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Ethical Crawling</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Respects robots.txt:</strong> We honor all robots.txt
              directives including Disallow rules and Crawl-delay instructions
            </li>
            <li>
              <strong>Rate limiting:</strong> Minimum 2-second delay between
              requests to the same domain (configurable per site)
            </li>
            <li>
              <strong>Conditional requests:</strong> Uses ETag and
              Last-Modified headers to minimize unnecessary bandwidth
            </li>
            <li>
              <strong>Reasonable timeouts:</strong> All requests timeout after
              15 seconds to avoid hanging connections
            </li>
            <li>
              <strong>Focus:</strong> Only crawls publicly available real
              estate listings in București
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">
            Request to Block or Modify
          </h2>
          <p>
            If you operate a real estate website and wish to block our crawler
            or adjust crawl rate, you can:
          </p>
          <ol className="list-decimal pl-6 space-y-2">
            <li>
              Add rules to your <code>robots.txt</code> file:
              <pre className="bg-muted p-4 rounded mt-2 overflow-x-auto">
                {`User-agent: ImobIntelBot
Disallow: /

# Or to set a slower crawl rate:
User-agent: ImobIntelBot
Crawl-delay: 10`}
              </pre>
            </li>
            <li>
              Contact us at{" "}
              <a
                href="mailto:contact@imob.ro"
                className="text-primary hover:underline"
              >
                contact@imob.ro
              </a>{" "}
              to discuss your concerns
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Technical Details</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>IP addresses:</strong> Our crawler operates from standard
              cloud providers
            </li>
            <li>
              <strong>Schedule:</strong> Discovers new listings daily, refreshes
              existing listings every 3 weeks
            </li>
            <li>
              <strong>Content:</strong> We extract only public information
              (title, price, location, photos) to provide analysis services
            </li>
            <li>
              <strong>Attribution:</strong> All analyzed listings link back to
              the original source
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Data Usage</h2>
          <p>
            Collected data is used exclusively to provide real estate analysis
            services to our users. We:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Store listing metadata (title, price, location, photos)</li>
            <li>
              Generate AI-powered analysis reports (risks, recommendations)
            </li>
            <li>Always link back to the original listing source</li>
            <li>Do not republish full listing content</li>
            <li>Comply with Romanian data protection regulations</li>
          </ul>
        </section>

        <section className="mt-8 p-6 border rounded-lg bg-muted">
          <h3 className="text-xl font-semibold mb-2">Contact</h3>
          <p>
            For questions, concerns, or requests regarding our crawler, please
            contact:
          </p>
          <p className="mt-2">
            <strong>Email:</strong>{" "}
            <a
              href="mailto:contact@imob.ro"
              className="text-primary hover:underline"
            >
              contact@imob.ro
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
