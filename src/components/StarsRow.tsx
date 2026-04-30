import { cn } from "@/lib/utils";

export function StarsRow({
  value,
  size = "sm",
  muted = false,
}: {
  value: number | null;
  size?: "xs" | "sm" | "md";
  muted?: boolean;
}) {
  const pixel =
    size === "xs" ? "h-2.5 w-2.5" : size === "sm" ? "h-3 w-3" : "h-4 w-4";

  if (value === null) {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={cn(
              "rounded-full",
              pixel,
              "bg-stone-200",
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= Math.round(value);
        return (
          <span
            key={i}
            className={cn(
              "rounded-full",
              pixel,
              filled
                ? muted
                  ? "bg-stone-400"
                  : "bg-amber-400"
                : "bg-stone-200",
            )}
          />
        );
      })}
    </div>
  );
}
