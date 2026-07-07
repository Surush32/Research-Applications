import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/ProfileForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
          <p className="text-red-600">
            Could not load your profile. Make sure you ran the Supabase database
            migration.
          </p>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <h1 className="font-serif-display text-4xl tracking-tight">Your profile</h1>
        <p className="mt-2 text-sm text-muted">
          Update your public information and personal details.
        </p>
        <div className="mt-8">
          <ProfileForm profile={profile as Profile} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
