import type { AssetStatus, IssuePriority, IssueStatus } from "./types";

type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "primary";

export const assetStatusMeta: Record<
  AssetStatus,
  { label: string; tone: Tone }
> = {
  OPERATIONAL: { label: "Operational", tone: "success" },
  ISSUE_REPORTED: { label: "Issue Reported", tone: "warning" },
  UNDER_INSPECTION: { label: "Under Inspection", tone: "info" },
  UNDER_MAINTENANCE: { label: "Under Maintenance", tone: "info" },
  OUT_OF_SERVICE: { label: "Out of Service", tone: "danger" },
  RETIRED: { label: "Retired", tone: "neutral" },
};

export const issueStatusMeta: Record<
  IssueStatus,
  { label: string; tone: Tone }
> = {
  REPORTED: { label: "Reported", tone: "warning" },
  ASSIGNED: { label: "Assigned", tone: "info" },
  INSPECTION_STARTED: { label: "Inspection Started", tone: "info" },
  MAINTENANCE_IN_PROGRESS: { label: "Maintenance", tone: "primary" },
  WAITING_FOR_PARTS: { label: "Waiting for Parts", tone: "warning" },
  RESOLVED: { label: "Resolved", tone: "success" },
  CLOSED: { label: "Closed", tone: "neutral" },
  REOPENED: { label: "Reopened", tone: "danger" },
};

export const priorityMeta: Record<
  IssuePriority,
  { label: string; tone: Tone }
> = {
  LOW: { label: "Low", tone: "neutral" },
  MEDIUM: { label: "Medium", tone: "info" },
  HIGH: { label: "High", tone: "warning" },
  CRITICAL: { label: "Critical", tone: "danger" },
};

export function historyLabel(action: string): string {
  return action
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateShort(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
