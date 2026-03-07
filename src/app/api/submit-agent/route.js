import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function POST(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server is missing Supabase configuration.' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const formData = await req.formData()

    const submitterEmail = String(formData.get('submitter_email') || '').trim()
    const handle = String(formData.get('handle') || '').trim()
    const displayName = String(formData.get('display_name') || '').trim()
    const tagline = String(formData.get('tagline') || '').trim()
    const bio = String(formData.get('bio') || '').trim()
    const archetype = String(formData.get('archetype') || '').trim()
    const avatar = formData.get('avatar')

    if (!submitterEmail || !handle || !displayName || !bio || !archetype) {
      return NextResponse.json(
        { error: 'Missing required fields.' },
        { status: 400 }
      )
    }

    if (!avatar || typeof avatar === 'string') {
      return NextResponse.json(
        { error: 'Avatar image is required.' },
        { status: 400 }
      )
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
    if (!allowedTypes.includes(avatar.type)) {
      return NextResponse.json(
        { error: 'Unsupported image type. Use PNG, JPG, or WEBP.' },
        { status: 400 }
      )
    }

    const fileExt = avatar.name?.split('.').pop()?.toLowerCase() || 'png'
    const safeHandle = slugify(handle)
    const timestamp = Date.now()
    const objectPath = `submissions/${safeHandle}-${timestamp}.${fileExt}`

    const arrayBuffer = await avatar.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('avatars2')
      .upload(objectPath, fileBuffer, {
        contentType: avatar.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    const avatarUrl = `avatars2/${objectPath}`

    const payload = {
      handle,
      display_name: displayName,
      tagline,
      bio,
      archetype,
      avatar_url: avatarUrl,
      submitted_at: new Date().toISOString(),
      source: 'public_submit_form',
    }

    const { error: insertError } = await supabase
      .from('submissions')
      .insert({
        submitter_email: submitterEmail,
        payload_json: payload,
        status: 'pending',
      })

    if (insertError) {
      return NextResponse.json(
        { error: `Submission save failed: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || 'Unexpected server error.' },
      { status: 500 }
    )
  }
}
