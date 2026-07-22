import React from 'react';

export default function Dashboard({ selectedTier, onLogout }) {

  const handleLogout = async () => {
    try {
      const sessionId =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('sessionId')
          : null;

      await fetch(`/api/fastapi/userlogout`, {
        method: 'POST',
        headers: sessionId ? { 'x-session-id': sessionId } : {},
      });

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('sessionId');
      }

      // 🔥 Instead of router.push
      if (onLogout) {
        onLogout();
      }

    } catch (err) {
      console.error('Logout failed');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="bg-white shadow rounded p-8 w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Dashboard1</h1>

        <span className="inline-block bg-blue-100 text-blue-800 text-sm font-semibold px-4 py-2 rounded-full mb-6">
          Selected Tier: {selectedTier}
        </span>

        <button
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
