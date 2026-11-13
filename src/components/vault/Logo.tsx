import { AudioWaveform, Sparkles } from "lucide-react";
export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <div className={`flex min-w-0 items-center ${size === "sm" ? "gap-2" : "gap-3"}`}>
      <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl ${size === "sm" ? "h-9 w-9" : "h-11 w-11"}` } border border-cyan-300/25 bg-gradient-to-br from-cyan-300/20 via-sky-500/15 to-indigo-500/25 shadow-[0_8px_30px_-12px_rgba(34,211,238,.6)]">
        <AudioWaveform className={`${size === "sm" ? "h-5 w-5" : "h-6 w-6"} text-cyan-200` } strokeWidth={2.2}/>
        <Sparkles className="absolute right-1 top-1 h-3 w-3 text-white/80"/>
      </div>
      <div className="leading-tight">
        <span className={`block font-display font-bold tracking-tight text-foreground ${size === "lg" ? "text-3xl" : size === "sm" ? "text-sm" : "text-lg"}`}>OsEscolhidos</span>
        <span className={`font-semibold uppercase tracking-[.18em] text-cyan-200/70 ${size === "sm" ? "text-[7px]" : "text-[9px]"}`}>Fé • foco • constância</span>
      </div>
    </div>
  );
}