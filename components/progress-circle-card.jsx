import React from "react";
import { Card } from "./ui/card.jsx";
import { motion } from "framer-motion";

const ProgressCircleCard = ({
  label,
  percent,
  checked,
  total,
  color = "jd",
  icon,
}) => {
  const variants = {
    jd: "from-slate-800 via-slate-900 to-slate-950",
    indigo: "from-indigo-600 via-violet-600 to-blue-500",
    teal: "from-teal-600 via-emerald-500 to-teal-400",
    purple: "from-fuchsia-600 via-purple-600 to-violet-600",
    orange: "from-orange-600 via-amber-500 to-yellow-400",
    blue: "from-blue-600 via-sky-500 to-cyan-400",
    red: "from-rose-600 via-red-500 to-orange-500",
    pink: "from-pink-600 via-rose-500 to-fuchsia-500",
    neon: "from-slate-900 via-purple-900 to-slate-900",
    glass: "from-white/10 via-white/5 to-transparent",

    electricViolet: "from-[#A855F7] via-purple-500 to-indigo-600",
    royalPurple: "from-[#6B55C6] via-indigo-600 to-violet-800",
    softLavender: "from-[#C084FC] via-purple-400 to-fuchsia-400",
    lightLilac: "from-[#DB4FE] via-[#E879F9] to-fuchsia-500",
    vibrantPink: "from-[#EE4899] via-pink-500 to-rose-500",
    palePeriwinkle: "from-[#818CF8] via-[#60A5FA] to-blue-400",
    softPink: "from-[#F472B6] via-[#FB7185] to-rose-400",
    ocean: "from-[#0284C7] via-sky-600 to-blue-700",
    cornflower: "from-[#A5B4FC] via-indigo-300 to-blue-400",
    azure: "from-[#0891B2] via-cyan-600 to-teal-600",
  };

  const bgGradient = variants[color] || variants.jd;

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
    >
      <Card
        className={`
          relative overflow-hidden rounded-[2rem] border-0 text-white
          bg-gradient-to-br ${bgGradient}
          backdrop-blur-2xl
          shadow-[0_20px_50px_rgba(0,0,0,0.15)]
          shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]
          ring-1 ring-white/10
          transition-all duration-500
          text-white w-full h-44
        `}
      >
        {/* gloss highlight */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent pointer-events-none" />

        {/* ambient glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />

        {/* HEADER */}
        <div className="relative z-10 p-4 flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
            {React.cloneElement(icon, {
              className: "w-4 h-4 text-white",
            })}
          </div>

          <span className="font-semibold tracking-tight text-white/90 text-[13px]">
            {label}
          </span>
        </div>

        {/* PROGRESS RING */}
        <div className="relative flex items-center justify-center pb-1">
          <svg width="78" height="78" viewBox="0 0 100 100" className="-rotate-90">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="10"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="white"
              strokeWidth="10"
              strokeDasharray={2 * Math.PI * 40}
              initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
              animate={{
                strokeDashoffset:
                  2 * Math.PI * 40 * (1 - percent / 100),
              }}
              transition={{ duration: 1, ease: "easeOut" }}
              strokeLinecap="round"
            />
          </svg>

          <div className="absolute flex flex-col items-center">
            <span className="text-[20px] font-bold tracking-tight leading-none">
              {percent}%
            </span>
          </div>
        </div>

        {/* FOOTER BADGE */}
        <div className="relative z-10 flex justify-center pb-4">
          <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[11px] font-semibold tracking-tight">
            {checked} / {total} synced
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export { ProgressCircleCard };
