import { AudioWaveform, Sparkles } from "lucide-react";
export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-cyan-300/25 bg-gradient-to-br from-cyan-300/20 via-sky-500/15 to-indigo-500/25 shadow-[0_8px_30px_-12px_rgba(34,211,238,.6)]">
        <AudioWaveform className="h-6 w-6 text-cyan-200" strokeWidth={2.2}/>
        <Sparkles className="absolute right-1 top-1 h-3 w-3 text-white/80"/>
      </div>
      <div className="leading-tight">
        <span className={`block font-display font-bold tracking-tight text-foreground ${size === "lg" ? "text-3xl" : "text-lg"}`}>OsEscolhidos</span>
        <span className="text-[9px] font-semibold uppercase tracking-[.24em] text-cyan-200/70">Fé • foco • constância</span>
      </div>
    </div>
  );
}