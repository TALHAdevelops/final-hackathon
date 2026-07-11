"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Asset, AssetStatus, Paginated } from "@/lib/types";
import {
  Card,
  Badge,
  Input,
  Select,
  LinkButton,
  Spinner,
  EmptyState,
} from "@/components/ui";
import { IconPlus, IconSearch } from "@/components/icons";
import { assetStatusMeta, formatDateShort } from "@/lib/labels";
import { useAuth } from "@/lib/auth";

const STATUS_OPTIONS: AssetStatus[] = [
  "OPERATIONAL",
  "ISSUE_REPORTED",
  "UNDER_INSPECTION",
  "UNDER_MAINTENANCE",
  "OUT_OF_SERVICE",
  "RETIRED",
];

export default function AssetsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [data, setData] = useState<Paginated<Asset> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    try {
      const res = await api<Paginated<Asset>>(`/assets?${params.toString()}`);
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[--color-text]">
            Assets
          </h1>
          <p className="mt-1 text-sm text-[--color-text-subtle]">
            {data ? `${data.meta.total} total` : "Loading…"}
          </p>
        </div>
        {user?.role === "ADMIN" && (
          <LinkButton href="/assets/new">
            <IconPlus className="h-4 w-4" />
            New Asset
          </LinkButton>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-56">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[--color-text-subtle]" />
          <Input
            placeholder="Search by name, code, location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search assets"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
          className="w-52"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {assetStatusMeta[s].label}
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
          title="No assets found"
          description="Try adjusting your search, or register a new asset."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[--color-border] bg-[--color-surface-muted] text-xs uppercase tracking-wide text-[--color-text-subtle]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Next Service</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--color-border]">
                {data?.data.map((asset) => (
                  <tr
                    key={asset.id}
                    onClick={() => router.push(`/assets/${asset.id}`)}
                    className="cursor-pointer transition-colors hover:bg-[--color-surface-muted]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-[--color-primary]">
                      {asset.code}
                    </td>
                    <td className="px-4 py-3 font-medium text-[--color-text]">
                      {asset.name}
                    </td>
                    <td className="px-4 py-3 text-[--color-text-muted]">
                      {asset.category}
                    </td>
                    <td className="px-4 py-3 text-[--color-text-muted]">
                      {asset.location}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={assetStatusMeta[asset.status].tone}>
                        {assetStatusMeta[asset.status].label}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[--color-text-muted]">
                      {formatDateShort(asset.nextServiceDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
