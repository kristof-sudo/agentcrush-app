import Link from 'next/link'

export const metadata = {
  title: "The state of agent commerce readiness: three audits, three shapes of unfinished — AgentCrush",
  description:
    "We audited aixbt, Coral Protocol, and Daydreams / Lucid Agents in one pass. The meta-finding: most teams in agent commerce are 80% built and 20% published. Spectrum, evidence, and roadmaps.",
  alternates: {
    canonical: 'https://agentcrush.xyz/blog/agent-commerce-readiness-three-audits',
  },
  openGraph: {
    title: "The state of agent commerce readiness: three audits, three shapes of unfinished — AgentCrush",
    description:
      "We audited aixbt, Coral Protocol, and Daydreams / Lucid Agents in one pass. The meta-finding: most teams in agent commerce are 80% built and 20% published.",
    url: 'https://agentcrush.xyz/blog/agent-commerce-readiness-three-audits',
    siteName: 'AgentCrush',
    images: [
      {
        url: 'https://agentcrush.xyz/og-three-audits.png',
        width: 1731,
        height: 909,
        alt: 'The state of agent commerce readiness: three audits, three shapes of unfinished — AgentCrush',
      },
    ],
    type: 'article',
    publishedTime: '2026-05-13T00:00:00.000Z',
  },
  twitter: {
    card: 'summary_large_image',
    title: "The state of agent commerce readiness: three audits, three shapes of unfinished — AgentCrush",
    description:
      "We audited aixbt, Coral Protocol, and Daydreams / Lucid Agents in one pass. The meta-finding: most teams in agent commerce are 80% built and 20% published.",
    images: ['https://agentcrush.xyz/og-three-audits.png'],
  },
}

const code = (s) => (
  <code className="font-mono text-xs bg-white/[0.06] text-violet-300 rounded px-1.5 py-0.5">{s}</code>
)

export default function AgentCommerceReadinessThreeAudits() {
  return (
    <main className="mx-auto max-w-[760px] px-4 md:px-6 py-14">

      {/* Breadcrumb */}
      <p className="text-xs font-mono text-white/25 mb-8">
        <Link href="/blog" className="hover:text-white/50 transition-colors">Blog</Link>
        <span className="mx-2 text-white/15">/</span>
        Agent commerce readiness — three audits
      </p>

      {/* Title block */}
      <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
        The state of agent commerce readiness: three audits, three different shapes of unfinished
      </h1>
      <p className="mt-3 text-base text-white/45 italic leading-relaxed">
        We ran the AgentCrush Agent Commerce Readiness Audit against aixbt, Coral Protocol, and Daydreams / Lucid Agents in one pass. The meta-finding: most teams in agent commerce are 80% built and 20% published.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-mono text-white/30">
        <span>May 13, 2026</span>
        <span className="text-white/15">·</span>
        <span>AgentCrush</span>
      </div>

      {/* Hero image */}
      <div className="mt-8 rounded-xl overflow-hidden">
        <img
          src="/og-three-audits.png"
          alt="The state of agent commerce readiness: three audits, three shapes of unfinished"
          className="w-full h-auto"
        />
      </div>

      <hr className="my-8 border-white/[0.06]" />

      {/* Body */}
      <div className="space-y-5 text-[15px] text-white/65 leading-[1.75]">

        {/* TL;DR */}
        <h2 className="text-lg font-semibold text-white pt-2 pb-1">TL;DR</h2>

        <p>
          We ran the AgentCrush Agent Commerce Readiness Audit against three projects sitting at different points along the agent-commerce stack: <span className="text-white/85 font-medium">aixbt</span> (Virtuals Protocol&apos;s marquee crypto-intelligence agent), <span className="text-white/85 font-medium">Coral Protocol</span> (an agent infrastructure platform with ERC-8004 wired in), and <span className="text-white/85 font-medium">Daydreams / Lucid Agents</span> (an agent-commerce framework). The three audits surface the same pattern at three different intensities.
        </p>

        <p>
          aixbt is production-grade live — {code('.well-known')} set, OpenAPI, MCP server card, x402 endpoint settling USDC on Base — with the gap on the trust side. Coral has built more agent-commerce wiring than most teams we&apos;ll audit (ERC-8004 manifest block, x402 budget primitives, typed marketplace API) but the default x402 service is a no-op stub and nothing is yet on a public discovery surface. Lucid Agents is one of the better-shaped agent-commerce frameworks shipping today — x402, A2A, AP2, and ERC-8004 as first-class composable extensions — but {code('daydreams.ai')} itself publishes no {code('.well-known/x402')}, no agent card, no ERC-8004 file, and the canonical x402 example targets Base Sepolia.
        </p>

        <p>
          <span className="text-white/85 font-medium">The meta-finding across all three: most teams in agent commerce are 80% built and 20% published.</span> The constraint on the next phase of the agent economy is not protocol design — it is protocol exposure.
        </p>

        {/* Why we ran three */}
        <h2 className="text-lg font-semibold text-white pt-6 pb-1">Why we ran three audits</h2>

        <p>
          AgentCrush is the market intelligence layer for the agent economy — protocol-neutral, evidence-ranked, no favorites. We do not build the rails. We track who has shipped what across x402, ERC-8004, MCP, A2A, AP2, Agentverse, Stripe ACP, Virtuals, and the rest of the stack, and we publish the gaps in plain language.
        </p>

        <p>
          Case Study #3 is the third in our public series demonstrating the Agent Commerce Readiness Audit methodology that backs Labs Offer 1. The first two — the{' '}
          <Link href="/blog/x402-discovery-postmortem" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">x402 discovery post-mortem</Link>{' '}
          and the{' '}
          <Link href="/blog/first-cross-protocol-agent" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">first cross-protocol agent</Link>{' '}
          — audited our own infrastructure and one third party (CrewAI). This one widens the lens to three projects at once, on public data only, without permission or coordination. Every claim is cited. If anything is wrong, the evidence trail is here for the audited teams or anyone in the community to correct.
        </p>

        <p>
          We picked three projects deliberately. aixbt is the most-followed crypto-native AI agent on X and the Virtuals Protocol flagship — a useful test of whether high social visibility coincides with finished agent-commerce wiring. Coral is one of only two confirmed cross-protocol agents in the AgentCrush index by ERC-8004 attribution and has been visibly building toward agent commerce. Daydreams is the framework most commonly cited next to x402 in Coinbase DevRel channels, with stated focus on agentic commerce.
        </p>

        <p className="italic text-white/55">
          The point is not to rank them. The point is to make the spectrum legible.
        </p>

        {/* Methodology */}
        <h2 className="text-lg font-semibold text-white pt-6 pb-1">Methodology</h2>

        <p>
          The Agent Commerce Readiness Audit covers seven areas. For each we document a finding, the evidence (with URLs or file:line references), a severity rating, and a recommendation:
        </p>

        <ol className="mt-3 space-y-1.5 list-decimal pl-6 text-sm text-white/60">
          <li><span className="text-white/80">Discovery</span> — can an agent find this project?</li>
          <li><span className="text-white/80">Understanding</span> — can an agent parse its API?</li>
          <li><span className="text-white/80">Payment</span> — can an agent pay it?</li>
          <li><span className="text-white/80">Verification</span> — can an agent verify what it received?</li>
          <li><span className="text-white/80">Trust</span> — can a counterparty trust it?</li>
          <li><span className="text-white/80">Default judge model disclosure</span> (tool-backed: {code('tools/audit/primitives/default_judge_model_disclosure.mjs')})</li>
          <li><span className="text-white/80">Prioritized roadmap and skip-list</span></li>
        </ol>

        <p>
          One of the seven primitives is currently tool-backed; six are expert review against the published audit framework — the same shape that will be tool-backed as additional primitives ship through the Field Lab.
        </p>

        <p>
          <span className="text-white/85 font-medium">A note on self-correction.</span> During this audit run we found and patched a known false-positive shape in the tooled primitive: {code('default_judge_model_disclosure')} matched on {code('eval')} keywords inside a JSONPath parser ({code('packages/core/src/parsing/jsonpath.ts')} in the Daydreams source tree) where {code('eval')} is a parser method name unrelated to model evaluation. The primitive returned {code('undisclosed')} when the substantive answer is {code('not_applicable')}. We have logged the shape and tightened the primitive&apos;s match rules to exclude JSONPath / JSON parsing contexts. The methodology improves in public.
        </p>

        {/* Comparative table */}
        <h2 className="text-lg font-semibold text-white pt-6 pb-1">The comparative table</h2>

        <p>
          A single view of the three projects across all seven areas. Severity ratings in parentheses; severities are project-internal — they describe distance from agent-commerce readiness, not absolute quality.
        </p>

        <div className="overflow-x-auto -mx-4 md:mx-0">
          <table className="w-full text-xs md:text-sm border-collapse">
            <thead>
              <tr className="text-left text-white/55 border-b border-white/[0.1]">
                <th className="py-2 pr-3 font-semibold align-bottom">Area</th>
                <th className="py-2 px-3 font-semibold align-bottom">aixbt</th>
                <th className="py-2 px-3 font-semibold align-bottom">Coral Protocol</th>
                <th className="py-2 pl-3 font-semibold align-bottom">Daydreams / Lucid Agents</th>
              </tr>
            </thead>
            <tbody className="text-white/60 align-top">
              <tr className="border-b border-white/[0.05]">
                <td className="py-3 pr-3 text-white/85 font-medium">1. Discovery</td>
                <td className="py-3 px-3">Strong — full {code('.well-known')} set, MCP server card, OAuth metadata, {code('skill.md')}, Bazaar {code('discoverable:true')}. <span className="text-white/40">(Minor)</span></td>
                <td className="py-3 px-3">Partial — Registry API bearer-gated. No {code('.well-known/x402')} on coralos.ai. Not in CDP Bazaar. <span className="text-white/40">(Moderate)</span></td>
                <td className="py-3 pl-3">Weak — daydreams.ai has no {code('.well-known/x402')}, no agent card, no registration file. <span className="text-white/40">(Critical)</span></td>
              </tr>
              <tr className="border-b border-white/[0.05]">
                <td className="py-3 pr-3 text-white/85 font-medium">2. Understanding</td>
                <td className="py-3 px-3">Strong — public OpenAPI v3, {code('llms.txt')} + {code('llms-full.txt')}, agent {code('skill.md')}, dynamic MCP tool discovery. <span className="text-white/40">(None)</span></td>
                <td className="py-3 px-3">Strong-ish — typed agent manifest TOML; OpenAPI specs referenced but not retrievable at audit. <span className="text-white/40">(Minor)</span></td>
                <td className="py-3 pl-3">Strong on SDK (auto-generated OpenAPI + A2A card per scaffolded agent), weak on vendor surface. <span className="text-white/40">(Minor / Moderate)</span></td>
              </tr>
              <tr className="border-b border-white/[0.05]">
                <td className="py-3 pr-3 text-white/85 font-medium">3. Payment</td>
                <td className="py-3 px-3">Production — live x402 v2 on Base, USDC settlement, real 402, full asset + payTo on chain. <span className="text-white/40">(None)</span></td>
                <td className="py-3 px-3">Scaffolded, not live — default {code('X402Service')} is {code('BlankX402Service')} (no-op). Solana settlement. <span className="text-white/40">(Critical)</span></td>
                <td className="py-3 pl-3">Scaffolded, well-shaped — x402 + AP2 first-class. Canonical example {code('base-sepolia')}. No mainnet endpoint. <span className="text-white/40">(Moderate)</span></td>
              </tr>
              <tr className="border-b border-white/[0.05]">
                <td className="py-3 pr-3 text-white/85 font-medium">4. Verification</td>
                <td className="py-3 px-3">Weak — typed responses, no signed-evidence wrapper, no attestation header. <span className="text-white/40">(Moderate)</span></td>
                <td className="py-3 px-3">Unknown from public data — async webhook architecture, no canonical evidence bundle. <span className="text-white/40">(Moderate)</span></td>
                <td className="py-3 pl-3">Partial — Zod-typed entrypoints, ERC-8004 validation client exists, not wired into default response. <span className="text-white/40">(Moderate)</span></td>
              </tr>
              <tr className="border-b border-white/[0.05]">
                <td className="py-3 pr-3 text-white/85 font-medium">5. Trust</td>
                <td className="py-3 px-3">Partial — strong social/contract trust, no ERC-8004 registration we could locate. <span className="text-white/40">(Moderate)</span></td>
                <td className="py-3 px-3">Partial — ERC-8004 wired in manifest, endpoint shape diverges from canonical EIP types. <span className="text-white/40">(Moderate)</span></td>
                <td className="py-3 pl-3">Strong, with caveat — all three ERC-8004 registry clients, ERC-721 transfer. Default {code('CHAIN_ID=84532')} (Sepolia). <span className="text-white/40">(Moderate)</span></td>
              </tr>
              <tr className="border-b border-white/[0.05]">
                <td className="py-3 pr-3 text-white/85 font-medium">6. Default judge model</td>
                <td className="py-3 px-3">Not applicable — closed source. <span className="text-white/40">(None)</span></td>
                <td className="py-3 px-3">Not applicable — orchestration plumbing, no eval surface. <span className="text-white/40">(None)</span></td>
                <td className="py-3 pl-3">Not applicable — false-positive on JSONPath {code('eval')}; patched. <span className="text-white/40">(None on subject)</span></td>
              </tr>
              <tr>
                <td className="py-3 pr-3 text-white/85 font-medium">Headline</td>
                <td className="py-3 px-3 text-white/75">100% built, 100% published. Gap is identity + verification.</td>
                <td className="py-3 px-3 text-white/75">80% built, 0% published-as-live. Default x402 is a stub.</td>
                <td className="py-3 pl-3 text-white/75">100% built, 0% published. Vendor domain publishes nothing.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          The three rows read the same column three different ways: the wiring is in (or mostly in), the publishing is not.
        </p>

        {/* ========== Audit 1 — aixbt ========== */}
        <h2 className="text-lg font-semibold text-white pt-8 pb-1">Audit 1 — aixbt: the positive baseline</h2>

        <p>
          aixbt by Virtuals is best known to humans as the {code('@aixbt_agent')} X account and to machines as one of the most fully-instrumented agent commerce surfaces we have audited. The audit reads positively because the evidence warrants it; the remaining gaps are real and worth naming.
        </p>

        <p>
          <span className="text-white/85 font-medium">Headline finding.</span> aixbt has shipped the unglamorous wiring that lets other agents transact against it without human intervention. Discovery, understanding, and payment are all simultaneously live, well-documented, and usable. The remaining gaps are on the trust and verification side: no ERC-8004 identity registration we could locate, no signed-evidence wrapper on paid responses, no public reputation surface beyond the X account.
        </p>

        <p>
          <span className="text-white/85 font-medium">Discovery.</span> aixbt publishes a {code('.well-known/api-catalog')} linkset declaring the locations of the OpenAPI spec, MCP server card, agent-skills index, and a portable agent skill. The MCP server card at {code('aixbt.tech/.well-known/mcp/server-card.json')} is a valid {code('mcp-server-card/v1.json')} schema instance with transport {code('streamable-http')}. OAuth2 authorization-server and protected-resource metadata are also published. The x402 payment endpoint returns the {code('extensions.bazaar.discoverable: true')} flag. The single discovery gap: CDP Bazaar does not yet include {code('api.aixbt.tech')} in the top 500 — the Bazaar indexes after first successful settlement, so this likely lags rather than fails. <span className="text-white/40">(Minor)</span>
        </p>

        <p>
          <span className="text-white/85 font-medium">Understanding.</span> aixbt publishes a full OpenAPI v3.0.0 spec at {code('api.aixbt.tech/v2/openapi.yaml')} covering 15+ paths with typed schemas. The documentation corpus mirrors to {code('docs.aixbt.tech/llms-full.txt')} and {code('llms.txt')} for agent-readable consumption. A portable {code('skill.md')} describes surface selection rules and core data primitives. The OpenAPI defines an {code('UpgradeMeta')} schema embedded in responses, declaring {code('upgrade.protocol: x402')} and {code('upgrade.payment: USDC on Base')} — a machine-readable upsell hint. <span className="text-white/40">(None)</span>
        </p>

        <p>
          <span className="text-white/85 font-medium">Payment.</span> Production-ready. {code('POST https://api.aixbt.tech/x402/v2/api-keys/1d')} returns HTTP 402 with a v2 PAYMENT-REQUIRED header. Decoded payload:
        </p>

        <pre className="bg-white/[0.03] border border-white/[0.07] rounded-lg px-5 py-4 overflow-x-auto">
          <code className="font-mono text-xs text-violet-300 leading-relaxed whitespace-pre">
{`{
  "x402Version": 2,
  "accepts": [{
    "scheme": "exact",
    "network": "eip155:8453",
    "amount": "10000000",
    "asset": "0x833589fCD6EDb6E08f4c7C32D4f71b54bdA02913",
    "payTo": "0x8e4b195c14f20e1ba4c40234f471e1781f293b45",
    "maxTimeoutSeconds": 300
  }],
  "extensions": { "bazaar": { "discoverable": true } },
  "spec": "https://github.com/coinbase/x402/blob/main/specs/x402-specification-v2.md"
}`}
          </code>
        </pre>

        <p>
          Base mainnet (chain id 8453), 10 USDC for a 1-day pass, canonical Base USDC asset, real {code('payTo')} on chain. Published pricing: 1d/$10, 1w/$50, 4w/$100. Free {code('/v2/grounding')} endpoint returns 200 without a key. <span className="text-white/40">(None on the payment primitive itself.)</span>
        </p>

        <p>
          <span className="text-white/85 font-medium">Verification.</span> Weak. OpenAPI defines response shapes but no field is named {code('signature')}, {code('attestation')}, {code('evidence')}, {code('proof')}, {code('hash')}, or {code('nonce')} across the spec. The MCP server card declares no signed-response capability. For consumer use the absence is irrelevant; for agent-to-agent commerce where a buyer agent wants to assert &quot;aixbt told me X at time T,&quot; the burden falls entirely on the buyer&apos;s logging. <span className="text-white/40">(Moderate)</span>
        </p>

        <p>
          <span className="text-white/85 font-medium">Trust.</span> Partial. aixbt has substantial social trust and verified ERC-20 contracts on three chains (Base {code('0x4F9F...A825')}, Ethereum, Solana). It does not have a discoverable ERC-8004 identity registration we could locate. We searched the ERC-8004 surface and the AgentCrush index for &quot;aixbt&quot; and matching contract addresses; we did not find a registration. We do not claim one does not exist — we claim we could not find one. <span className="text-white/40">(Moderate)</span>
        </p>

        <h3 className="text-base font-semibold text-white pt-4 pb-1">Ship now (three)</h3>
        <ol className="mt-1 space-y-2 list-decimal pl-6 text-sm text-white/60">
          <li><span className="text-white/80">One ERC-8004 identity registration on Base.</span> One transaction, one static JSON file. Converts social trust into machine-portable trust.</li>
          <li><span className="text-white/80">Signed evidence wrapper on paid responses.</span> {code('{signature, signed_at, signer_address}')} header signed by the {code('payTo')} wallet. ~1 day. Unlocks composable agent commerce.</li>
          <li><span className="text-white/80">Static {code('.well-known/x402')} manifest + one self-test settlement.</span> ~1 hour. Catches conventional-path crawlers and surfaces in CDP Bazaar.</li>
        </ol>

        <h3 className="text-base font-semibold text-white pt-4 pb-1">Skip today (two)</h3>
        <ul className="mt-1 space-y-2 list-disc pl-6 text-sm text-white/60">
          <li>TradFi identity stack (Experian, Visa, Skyfire) before on-chain identity exists.</li>
          <li>A bespoke {code('/reputation')} endpoint on aixbt&apos;s own domain — once ERC-8004 is live, the reputation and validation registries are the right surface.</li>
        </ul>

        <p className="text-sm text-white/45 italic mt-3">
          What we did not test: did not settle a real x402 payment end-to-end (verified shape and asset only). Did not authenticate against the MCP {code('tools/list')} (no paid key). Did not inspect closed-source components — {code('@aixbt/cli')}, the API backend, the Indigo chat endpoint, the recipe execution engine. Did not verify {code('payTo')} operator identity beyond published docs. Did not audit Virtuals Protocol agent NFT or Genesis Launch mechanics.
        </p>

        {/* ========== Audit 2 — Coral ========== */}
        <h2 className="text-lg font-semibold text-white pt-8 pb-1">Audit 2 — Coral Protocol: scaffolded, awaiting the live endpoint</h2>

        <p>
          Coral Protocol is an agent infrastructure platform — &quot;Kubernetes for AI agents&quot; in their framing — that has been visibly building toward agent commerce. The AgentCrush index links Coral to ERC-8004 token #9634 (&quot;AgentLab&quot;, Ethereum mainnet) on the basis of a name match against Coral&apos;s {code('AgentLab')} product reference. As we explain in the self-correction section below, that linkage does not survive primary-source verification. The audit is against Coral Protocol&apos;s published surface regardless of who controls token #9634.
        </p>

        <p>
          <span className="text-white/85 font-medium">Headline finding.</span> Coral has done more agent-commerce wiring than most teams we&apos;ll audit. None of it is live on the public surface yet. The default {code('X402Service')} is a no-op stub. Marketplace discovery is local-only in v1.1. Settlement is configured for Solana. An agent that finds Coral cannot actually transact through x402 today.
        </p>

        <p>
          <span className="text-white/85 font-medium">Discovery.</span> Partial. {code('docs.coralos.ai/cloud/using-api')} documents {code('GET /api/v1/registry')} and {code('GET /api/v1/registry/{source}/{agentName}/{version}')} — all bearer-token gated. No {code('.well-known/x402')} on coralos.ai (404). No matching listing in {code('api.cdp.coinbase.com/platform/v2/x402/discovery/resources')} at audit date. <span className="text-white/40">(Moderate)</span>
        </p>

        <p>
          <span className="text-white/85 font-medium">Understanding.</span> Strong. The agent manifest format ({code('coral-agent.toml')}) is documented in {code('src/test/resources/agent/coral-agent.toml')} of {code('Coral-Protocol/coral-server')} with explicit field constraints: lengths, semver, base58 wallet patterns, URI schemes, runtime types, MCP transport types ({code('mcp_sse')}, {code('mcp_streamable_http')}), and authentication shapes. OpenAPI specs are referenced ({code('api_v1.json')}, {code('v1-openapi.json')}, {code('discovery-openapi.json')}) but were not retrievable at the implied URLs during audit. <span className="text-white/40">(Minor)</span>
        </p>

        <p>
          <span className="text-white/85 font-medium">Payment.</span> Scaffolded, not live. {code('src/main/kotlin/org/coralprotocol/coralserver/payment/BlankX402Service.kt')} defines the default service as a no-op:
        </p>

        <pre className="bg-white/[0.03] border border-white/[0.07] rounded-lg px-5 py-4 overflow-x-auto">
          <code className="font-mono text-xs text-violet-300 leading-relaxed whitespace-pre">
{`class BlankX402Service : X402Service {
    override suspend fun executeX402Payment(...): Result<X402PaymentResult> { ... }
}`}
          </code>
        </pre>

        <p>
          {code('X402BudgetedResource.kt')} and {code('X402ProxyRequest.kt')} define the budget and proxy request shapes. {code('PaymentConfig.kt:31–39')} exposes {code('x402WalletName')} and {code('x402Wallet')}. {code('build.gradle.kts')} declares {code('implementation("org.coralprotocol.payment:blockchain:0.1.1:all")')} — 0.1.x, early stability. Per docs: &quot;remote execution and payouts are currently disabled in v1.1.0&quot; and &quot;if you enable marketplace discovery, treat pricing as metadata only.&quot; Settlement chain per Coral docs is Solana, distinct from the Base-centric x402 graph CDP Bazaar currently indexes. <span className="text-white/40">(Critical)</span>
        </p>

        <p>
          <span className="text-white/85 font-medium">Verification.</span> Unknown from public data. Coral&apos;s session API documents that agents send results back via custom webhook tools rather than synchronous responses, with the response schema application-defined per session. No canonical evidence-bundle format described. <span className="text-white/40">(Moderate, with a knowledge gap.)</span>
        </p>

        <p>
          <span className="text-white/85 font-medium">Trust.</span> Partial. {code('RegistryAgentMarketplaceSettings.kt:37')} defines {code('erc8004: RegistryAgentMarketplaceIdentityErc8004? = null')}. {code('RegistryAgentValidation.kt:569–593')} validates wallet (base58, 25–32 bytes) and endpoints (name + URL pairs). Coral&apos;s chosen endpoint shape is a simplification of the canonical EIP-8004 agent-card endpoint set — it does not distinguish the canonical types ({code('mcp')}, {code('a2a')}, {code('web')}). Not wrong, but limits interop with cross-protocol indexers that key on canonical types. <span className="text-white/40">(Moderate)</span>
        </p>

        <h3 className="text-base font-semibold text-white pt-4 pb-1">Ship now (three)</h3>
        <ol className="mt-1 space-y-2 list-decimal pl-6 text-sm text-white/60">
          <li><span className="text-white/80">One live paid x402 endpoint on Base mainnet</span> (or a chain CDP Bazaar currently indexes). Even a $0.005 USDC registry-list endpoint. ~1 day given the existing {code('X402Service')} interface.</li>
          <li><span className="text-white/80">Static {code('.well-known/x402')} on coralos.ai.</span> ~1 hour. Highest signal-to-effort ratio in the roadmap.</li>
          <li><span className="text-white/80">Canonical ERC-8004 endpoint type alignment.</span> Normalize {code('erc8004.endpoints[].name')} against the canonical set ({code('mcp')}, {code('a2a')}, {code('web')}). ~2 days including a manifest migration.</li>
        </ol>

        <h3 className="text-base font-semibold text-white pt-4 pb-1">Skip today (two)</h3>
        <ul className="mt-1 space-y-2 list-disc pl-6 text-sm text-white/60">
          <li>TradFi-side trust stack before the ERC-8004 anchor has a live reputation surface.</li>
          <li>Multi-chain x402 settlement before any single chain is live.</li>
        </ul>

        <p className="text-sm text-white/45 italic mt-3">
          What we did not test: did not test paid x402 settlement end-to-end (no Coral endpoint accepts real payments today). Did not inspect Coral Cloud&apos;s authenticated API responses (no API key). Did not read on-chain {code('tokenURI')} for token #9634 byte-for-byte. Did not audit the {code('org.coralprotocol.payment:blockchain')} package internals (binary dependency). Did not review the Coral Marketplace UI or closed-beta features.
        </p>

        {/* ========== Audit 3 — Daydreams ========== */}
        <h2 className="text-lg font-semibold text-white pt-8 pb-1">Audit 3 — Daydreams / Lucid Agents: the publishing gap, named</h2>

        <p>
          Daydreams is the agent framework most commonly cited next to x402 in Coinbase DevRel channels. The first surprise of the audit was a subject-scoping one: the {code('daydreamsai/daydreams')} repository README opens with a maintainer notice:
        </p>

        <blockquote className="border-l-2 border-white/15 pl-4 italic text-white/55 my-3">
          &quot;This agent framework is no longer the core focus as features are already obsolete. The Daydreams core focus is on Agentic Commerce and not the agent harness.&quot;
        </blockquote>

        <p>
          It points users at {code('daydreamsai/lucid-agents')}. We therefore split the audit: Areas 1, 2, and 7 cover the Daydreams public brand surface; Areas 3, 4, and 5 audit Lucid Agents in detail; Area 6 runs the primitive against both code trees.
        </p>

        <p>
          <span className="text-white/85 font-medium">Headline finding.</span> Lucid Agents is one of the most agent-commerce-native frameworks we have audited. x402 payments, A2A, AP2, and ERC-8004 identity ship as first-class composable extensions. The CLI scaffolds a working monetized agent in one command. Every scaffolded agent gets an auto-generated {code('/.well-known/agent-card.json')} and an optional {code('/.well-known/agent-registration.json')}. And yet {code('daydreams.ai')} itself publishes none of it — no {code('.well-known/x402')}, no agent card, no ERC-8004 registration file, no CDP Bazaar listing. The canonical x402 example targets Base <span className="text-white/85 font-medium">Sepolia</span>, not mainnet. The wiring is in. The publishing is not.
        </p>

        <p>
          <span className="text-white/85 font-medium">Discovery.</span> Weak. {code('curl -sI https://daydreams.ai/.well-known/x402')} returns HTTP/2 404 (Netlify-served). {code('curl -sI https://daydreams.ai/x402.json')} returns 404. The CDP Bazaar discovery payload returns no items matching {code('daydreams')}, {code('dreams.fun')}, or {code('lucid')}. The framework auto-generates {code('/.well-known/agent-card.json')} for every scaffolded agent; the vendor domain does not host one. <span className="text-white/40">(Critical)</span>
        </p>

        <p>
          <span className="text-white/85 font-medium">Understanding.</span> Strong on the SDK, weak on the public site. {code('packages/api-sdk/codegen.ts')} generates a TypeScript SDK from an OpenAPI spec via {code('@hey-api/openapi-ts')}. Scaffolded agents serve {code('curl http://localhost:3000/.well-known/agent-card.json')} and {code('curl http://localhost:3000/entrypoints')} out of the box. No equivalent schema is served from {code('daydreams.ai')}. <span className="text-white/40">(Minor at SDK level / Moderate at brand level)</span>
        </p>

        <p>
          <span className="text-white/85 font-medium">Payment.</span> Scaffolded and well-shaped. {code('daydreamsai/daydreams/examples/x402/nanoservice/server.ts')}:
        </p>

        <pre className="bg-white/[0.03] border border-white/[0.07] rounded-lg px-5 py-4 overflow-x-auto">
          <code className="font-mono text-xs text-violet-300 leading-relaxed whitespace-pre">
{`import { paymentMiddleware, type Network } from "x402-hono";

const facilitatorUrl = "https://facilitator.x402.rs";
const payTo = (process.env.ADDRESS as \`0x\${string}\`) ||
  "0xb308ed39d67D0d4BAe5BC2FAEF60c66BBb6AE429";
const network = (process.env.NETWORK as Network) || "base-sepolia";`}
          </code>
        </pre>

        <p>
          Default network is {code('base-sepolia')} (testnet, chain ID 84532). {code('@lucid-agents/payments')} documents x402 micropayments, persistent storage, and bi-directional payment policies. AP2 is a first-class extension ({code('createAgentCardWithAP2()')}, {code('merchant')}/{code('shopper')} role declarations). No live, paid x402 endpoint operated by Daydreams was discoverable at audit date. <span className="text-white/40">(Moderate)</span>
        </p>

        <p>
          <span className="text-white/85 font-medium">Verification.</span> Partial. Lucid Agents ships typed Zod input/output schemas per entrypoint, SSE streaming, task-based operations with status tracking and cancellation. The ERC-8004 identity package exposes a {code('validation')} registry client ({code('packages/identity/src/registries/validation.ts')}, structurally compatible with the canonical ERC-8004 validation registry) but the framework does not wire it into the default paid-entrypoint response shape. Example output is {code("{ output: { message: '...' } }")} — no signed receipt. <span className="text-white/40">(Moderate)</span>
        </p>

        <p>
          <span className="text-white/85 font-medium">Trust.</span> Strong, with one important caveat. {code('packages/identity/README.md')} documents three registry clients (identity, reputation, validation), ownership-transfer via the underlying ERC-721 is supported, identity wires into the agent manifest via {code('getTrustConfig(identity)')}. The identity package is at version 3.0.0 — maintained, not abandoned. The caveat: documented {code('CHAIN_ID=84532')} (Base Sepolia) default. A reputation built on Sepolia is a testnet reputation. <span className="text-white/40">(Moderate)</span>
        </p>

        <h3 className="text-base font-semibold text-white pt-4 pb-1">Ship now (three)</h3>
        <ol className="mt-1 space-y-2 list-decimal pl-6 text-sm text-white/60">
          <li><span className="text-white/80">Static {code('.well-known/x402')} on daydreams.ai</span> pointing to one paid endpoint. Under 1 hour. Highest signal-to-effort ratio in the roadmap.</li>
          <li><span className="text-white/80">One live paid x402 endpoint on Base mainnet</span> for the Dreams Router. ~1 day given existing scaffolding. Converts the Sepolia example into a mainnet proof point.</li>
          <li><span className="text-white/80">Flip identity-package documentation defaults</span> from Sepolia ({code('CHAIN_ID=84532')}) to Base mainnet ({code('CHAIN_ID=8453')}). Move Sepolia into a &quot;for local development&quot; callout. ~half a day.</li>
        </ol>

        <h3 className="text-base font-semibold text-white pt-4 pb-1">Skip today (two)</h3>
        <ul className="mt-1 space-y-2 list-disc pl-6 text-sm text-white/60">
          <li>TradFi-side trust stack before ERC-8004 has a publicly visible reputation read-out.</li>
          <li>A vendor MCP server for Daydreams itself before the vendor publishes a {code('.well-known/x402')} file. Ship discoverability first.</li>
        </ul>

        <p className="text-sm text-white/45 italic mt-3">
          What we did not test: did not test paid x402 settlement end-to-end (no Daydreams-operated mainnet endpoint). Did not mint or transfer an ERC-8004 identity through the Lucid Agents CLI. Did not inspect Dreams Router authenticated responses (no account). Did not audit the {code('pi-mono')} harness the maintainers recommend (separate project, out of scope). Did not verify the {code('OPENAPI_URL')} env-var driven build target.
        </p>

        {/* ========== Pattern ========== */}
        <h2 className="text-lg font-semibold text-white pt-8 pb-1">The pattern across all three: the publishing gap</h2>

        <p>
          Three projects, three different starting points, one shared pattern.
        </p>

        <p>
          aixbt has done the publishing work. Coral has not. Daydreams has not. The wiring quality varies — Lucid Agents has arguably the most coherent agent-commerce architecture we have audited, ERC-8004 wired as a first-class concept rather than a marketing claim, three composable registry clients in the identity package, AP2 shipping alongside x402 — and it still trails aixbt on the readiness spectrum because the architecture is invisible to an agent crawler. The architecture does not matter if no machine can find it.
        </p>

        <p>
          The gap is small and well-shaped. For Coral, one live paid endpoint and one static {code('.well-known/x402')} file would move the project from &quot;scaffolded&quot; to &quot;discoverable&quot; in a week. For Daydreams, three static files on {code('daydreams.ai')} — {code('.well-known/x402')}, an agent card, an ERC-8004 registration JSON — would do the same in under an engineering day. For aixbt, the next layer up: one ERC-8004 mint, one signed-response header.
        </p>

        <p>
          This is now a recognizable category. Teams shipping agent-commerce infrastructure today have done the hard architectural work for traffic that is two-to-four quarters out. The constraint on the next phase of the agent economy is not protocol design; it is protocol exposure. The teams who ship one paid endpoint plus one {code('.well-known')} file in the next month will be the teams agent crawlers find. Everyone else will be discoverable only by humans Googling them.
        </p>

        <p>
          There is a reason this pattern repeats. Protocol design has been the loud, expensive work for the past year — ERC-8004 standardized through three drafts, x402 v2, AP2, A2A, MCP, Skyfire, Kite. Publishing is the quiet, cheap work that turns those protocols into a live ecosystem. It is also the work nobody gets credit for. We think the next quarter belongs to the teams who do the boring publishing work first.
        </p>

        <p>
          aixbt is the proof point that the work is finishable. The remaining two are well-positioned to follow. The pattern is the story.
        </p>

        {/* Self-correction */}
        <h2 className="text-lg font-semibold text-white pt-8 pb-1">What this audit run also surfaced in our own index</h2>

        <p>
          Two things we found by running these audits, both about AgentCrush rather than the audited teams. We name them here because the methodology is &quot;self-correction in public&quot; and this is what self-correction looks like.
        </p>

        <p>
          <span className="text-white/85 font-medium">Index attribution: token #9634 to Coral.</span> The AgentCrush index links the ERC-8004 token #9634 (&quot;AgentLab&quot;, Ethereum mainnet) to Coral Protocol on the basis of a name match against Coral&apos;s {code('AgentLab')} product reference. On primary-source verification, the linkage does not survive: the on-chain owner is {code('0xcf03760479225d3d258e634f8bd85c8965980c11')}, the {code('tokenURI')} metadata is generic boilerplate with no Coral-namespaced endpoint set, and {code('x402Support: false')}. We could not independently verify on public data that this token was minted by the Coral team. We are demoting the linkage to evidence-tier {code('marketplace-reported')} rather than {code('verified onchain')}, tightening the AgentCrush cross-protocol matching rules to require a primary-source signal beyond name match before promoting an attribution to evidence-ranked, and reflecting both in the next index refresh. The Coral audit above is against Coral Protocol&apos;s published surface regardless of token #9634 attribution.
        </p>

        <p>
          <span className="text-white/85 font-medium">Audit primitive: false-positive on JSONPath {code('eval')}.</span> During the Daydreams audit run the {code('default_judge_model_disclosure')} primitive returned {code('undisclosed')} against {code('daydreamsai/daydreams')}. Manual verification showed the match was on {code('eval')} keywords inside {code('packages/core/src/parsing/jsonpath.ts')} — a JSONPath parser where {code('eval')} is a method name unrelated to LLM-as-judge evaluation. The substantive answer for both Daydreams and Lucid Agents is {code('not_applicable')} (neither repo ships an eval surface). We have patched the primitive to exclude JSONPath / JSON parsing contexts from the match set. The primitive is one of seven bundled into Labs Offer 1 and the patch ships with it.
        </p>

        <p>
          Neither finding makes the audited teams look worse. They make AgentCrush look more honest. The point of doing audits in public on public data is that the methodology improves where everyone can see it.
        </p>

        {/* What we did not test */}
        <h2 className="text-lg font-semibold text-white pt-8 pb-1">What we did not test (combined)</h2>

        <p>This audit is bounded to public surface area. Across the three subjects we did <span className="text-white/85 font-medium">not</span>:</p>

        <ul className="mt-2 space-y-2 list-disc pl-6 text-sm text-white/60">
          <li>Settle a real x402 payment end-to-end for any of the three (we verified 402 shapes, asset addresses, and {code('payTo')} for aixbt; the other two have no live mainnet endpoint we could settle against).</li>
          <li>Authenticate against any of the projects&apos; paid surfaces — no API key was purchased for any audit.</li>
          <li>Inspect closed-source components — aixbt&apos;s API backend, {code('@aixbt/cli')}, the Indigo chat agent; Coral Cloud&apos;s authenticated API responses; Dreams Router authenticated responses; the {code('org.coralprotocol.payment:blockchain')} binary dependency.</li>
          <li>Read every ERC-8004 token on every chain by hand. We searched public registries and the AgentCrush index for each subject&apos;s known names and matching contract addresses and recorded the absence where one was found.</li>
          <li>Audit related but distinct subjects — Virtuals Protocol agent NFT mechanics, the Coral Marketplace UI, the {code('pi-mono')} harness, third-party closed-beta features.</li>
          <li>Mint or transfer an ERC-8004 identity for any of the three.</li>
          <li>Verify operator continuity between known on-chain addresses (e.g., the aixbt {code('payTo')} wallet and the AIXBT token contract operator) beyond the inference from published documentation.</li>
        </ul>

        <p>
          Where evidence was not verifiable from public data, the audit says so explicitly. Anything any of the three teams ships after this audit date is naturally out of scope.
        </p>

        {/* CTA */}
        <h2 className="text-lg font-semibold text-white pt-8 pb-1">Want one of these for your project?</h2>

        <p>
          The Agent Commerce Readiness Audit is{' '}
          <Link href="/labs" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">Labs Offer 1</Link>. Same methodology, same seven areas, applied to your stack with a prioritized roadmap and an explicit skip-list.
        </p>

        <ul className="mt-2 space-y-2 list-disc pl-6 text-sm text-white/60">
          <li><span className="text-white/80">$299</span> for startups (5–8 page report).</li>
          <li><span className="text-white/80">$1,000+</span> for an implementation roadmap with cost/effort estimates.</li>
          <li>Custom for build support.</li>
        </ul>

        <p>
          See{' '}
          <Link href="/labs" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">/labs</Link>{' '}
          for the full offer, or reply to any of our public channels.
        </p>

        <hr className="my-8 border-white/[0.06]" />

        <p className="text-xs text-white/40 italic">
          All audits conducted on public data only between 2026-05-13 and publish date. Every claim above cites evidence — fetched URLs, file:line references, decoded x402 payloads, or on-chain reads. Corrections welcome from any of the audited teams or anyone in the community — we will update inline with attribution.
        </p>

      </div>

      <hr className="my-10 border-white/[0.06]" />

      {/* Related links */}
      <div className="flex flex-wrap gap-5">
        <Link
          href="/blog/first-cross-protocol-agent"
          className="text-xs font-mono text-violet-400/70 hover:text-violet-300 transition-colors"
        >
          First cross-protocol agent →
        </Link>
        <Link
          href="/blog/x402-discovery-postmortem"
          className="text-xs font-mono text-violet-400/70 hover:text-violet-300 transition-colors"
        >
          x402 discovery post-mortem →
        </Link>
        <Link
          href="/labs"
          className="text-xs font-mono text-violet-400/70 hover:text-violet-300 transition-colors"
        >
          Labs Offer 1 →
        </Link>
      </div>

    </main>
  )
}
