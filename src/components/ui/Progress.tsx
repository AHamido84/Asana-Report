import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
  barClassName,
  color,
}: {
  value: number;
  className?: string;
  barClassName?: string;
  color?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-1.5 w-full rounded-full bg-muted overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", barClassName)}
        style={{ width: `${clamped}%`, background: color ?? "var(--primary)" }}
      />
    </div>
  );
}
