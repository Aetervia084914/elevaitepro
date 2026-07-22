import React from 'react';
import { X } from 'lucide-react';
import { getPricingPlans, PRICING_CRITERIA } from '../datastore.js';
import { motion, AnimatePresence } from 'framer-motion';

export const PricingComparisonModal = ({
  isOpen,
  onClose,
  onSelectTier,
  prices
}) => {
  if (!isOpen) return null;

  const plans = getPricingPlans(prices);

  const getTierStyles = (tier) => {
    switch (tier.toLowerCase()) {
      case 'starter':
        return {
          column: 'bg-vibrant-azure/70 text-white border-r border-white/20',
          priceColor: 'text-white',
          button: 'bg-gradient-to-br from-vibrant-azure/60 to-vibrant-indigo/60 text-white border border-white/20 shadow-lg shadow-blue-900/30 backdrop-blur-md',
          dot: 'bg-vibrant-azure shadow-[0_0_8px_rgba(0,107,223,0.6)]',
        };
      case 'pro':
        return {
          column: 'bg-white/90 text-slate-900 rounded-r-[1.5rem] border-white/50',
          priceColor: 'text-vibrant-indigo',
          button: 'bg-white text-vibrant-indigo border border-slate-200 shadow-xl hover:bg-slate-50 transition-all font-bold',
          dot: 'bg-vibrant-azure shadow-[0_0_8px_rgba(0,107,223,0.4)]',
        };
      default:
        return {
          column: 'bg-slate-800/60 text-white',
          priceColor: 'text-white',
          button: 'bg-white text-bold',
          dot: 'bg-white',
        };
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-6">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-150/80 backdrop-blur-[24px] saturate-150"
        />

        {/* Modal Container */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="relative w-full h-[90vh] bg-gradient-to-br from-white/15 to-white/5 rounded-[2rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.6)] border border-white/20 flex flex-col backdrop-blur-3xl"
        >
          {/* Header */}
          <div className="p-6 pb-2 flex justify-center items-center relative z-10">
            <div className="text-center">
              <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tighter italic uppercase leading-none">
                Plan <span className="text-vibrant-azure">comparison</span>
              </h2>
            </div>
            
            <button 
              onClick={onClose} 
              className="absolute right-6 top-6 p-2 hover:bg-white/15 rounded-full transition-all text-white/60 border border-white/10 backdrop-blur-md"
            >
              <X size={20} />
            </button>
          </div>

          {/* Pricing Grid - Compacted heights */}
          <div className="flex-grow overflow-auto px-6 md:px-8 pb-8 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 w-full h-fit gap-6 bg-transparent">
              
              {/* Criteria Column */}
              <div className="hidden md:flex flex-col bg-vibrant-indigo/40 text-white/90 rounded-l-2xl border-r border-white/5 backdrop-blur-md shadow-lg">
                <div className="h-28 flex items-center px-8 border-b border-white/10">
                  <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-white/30">Criteria</span>
                </div>
                <div className="flex-grow flex flex-col">
                  {PRICING_CRITERIA.map((feature) => (
                    <div key={feature} className="h-12 flex items-center px-8 border-b border-white/5 hover:bg-white/5 transition-all">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">{feature}</span>
                    </div>
                  ))}
                </div>
                <div className="h-24 border-t border-white/10"></div>
              </div>

              {/* Tier Columns */}
              {plans.map((p) => {
                const styles = getTierStyles(p.tier);
                return (
                  <div key={p.tier} className={`flex flex-col rounded-2xl shadow-xl border border-white/10 ${p.tier === 'Starter' ? 'bg-vibrant-azure/70 text-white md:rounded-l-2xl' : 'bg-white/90 text-slate-900'} ${p.tier === 'Pro' ? 'md:rounded-r-2xl' : ''}`}>
                    {/* Header */}
                    <div className="h-28 flex flex-col items-center justify-center text-center p-3 border-b border-white/10 relative z-10">
                      <h3 className="text-base font-bold italic uppercase tracking-tighter mb-0.5 opacity-80">{p.tier}</h3>
                      <div className="flex items-center justify-center">
                        <span className="inline-block text-4xl font-black tracking-tighter italic text-vibrant-azure bg-white rounded-lg px-4 py-2 shadow-md">
                          {p.price}
                        </span>
                      </div>
                    </div>

                    {/* Features List - Compacted */}
                    <div className="divide-y divide-white/5 flex-grow relative z-10">
                      {p.features.map((feature, i) => (
                        <div key={i} className="h-12 flex items-center px-6 hover:bg-white/5 transition-colors">
                          <span className="text-[10px] font-bold tracking-tight flex items-center gap-2.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Button Area */}
                    <div className="h-24 flex items-center justify-center p-5 relative z-10">
                      <button 
                        onClick={() => onSelectTier(p.tier)} 
                        className={`w-full h-11 rounded-xl text-[9px] font-bold uppercase tracking-[0.2em] transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg shimmer-btn ${styles.button}`}
                      >
                        Select {p.tier}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Footer */}
          <div className="px-8 py-4 border-t border-white/5 flex justify-center items-center opacity-30">
             <span className="text-[7px] font-bold uppercase tracking-[0.8em] text-white">Precision Engineering</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};