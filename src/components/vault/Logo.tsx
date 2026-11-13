import { Zap } from "lucide-react";
export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="glass glow flex h-10 w-10 items-center justify-center rounded-xl">
        <Zap className="h-5 w-5 text-primary" fill="currentColor" />
      </div>
      <span className={`font-display font-semibold text-lightning ${size === "lg" ? "text-4xl" : "text-xl"}`}>
        OsEscolhidos
      </span>
    </div>
  );
}
