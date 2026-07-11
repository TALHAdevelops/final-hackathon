"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { Issue, AuthUser } from "@/lib/types";
import {
  Card,
  Badge,
  Button,
  Select,
  Field,
  Input,
  Textarea,
  Alert,
  Spinner,
} from "@/components/ui";
import { IconSparkles } from "@/components/icons";
import {
  issueStatusMeta,
  priorityMeta,
  formatDate,
} from "@/lib/labels";
import { useAuth } from "@/lib/auth";

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [techs, setTechs] = useState<AuthUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setIssue(await api<Issue>(`/issues/${id}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load issue");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (user && (user.role === "ADMIN" || user.role === "SUPERVISOR")) {
      api<AuthUser[]>("/users?role=TECHNICIAN")
        .then(setTechs)
        .catch(() => {});
    }
  }, [user]);

  async function act(fn: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (error && !issue) return <Alert>{error}</Alert>;
  if (!issue)
    return (
      <div className="flex justify-center py-20 text-[--color-text-subtle]">
        <Spinner />
      </div>
    );

  const privileged = user?.role === "ADMIN" || user?.role === "SUPERVISOR";
  const isOwner = issue.assignedTechnicianId === user?.id;
  const canAct = privileged || isOwner;
  const s = issue.status;
  const ai = issue.aiSuggested;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/issues"
          className="text-sm font-medium text-[--color-primary] hover:underline"
        >
          ← Back to issues
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold text-[--color-primary]">
                {issue.number}
              </span>
              <Badge tone={priorityMeta[issue.priority].tone}>
                {priorityMeta[issue.priority].label}
              </Badge>
              <Badge tone={issueStatusMeta[s].tone}>
                {issueStatusMeta[s].label}
              </Badge>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[--color-text]">
              {issue.title}
            </h1>
            {issue.asset && (
              <Link
                href={`/assets/${issue.asset.id}`}
                className="mt-1 inline-block text-sm text-[--color-text-subtle] hover:text-[--color-primary]"
              >
                {issue.asset.code} — {issue.asset.name} · {issue.asset.location}
              </Link>
            )}
          </div>
        </div>
      </div>

      {error && <Alert>{error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-[--color-text]">
              Description
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-[--color-text-muted]">
              {issue.description}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-[--color-border] pt-4 text-sm">
              <div>
                <dt className="text-xs uppercase text-[--color-text-subtle]">
                  Reporter
                </dt>
                <dd className="font-medium text-[--color-text]">
                  {issue.reporterName || "Anonymous"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-[--color-text-subtle]">
                  Reported
                </dt>
                <dd className="font-medium text-[--color-text]">
                  {formatDate(issue.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-[--color-text-subtle]">
                  Assigned to
                </dt>
                <dd className="font-medium text-[--color-text]">
                  {issue.assignedTechnician?.name || "Unassigned"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-[--color-text-subtle]">
                  Category
                </dt>
                <dd className="font-medium text-[--color-text]">
                  {issue.category || "—"}
                </dd>
              </div>
            </dl>
          </Card>

          {ai && (
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <IconSparkles className="h-4 w-4 text-[--color-primary]" />
                <h2 className="text-sm font-semibold text-[--color-text]">
                  AI Triage
                </h2>
                <Badge tone={ai.source === "ai" ? "primary" : "neutral"}>
                  {ai.source === "ai" ? "AI generated" : "Fallback"}
                </Badge>
                {issue.aiEdited && <Badge tone="info">Edited by reporter</Badge>}
              </div>
              {ai.possibleCauses?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase text-[--color-text-subtle]">
                    Possible causes
                  </p>
                  <ul className="mt-1 list-inside list-disc text-sm text-[--color-text-muted]">
                    {ai.possibleCauses.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {ai.initialChecks?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase text-[--color-text-subtle]">
                    Initial checks
                  </p>
                  <ul className="mt-1 list-inside list-disc text-sm text-[--color-text-muted]">
                    {ai.initialChecks.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {ai.recurringWarning && (
                <div className="mt-3">
                  <Alert tone="warning">{ai.recurringWarning}</Alert>
                </div>
              )}
            </Card>
          )}

          {/* Maintenance records */}
          <Card className="overflow-hidden">
            <div className="border-b border-[--color-border] px-5 py-4">
              <h2 className="text-sm font-semibold text-[--color-text]">
                Maintenance records ({issue.maintenanceRecords?.length ?? 0})
              </h2>
            </div>
            {!issue.maintenanceRecords ||
            issue.maintenanceRecords.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-[--color-text-subtle]">
                No maintenance recorded yet.
              </p>
            ) : (
              <ul className="divide-y divide-[--color-border]">
                {issue.maintenanceRecords.map((r) => (
                  <li key={r.id} className="px-5 py-4">
                    <p className="text-sm text-[--color-text]">{r.notes}</p>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[--color-text-subtle]">
                      {r.technician && <span>By {r.technician.name}</span>}
                      {r.cost != null && <span>Cost: {String(r.cost)}</span>}
                      {r.timeSpent != null && <span>{r.timeSpent} min</span>}
                      {r.finalCondition && (
                        <span>Condition: {r.finalCondition}</span>
                      )}
                      <span>{formatDate(r.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Actions */}
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-[--color-text]">
              Actions
            </h2>
            {!canAct && (
              <p className="mt-3 text-sm text-[--color-text-subtle]">
                You can only act on issues assigned to you.
              </p>
            )}

            <div className="mt-4 space-y-3">
              {/* Assign */}
              {privileged && ["REPORTED", "ASSIGNED", "REOPENED"].includes(s) && (
                <AssignForm
                  techs={techs}
                  busy={busy}
                  current={issue.assignedTechnicianId ?? ""}
                  onAssign={(techId) =>
                    act(() =>
                      api(`/issues/${id}/assign`, {
                        method: "PATCH",
                        body: { technicianId: techId },
                      }),
                    )
                  }
                />
              )}

              {canAct && s === "ASSIGNED" && (
                <Button
                  className="w-full"
                  loading={busy}
                  onClick={() =>
                    act(() =>
                      api(`/issues/${id}/status`, {
                        method: "PATCH",
                        body: { status: "INSPECTION_STARTED" },
                      }),
                    )
                  }
                >
                  Start inspection
                </Button>
              )}

              {canAct &&
                ["INSPECTION_STARTED", "MAINTENANCE_IN_PROGRESS", "WAITING_FOR_PARTS"].includes(
                  s,
                ) && (
                  <MaintenanceForm
                    busy={busy}
                    onSubmit={(body) =>
                      act(() =>
                        api(`/issues/${id}/maintenance`, {
                          method: "POST",
                          body,
                        }),
                      )
                    }
                  />
                )}

              {canAct && s === "MAINTENANCE_IN_PROGRESS" && (
                <>
                  <Button
                    variant="secondary"
                    className="w-full"
                    loading={busy}
                    onClick={() =>
                      act(() =>
                        api(`/issues/${id}/status`, {
                          method: "PATCH",
                          body: { status: "WAITING_FOR_PARTS" },
                        }),
                      )
                    }
                  >
                    Mark waiting for parts
                  </Button>
                  <Button
                    className="w-full"
                    loading={busy}
                    onClick={() =>
                      act(() =>
                        api(`/issues/${id}/resolve`, { method: "PATCH" }),
                      )
                    }
                  >
                    Resolve issue
                  </Button>
                </>
              )}

              {privileged && s === "RESOLVED" && (
                <Button
                  variant="secondary"
                  className="w-full"
                  loading={busy}
                  onClick={() =>
                    act(() => api(`/issues/${id}/close`, { method: "PATCH" }))
                  }
                >
                  Close issue
                </Button>
              )}

              {canAct && ["RESOLVED", "CLOSED"].includes(s) && (
                <Button
                  variant="danger"
                  className="w-full"
                  loading={busy}
                  onClick={() =>
                    act(() => api(`/issues/${id}/reopen`, { method: "PATCH" }))
                  }
                >
                  Reopen issue
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AssignForm({
  techs,
  current,
  busy,
  onAssign,
}: {
  techs: AuthUser[];
  current: string;
  busy: boolean;
  onAssign: (techId: string) => void;
}) {
  const [techId, setTechId] = useState(current);
  return (
    <div className="space-y-2">
      <Field label="Assign technician" htmlFor="tech">
        <Select
          id="tech"
          value={techId}
          onChange={(e) => setTechId(e.target.value)}
        >
          <option value="">Select technician…</option>
          {techs.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.email})
            </option>
          ))}
        </Select>
      </Field>
      <Button
        className="w-full"
        loading={busy}
        disabled={!techId}
        onClick={() => onAssign(techId)}
      >
        {current ? "Reassign" : "Assign"}
      </Button>
    </div>
  );
}

function MaintenanceForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const [notes, setNotes] = useState("");
  const [parts, setParts] = useState("");
  const [cost, setCost] = useState("");
  const [time, setTime] = useState("");
  const [condition, setCondition] = useState("");

  function submit() {
    const body: Record<string, unknown> = { notes };
    if (parts) body.partsReplaced = parts;
    if (cost) body.cost = Number(cost);
    if (time) body.timeSpent = Number(time);
    if (condition) body.finalCondition = condition;
    onSubmit(body);
    setNotes("");
    setParts("");
    setCost("");
    setTime("");
    setCondition("");
  }

  return (
    <div className="space-y-2 border-t border-[--color-border] pt-3">
      <p className="text-xs font-semibold uppercase text-[--color-text-subtle]">
        Record maintenance
      </p>
      <Field label="Notes" htmlFor="notes">
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Work performed…"
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Parts" htmlFor="parts">
          <Input
            id="parts"
            value={parts}
            onChange={(e) => setParts(e.target.value)}
            placeholder="e.g. HDMI cable"
          />
        </Field>
        <Field label="Cost" htmlFor="cost">
          <Input
            id="cost"
            type="number"
            min="0"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="Time (min)" htmlFor="time">
          <Input
            id="time"
            type="number"
            min="0"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="Condition" htmlFor="condition">
          <Input
            id="condition"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            placeholder="e.g. Good"
          />
        </Field>
      </div>
      <Button
        className="w-full"
        loading={busy}
        disabled={notes.trim().length < 3}
        onClick={submit}
      >
        Save maintenance
      </Button>
    </div>
  );
}
