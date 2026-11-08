import type { ReactNode } from "react";

export const inputCls = "w-full rounded-md border bg-background px-3 py-2 text-sm";
export const btnCls =
  "inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90";
export const btnGhostCls =
  "inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted";
export const btnDangerCls =
  "inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:opacity-90";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border bg-card p-4 text-card-foreground ${className}`}>{children}</div>;
}

type Tone = "neutral" | "green" | "amber" | "red" | "blue";
const tones: Record<Tone, string> = {
  neutral: "bg-muted text-foreground",
  green: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
  blue: "bg-blue-100 text-blue-800",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function riskTone(level: string | null | undefined): Tone {
  if (level === "high") return "red";
  if (level === "medium") return "amber";
  if (level === "low") return "green";
  return "neutral";
}

export function statusTone(status: string): Tone {
  switch (status) {
    case "approved":
    case "paid":
    case "completed":
    case "matched":
      return "green";
    case "in_review":
    case "waiting_approval":
    case "partial":
    case "pending":
      return "amber";
    case "blocked":
    case "failed":
    case "rejected":
      return "red";
    case "received":
    case "running":
      return "blue";
    default:
      return "neutral";
  }
}
