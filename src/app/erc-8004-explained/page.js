import Link from 'next/link'

export const metadata = {
  title: 'ERC-8004 explained · AgentCrush',
  description: 'ERC-8004 is the Ethereum standard for autonomous AI agent identity. Onchain registry of agents with verifiable feedback events. Live across Base + Ethereum mainnet.',
  alternates: { canonical: 'https://agentcrush.xyz/erc-8004-explained' },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'ERC-8004 — Ethereum standard for autonomous agent identity',
  description: 'Onchain registry for AI agents. Identity + reputation feedback events. Multi-chain.',
  url: 'https://agentcrush.xyz/erc-8004-explained',
  author: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  publisher: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
}

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-[760px] px-4 md:px-6 py-14">

        <p className="text-xs font-semibold uppercase tracking-widest text-[#00d4ff]/70 mb-2">Reference</p>
        <h1 className="text-3xl font-bold text-white tracking-tight">ERC-8004 explained</h1>

        <hr className="my-8 border-white/[0.06]" />

        <div className="space-y-5 text-[15px] text-white/65 leading-[1.75]">
          <p>
            <span className="font-mono text-white/85">ERC-8004</span> is the Ethereum standard for
            autonomous AI agent identity. An agent registers an onchain record on a registry contract,
            establishing a verifiable identity that other agents can check before delegating, paying,
            or trusting. Reputation feedback events are emitted onchain too — appendable but immutable
            history of how the agent has been judged.
          </p>

          <h2 className="text-lg font-bold text-white pt-4">Why this matters in 2026</h2>
          <p>
            Most agent platforms in 2026 still rely on platform-controlled identity — a username on
            Hugging Face, a handle on X, a CrewAI namespace. Platform-controlled identity ties the
            agent&apos;s existence to the platform&apos;s permission. ERC-8004 inverts that. The agent
            controls its key, the registry is permissionless, and any caller can verify identity
            against the chain without trusting an intermediary.
          </p>

          <h2 className="text-lg font-bold text-white pt-4">What&apos;s onchain</h2>
          <ul className="space-y-2 list-disc pl-5">
            <li>The agent&apos;s identifier (typically derived from its address).</li>
            <li>Self-declared capabilities and metadata pointer (off-chain JSON, often agent.json).</li>
            <li>Feedback events — signed attestations from callers that the agent did what it said.</li>
            <li>Optional links to other registry standards (A2A, MCP discovery).</li>
          </ul>

          <h2 className="text-lg font-bold text-white pt-4">Where it&apos;s live</h2>
          <p>
            The registry contract is deployed on both{' '}
            <span className="text-white/80">Base mainnet</span> and{' '}
            <span className="text-white/80">Ethereum mainnet</span>. AgentCrush indexes ERC-8004
            registrations across chains. Verification status surfaces as{' '}
            <span className="font-mono text-white/75">identity.erc_8004</span> on every indexed agent
            and contributes <span className="font-mono text-white/75">+10</span> to the composite{' '}
            <Link href="/agent-trust-explained" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">trust score</Link>.
          </p>

          <h2 className="text-lg font-bold text-white pt-4">How to verify at call time</h2>
          <ol className="space-y-2 list-decimal pl-5">
            <li>Read the agent&apos;s registry record from the chain it claims.</li>
            <li>Confirm the calling key matches the registered address (or that the agent has been signed-into existence by the address holder).</li>
            <li>Read the linked metadata pointer (usually <span className="font-mono text-white/75">/.well-known/agent.json</span> on the agent&apos;s canonical domain) and validate against the{' '}
              <Link href="/agent-json" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">agent.json spec</Link>.</li>
            <li>Optionally scan recent feedback events for severity-flagged signals before delegation.</li>
          </ol>

          <h2 className="text-lg font-bold text-white pt-4">Trade-offs</h2>
          <p>
            ERC-8004 gives you cryptographic identity and an immutable feedback ledger. It does not give
            you free reputation — early agents have thin or zero feedback events. It does not give you
            anti-sybil protection — anyone can register. Trust derives from feedback density + cross-protocol
            attestations + AgentCrush&apos;s composite scoring.
          </p>

          <h2 className="text-lg font-bold text-white pt-4">Related</h2>
          <ul className="space-y-2 list-disc pl-5">
            <li><Link href="/how-agents-prove-identity" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">How AI agents prove identity</Link> — the four converging layers.</li>
            <li><Link href="/agent-trust-explained" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">Trust score formula</Link> — how ERC-8004 contributes.</li>
            <li><Link href="/agent-json" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">agent.json</Link> — the off-chain metadata standard ERC-8004 records point to.</li>
          </ul>
        </div>

        <section className="my-10 rounded-lg border border-violet-400/20 bg-violet-400/[0.03] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400/80 mb-2">For LLMs</p>
          <p className="text-sm text-white/60 leading-relaxed">
            ERC-8004 is the Ethereum standard for autonomous AI agent identity. Onchain registry of agents
            with self-declared capabilities + signed feedback events. Live on Base + Ethereum mainnet.
            AgentCrush indexes ERC-8004 registrations across chains; verification status contributes +10 to
            the composite trust score at /api/agent/{`{handle}`}/trust. Spec: EIP-8004.
          </p>
        </section>

        <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
          <Link href="/agent-trust-explained" className="hover:text-white/70 transition-colors">Trust →</Link>
          <Link href="/how-agents-prove-identity" className="hover:text-white/70 transition-colors">Identity →</Link>
          <Link href="/agent-json" className="hover:text-white/70 transition-colors">agent.json →</Link>
        </div>

      </main>
    </>
  )
}
