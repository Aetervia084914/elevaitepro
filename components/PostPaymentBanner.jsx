'use client';

import React from 'react';
import { Check, Upload, Sparkles, FileText, User, CreditCard, Zap, AlertCircle } from 'lucide-react';

const STAGES = [
  { key: 'PROFILE',   label: 'Profile',    Icon: User },
  { key: 'PAYMENT',   label: 'Payment',    Icon: CreditCard },
  { key: 'UPLOAD_CV', label: 'Upload CV',  Icon: Upload },
  { key: 'ANALYSIS',  label: 'Analyse',    Icon: Sparkles },
  { key: 'RESULTS',   label: 'Results',    Icon: FileText },
];

export function PostPaymentBanner({ currentStage = 'UPLOAD_CV', creditsRemaining = 1, onCreditsClick, onStageClick }) {
  const currentIdx = STAGES.findIndex(s => s.key === currentStage);
  const noCredits = creditsRemaining <= 0;

  return (
    <div style={{
      width: '100%',
      borderRadius: 999,
      background: 'linear-gradient(135deg, rgba(219,234,254,0.55) 0%, rgba(224,231,255,0.60) 50%, rgba(207,220,253,0.55) 100%)',
      backdropFilter: 'blur(20px) saturate(160%)',
      WebkitBackdropFilter: 'blur(20px) saturate(160%)',
      border: '1px solid rgba(255,255,255,0.80)',
      boxShadow: '0 2px 16px rgba(99,102,241,0.10), inset 0 1px 0 rgba(255,255,255,0.90)',
      padding: '10px 18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 20,
    }}>

      {/* Steps */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
        {STAGES.map((stage, i) => {
          const isPast   = i < currentIdx;
          const isActive = i === currentIdx;
          const isResults = stage.key === 'RESULTS';
          const { Icon } = stage;

          return (
            <React.Fragment key={stage.key}>
              {i > 0 && (
                <div style={{
                  flex: '1 1 0',
                  height: 2,
                  borderRadius: 999,
                  background: isPast || isActive
                    ? 'rgba(99,102,241,0.22)'
                    : 'rgba(148,163,184,0.22)',
                  minWidth: 12,
                  maxWidth: 36,
                }} />
              )}

              <div 
                onClick={isResults ? undefined : () => onStageClick?.(stage.key)}
                style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: isActive ? '7px 14px' : '6px 12px',
                borderRadius: 999,
                background: isResults
                  ? isActive
                    ? 'rgba(59,130,246,0.12)'
                    : 'rgba(241,245,249,0.85)'
                  : isActive
                    ? 'linear-gradient(135deg, #7c3aed, #6366f1)'
                    : 'transparent',
                border: isResults
                  ? '1px solid rgba(59,130,246,0.20)'
                  : isActive
                    ? '1px solid rgba(139,92,246,0.40)'
                    : '1px solid transparent',
                boxShadow: isResults
                  ? 'none'
                  : isActive
                    ? '0 2px 12px rgba(99,102,241,0.30), inset 0 1px 0 rgba(255,255,255,0.20)'
                    : 'none',
                transition: 'all 0.2s ease',
                flexShrink: 0,
                cursor: isResults ? 'default' : 'pointer',
              }}>
                {isPast ? (
                  <Check
                    size={13}
                    strokeWidth={2.8}
                    style={{ color: '#10b981', flexShrink: 0 }}
                  />
                ) : (
                  <Icon
                    size={13}
                    style={{
                      color: isActive
                        ? isResults ? '#1d4ed8' : '#ffffff'
                        : 'rgba(100,116,139,0.70)',
                      flexShrink: 0,
                    }}
                  />
                )}
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: isPast
                    ? '#10b981'
                    : isActive
                      ? isResults ? '#1d4ed8' : '#ffffff'
                      : 'rgba(100,116,139,0.75)',
                  whiteSpace: 'nowrap',
                  letterSpacing: '-0.01em',
                }}>
                  {stage.label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Credits pill — changes appearance when credits are exhausted */}
      {noCredits ? (
        <button
          onClick={() => onCreditsClick?.()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            borderRadius: 999,
            background: 'rgba(254,242,242,0.90)',
            border: '1px solid rgba(239,68,68,0.35)',
            boxShadow: '0 1px 4px rgba(239,68,68,0.10)',
            flexShrink: 0,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(254,242,242,1.00)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(239,68,68,0.20)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(254,242,242,0.90)';
            e.currentTarget.style.boxShadow = '0 1px 4px rgba(239,68,68,0.10)';
          }}>
          <AlertCircle size={13} style={{ color: '#ef4444' }} />
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#dc2626',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.01em',
          }}>
            No credits - New CV needs payment 
          </span>
        </button>
      ) : (
        <button
          onClick={() => onCreditsClick?.()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.60)',
            border: '1px solid rgba(255,255,255,0.80)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            flexShrink: 0,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.80)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.60)';
            e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
          }}>
          <Zap size={13} style={{ color: '#10b981' }} fill="#10b981" />
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#10b981',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.01em',
          }}>
            {creditsRemaining} credit{creditsRemaining !== 1 ? 's' : ''} ready
          </span>
        </button>
      )}
    </div>
  );
}
