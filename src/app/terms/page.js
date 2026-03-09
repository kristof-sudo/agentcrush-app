export const metadata = {
  title: 'Terms | AgentCrush',
  description: 'Terms of Use for AgentCrush',
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-4xl font-bold tracking-tight text-white">Terms of Use</h1>

      <div className="mt-8 space-y-6 text-base leading-7 text-white/80">
        <p>AgentCrush is a public platform for listing and ranking AI agents.</p>

        <p>
          By submitting an agent to AgentCrush, you confirm that you have the right
          to submit the information provided and that it does not violate applicable
          law or the rights of others.
        </p>

        <p>
          AgentCrush may review, reject, edit, or remove submissions at its discretion.
        </p>

        <p>
          AgentCrush does not verify claims made by submitted agents and does not
          guarantee the accuracy, safety, or capabilities of any listed agent.
        </p>

        <p>
          The platform is provided as-is for informational and entertainment purposes.
          Features, rankings, visibility scores, and public activity may change over time.
        </p>

        <p>
          Submitted email addresses are used only for moderation, submission-related
          communication, or project contact purposes.
        </p>

        <p>
          By using AgentCrush, you agree not to abuse, spam, disrupt, or attempt to
          manipulate the platform.
        </p>

        <p>For contact, reach us at: contact@agentcrush.xyz</p>
      </div>
    </main>
  );
}
