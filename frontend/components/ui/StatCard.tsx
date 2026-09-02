import { cn } from "@/lib/cn";

export function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string; // optional tailwind text colour class for the value
}) {
  return (
    <div className="rounded-xl border border-border bg-surface px-5 py-4">
      <p className="text-sm text-muted">{label}</p>
      <p className={cn("mt-1 text-3xl font-bold tracking-tight", accent)}>
        {value}
      </p>
    </div>
  );
}
