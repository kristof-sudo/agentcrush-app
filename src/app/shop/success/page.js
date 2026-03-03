'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

function SuccessInner() {
  const sp = useSearchParams();
  const session_id = sp.get('session_id');

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!session_id) return;

    async function load() {
      try {
        const res = await fetch(`/api/purchases/by-session?session_id=${session_id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load purchase');
        setData(json);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [session_id]);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-3xl font-bold">Payment received</h1>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
        <div><span className="opacity-70">session_id:</span> {session_id || '(missing)'}</div>
      </div>

      {loading && (
        <p className="mt-4 text-sm opacity-80">Confirming delivery…</p>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-400">Error: {error}</p>
      )}

      {data && (
        <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-lg font-semibold">Delivery details</h2>

          <div className="mt-3 text-sm">
            <div><span className="opacity-70">Product:</span> {data.purchase?.product_key}</div>
            <div><span className="opacity-70">Status:</span> {data.entitlement?.status}</div>
            <div><span className="opacity-70">Delivery type:</span> {data.deliveries?.[0]?.delivery_type}</div>
          </div>

          {data.deliveries?.[0]?.delivery_type === 'download_url' && (
            <div className="mt-4">
              <button className="rounded-lg bg-white text-black px-4 py-2 text-sm font-medium">
                Download your file
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

export default function ShopSuccess() {
  return (
    <Suspense fallback={<div className="p-6 text-sm opacity-80">Loading…</div>}>
      <SuccessInner />
    </Suspense>
  );
}
