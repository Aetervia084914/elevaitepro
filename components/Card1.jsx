
import { Card, CardHeader, CardContent } from "./ui/card.jsx";
import { cn } from "../lib/utils.js";
import { Sparkles } from "lucide-react";

export default function Card1({
  title,
  children,
  icon: Icon = Sparkles,
  variant = "jd",
  rounded,
  width,
  height,
  className,
}) {
  const variants = {
    jd: "from-slate-800 via-slate-900 to-slate-950", // Dark Professional
    indigo: "from-indigo-600 via-violet-600 to-blue-500",
    teal: "from-teal-600 via-emerald-500 to-teal-400",
    purple: "from-fuchsia-600 via-purple-600 to-violet-600",
    orange: "from-orange-600 via-amber-500 to-yellow-400",
    blue: "from-blue-600 via-sky-500 to-cyan-400",
    red: "from-rose-600 via-red-500 to-orange-500",
    pink: "from-pink-600 via-rose-500 to-fuchsia-500",
    neon: "from-slate-900 via-purple-900 to-slate-900",
    glass: "from-white/10 via-white/5 to-transparent",
    saasGrowth: "from-emerald-500 via-teal-500 to-cyan-600",
        // --- NEW VARIANTS (FROM IMAGES) ---
    darkRoyal: "from-[#0F0C29] via-[#302B63] to-[#24243E]",
darkObsidian: "from-black via-slate-900 to-slate-800",
darkVelvet: "from-purple-950 via-fuchsia-900 to-black",
darkEmerald: "from-[#0B3D2E] via-emerald-900 to-black",
darkGold: "from-[#1F1C2C] via-[#928DAB] to-black",
darkGalaxy: "from-indigo-950 via-purple-900 to-black",
aiNeural: "from-cyan-400 via-blue-500 to-indigo-600",
aiQuantum: "from-purple-500 via-pink-500 to-red-500",
aiCyber: "from-cyan-400 via-purple-500 to-fuchsia-600",
aiMatrix: "from-green-400 via-emerald-500 to-teal-700",
aiHologram: "from-sky-400 via-indigo-500 to-purple-600",
aiFusion: "from-blue-600 via-violet-600 to-pink-600",
trendNeoMint: "from-[#00F5D4] via-[#02C39A] to-[#028090]",
trendSolarPop: "from-[#FDEB71] via-[#F8D800] to-[#F76B1C]",
trendDigitalLavender: "from-[#CDB4DB] via-[#B583D6] to-[#9D4EDD]",
trendFutureCoral: "from-[#FF6B6B] via-[#FF8E72] to-[#FFB26B]",
trendHyperBlue: "from-[#3A86FF] via-[#4361EE] to-[#3F37C9]",
trendSoftLuxury: "from-[#E3F2FD] via-[#CDB4DB] to-[#FFC8DD]",
    // 1. Electric Violet (#A855F7)
    electricViolet: "from-[#A855F7] via-purple-500 to-indigo-600",
    
    // 2. Royal Purple (#6B55C6)
    royalPurple: "from-[#6B55C6] via-indigo-600 to-violet-800",
    
    // 3. Soft Lavender (#C084FC)
    softLavender: "from-[#C084FC] via-purple-400 to-fuchsia-400",
    
    // 4. Light Lilac (#E879F9 / #DB4FE)
    lightLilac: "from-[#DB4FE] via-[#E879F9] to-fuchsia-500",
    
    // 5. Vibrant Pink (#EE4899)
    vibrantPink: "from-[#EE4899] via-pink-500 to-rose-500",
    
    // 6. Pale Periwinkle (Visual Blue/Purple Mix)
    palePeriwinkle: "from-[#818CF8] via-[#60A5FA] to-blue-400",
    
    // 7. Soft Pink/Peach (Visual mix from right side of image 1)
    softPink: "from-[#F472B6] via-[#FB7185] to-rose-400",
    
    // 8. Ocean (#0284C7)
    ocean: "from-[#0284C7] via-sky-600 to-blue-700",
    
    // 9. Cornflower (#A5B4FC)
    cornflower: "from-[#A5B4FC] via-indigo-300 to-blue-400",
    
    // 10. Azure (#0891B2)
    azure: "from-[#0891B2] via-cyan-600 to-teal-600",
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-0 text-white",
        rounded || "rounded-[2rem]",
        width,
        height,
        "bg-gradient-to-br",
        variants[variant] || variants.jd,
        "backdrop-blur-2xl",
        "shadow-[0_20px_50px_rgba(0,0,0,0.15)]",
        "shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]", 
        "ring-1 ring-white/10",
        "transition-all duration-500 ease-out",
        
        className
      )}
    >
      {/* GLOSS LAYERS */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent pointer-events-none" />
      
      {/* AMBIENT LIGHTING */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />

      {/* ICON + TITLE ROW */}
      <CardHeader className="relative z-10 px-8 pt-8 pb-2">
        <div className="flex items-center gap-4">
          <div className="group relative inline-flex">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center",
              "bg-white/10 backdrop-blur-md border border-white/20",
              "shadow-lg group-hover:scale-110 transition-transform duration-300"
            )}>
              <Icon className="w-7 h-7 text-white" strokeWidth={2} />
            </div>
          </div>

          {title && (
            <h3 className="text-lg font-bold text-white">
              {title}
            </h3>
          )}
        </div>
      </CardHeader>

      {/* CONTENT */}
      <CardContent className="relative z-10 px-8 pt-1 pb-10 text-white  leading-tight">
        {children}
      </CardContent>
    </Card>
  );
}
