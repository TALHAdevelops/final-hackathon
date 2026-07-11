"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { DashboardSummary } from "@/lib/types";
import { Card, Badge, Spinner } from "@/components/ui";
import {
  assetStatusMeta,
  issueStatusMeta,
  priorityMeta,
  formatDate,
} from "@/lib/labels";
import type { AssetStatus, IssueStatus, IssuePriority } from "@/lib/types";

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-[--color-text-subtle]">{label}</p>
      <p
        className="mt-2 text-3xl font-bold tracking-tight"
        style={{ color: accent ?? "var(--color-text)" }}
      >
        {value}
      </p>
    </Card>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<DashboardSummary>("/dashboard/summary")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error)
    return (
      <p className="text-sm text-[--color-danger]">Failed to load: {error}</p>
    );
  if (!data)
    return (
      <div className="flex justify-center py-20 text-[--color-text-subtle]">
        <Spinner />
      </div>
    );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[--color-text]">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-[--color-text-subtle]">
          Operational overview of assets and maintenance issues.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Assets" value={data.assets.total} />
        <StatCard label="Open Issues" value={data.issues.open} />
        <StatCard
          label="Critical Open"
          value={data.issues.criticalOpen}
          accent={
            data.issues.criticalOpen > 0 ? "var(--color-danger)" : undefined
          }
        />
        <StatCard
          label="Service Due"
          value={data.assets.dueService}
          accent={
            data.assets.dueService > 0 ? "var(--color-warning)" : undefined
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-[--color-text]">
            Assets by status
          </h2>
          <div className="mt-4 space-y-3">
            {Object.entries(data.assets.byStatus).map(([status, count]) => {
              const meta = assetStatusMeta[status as AssetStatus];
              return (
                <div key={status} className="flex items-center justify-between">
                  <Badge tone={meta?.tone}>{meta?.label ?? status}</Badge>
                  <span className="text-sm font-semibold text-[--color-text]">
                    {count}
                  </span>
                </div>
              );
            })}
            {Object.keys(data.assets.byStatus).length === 0 && (
              <p className="text-sm text-[--color-text-subtle]">No assets yet.</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-[--color-text]">
            Issues by priority
          </h2>
          <div className="mt-4 space-y-3">
            {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as IssuePriority[])
              .filter((p) => data.issues.byPriority[p])
              .map((p) => (
                <div key={p} className="flex items-center justify-between">
                  <Badge tone={priorityMeta[p].tone}>
                    {priorityMeta[p].label}
                  </Badge>
                  <span className="text-sm font-semibold text-[--color-text]">
                    {data.issues.byPriority[p]}
                  </span>
                </div>
              ))}
            {Object.keys(data.issues.byPriority).length === 0 && (
              <p className="text-sm text-[--color-text-subtle]">No issues yet.</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-[--color-border] px-5 py-4">
          <h2 className="text-sm font-semibold text-[--color-text]">
            Recent issues
          </h2>
          <Link
            href="/issues"
            className="text-sm font-medium text-[--color-primary] hover:underline"
          >
            View all
          </Link>
        </div>
        {data.recentIssues.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[--color-text-subtle]">
            No issues reported yet.
          </p>
        ) : (
          <ul className="divide-y divide-[--color-border]">
            {data.recentIssues.map((issue) => (
              <li key={issue.number}>
                <div className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[--color-text]">
                      {issue.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[--color-text-subtle]">
                      {issue.number} · {issue.asset.code} — {issue.asset.name} ·{" "}
                      {formatDate(issue.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={priorityMeta[issue.priority].tone}>
                      {priorityMeta[issue.priority].label}
                    </Badge>
                    <Badge
                      tone={issueStatusMeta[issue.status as IssueStatus]?.tone}
                    >
                      {issueStatusMeta[issue.status as IssueStatus]?.label}
                    </Badge>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
