'use client'

import { useState } from 'react'

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

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

const inputCls =
  'w-full rounded-lg border border-white/[0.08] bg-[rgba(255,255,255,0.04)] px-3 py-2 font-mono text-sm text-white placeholder:text-white/20 outline-none transition focus:border-[rgba(232,121,249,0.4)]'

const labelCls = 'font-mono text-xs text-white/50 uppercase tracking-wider'

function Field({ label, children, hint }) {
  return (
    <div className="flex flex-col gap-1">
      <label className={labelCls}>{label}</label>
      {children}
      {hint && <span className="text-[10px] text-white/25">{hint}</span>}
    </div>
  )
}

export default function SubmitAgentForm() {
  const [form, setForm] = useState({
    submitter_email: '',
    handle: '',
    display_name: '',
    tagline: '',
    bio: '',
    archetype: '',
    website: '', // honeypot
  })
  const [avatarFile, setAvatarFile] = useState(null)
  const [claimVerification, setClaimVerification] = useState(false)
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
      if (!form.submitter_email.trim()) throw new Error('Email is required.')
      if (!form.handle.trim()) throw new Error('Handle is required.')
      if (!form.display_name.trim()) throw new Error('Display name is required.')
      if (!form.bio.trim()) throw new Error('Bio is required.')
      if (!form.archetype.trim()) throw new Error('Archetype is required.')
      if (!avatarFile) throw new Error('Avatar image is required.')
      if (avatarFile.size > MAX_FILE_SIZE) throw new Error('Avatar image must be 5 MB or smaller.')

      const body = new FormData()
      body.append('submitter_email', form.submitter_email.trim())
      body.append('handle', form.handle.trim())
      body.append('display_name', form.display_name.trim())
      body.append('tagline', form.tagline.trim())
      body.append('bio', form.bio.trim())
      body.append('archetype', form.archetype.trim())
      body.append('website', form.website) // honeypot
      body.append('avatar', avatarFile)

      const res = await fetch('/api/submit-agent', { method: 'POST', body })
      const data = await res.json()

      if (!res.ok) throw new Error(data?.error || 'Submission failed.')

      setMessage('Submission received. Your agent will be reviewed and added within 24 hours.')
      setForm({ submitter_email: '', handle: '', display_name: '', tagline: '', bio: '', archetype: '', website: '' })
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
    <div className="max-w-lg">
      <div className="relative rounded-lg border border-white/[0.08] bg-[#0a0a14] px-4 py-4 overflow-hidden">
        {/* Corner accents */}
        <span className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t border-l border-[rgba(232,121,249,0.35)]" />
        <span className="pointer-events-none absolute top-0 right-0 w-2 h-2 border-t border-r border-[rgba(232,121,249,0.35)]" />
        <span className="pointer-events-none absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[rgba(232,121,249,0.35)]" />
        <span className="pointer-events-none absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[rgba(232,121,249,0.35)]" />
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          {/* Honeypot */}
          <input
            type="text"
            name="website"
            value={form.website}
            onChange={(e) => updateField('website', e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
          />

          <Field label="Your email *">
            <input
              type="email"
              value={form.submitter_email}
              onChange={(e) => updateField('submitter_email', e.target.value)}
              className={inputCls}
              placeholder="you@example.com"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Handle *">
              <input
                type="text"
                value={form.handle}
                onChange={(e) => updateField('handle', e.target.value)}
                className={inputCls}
                placeholder="virtuals_agent"
              />
            </Field>
            <Field label="Display name *">
              <input
                type="text"
                value={form.display_name}
                onChange={(e) => updateField('display_name', e.target.value)}
                className={inputCls}
                placeholder="Virtuals Agent"
              />
            </Field>
          </div>

          <Field label="Tagline">
            <input
              type="text"
              value={form.tagline}
              onChange={(e) => updateField('tagline', e.target.value)}
              className={inputCls}
              placeholder="Autonomous trading agent built on Virtuals Protocol"
            />
          </Field>

          <Field label="Category *">
            <select
              value={form.archetype}
              onChange={(e) => updateField('archetype', e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-[rgba(255,255,255,0.04)] px-3 py-2 font-mono text-sm text-white outline-none transition focus:border-[rgba(232,121,249,0.4)]"
            >
              <option value="">Select a category</option>
              {ARCHETYPES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </Field>

          <Field label="Bio *" hint="What does your agent do? Keep it under 600 characters.">
            <textarea
              rows={3}
              value={form.bio}
              onChange={(e) => updateField('bio', e.target.value)}
              className={inputCls}
              placeholder="Describe your agent's core function and purpose."
            />
          </Field>

          <Field label="Avatar image *" hint="PNG, JPG or WEBP · max 5 MB">
            <input
              id="avatar-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-sm text-white/60 file:mr-3 file:rounded file:border-0 file:bg-white/[0.08] file:px-2.5 file:py-1 file:text-xs file:text-white/70 file:cursor-pointer"
            />
          </Field>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/[0.07] px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-2 text-xs text-emerald-300">
              {message}
            </div>
          )}

          <div className="pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md border border-[rgba(232,121,249,0.4)] bg-[rgba(232,121,249,0.1)] px-4 py-2 font-mono text-xs font-bold text-[#e879f9] transition-colors hover:bg-[rgba(232,121,249,0.18)] hover:border-[rgba(232,121,249,0.65)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit for Review →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
