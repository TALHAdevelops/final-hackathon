"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type {
  Issue,
  IssuePriority,
  IssueStatus,
  Paginated,
} from "@/lib/types";
import { Card, Badge, Select, Spinner, EmptyState } from "@/components/ui";
import {
  issueStatusMeta,
  priorityMeta,
  formatDate,
} from "@/lib/labels";

const STATUS_OPTIONS: IssueStatus[] = [
  "REPORTED",
  "ASSIGNED",
  "INSPECTION_STARTED",
  "MAINTENANCE_IN_PROGRESS",
  "WAITING_FOR_PARTS",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
];
const PRIORITY_OPTIONS: IssuePriority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export default function IssuesPage() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [data, setData] = useState<Paginated<Issue> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    try {
      setData(await api<Paginated<Issue>>(`/issues?${params.toString()}`));
    } finally {
      setLoading(false);
    }
  }, [status, priority]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[--color-text]">
          Issues
        </h1>
        <p className="mt-1 text-sm text-[--color-text-subtle]">
          {data ? `${data.meta.total} total` : "Loading…"}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
          className="w-56"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {issueStatusMeta[s].label}
            </option>
          ))}
        </Select>
        <Select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          aria-label="Filter by priority"
          className="w-48"
        >
          <option value="">All priorities</option>
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {priorityMeta[p].label}
            </option>
          ))}
        </Select>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-20 text-[--color-text-subtle]">
          <Spinner />
        </div>
      ) : data && data.data.length === 0 ? (
        <EmptyState
          title="No issues found"
          description="No issues match the current filters."
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-[--color-border]">
            {data?.data.map((issue) => (
              <li key={issue.id}>
                <button
                  onClick={() => router.push(`/issues/${issue.id}`)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[--color-surface-muted] cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[--color-primary]">
                        {issue.number}
                      </span>
                      {issue.priority === "CRITICAL" && (
                        <Badge tone="danger">Critical</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-sm font-medium text-[--color-text]">
                      {issue.title}
                    </p>
                    <p className="text-xs text-[--color-text-subtle]">
                      {issue.asset
                        ? `${issue.asset.code} — ${issue.asset.name} · `
                        : ""}
                      {formatDate(issue.createdAt)}
                      {issue.assignedTechnician
                        ? ` · ${issue.assignedTechnician.name}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={priorityMeta[issue.priority].tone}>
                      {priorityMeta[issue.priority].label}
                    </Badge>
                    <Badge tone={issueStatusMeta[issue.status].tone}>
                      {issueStatusMeta[issue.status].label}
                    </Badge>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
