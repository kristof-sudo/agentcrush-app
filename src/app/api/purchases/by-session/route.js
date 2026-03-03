import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function sbAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const session_id = searchParams.get("session_id");
    if (!session_id) {
      return Response.json({ error: "Missing session_id" }, { status: 400 });
    }

    const sb = sbAdmin();

    const { data: purchase, error: perr } = await sb
      .from("purchases")
      .select("*")
      .eq("stripe_checkout_session_id", session_id)
      .maybeSingle();
    if (perr) throw perr;
    if (!purchase) return Response.json({ error: "Purchase not found" }, { status: 404 });

    const { data: entitlement, error: eerr } = await sb
      .from("entitlements")
      .select("*")
      .eq("source_purchase_id", purchase.id)
      .maybeSingle();
    if (eerr) throw eerr;

    let deliveries = [];
    if (entitlement?.id) {
      const { data: dels, error: derr } = await sb
        .from("deliveries")
        .select("*")
        .eq("entitlement_id", entitlement.id)
        .order("created_at", { ascending: false });
      if (derr) throw derr;
      deliveries = dels || [];
    }

    return Response.json({ purchase, entitlement, deliveries });
  } catch (e) {
    return Response.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
