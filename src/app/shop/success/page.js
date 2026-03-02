'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

function SuccessInner() {
  const sp = useSearchParams();
  const session_id = sp.get('session_id');

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-3xl font-bold">Payment received</h1>
      <p className="mt-2 text-sm opacity-80">Your purchase is being processed automatically.</p>
      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
        <div><span className="opacity-70">session_id:</span> {session_id || '(missing)'}</div>
      </div>
      <p className="mt-4 text-sm opacity-80">You can close this page. Delivery will appear in-app.</p>
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
