import { AudioWaveform, Sparkles } from "lucide-react";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const compact = size === "sm";
  return (
    <div className={`flex min-w-0 items-center ${compact ? "gap-2" : "gap-3"}`}>
      <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-cyan-300/25 bg-gradient-to-br from-cyan-300/20 via-sky-500/15 to-indigo-500/25 shadow-[0_8px_30px_-12px_rgba(34,211,238,.6)] ${compact ? "h-9 w-9" : "h-11 w-11"}`}>
        <AudioWaveform className={`${compact ? "h-5 w-5" : "h-6 w-6"} text-cyan-200`} strokeWidth={2.2} />
        <Sparkles className="absolute right-1 top-1 h-3 w-3 text-white/80" />
      </div>
      <div className="flex min-w-0 flex-col gap-0 leading-none">
        <span className={`block whitespace-nowrap font-display font-bold leading-none tracking-tight text-foreground ${size === "lg" ? "text-3xl" : compact ? "text-sm" : "text-lg"}`}>OsEscolhidos</span>
        <span className={`mt-1 block whitespace-nowrap font-semibold uppercase leading-[1.2] tracking-[.18em] text-cyan-200/70 ${compact ? "text-[7px]" : "text-[9px]"}`}>Fé • foco • constância</span>
      </div>
    </div>
  );
}
