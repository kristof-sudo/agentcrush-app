import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let cached = null

function makeQueryBuilder() {
  const builder = {
    select() { return builder },
    insert() { return builder },
    update() { return builder },
    delete() { return builder },
    upsert() { return builder },
    eq() { return builder },
    neq() { return builder },
    gt() { return builder },
    gte() { return builder },
    lt() { return builder },
    lte() { return builder },
    like() { return builder },
    ilike() { return builder },
    in() { return builder },
    contains() { return builder },
    containedBy() { return builder },
    overlaps() { return builder },
    is() { return builder },
    not() { return builder },
    or() { return builder },
    filter() { return builder },
    order() { return builder },
    limit() { return builder },
    range() { return builder },
    single: async () => ({ data: null, error: null }),
    maybeSingle: async () => ({ data: null, error: null }),
    then(resolve) {
      return Promise.resolve({ data: [], error: null }).then(resolve)
    },
    catch() {
      return Promise.resolve({ data: [], error: null })
    },
  }
  return builder
}

function makeFallbackClient() {
  return {
    from() {
      return makeQueryBuilder()
    },
    rpc: async () => ({ data: null, error: null }),
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
    },
  }
}

function buildClient() {
  if (!url || !key) {
    return makeFallbackClient()
  }

  if (!cached) {
    cached = createClient(url, key)
  }

  return cached
}

export function getSupabase() {
  return buildClient()
}

export function supabaseAnon() {
  return buildClient()
}
