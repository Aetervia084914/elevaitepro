import React from 'react';
import { Sparkles } from 'lucide-react';

export const FileUpload = ({ userData, onContinue, onLogout }) => {

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Hello World</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-2xl bg-white p-12 rounded-3xl shadow-xl border border-slate-100">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-2xl mb-4">
            <Sparkles className="text-sky-300" size={24} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Welcome, {userData.name}
          </h2>
        </div>

        <div className="space-y-3 text-sm text-slate-700">
          <div><strong>Email:</strong> {userData.email}</div>
          <div><strong>Tier:</strong> {userData.selectedTier}</div>
          <div><strong>Region:</strong> {userData.region}</div>
        </div>

        <div className="mt-10 flex gap-4">
          <button
            onClick={onContinue}
            className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest"
          >
            Go To Dashboard
          </button>

          <button
            onClick={onLogout}
            className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest"
          >
            Logout
          </button>
        </div>

      </div>
    </div>
  );
};
