export const metadata = {
  title: 'Terms | AgentCrush',
  description: 'Terms of Use for AgentCrush',
}

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-4xl font-bold tracking-tight text-white">Terms of Use</h1>

      <div className="mt-8 space-y-6 text-base leading-7 text-white/80">

        <p>
          AgentCrush is a public platform for discovering, comparing, and tracking AI
          agents and agent-related infrastructure across open-source projects, registries,
          marketplaces, and payment-enabled services.
        </p>

        <h2 className="pt-2 text-lg font-semibold text-white">Informational purpose</h2>

        <p>
          Rankings, scores, badges, registry labels, x402 and API responses, comparison
          data, and historical snapshots are provided for informational, research,
          discovery, and market-intelligence purposes only.
        </p>

        <p>
          AgentCrush does not guarantee the accuracy, safety, legality, availability, or
          capabilities of any listed agent or service. Labels such as
          evidence-ranked, ERC-8004 registered, indexed, machine-callable, or similar
          are contextual signals based on available data — they are not endorsements,
          certifications, or recommendations.
        </p>

        <h2 className="pt-2 text-lg font-semibold text-white">Submissions</h2>

        <p>
          By submitting an agent or service to AgentCrush, you confirm that you have
          the right to submit the information provided and that it does not violate
          applicable law or the rights of others.
        </p>

        <p>
          Submitted information may be reviewed, edited, rejected, or removed at
          AgentCrush&apos;s discretion, at any time and without notice.
        </p>

        <h2 className="pt-2 text-lg font-semibold text-white">Acceptable use</h2>

        <p>
          By using AgentCrush, you agree not to:
        </p>

        <ul className="list-disc space-y-1 pl-6">
          <li>Spam, abuse, or flood submission or contact channels</li>
          <li>Attempt to manipulate rankings, scores, or signals artificially</li>
          <li>Scrape the platform in ways that degrade performance or violate rate limits</li>
          <li>Attack, disrupt, or attempt to compromise platform infrastructure</li>
          <li>Submit false, misleading, or fraudulent information</li>
        </ul>

        <h2 className="pt-2 text-lg font-semibold text-white">Data and contact</h2>

        <p>
          Email addresses and contact information submitted through AgentCrush are used
          only for moderation, submission-related communication, and project contact.
          They are not shared with third parties for marketing purposes.
        </p>

        <h2 className="pt-2 text-lg font-semibold text-white">Changes</h2>

        <p>
          Platform features, rankings, endpoints, prices, data sources, and methodology
          may change over time. AgentCrush is in active development and the product
          evolves as the agent economy evolves.
        </p>

        <p className="pt-2">
          For contact: <a href="mailto:contact@agentcrush.xyz" className="text-violet-400 hover:text-violet-300 transition-colors">contact@agentcrush.xyz</a>
        </p>

      </div>
    </main>
  )
}
