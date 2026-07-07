import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ProfileForm } from "@/components/ProfileForm";
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
        <Navbar email={user.email} />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
          <p className="text-red-600">
            Could not load your profile. Make sure you ran the Supabase database
            migration.
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar email={user.email} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Update your public information and personal details.
          </p>
        </div>
        <ProfileForm profile={profile as Profile} />
      </main>
    </>
  );
}
