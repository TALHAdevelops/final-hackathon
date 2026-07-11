"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { Asset } from "@/lib/types";
import { Card, Field, Input, Textarea, Button, Alert } from "@/components/ui";

export default function NewAssetPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    category: "",
    location: "",
    condition: "",
    description: "",
    nextServiceDate: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        category: form.category,
        location: form.location,
      };
      if (form.condition) body.condition = form.condition;
      if (form.description) body.description = form.description;
      if (form.nextServiceDate)
        body.nextServiceDate = new Date(form.nextServiceDate).toISOString();

      const asset = await api<Asset>("/assets", { method: "POST", body });
      router.push(`/assets/${asset.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create asset");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/assets"
          className="text-sm font-medium text-[--color-primary] hover:underline"
        >
          ← Back to assets
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[--color-text]">
          Register Asset
        </h1>
        <p className="mt-1 text-sm text-[--color-text-subtle]">
          A unique asset code and QR code are generated automatically.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <Field label="Asset name" htmlFor="name">
            <Input
              id="name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Classroom Projector 01"
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor="category">
              <Input
                id="category"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="e.g. Projector"
                required
              />
            </Field>
            <Field label="Location" htmlFor="location">
              <Input
                id="location"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="e.g. Room A-101"
                required
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Condition" htmlFor="condition" hint="Optional">
              <Input
                id="condition"
                value={form.condition}
                onChange={(e) => set("condition", e.target.value)}
                placeholder="e.g. Good"
              />
            </Field>
            <Field
              label="Next service date"
              htmlFor="nextServiceDate"
              hint="Optional"
            >
              <Input
                id="nextServiceDate"
                type="date"
                value={form.nextServiceDate}
                onChange={(e) => set("nextServiceDate", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Description" htmlFor="description" hint="Optional">
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Any additional details about the asset"
            />
          </Field>
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading}>
              Create asset
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/assets")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
