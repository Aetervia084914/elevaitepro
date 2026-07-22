import { Card, CardHeader, CardContent } from "./ui/card.jsx";
import { cn } from "../lib/utils.js";
import { Sparkles, ArrowUpRight } from "lucide-react";
import { useRef } from "react";

export default function Card2({
  title,
  children,
  icon: Icon = Sparkles,
  variant = "neon",
  href,
  onClick,
  className,
}) {
  const cardRef = useRef(null);

  const variants = {
    neon: "from-[#0f0c29] via-[#302b63] to-[#24243e]",
    electric: "from-[#7f00ff] via-[#e100ff] to-[#00dbde]",
    cyber: "from-[#00F5A0] via-[#00D9F5] to-[#9D00FF]",
    glass: "from-white/10 via-white/5 to-transparent",
  };

  // ✨ Magnetic Hover
  const handleMouseMove = (e) => {
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const moveX = (x - rect.width / 2) / 18;
    const moveY = (y - rect.height / 2) / 18;

    card.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.02)`;
  };

  const resetPosition = () => {
    cardRef.current.style.transform = "";
  };

  // ✨ Ripple Effect
  const createRipple = (e) => {
    const button = e.currentTarget;
    const circle = document.createElement("span");

    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const rect = button.getBoundingClientRect();

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - rect.left - diameter / 2}px`;
    circle.style.top = `${e.clientY - rect.top - diameter / 2}px`;
    circle.className = "ripple";

    const ripple = button.getElementsByClassName("ripple")[0];
    if (ripple) ripple.remove();

    button.appendChild(circle);
  };

  const Wrapper = href ? "a" : "button";

  return (
    <Wrapper
      href={href}
      onClick={(e) => {
        createRipple(e);
        onClick?.(e);
      }}
      className="relative block w-full text-left overflow-hidden rounded-[2rem]"
    >
      <Card
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={resetPosition}
        className={cn(
          "group relative overflow-hidden rounded-[2rem] border border-white/10 text-white",
          "bg-gradient-to-br",
          variants[variant],
          "backdrop-blur-3xl",
          "shadow-2xl",
          "transition-all duration-300 ease-out",
          className
        )}
      >
        {/* ✨ Neon Glow Border */}
        <div className="absolute inset-0 rounded-[2rem] p-[1px] bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-indigo-500 opacity-0 group-hover:opacity-100 blur-sm transition duration-500" />

        {/* ✨ Glass highlight */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-transparent to-transparent pointer-events-none" />

        {/* ✨ ambient glow */}
        <div className="absolute -top-32 -right-32 w-72 h-72 bg-fuchsia-500/20 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-72 h-72 bg-cyan-400/20 blur-3xl rounded-full pointer-events-none" />

        {/* Arrow */}
        <div className="absolute top-6 right-6 z-20">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center transition group-hover:scale-110 group-hover:bg-white/20">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* Icon */}
        <div className="relative z-10 px-8 pt-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 shadow-lg transition-transform duration-300 group-hover:scale-110">
            <Icon className="w-7 h-7" strokeWidth={2} />
          </div>
        </div>

        {/* Title */}
        {title && (
          <CardHeader className="relative z-10 px-8 pb-1 pt-6">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white/60">
              {title}
            </h3>
          </CardHeader>
        )}

        {/* Content */}
        <CardContent className="relative z-10 px-8 pt-1 pb-10 text-white font-medium">
          {children}
        </CardContent>
      </Card>

      {/* Ripple Styles */}
      <style jsx>{`
        .ripple {
          position: absolute;
          border-radius: 50%;
          transform: scale(0);
          animation: ripple 700ms linear;
          background-color: rgba(255, 255, 255, 0.35);
          pointer-events: none;
        }
        @keyframes ripple {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
      `}</style>
    </Wrapper>
  );
}
