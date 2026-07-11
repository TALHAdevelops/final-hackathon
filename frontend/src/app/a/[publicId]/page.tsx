"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type {
  PublicAsset,
  TriageResult,
  IssuePriority,
  Issue,
} from "@/lib/types";
import {
  Card,
  Badge,
  Button,
  Field,
  Input,
  Textarea,
  Select,
  Alert,
  Spinner,
} from "@/components/ui";
import { IconLogo, IconSparkles, IconCheck } from "@/components/icons";
import {
  assetStatusMeta,
  historyLabel,
  formatDateShort,
} from "@/lib/labels";

const PRIORITIES: IssuePriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export default function PublicAssetPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const [asset, setAsset] = useState<PublicAsset | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [submitted, setSubmitted] = useState<Issue | null>(null);

  const load = useCallback(async () => {
    try {
      setAsset(
        await api<PublicAsset>(`/public/assets/${publicId}`, { auth: false }),
      );
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setNotFound(true);
    }
  }, [publicId]);

  useEffect(() => {
    load();
  }, [load]);

  if (notFound)
    return (
      <Shell>
        <Card className="p-8 text-center">
          <h1 className="text-lg font-semibold text-[--color-text]">
            Asset not found
          </h1>
          <p className="mt-1 text-sm text-[--color-text-subtle]">
            This QR code does not match any registered asset.
          </p>
        </Card>
      </Shell>
    );

  if (!asset)
    return (
      <Shell>
        <div className="flex justify-center py-20 text-[--color-text-subtle]">
          <Spinner />
        </div>
      </Shell>
    );

  const meta = assetStatusMeta[asset.status];

  if (submitted)
    return (
      <Shell>
        <Card className="p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[--color-success-soft] text-[--color-success]">
            <IconCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-[--color-text]">
            Issue reported
          </h1>
          <p className="mt-1 text-sm text-[--color-text-subtle]">
            Your reference number is{" "}
            <span className="font-mono font-semibold text-[--color-text]">
              {submitted.number}
            </span>
            . The maintenance team has been notified.
          </p>
          <Button
            variant="secondary"
            className="mt-6"
            onClick={() => {
              setSubmitted(null);
              setReporting(false);
              load();
            }}
          >
            Done
          </Button>
        </Card>
      </Shell>
    );

  return (
    <Shell>
      <Card className="overflow-hidden">
        <div className="border-b border-[--color-border] bg-[--color-surface-muted] px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-xs font-semibold text-[--color-primary]">
                {asset.code}
              </p>
              <h1 className="mt-0.5 text-lg font-bold text-[--color-text]">
                {asset.name}
              </h1>
            </div>
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-4 px-5 py-4 text-sm">
          <Detail label="Category" value={asset.category} />
          <Detail label="Location" value={asset.location} />
          <Detail label="Condition" value={asset.condition ?? "—"} />
          <Detail
            label="Next service"
            value={formatDateShort(asset.nextServiceDate)}
          />
        </dl>
      </Card>

      {asset.isRetired && (
        <Alert tone="warning">
          This asset is retired and no longer accepts new issue reports.
        </Alert>
      )}

      {asset.recentActivity.length > 0 && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-[--color-text]">
            Recent activity
          </h2>
          <ul className="mt-3 space-y-2">
            {asset.recentActivity.map((a, i) => (
              <li
                key={i}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-[--color-text-muted]">
                  {historyLabel(a.action)}
                </span>
                <span className="text-xs text-[--color-text-subtle]">
                  {formatDateShort(a.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {asset.canReportIssue &&
        (reporting ? (
          <ReportFlow
            publicId={publicId}
            onSubmitted={setSubmitted}
            onCancel={() => setReporting(false)}
          />
        ) : (
          <Button className="w-full" onClick={() => setReporting(true)}>
            Report an issue
          </Button>
        ))}
    </Shell>
  );
}

function ReportFlow({
  publicId,
  onSubmitted,
  onCancel,
}: {
  publicId: string;
  onSubmitted: (issue: Issue) => void;
  onCancel: () => void;
}) {
  const [complaint, setComplaint] = useState("");
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [triaging, setTriaging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable issue fields (prefilled from triage, reporter can change).
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<IssuePriority>("MEDIUM");
  const [reporterName, setReporterName] = useState("");
  const [edited, setEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function runTriage() {
    setError(null);
    setTriaging(true);
    try {
      const result = await api<TriageResult>(
        `/public/assets/${publicId}/triage`,
        { method: "POST", body: { complaint }, auth: false },
      );
      setTriage(result);
      setTitle(result.title);
      setCategory(result.category);
      setPriority(result.priority);
      setEdited(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "AI triage unavailable");
    } finally {
      setTriaging(false);
    }
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const issue = await api<Issue>(`/public/assets/${publicId}/issues`, {
        method: "POST",
        auth: false,
        body: {
          title: title || complaint.slice(0, 80),
          description: complaint,
          category: category || undefined,
          priority,
          reporterName: reporterName || undefined,
          aiSuggested: triage ?? undefined,
          aiEdited: edited,
        },
      });
      onSubmitted(issue);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[--color-text]">
          Report an issue
        </h2>
        <button
          onClick={onCancel}
          className="text-sm text-[--color-text-subtle] hover:text-[--color-text] cursor-pointer"
        >
          Cancel
        </button>
      </div>

      {error && <Alert>{error}</Alert>}

      <Field
        label="Describe the problem"
        htmlFor="complaint"
        hint="Plain language is fine — AI will structure it for you."
      >
        <Textarea
          id="complaint"
          value={complaint}
          onChange={(e) => setComplaint(e.target.value)}
          placeholder="e.g. The projector display is flickering and sometimes does not detect HDMI"
        />
      </Field>

      {!triage ? (
        <div className="flex gap-2">
          <Button
            onClick={runTriage}
            loading={triaging}
            disabled={complaint.trim().length < 5}
          >
            <IconSparkles className="h-4 w-4" />
            AI Triage
          </Button>
          <Button
            variant="secondary"
            onClick={submit}
            loading={submitting}
            disabled={complaint.trim().length < 5}
          >
            Skip &amp; submit
          </Button>
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border border-[--color-primary-soft] bg-[--color-primary-soft]/40 p-4">
          <div className="flex items-center gap-2">
            <IconSparkles className="h-4 w-4 text-[--color-primary]" />
            <span className="text-sm font-semibold text-[--color-text]">
              AI suggestions
            </span>
            <Badge tone={triage.source === "ai" ? "primary" : "neutral"}>
              {triage.source === "ai" ? "AI" : "Fallback"}
            </Badge>
          </div>
          <p className="text-xs text-[--color-text-subtle]">
            Review and edit before submitting.
          </p>

          <Field label="Title" htmlFor="title">
            <Input
              id="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setEdited(true);
              }}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category" htmlFor="cat">
              <Input
                id="cat"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setEdited(true);
                }}
              />
            </Field>
            <Field label="Priority" htmlFor="prio">
              <Select
                id="prio"
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value as IssuePriority);
                  setEdited(true);
                }}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {triage.possibleCauses.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-[--color-text-subtle]">
                Possible causes
              </p>
              <ul className="mt-1 list-inside list-disc text-sm text-[--color-text-muted]">
                {triage.possibleCauses.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
          {triage.initialChecks.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-[--color-text-subtle]">
                Safe initial checks
              </p>
              <ul className="mt-1 list-inside list-disc text-sm text-[--color-text-muted]">
                {triage.initialChecks.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
          {triage.recurringWarning && (
            <Alert tone="warning">{triage.recurringWarning}</Alert>
          )}

          <Field label="Your name" htmlFor="name" hint="Optional">
            <Input
              id="name"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              placeholder="e.g. Ali Khan"
            />
          </Field>

          <Button className="w-full" onClick={submit} loading={submitting}>
            Submit issue
          </Button>
        </div>
      )}
    </Card>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[--color-bg] px-4 py-6">
      <div className="mx-auto w-full max-w-md space-y-4">
        <div className="flex items-center justify-center gap-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[--color-primary] text-[--color-primary-contrast]">
            <IconLogo className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[--color-text]">
            MaintainIQ
          </span>
        </div>
        {children}
        <p className="pt-4 text-center text-xs text-[--color-text-subtle]">
          Powered by MaintainIQ · AI-assisted maintenance
        </p>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-[--color-text-subtle]">
        {label}
      </dt>
      <dd className="mt-0.5 font-medium text-[--color-text]">{value}</dd>
    </div>
  );
}
