"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, ProfileUpdate } from "@/types/database";

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [form, setForm] = useState<ProfileUpdate>({
    full_name: profile.full_name ?? "",
    username: profile.username ?? "",
    bio: profile.bio ?? "",
    avatar_url: profile.avatar_url ?? "",
    website: profile.website ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateField(field: keyof ProfileUpdate, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name || null,
        username: form.username || null,
        bio: form.bio || null,
        avatar_url: form.avatar_url || null,
        website: form.website || null,
      })
      .eq("id", profile.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess("Profile updated successfully.");
    setLoading(false);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="full_name" className="mb-1.5 block text-sm font-medium">
            Full name
          </label>
          <input
            id="full_name"
            type="text"
            value={form.full_name ?? ""}
            onChange={(e) => updateField("full_name", e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        <div>
          <label htmlFor="username" className="mb-1.5 block text-sm font-medium">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={form.username ?? ""}
            onChange={(e) => updateField("username", e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="jane_doe"
          />
        </div>
      </div>

      <div>
        <label htmlFor="bio" className="mb-1.5 block text-sm font-medium">
          Bio
        </label>
        <textarea
          id="bio"
          rows={4}
          value={form.bio ?? ""}
          onChange={(e) => updateField("bio", e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
          placeholder="Tell us a little about yourself…"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="avatar_url"
            className="mb-1.5 block text-sm font-medium"
          >
            Avatar URL
          </label>
          <input
            id="avatar_url"
            type="url"
            value={form.avatar_url ?? ""}
            onChange={(e) => updateField("avatar_url", e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="https://…"
          />
        </div>

        <div>
          <label htmlFor="website" className="mb-1.5 block text-sm font-medium">
            Website
          </label>
          <input
            id="website"
            type="url"
            value={form.website ?? ""}
            onChange={(e) => updateField("website", e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="https://…"
          />
        </div>
      </div>

      <div className="rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
        Email: <span className="font-medium">{profile.email}</span> (managed by
        auth)
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {loading ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
