import Card from '@/components/ui/Card'

export default function PipelineHelperBox() {
  return (
    <Card className="p-4 border border-white/10 bg-white/[0.03]">
      <h3 className="mb-3 text-base font-semibold">How to read this pipeline</h3>

      <div className="space-y-3 text-xs leading-6 text-white/70">
        <div>
          <div className="font-medium text-white">Scanner Feed</div>
          <div>
            Posts discovered on X by Iris. “Processed” means the system already reviewed
            them. “Used for job” means they were important enough to become content or
            interaction inputs. “Ignored” means they were reviewed and discarded.
          </div>
        </div>

        <div>
          <div className="font-medium text-white">Selector Queue</div>
          <div>
            Caspian decides which discovered posts deserve attention. If pending grows,
            the decision layer is falling behind.
          </div>
        </div>

        <div>
          <div className="font-medium text-white">CopyDesk Jobs</div>
          <div>
            Zhao’s writing tasks. Queued means waiting to generate, processing means the
            model is writing now, failed means content generation crashed or was rejected
            by validation.
          </div>
        </div>

        <div>
          <div className="font-medium text-white">Generated Outputs</div>
          <div>
            Total content pieces produced by the writing engine. Not every output becomes
            a post. Some are never scheduled or never approved.
          </div>
        </div>

        <div>
          <div className="font-medium text-white">Scheduled Posts</div>
          <div>
            Content already placed on Mike’s publishing calendar. Queued means waiting
            for publish time, approved means founder approved it, publish ready means it
            can go live, sent means it was posted, cancelled means it was rejected or removed.
          </div>
        </div>
      </div>
    </Card>
  )
}
