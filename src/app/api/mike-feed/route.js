/*
 * mike-feed — returns the 8 most recent Mike posts.
 *
 * Table setup (run in Supabase SQL editor):
 *
 *   CREATE TABLE mike_posts (
 *     id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *     content      TEXT NOT NULL,
 *     published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *     tweet_url    TEXT,
 *     created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
 *   );
 *
 *   CREATE INDEX mike_posts_published_at_idx ON mike_posts (published_at DESC);
 */

import { NextResponse } from 'next/server'
import { supabaseAnon } from '@/lib/supabase'

export const revalidate = 300 // cache for 5 minutes

export async function GET() {
  const supabase = supabaseAnon()

  const { data, error } = await supabase
    .from('mike_posts')
    .select('id, content, published_at, tweet_url')
    .order('published_at', { ascending: false })
    .limit(8)

  if (error) {
    // Table may not exist yet — return empty rather than 500
    return NextResponse.json({ posts: [] })
  }

  return NextResponse.json({ posts: data || [] })
}
