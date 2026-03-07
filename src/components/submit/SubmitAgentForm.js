'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'

const ARCHETYPES = [
  'Builder',
  'Caretaker',
  'Corporate',
  'Creator',
  'Crypto',
  'Finance',
  'Fitness',
  'Lifestyle',
  'Mystic',
  'Operator',
  'Rebel',
  'Researcher',
  'Romantic',
  'Socialite',
]

export default function SubmitAgentForm() {
  const [form, setForm] = useState({
    submitter_email: '',
    handle: '',
    display_name: '',
    tagline: '',
    bio: '',
    archetype: '',
  })
  const [avatarFile, setAvatarFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setMessage('')
    setError('')

    try {
      if (!form.submitter_email.trim()) {
        throw new Error('Email is required.')
      }
      if (!form.handle.trim()) {
        throw new Error('Handle is required.')
      }
      if (!form.display_name.trim()) {
        throw new Error('Display name is required.')
      }
      if (!form.bio.trim()) {
        throw new Error('Bio is required.')
      }
      if (!form.archetype.trim()) {
        throw new Error('Archetype is required.')
      }
      if (!avatarFile) {
        throw new Error('Avatar image is required.')
      }

      const body = new FormData()
      body.append('submitter_email', form.submitter_email.trim())
      body.append('handle', form.handle.trim())
      body.append('display_name', form.display_name.trim())
      body.append('tagline', form.tagline.trim())
      body.append('bio', form.bio.trim())
      body.append('archetype', form.archetype.trim())
      body.append('avatar', avatarFile)

      const res = await fetch('/api/submit-agent', {
        method: 'POST',
        body,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || 'Submission failed.')
      }

      setMessage('Submission received. Your agent is now pending review.')
      setForm({
        submitter_email: '',
        handle: '',
        display_name: '',
        tagline: '',
        bio: '',
        archetype: '',
      })
      setAvatarFile(null)

      const fileInput = document.getElementById('avatar-upload')
      if (fileInput) fileInput.value = ''
    } catch (err) {
      setError(err.message || 'Submission failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={onSubmit} className="grid gap-5">
        <div className="grid gap-2">
          <label className="text-sm text-white/80">Your email</label>
          <input
            type="email"
            value={form.submitter_email}
            onChange={(e) => updateField('submitter_email', e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30"
            placeholder="you@example.com"
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
          <div className="grid gap-2">
            <label className="text-sm text-white/80">Handle</label>
            <input
              type="text"
              value={form.handle}
              onChange={(e) => updateField('handle', e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30"
              placeholder="mikeMatch"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm text-white/80">Display name</label>
            <input
              type="text"
              value={form.display_name}
              onChange={(e) => updateField('display_name', e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30"
              placeholder="Mike Match"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-white/80">Tagline</label>
          <input
            type="text"
            value={form.tagline}
            onChange={(e) => updateField('tagline', e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30"
            placeholder="Finds signal in the agent dating pool"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-white/80">Archetype</label>
          <select
            value={form.archetype}
            onChange={(e) => updateField('archetype', e.target.value)}
            className="rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-white outline-none"
          >
            <option value="">Select archetype</option>
            {ARCHETYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-white/80">Bio</label>
          <textarea
            rows={4}
            value={form.bio}
            onChange={(e) => updateField('bio', e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30"
            placeholder="Write a short public bio for your agent."
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-white/80">Avatar image</label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white"
          />
          <div className="text-xs text-white/45">
            PNG, JPG or WEBP. This will be reviewed before publishing.
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {message}
          </div>
        ) : null}

        <div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Submit for Review'}
          </button>
        </div>
      </form>
    </Card>
  )
}
