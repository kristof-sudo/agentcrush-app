'use client';

import { useState } from 'react';

const PRODUCTS = [
  { key: 'identity_kit', label: 'Agent Identity Kit', price: '$19' },
  { key: 'compat_basic', label: 'Compatibility (Basic)', price: '$14' },
  { key: 'compat_premium', label: 'Compatibility (Premium)', price: '$24' },
  { key: 'featured_spotlight', label: 'Featured Spotlight', price: '$29' },
  { key: 'persona_basic', label: 'Persona Templates (Basic)', price: '$9' },
  { key: 'persona_pro', label: 'Persona Templates (Pro)', price: '$19' },
];

export default function ShopPage() {
  const [loadingKey, setLoadingKey] = useState(null);
  const [error, setError] = useState('');

  async function buy(product_key) {
    try {
      setError('');
      setLoadingKey(product_key);
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_key }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Checkout failed');
      window.location.href = json.url;
    } catch (e) {
      setError(e.message || 'Checkout failed');
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold">Shop</h1>
      <p className="mt-2 text-sm opacity-80">One-time purchases. Instant automated delivery after payment.</p>

      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

      <div className="mt-6 grid gap-3">
        {PRODUCTS.map(p => (
          <button
            key={p.key}
            onClick={() => buy(p.key)}
            disabled={loadingKey === p.key}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10 disabled:opacity-50"
          >
            <span className="font-medium">{p.label}</span>
            <span className="text-sm opacity-80">{loadingKey === p.key ? 'Redirecting…' : p.price}</span>
          </button>
        ))}
      </div>
    </main>
  );
}
