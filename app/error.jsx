'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('[AppError] Unhandled error caught by error boundary:', error);
  }, [error]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, fontFamily: 'inherit' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Something went wrong</h2>
      <p style={{ color: '#6b7280', marginBottom: 20, maxWidth: 480, textAlign: 'center' }}>
        {error?.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <button
        onClick={() => reset()}
        style={{ padding: '10px 24px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
      >
        Try Again
      </button>
    </div>
  );
}
