"use client";
import clsx from "clsx";
export const INPUT_CLS = "flex w-full rounded-lg border border-card-border bg-background px-3 h-10 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/40";
export function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-red-400">{msg}</p>;
}
export function Kpi({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-card-border bg-card px-5 py-4">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tabular-nums text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{sub}</span>
    </div>
  );
}
export function BadgeBureau({ aUnBureau }: { aUnBureau: boolean }) {
  return (
    <span className={clsx("rounded-full px-2.5 py-1 text-xs font-medium", aUnBureau ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
      {aUnBureau ? "Bureau" : "Sans bureau"}
    </span>
  );
}
