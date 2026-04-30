import { cn } from "@/lib/utils";
import type { EventKind } from "@/lib/types";

// Lone Peak HS colors are maroon (~#7c1a3a) and gold (~#c9a14a).
const STYLES: Record<EventKind, string> = {
  byu_football_home: "bg-[#002E5D] text-white border-[#002E5D]",
  byu_football_away: "bg-white text-[#002E5D] border-[#002E5D]/40 border-dashed",
  lone_peak_home: "bg-[#7c1a3a] text-[#f8e7be] border-[#7c1a3a]",
  lone_peak_away: "bg-white text-[#7c1a3a] border-[#7c1a3a]/40 border-dashed",
  federal_holiday: "bg-rose-50 text-rose-900 border-rose-200",
  custom: "bg-emerald-50 text-emerald-900 border-emerald-200",
};

export function EventBar({
  kind,
  title,
  size = "sm",
}: {
  kind: EventKind;
  title: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "rounded-md border font-medium",
        size === "sm"
          ? "px-1.5 py-0.5 text-[10px] leading-4 line-clamp-1 break-all"
          : "px-3 py-2 text-sm leading-5 break-words",
        STYLES[kind],
      )}
      title={title}
    >
      {title}
    </div>
  );
}
