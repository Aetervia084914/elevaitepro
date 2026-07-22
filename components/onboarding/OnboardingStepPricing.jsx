
import React from 'react';
import { PricingTier } from '../../app/types.js';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { OnboardingModalShell } from './OnboardingModalShell.jsx';

export const OnboardingStepPricing = ({ prices, onSelectTier, onShowComparison, onBack }) => {
  return (
    <OnboardingModalShell
      onClose={onBack}
      leftEyebrow="Professional Intelligence Access"
      leftTitle="Select your plan"
      leftSubtitle="Professional Intelligence Access"
      leftFooterItems={['Starter', 'Pro', 'Detailed Comparison']}
      className="md:min-h-[510px]"
    >
      <div className="mx-auto w-full max-w-[360px]">
        <div className="mb-[5px] font-[var(--font-bricolage-grotesque)] text-[22px] font-extrabold tracking-[-0.025em] text-[var(--m05-indigo-900)]">
          Select your plan
        </div>
        <div className="mb-6 text-[13px] leading-[1.5] text-[var(--m05-muted)]">
          Professional Intelligence Access
        </div>

        <div className="grid grid-cols-1 gap-3">
          {[
            { t: PricingTier.STARTER, p: prices.Basic, n: 'Starter', desc: 'Core features' },
            { t: PricingTier.PRO, p: prices.Pro, n: 'Pro', desc: 'Advanced analysis', highlight: true }
          ].map((tier, idx) => (
            <button
              key={String(tier.t) + '-' + tier.n + '-' + idx}
              type="button"
              onClick={() => onSelectTier(tier.t)}
              className={`group rounded-2xl border px-4 py-4 text-left transition-all ${tier.highlight ? 'border-[rgba(57,73,171,0.18)] bg-[linear-gradient(135deg,rgba(57,73,171,0.08),rgba(0,188,212,0.06))] shadow-[0_12px_30px_rgba(57,73,171,0.12)]' : 'border-[var(--m05-border)] bg-white shadow-[0_8px_24px_rgba(57,73,171,0.06)] hover:border-[rgba(57,73,171,0.2)] hover:bg-[#F8F9FF]'}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold text-[var(--m05-indigo-900)]">{tier.n}</span>
                    {tier.highlight && (
                      <span className="rounded-full bg-[var(--m05-indigo-700)] px-2 py-1 text-[8px] font-extrabold uppercase tracking-[0.08em] text-white">
                        Best Value
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[12px] text-[var(--m05-muted)]">{tier.desc}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-[var(--font-unbounded)] text-[18px] font-bold tracking-[-0.03em] text-[var(--m05-indigo-900)]">{tier.p}</div>
                  <div className="grid h-8 w-8 place-items-center rounded-full border border-[var(--m05-border)] bg-[#F8F9FF] text-[var(--m05-indigo-700)] transition-colors group-hover:bg-[var(--m05-indigo-700)] group-hover:text-white">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onShowComparison}
            className="border-b border-[var(--m05-border)] pb-0.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--m05-muted)] transition-colors hover:text-[var(--m05-indigo-700)]"
          >
            Detailed Comparison
          </button>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-[5px] text-[12px] text-[var(--m05-muted-light)] transition-colors hover:text-[var(--m05-indigo-700)]"
            >
              <ChevronLeft className="h-[12px] w-[12px]" />
              Return to previous step
            </button>
          )}
        </div>
      </div>
    </OnboardingModalShell>
  );
};
