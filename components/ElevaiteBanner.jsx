import { Badge } from './ui/badge.jsx';
import { ArrowRight, Sparkles, Brain, Info } from 'lucide-react';
export default function ElevaiteBanner() {
  return (
    <div>
                {/* Badge */}
        <div className="relative group mb-8 animate-float">
          <Badge
            variant="secondary"
            className="relative overflow-hidden py-2 px-5 gap-2.5 rounded-full border border-white/30 bg-white/10 backdrop-blur-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_0_20px_rgba(59,111,245,0.1)] transition-all duration-500 group-hover:scale-105 group-hover:bg-white/15 animate-in fade-in slide-in-from-bottom-3 duration-700"
          >
            <div className="absolute inset-0 z-0 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12 animate-shimmer-fast" />
            </div>

            <Brain className="w-3.5 h-3.5 text-white relative z-10" />
                <span style={{ fontSize: 20, fontWeight: 600 }} className="text-white">
        elev<span style={{ color: "#7cc3ff" }}>AI</span>te pro
      </span>
            <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/90 relative z-10">
              The simplest way to grow your career
            </span>
          </Badge>
        </div>



      {/* Brand Name */}
  
 

    </div>
  );
}
